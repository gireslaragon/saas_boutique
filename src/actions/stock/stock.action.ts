"use server";

import { db, withTransaction } from "@/db";
import { stockSnapshots } from "@/db/schema/stock-snapshots";
import { stockMovements } from "@/db/schema/stock-movements";
import { stockLosses } from "@/db/schema/stock-losses";
import { restockings } from "@/db/schema/restockings";
import { events } from "@/db/schema/events";
import { products } from "@/db/schema/products";
import { productVariants } from "@/db/schema/product-variants";
import { categories } from "@/db/schema/categories";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { eq, and, desc, asc } from "drizzle-orm";
import { z } from "zod";

// ─── Get stock complet ────────────────────────────────────────────────────────

export async function getStockAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  const rows = await db
    .select({
      variantId:     productVariants.id,
      variantLabel:  productVariants.label,
      variantType:   productVariants.variantType,
      unitsPerVariant: productVariants.unitsPerVariant,
      alertThreshold:  productVariants.alertThresholdUnits,
      sellingPrice:    productVariants.sellingPrice,
      costPrice:     products.costPrice,
      productId:     products.id,
      productName:   products.name,
      imageUrl:      products.imageUrl,
      categoryName:  categories.name,
      categoryColor: categories.color,
      isActive:      products.isActive,
      qtyUnits:      stockSnapshots.qtyUnits,
      lastMovement:  stockSnapshots.lastMovementAt,
    })
    .from(productVariants)
    .innerJoin(products,        eq(productVariants.productId, products.id))
    .leftJoin(stockSnapshots,   and(eq(stockSnapshots.productId, productVariants.productId), eq(stockSnapshots.tenantId, tenantId)))
    .leftJoin(categories,       eq(products.categoryId, categories.id))
    .where(eq(productVariants.tenantId, tenantId))
    .orderBy(asc(products.name));

  return {
    success: true as const,
    data: rows.map((r) => {
      const qty = r.qtyUnits ?? 0;
      const uPerV = r.unitsPerVariant ?? 1;
      const threshold = r.alertThreshold ?? 0;
      return {
        variantId:      r.variantId,
        variantLabel:   r.variantLabel,
        variantType:    r.variantType,
        sellingPrice:   Number(r.sellingPrice),
        costPrice:      Number(r.costPrice ?? 0),
        unitsPerVariant: uPerV,
        alertThreshold:  threshold,
        productId:      r.productId,
        productName:    r.productName,
        imageUrl:       r.imageUrl,
        categoryName:   r.categoryName,
        categoryColor:  r.categoryColor,
        isActive:       r.isActive,
        qtyUnits:       qty,
        qtyInPacks:     Math.floor(qty / uPerV),
        isLowStock:     qty <= threshold && qty > 0,
        isOutOfStock:   qty === 0,
        lastMovement:   r.lastMovement?.toISOString() ?? null,
      };
    }),
  };
}

// ─── Réapprovisionner ─────────────────────────────────────────────────────────

const restockSchema = z.object({
  variantId:        z.string().uuid(),
  qtyUnitsAdded:    z.number().int().positive("Quantité invalide"),
  costPricePerUnit: z.number().min(0),
  supplier:         z.string().optional(),
  notes:            z.string().optional(),
});

export type RestockInput = z.infer<typeof restockSchema>;

