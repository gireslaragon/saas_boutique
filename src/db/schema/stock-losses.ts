import {
  pgTable,
  uuid,
  numeric,
  integer,
  text,
  timestamp,
  pgEnum,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { productVariants } from "./product-variants";
import { users } from "./users";

export const lossTypeEnum = pgEnum("loss_type", [
  "breakage",   // casse
  "theft",      // vol
  "expiry",     // péremption
  "error",      // erreur de comptage
  "other",      // autre
]);

export const stockLosses = pgTable("stock_losses", {
  id:               uuid("id").primaryKey().defaultRandom(),
  tenantId:         uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  variantId:        uuid("variant_id").notNull().references(() => productVariants.id),

  lossType:         lossTypeEnum("loss_type").notNull(),
  qtyUnitsLost:     integer("qty_units_lost").notNull(),
  estimatedValue:   numeric("estimated_value", { precision: 12, scale: 2 }).default("0"),

  // Obligatoire — motif détaillé
  reason:           text("reason").notNull(),

  // Doit être un admin — vérifié côté applicatif
  declaredBy:       uuid("declared_by").notNull().references(() => users.id),
  declaredAt:       timestamp("declared_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  qtyPositive: check("loss_qty_positive", sql`${t.qtyUnitsLost} > 0`),
}));

export const stockLossesRelations = relations(stockLosses, ({ one }) => ({
  tenant:      one(tenants, { fields: [stockLosses.tenantId], references: [tenants.id] }),
  variant:     one(productVariants, { fields: [stockLosses.variantId], references: [productVariants.id] }),
  declaredByUser: one(users, { fields: [stockLosses.declaredBy], references: [users.id] }),
}));

export type StockLoss    = typeof stockLosses.$inferSelect;
export type NewStockLoss = typeof stockLosses.$inferInsert;