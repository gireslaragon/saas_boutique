"use server";

import { db, withTransaction } from "@/db";
import { products } from "@/db/schema/products";
import { productVariants } from "@/db/schema/product-variants";
import { stockSnapshots } from "@/db/schema/stock-snapshots";
import { stockMovements } from "@/db/schema/stock-movements";
import { events } from "@/db/schema/events";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { eq, and } from "drizzle-orm";

import type { CreateProductInput, PurchaseUnit } from "./create-product.action";

export async function createProductAction(input: CreateProductInput) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId, id: userId } = auth.data;

  const {
    name, categoryId, imageUrl,
    purchaseTotalCost, purchaseQty, purchaseUnit, purchaseUnitSize,
    alertQty, alertUnit, alertUnitSize,
    variants,
  } = input;

  const toBaseUnits = (qty: number, unit: PurchaseUnit, unitSize: number) =>
    unit === "unit" ? qty : qty * Math.max(1, unitSize);

  const calcCostPerUnit = (totalCost: number, qty: number, unit: PurchaseUnit, unitSize: number) => {
    const totalUnits = toBaseUnits(qty, unit, unitSize);
    if (!totalUnits) return 0;
    return totalCost / totalUnits;
  };

  const initialQtyUnits = toBaseUnits(purchaseQty, purchaseUnit, purchaseUnitSize);
  const costPerUnit = calcCostPerUnit(purchaseTotalCost, purchaseQty, purchaseUnit, purchaseUnitSize);
  const alertThresholdUnits = toBaseUnits(alertQty, alertUnit, alertUnitSize);

  const purchaseNote = purchaseUnit === "unit"
    ? `${purchaseQty} unité${purchaseQty > 1 ? "s" : ""}`
    : `${purchaseQty} ${purchaseUnit === "case" ? "casier" : "paquet"}${purchaseQty > 1 ? "s" : ""} × ${purchaseUnitSize} u`;

  try {
    await withTransaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          tenantId,
          name,
          categoryId:  categoryId ?? null,
          imageUrl:    imageUrl   ?? null,
          costPrice:   String(costPerUnit),
          isActive:    true,
        })
        .returning({ id: products.id });

      for (const v of variants) {
        await tx.insert(productVariants).values({
          tenantId,
          productId:           product.id,
          label:               v.label,
          variantType:         v.variantType,
          sellingPrice:        String(v.sellingPrice),
          unitsPerVariant:     v.unitsPerVariant,
          alertThresholdUnits,
          isActive:            true,
        });
      }

      await tx.insert(stockSnapshots).values({
        tenantId,
        productId:        product.id,
        qtyUnits:         initialQtyUnits,
        lastMovementType: initialQtyUnits > 0 ? "restock" : null,
        lastMovementAt:   new Date(),
      });

      if (initialQtyUnits > 0) {
        await tx.insert(stockMovements).values({
          tenantId,
          productId:      product.id,
          movementType:   "restock",
          qtyUnitsDelta:  initialQtyUnits,
          qtyUnitsBefore: 0,
          qtyUnitsAfter:  initialQtyUnits,
          reason:         `Stock initial — ${purchaseNote}`,
          createdBy:      userId,
        });
      }

      await tx.insert(events).values({
        tenantId,
        eventType:   "PRODUCT_CREATED",
        triggeredBy: userId,
        payload: {
          name,
          initialQtyUnits,
          costPerUnit,
          purchaseTotalCost,
          purchaseNote,
          alertThresholdUnits,
          variantsCount: variants.length,
        },
      });
    });

    return { success: true as const };
  } catch (err) {
    console.error("[createProduct] (server)", err);
    return { success: false as const, error: "Erreur lors de la création du produit" };
  }
}

export async function updateProductAction(
  productId: string,
  input: { name?: string; categoryId?: string | null; imageUrl?: string | null },
) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  try {
    await db.update(products)
      .set({
        ...(input.name       !== undefined && { name:      input.name }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.imageUrl   !== undefined && { imageUrl:  input.imageUrl }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(products.id,       productId),
        eq(products.tenantId, auth.data.tenantId)
      ));

    return { success: true as const };
  } catch {
    return { success: false as const, error: "Erreur mise à jour produit" };
  }
}

export async function toggleProductAction(productId: string, isActive: boolean) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  await db
    .update(products)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.tenantId, auth.data.tenantId)));

  await db.insert(events).values({
    tenantId:    auth.data.tenantId,
    eventType:   isActive ? "PRODUCT_UPDATED" : "PRODUCT_DEACTIVATED",
    triggeredBy: auth.data.id,
    payload:     { productId, isActive },
  });

  return { success: true as const };
}