export async function restockAction(input: z.infer<typeof restockSchema>) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId, id: userId } = auth.data;

  const parsed = restockSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  const { variantId, qtyUnitsAdded, costPricePerUnit, supplier, notes } = parsed.data;

  try {
    await withTransaction(async (tx) => {
      // Résout productId depuis la variante
      const [variantRow] = await tx
        .select({ productId: productVariants.productId })
        .from(productVariants)
        .where(eq(productVariants.id, variantId))
        .limit(1);

      if (!variantRow) throw new Error("Variante introuvable");

      // Lit le stock actuel (par produit)
      const [snap] = await tx
        .select({ qtyUnits: stockSnapshots.qtyUnits })
        .from(stockSnapshots)
        .where(and(
          eq(stockSnapshots.productId, variantRow.productId),
          eq(stockSnapshots.tenantId, tenantId),
        ))
        .limit(1);

      const before = snap?.qtyUnits ?? 0;
      const after  = before + qtyUnitsAdded;

      // Met à jour le snapshot (product-level)
      await tx.update(stockSnapshots)
        .set({ qtyUnits: after, lastMovementType: "restock", lastMovementAt: new Date(), updatedAt: new Date() })
        .where(and(eq(stockSnapshots.productId, variantRow.productId), eq(stockSnapshots.tenantId, tenantId)));

      // Journal mouvement (productId)
      await tx.insert(stockMovements).values({
        tenantId,
        productId: variantRow.productId,
        movementType:  "restock",
        qtyUnitsDelta: qtyUnitsAdded,
        qtyUnitsBefore: before,
        qtyUnitsAfter:  after,
        reason:   supplier ?? "Approvisionnement",
        createdBy: userId,
      });

      // Historique approvisionnement (table garde la variantId)
      await tx.insert(restockings).values({
        tenantId, variantId,
        qtyUnitsAdded,
        costPricePerUnit: String(costPricePerUnit),
        totalCost:        String(qtyUnitsAdded * costPricePerUnit),
        supplier,
        notes,
        createdBy: userId,
      });

      // Event
      await tx.insert(events).values({
        tenantId,
        eventType:   "STOCK_INCREASED",
        triggeredBy: userId,
        variantId,
        payload:     { variantId, qtyUnitsAdded, before, after, supplier },
      });
    });

    return { success: true as const };
  } catch (err) {
    console.error("[restock]", err);
    return { success: false as const, error: "Erreur réapprovisionnement" };
  }
}

// ─── Déclarer une perte ───────────────────────────────────────────────────────

const lossSchema = z.object({
  variantId:    z.string().uuid(),
  qtyUnitsLost: z.number().int().positive("Quantité invalide"),
  lossType:     z.enum(["breakage", "theft", "expiry", "error", "other"]),
  reason:       z.string().min(3, "Décrivez le motif"),
  estimatedValue: z.number().min(0).optional(),
});

export async function declareLossAction(input: z.infer<typeof lossSchema>) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId, id: userId } = auth.data;

  const parsed = lossSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  const { variantId, qtyUnitsLost, lossType, reason, estimatedValue } = parsed.data;

  try {
    await withTransaction(async (tx) => {
      // Résout productId depuis la variante
      const [variantRow] = await tx
        .select({ productId: productVariants.productId })
        .from(productVariants)
        .where(eq(productVariants.id, variantId))
        .limit(1);

      if (!variantRow) throw new Error("Variante introuvable");

      const [snap] = await tx
        .select({ qtyUnits: stockSnapshots.qtyUnits })
        .from(stockSnapshots)
        .where(and(eq(stockSnapshots.productId, variantRow.productId), eq(stockSnapshots.tenantId, tenantId)))
        .limit(1);

      const before = snap?.qtyUnits ?? 0;
      if (qtyUnitsLost > before) throw new Error("Quantité perdue supérieure au stock disponible");

      const after = before - qtyUnitsLost;

      await tx.update(stockSnapshots)
        .set({ qtyUnits: after, lastMovementType: "loss", lastMovementAt: new Date(), updatedAt: new Date() })
        .where(and(eq(stockSnapshots.productId, variantRow.productId), eq(stockSnapshots.tenantId, tenantId)));

      await tx.insert(stockMovements).values({
        tenantId,
        productId: variantRow.productId,
        movementType:   "loss",
        qtyUnitsDelta:  -qtyUnitsLost,
        qtyUnitsBefore: before,
        qtyUnitsAfter:  after,
        reason,
        createdBy: userId,
      });

      await tx.insert(stockLosses).values({
        tenantId, variantId,
        lossType,
        qtyUnitsLost,
        estimatedValue: String(estimatedValue ?? 0),
        reason,
        declaredBy: userId,
      });

      await tx.insert(events).values({
        tenantId,
        eventType:   "STOCK_LOSS_DECLARED",
        triggeredBy: userId,
        variantId,
        payload:     { variantId, qtyUnitsLost, lossType, reason, before, after },
      });
    });

    return { success: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur déclaration perte";
    return { success: false as const, error: message };
  }
}

// ─── Historique mouvements ────────────────────────────────────────────────────

export async function getStockMovementsAction(variantId?: string) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  let productFilter = undefined;
  if (variantId) {
    const [v] = await db
      .select({ productId: productVariants.productId })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);
    if (v) productFilter = eq(stockMovements.productId, v.productId);
  }

  const rows = await db
    .select()
    .from(stockMovements)
    .where(and(
      eq(stockMovements.tenantId, tenantId),
      productFilter,
    ))
    .orderBy(desc(stockMovements.createdAt))
    .limit(100);

  return { success: true as const, data: rows };
}