/**
 * STOCK ENGINE — Cœur de la logique de stock unifié
 *
 * Principe fondamental :
 * - Le stock est TOUJOURS stocké en unités de base (bouteilles, pièces, etc.)
 * - Chaque variante définit combien d'unités de base elle consomme (unitsPerVariant)
 * - Vendre 1 casier (unitsPerVariant=12) → déduire 12 unités de base
 * - Vendre 1 bouteille (unitsPerVariant=1) → déduire 1 unité de base
 *
 * Ce moteur centralise TOUTES les opérations de stock.
 * Il est appelé par le Transaction Engine — jamais directement par les actions.
 */

import { db } from "@/db";
import { stockSnapshots } from "@/db/schema/stock-snapshots";
import { stockMovements } from "@/db/schema/stock-movements";
import { productVariants } from "@/db/schema/product-variants";
import { eq, and } from "drizzle-orm";
// stockMovementTypeEnum type not required here

export interface StockDeductionParams {
  tenantId:    string;
  variantId:   string;
  qty:         number;    // quantité de la VARIANTE (ex: 2 casiers)
  movementType?: "sale" | "exchange_out" | "cancel" | "return" | "restock" | "loss" | "adjustment" | "exchange_in";
  reason?:     string;
  saleId?:     string;
  adjustmentId?: string;
  createdBy:   string;
  tx?:         typeof db; // transaction Drizzle optionnelle
}

export interface StockDeductionResult {
  success:        boolean;
  qtyUnitsDelta:  number;   // toujours négatif pour une déduction
  qtyUnitsBefore: number;
  qtyUnitsAfter:  number;
  error?:         string;
}

/**
 * Déduit du stock en convertissant la quantité variante → unités de base.
 *
 * Ex: vendre 2 casiers (unitsPerVariant=12) → -24 unités de base
 */
export async function deductStock(
  params: StockDeductionParams,
  db_: typeof db,
): Promise<StockDeductionResult> {
  const {
    tenantId, variantId, qty,
    movementType = "sale",
    reason, saleId, adjustmentId, createdBy,
  } = params;

  // 1. Lit unitsPerVariant pour calculer la déduction réelle
  const [variant] = await db_
    .select({ productId: productVariants.productId, unitsPerVariant: productVariants.unitsPerVariant })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) {
    return { success: false, qtyUnitsDelta: 0, qtyUnitsBefore: 0, qtyUnitsAfter: 0, error: "Variante introuvable" };
  }

  // 2. Calcule le delta en unités de base
  const unitsToDeduct = qty * variant.unitsPerVariant;

  // 3. Lit le snapshot actuel
  const [snap] = await db_
    .select({ qtyUnits: stockSnapshots.qtyUnits })
    .from(stockSnapshots)
    .where(and(
      eq(stockSnapshots.productId, variant.productId),
      eq(stockSnapshots.tenantId, tenantId),
    ))
    .limit(1);

  const before = snap?.qtyUnits ?? 0;

  // 4. Vérifie le stock disponible
  if (before < unitsToDeduct) {
    return {
      success: false,
      qtyUnitsDelta:  -unitsToDeduct,
      qtyUnitsBefore: before,
      qtyUnitsAfter:  before,
      error: `Stock insuffisant — disponible: ${before} unités, requis: ${unitsToDeduct} unités`,
    };
  }

  const after = before - unitsToDeduct;

  // 5. Met à jour le snapshot
  await db_
    .update(stockSnapshots)
    .set({
      qtyUnits:         after,
      lastMovementType: movementType,
      lastMovementAt:   new Date(),
      updatedAt:        new Date(),
    })
    .where(and(
      eq(stockSnapshots.productId, variant.productId),
      eq(stockSnapshots.tenantId, tenantId),
    ));

  // 6. Journal de mouvement
  await db_.insert(stockMovements).values({
    tenantId,
    productId: variant.productId,
    movementType,
    qtyUnitsDelta:  -unitsToDeduct,
    qtyUnitsBefore: before,
    qtyUnitsAfter:  after,
    reason:         reason ?? `Vente — ${qty} × ${variant.unitsPerVariant} unités`,
    saleId:         saleId       ?? null,
    adjustmentId:   adjustmentId ?? null,
    createdBy,
  });

  return {
    success:        true,
    qtyUnitsDelta:  -unitsToDeduct,
    qtyUnitsBefore: before,
    qtyUnitsAfter:  after,
  };
}

