import {
  pgTable,
  uuid,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { products } from "./products";
import { stockMovementTypeEnum } from "./stock-movements";

export const stockSnapshots = pgTable("stock_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),

  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  // Stock lié AU PRODUIT (et non plus à la variante)
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),

  // Toujours en unités de base
  qtyUnits: integer("qty_units").notNull().default(0),

  lastMovementType: stockMovementTypeEnum("last_movement_type"),

  lastMovementAt: timestamp("last_movement_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stockSnapshotsRelations = relations(stockSnapshots, ({ one }) => ({
  tenant: one(tenants, { fields: [stockSnapshots.tenantId], references: [tenants.id] }),
  product: one(products, { fields: [stockSnapshots.productId], references: [products.id] }),
}));

export type StockSnapshot    = typeof stockSnapshots.$inferSelect;
export type NewStockSnapshot = typeof stockSnapshots.$inferInsert;