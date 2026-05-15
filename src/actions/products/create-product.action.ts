"use server";

import { db } from "@/db";
import { products } from "@/db/schema/products";
import { productVariants } from "@/db/schema/product-variants";
import { stockSnapshots } from "@/db/schema/stock-snapshots";
import { events } from "@/db/schema/events";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { withTransaction } from "@/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const variantSchema = z.object({
  label:           z.string().min(1),
  variantType:     z.enum(["unit", "pack", "case"]),
  sellingPrice:    z.number().positive(),
  unitsPerVariant: z.number().int().positive(),
  alertThreshold:  z.number().int().min(0),
  initialQty:      z.number().int().min(0),
});

const createProductSchema = z.object({
  name:        z.string().min(2, "Nom trop court"),
  categoryId:  z.string().uuid().nullable(),
  imageUrl:    z.string().url().nullable(),
  costPrice:   z.number().min(0),
  variants:    z.array(variantSchema).min(1, "Au moins une variante requise"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export async function createProductAction(input: CreateProductInput) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId, id: userId } = auth.data;

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  const { name, categoryId, imageUrl, costPrice, variants } = parsed.data;

  try {
    const result = await withTransaction(async (tx) => {
      // 1. Crée le produit
      const [product] = await tx.insert(products).values({
        tenantId,
        name,
        categoryId:  categoryId ?? null,
        imageUrl:    imageUrl ?? null,
        costPrice:   String(costPrice),
        isActive:    true,
      }).returning({ id: products.id });

      // 2. Crée les variantes + snapshots stock
      for (const v of variants) {
        const [variant] = await tx.insert(productVariants).values({
          tenantId,
          productId:           product.id,
          label:               v.label,
          variantType:         v.variantType,
          sellingPrice:        String(v.sellingPrice),
          unitsPerVariant:     v.unitsPerVariant,
          alertThresholdUnits: v.alertThreshold,
          isActive:            true,
        }).returning({ id: productVariants.id });

        // Stock snapshot initial
        await tx.insert(stockSnapshots).values({
          tenantId,
          variantId:        variant.id,
          qtyUnits:         v.initialQty,
          lastMovementType: v.initialQty > 0 ? "restock" : null,
        });
      }

      // 3. Event store
      await tx.insert(events).values({
        tenantId,
        eventType:   "PRODUCT_CREATED",
        triggeredBy: userId,
        payload:     { name, categoryId, variantsCount: variants.length },
      });

      return product;
    });

    return { success: true as const, data: { id: result.id } };
  } catch (err) {
    console.error("[createProduct]", err);
    return { success: false as const, error: "Erreur lors de la création du produit" };
  }
}

export async function updateProductAction(
  productId: string,
  input: Partial<Pick<CreateProductInput, "name" | "categoryId" | "imageUrl" | "costPrice">>
) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  try {
    await db.update(products)
      .set({
        ...(input.name       !== undefined && { name:      input.name }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.imageUrl   !== undefined && { imageUrl:  input.imageUrl }),
        ...(input.costPrice  !== undefined && { costPrice: String(input.costPrice) }),
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

  await db.update(products)
    .set({ isActive, updatedAt: new Date() })
    .where(and(
      eq(products.id,       productId),
      eq(products.tenantId, auth.data.tenantId)
    ));

  await db.insert(events).values({
    tenantId:    auth.data.tenantId,
    eventType:   isActive ? "PRODUCT_UPDATED" : "PRODUCT_DEACTIVATED",
    triggeredBy: auth.data.id,
    payload:     { productId, isActive },
  });

  return { success: true as const };
}