/**
 * Réintègre du stock (retour, annulation).
 * Delta POSITIF.
 */
export async function restoreStock(
  params: Omit<StockDeductionParams, "movementType"> & {
    movementType?: "return" | "cancel" | "exchange_in" | "restock" | "adjustment";
  },
  db_: typeof db,
): Promise<StockDeductionResult> {
  const {
    tenantId, variantId, qty,
    movementType = "return",
    reason, saleId, adjustmentId, createdBy,
  } = params;

  const [variant] = await db_
    .select({ productId: productVariants.productId, unitsPerVariant: productVariants.unitsPerVariant })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) {
    return { success: false, qtyUnitsDelta: 0, qtyUnitsBefore: 0, qtyUnitsAfter: 0, error: "Variante introuvable" };
  }

  const unitsToRestore = qty * variant.unitsPerVariant;

  const [snap] = await db_
    .select({ qtyUnits: stockSnapshots.qtyUnits })
    .from(stockSnapshots)
    .where(and(
      eq(stockSnapshots.productId, variant.productId),
      eq(stockSnapshots.tenantId, tenantId),
    ))
    .limit(1);

  const before = snap?.qtyUnits ?? 0;
  const after  = before + unitsToRestore;

  await db_
    .update(stockSnapshots)
    .set({
      qtyUnits:         after,
      lastMovementType: movementType,
      lastMovementAt:   new Date(),
      updatedAt:        new Date(),
    })
    .where(and(
      eq(stockSnapshots.productId, variant.productId),
      eq(stockSnapshots.tenantId, tenantId),
    ));

  await db_.insert(stockMovements).values({
    tenantId,
    productId: variant.productId,
    movementType,
    qtyUnitsDelta:  unitsToRestore,
    qtyUnitsBefore: before,
    qtyUnitsAfter:  after,
    reason:         reason ?? `Retour — ${qty} × ${variant.unitsPerVariant} unités`,
    saleId:         saleId       ?? null,
    adjustmentId:   adjustmentId ?? null,
    createdBy,
  });

  return {
    success:        true,
    qtyUnitsDelta:  unitsToRestore,
    qtyUnitsBefore: before,
    qtyUnitsAfter:  after,
  };
}

/**
 * Vérifie si le stock est suffisant SANS le modifier.
 * Utilisé par le Transaction Engine avant de valider une vente.
 */
export async function checkStockAvailability(
  tenantId:  string,
  variantId: string,
  qty:       number,
  db_:       typeof db,
): Promise<{ available: boolean; qtyUnits: number; required: number }> {
  const [variant] = await db_
    .select({ unitsPerVariant: productVariants.unitsPerVariant })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) return { available: false, qtyUnits: 0, required: qty };

  const required = qty * variant.unitsPerVariant;

  const [variantRow] = await db_
    .select({ productId: productVariants.productId, unitsPerVariant: productVariants.unitsPerVariant })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variantRow) return { available: false, qtyUnits: 0, required: qty };

  const [snap] = await db_
    .select({ qtyUnits: stockSnapshots.qtyUnits })
    .from(stockSnapshots)
    .where(and(
      eq(stockSnapshots.productId, variantRow.productId),
      eq(stockSnapshots.tenantId, tenantId),
    ))
    .limit(1);

  const qtyUnits = snap?.qtyUnits ?? 0;

  return {
    available: qtyUnits >= required,
    qtyUnits,
    required,
  };
}