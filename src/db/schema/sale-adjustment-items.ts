import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  timestamp,
  pgEnum,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { saleAdjustments } from "./sale-adjustments";
import { productVariants } from "./product-variants";
import { tenants } from "./tenants";

export const adjustmentItemDirectionEnum = pgEnum("adjustment_item_direction", [
  "returned", // produit retourné par le client
  "added",    // produit ajouté lors d'un échange
]);

export const saleAdjustmentItems = pgTable("sale_adjustment_items", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  adjustmentId:   uuid("adjustment_id").notNull().references(() => saleAdjustments.id, { onDelete: "cascade" }),
  variantId:      uuid("variant_id").notNull().references(() => productVariants.id),

  direction:      adjustmentItemDirectionEnum("direction").notNull(),
  qty:            integer("qty").notNull(),
  unitPrice:      numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalLine:      numeric("total_line", { precision: 12, scale: 2 }).notNull(),

  // Snapshot produit
  productName:    varchar("product_name", { length: 200 }).notNull(),
  variantLabel:   varchar("variant_label", { length: 100 }).notNull(),

  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  qtyPositive: check("adj_item_qty_positive", sql`${t.qty} > 0`),
}));

export const saleAdjustmentItemsRelations = relations(saleAdjustmentItems, ({ one }) => ({
  tenant:     one(tenants, { fields: [saleAdjustmentItems.tenantId], references: [tenants.id] }),
  adjustment: one(saleAdjustments, { fields: [saleAdjustmentItems.adjustmentId], references: [saleAdjustments.id] }),
  variant:    one(productVariants, { fields: [saleAdjustmentItems.variantId], references: [productVariants.id] }),
}));

export type SaleAdjustmentItem    = typeof saleAdjustmentItems.$inferSelect;
export type NewSaleAdjustmentItem = typeof saleAdjustmentItems.$inferInsert;