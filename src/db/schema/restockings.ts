import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  text,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { productVariants } from "./product-variants";
import { users } from "./users";

export const restockings = pgTable("restockings", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  tenantId:           uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  variantId:          uuid("variant_id").notNull().references(() => productVariants.id),

  qtyUnitsAdded:      integer("qty_units_added").notNull(),
  costPricePerUnit:   numeric("cost_price_per_unit", { precision: 12, scale: 2 }).default("0").notNull(),
  totalCost:          numeric("total_cost", { precision: 12, scale: 2 }).default("0").notNull(),

  supplier:           varchar("supplier", { length: 200 }),
  notes:              text("notes"),

  createdBy:          uuid("created_by").notNull().references(() => users.id),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  qtyPositive: check("restock_qty_positive", sql`${t.qtyUnitsAdded} > 0`),
}));

export const restockingsRelations = relations(restockings, ({ one }) => ({
  tenant:   one(tenants, { fields: [restockings.tenantId], references: [tenants.id] }),
  variant:  one(productVariants, { fields: [restockings.variantId], references: [productVariants.id] }),
  createdByUser: one(users, { fields: [restockings.createdBy], references: [users.id] }),
}));

export type Restocking    = typeof restockings.$inferSelect;
export type NewRestocking = typeof restockings.$inferInsert;