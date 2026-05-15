import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { productVariants } from "./product-variants";
import { tenants } from "./tenants";

export const stockSnapshots = pgTable("stock_snapshots", {
  id:               uuid("id").primaryKey().defaultRandom(),
  tenantId:         uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  variantId:        uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),

  // Stock en unités individuelles — SOURCE DE VÉRITÉ
  qtyUnits:         integer("qty_units").default(0).notNull(),

  // Dernier mouvement (pour affichage rapide)
  lastMovementAt:   timestamp("last_movement_at", { withTimezone: true }).defaultNow(),
  lastMovementType: varchar("last_movement_type", { length: 50 }),

  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueVariant: unique("uq_stock_variant").on(t.variantId),
}));

export const stockSnapshotsRelations = relations(stockSnapshots, ({ one }) => ({
  tenant:   one(tenants, { fields: [stockSnapshots.tenantId], references: [tenants.id] }),
  variant:  one(productVariants, { fields: [stockSnapshots.variantId], references: [productVariants.id] }),
}));

export type StockSnapshot    = typeof stockSnapshots.$inferSelect;
export type NewStockSnapshot = typeof stockSnapshots.$inferInsert;