import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { sales } from "./sales";
import { productVariants } from "./product-variants";
import { tenants } from "./tenants";

export const saleItems = pgTable("sale_items", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  tenantId:             uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  saleId:               uuid("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
  variantId:            uuid("variant_id").notNull().references(() => productVariants.id),

  // Snapshot produit au moment de la vente — car les infos peuvent changer
  productName:          varchar("product_name", { length: 200 }).notNull(),
  variantLabel:         varchar("variant_label", { length: 100 }).notNull(),
  productImageUrl:      text("product_image_url"),

  // Prix FIGÉ à la vente — jamais modifié
  qty:                  integer("qty").notNull(),
  unitPrice:            numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalLine:            numeric("total_line", { precision: 12, scale: 2 }).notNull(),

  // Coût d'achat au moment de la vente pour calcul bénéfice fiable
  costPriceAtSale:      numeric("cost_price_at_sale", { precision: 12, scale: 2 }).default("0"),

  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  qtyPositive: check("qty_positive", sql`${t.qty} > 0`),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  tenant:   one(tenants, { fields: [saleItems.tenantId], references: [tenants.id] }),
  sale:     one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  variant:  one(productVariants, { fields: [saleItems.variantId], references: [productVariants.id] }),
}));

export type SaleItem    = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;