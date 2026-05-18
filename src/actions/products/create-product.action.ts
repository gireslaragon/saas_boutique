// Client-safe helpers and schemas for product creation.
import { z } from "zod";

export type PurchaseUnit = "unit" | "pack" | "case";

export function toBaseUnits(qty: number, unit: PurchaseUnit, unitSize: number): number {
  if (unit === "unit") return qty;
  return qty * Math.max(1, unitSize);
}

export function calcCostPerUnit(totalCost: number, qty: number, unit: PurchaseUnit, unitSize: number): number {
  const totalUnits = toBaseUnits(qty, unit, unitSize);
  if (!totalUnits) return 0;
  return totalCost / totalUnits;
}

const variantSchema = z.object({
  label:           z.string().min(1, "Nom de variante requis"),
  variantType:     z.enum(["unit", "pack", "case"]),
  sellingPrice:    z.coerce.number().positive("Prix de vente requis (> 0)"),
  unitsPerVariant: z.coerce.number().int().min(1, "Au moins 1 unité par variante"),
});

export const createProductSchema = z.object({
  name:       z.string().min(2, "Nom trop court (min 2 caractères)"),
  categoryId: z.string().uuid().nullable().optional(),
  imageUrl:   z.string().url("URL d'image invalide").nullable().optional().or(z.literal("")),

  purchaseTotalCost: z.coerce.number().min(0, "Coût d'achat requis"),
  purchaseQty:       z.coerce.number().int().positive("Quantité achetée requise"),
  purchaseUnit:      z.enum(["unit", "pack", "case"]),
  purchaseUnitSize:  z.coerce.number().int().min(1).default(1),

  alertQty:       z.coerce.number().int().min(0),
  alertUnit:      z.enum(["unit", "pack", "case"]),
  alertUnitSize:  z.coerce.number().int().min(1).default(1),

  variants: z.array(variantSchema).min(1, "Au moins une variante de vente"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// Note: server-side implementations of create/update/toggle actions live in
// `create-product.action.server.ts`. Import those from server components only.
