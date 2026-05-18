"use server";

import { db } from "@/db";
import { products } from "@/db/schema/products";
import { productVariants } from "@/db/schema/product-variants";
import { categories } from "@/db/schema/categories";
import { stockSnapshots } from "@/db/schema/stock-snapshots";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { eq, and, asc, ilike } from "drizzle-orm";

export interface ProductWithVariants {
  id:           string;
  name:         string;
  imageUrl:     string | null;
  categoryId:   string | null;
  categoryName: string | null;
  categoryColor: string | null;
  costPrice:    number;
  isActive:     boolean;
  createdAt:    string;
  variants: {
    id:               string;
    label:            string;
    variantType:      string;
    sellingPrice:     number;
    unitsPerVariant:  number;
    alertThreshold:   number;
    qtyUnits:         number;
    qtyInPacks:       number;
    isLowStock:       boolean;
    isOutOfStock:     boolean;
  }[];
}

export async function getProductsAction(search?: string) {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  const rows = await db
    .select({
      id:            products.id,
      name:          products.name,
      imageUrl:      products.imageUrl,
      categoryId:    products.categoryId,
      categoryName:  categories.name,
      categoryColor: categories.color,
      costPrice:     products.costPrice,
      isActive:      products.isActive,
      createdAt:     products.createdAt,
      variantId:           productVariants.id,
      variantLabel:        productVariants.label,
      variantType:         productVariants.variantType,
      sellingPrice:        productVariants.sellingPrice,
      unitsPerVariant:     productVariants.unitsPerVariant,
      alertThreshold:      productVariants.alertThresholdUnits,
      qtyUnits:            stockSnapshots.qtyUnits,
    })
    .from(products)
    .leftJoin(categories,      eq(products.categoryId, categories.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(stockSnapshots,  and(eq(stockSnapshots.productId, products.id), eq(stockSnapshots.tenantId, tenantId)))
    .where(and(
      eq(products.tenantId, tenantId),
      search ? ilike(products.name, `%${search}%`) : undefined,
    ))
    .orderBy(asc(products.name));

  // Regroupe par produit
  const map = new Map<string, ProductWithVariants>();

  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id:            row.id,
        name:          row.name,
        imageUrl:      row.imageUrl,
        categoryId:    row.categoryId,
        categoryName:  row.categoryName,
        categoryColor: row.categoryColor,
        costPrice:     Number(row.costPrice),
        isActive:      row.isActive,
        createdAt:     row.createdAt?.toISOString() ?? "",
        variants:      [],
      });
    }

    if (row.variantId) {
      const qty = row.qtyUnits ?? 0;
      const threshold = row.alertThreshold ?? 0;
      const uPerV = row.unitsPerVariant ?? 1;

      map.get(row.id)!.variants.push({
        id:              row.variantId,
        label:           row.variantLabel ?? "",
        variantType:     row.variantType ?? "unit",
        sellingPrice:    Number(row.sellingPrice),
        unitsPerVariant: uPerV,
        alertThreshold:  threshold,
        qtyUnits:        qty,
        qtyInPacks:      Math.floor(qty / uPerV),
        isLowStock:      qty <= threshold && qty > 0,
        isOutOfStock:    qty === 0,
      });
    }
  }

  return { success: true as const, data: Array.from(map.values()) };
}

export async function getCategoriesAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;

  const cats = await db
    .select({ id: categories.id, name: categories.name, color: categories.color })
    .from(categories)
    .where(eq(categories.tenantId, auth.data.tenantId))
    .orderBy(asc(categories.name));

  return { success: true as const, data: cats };
}