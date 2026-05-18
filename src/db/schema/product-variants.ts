import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { products } from "./products";
import { tenants } from "./tenants";
import { stockSnapshots } from "./stock-snapshots";
import { saleItems } from "./sale-items";

export const variantTypeEnum = pgEnum("variant_type", [
  "unit",   // unité individuelle (1 bouteille, 1 biscuit)
  "pack",   // paquet (6 biscuits, 12 savons...)
  "case",   // casier (12 Castel, 24 Export...)
]);

export const productVariants = pgTable("product_variants", {
  id:               uuid("id").primaryKey().defaultRandom(),
  tenantId:         uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId:        uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),

  variantType:      variantTypeEnum("variant_type").default("unit").notNull(),
  label:            varchar("label", { length: 100 }).notNull(), // ex: "Bouteille", "Casier 12"

  // Prix de vente affiché chez la caissière
  sellingPrice:     numeric("selling_price", { precision: 12, scale: 2 }).notNull(),

  // Conversion : combien d'unités de base dans cette variante ?
  // unit  → 1
  // pack  → ex: 6 (6 biscuits par paquet)
  // case  → ex: 12 (12 Castel par casier) — variable par produit !
  unitsPerVariant:  integer("units_per_variant").default(1).notNull(),

  // Seuil d'alerte en unités individuelles
  alertThresholdUnits: integer("alert_threshold_units").default(0),

  isActive:         boolean("is_active").default(true).notNull(),

  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  tenant:       one(tenants, { fields: [productVariants.tenantId], references: [tenants.id] }),
  product:      one(products, { fields: [productVariants.productId], references: [products.id] }),
  stockSnapshot: one(stockSnapshots, { fields: [productVariants.productId], references: [stockSnapshots.productId] }),
  saleItems:    many(saleItems),
}));

export type ProductVariant    = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;