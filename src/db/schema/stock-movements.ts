import {
  pgTable,
  uuid,
  integer,
  timestamp,
  pgEnum,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { products } from "./products";
import { users } from "./users";
import { sales } from "./sales";
import { saleAdjustments } from "./sale-adjustments";

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "sale",
  "return",
  "cancel",
  "restock",
  "loss",
  "adjustment",
  "exchange_out",
  "exchange_in",
]);

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),

  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  // Mouvement lié AU PRODUIT
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),

  movementType: stockMovementTypeEnum("movement_type").notNull(),

  qtyUnitsDelta:  integer("qty_units_delta").notNull(),
  qtyUnitsBefore: integer("qty_units_before").notNull(),
  qtyUnitsAfter:  integer("qty_units_after").notNull(),

  reason:       text("reason"),

  saleId:       uuid("sale_id"),
  adjustmentId: uuid("adjustment_id"),

  createdBy:    uuid("created_by").references(() => users.id),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  tenant:        one(tenants, { fields: [stockMovements.tenantId], references: [tenants.id] }),
  product:       one(products, { fields: [stockMovements.productId], references: [products.id] }),
  sale:          one(sales, { fields: [stockMovements.saleId], references: [sales.id] }),
  adjustment:    one(saleAdjustments, { fields: [stockMovements.adjustmentId], references: [saleAdjustments.id] }),
  createdByUser: one(users, { fields: [stockMovements.createdBy], references: [users.id] }),
}));

export type StockMovement    = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;