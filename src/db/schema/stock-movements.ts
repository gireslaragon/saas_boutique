import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { productVariants } from "./product-variants";
import { tenants } from "./tenants";
import { users } from "./users";
import { sales } from "./sales";
import { saleAdjustments } from "./sale-adjustments";

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "sale",           // déduction après vente
  "return",         // retour client
  "restock",        // approvisionnement
  "loss",           // perte (casse, vol, péremption)
  "adjustment",     // correction manuelle (patron uniquement)
  "exchange_out",   // sortie lors d'un échange
  "exchange_in",    // entrée lors d'un échange
  "cancel",         // annulation de vente → réintégration stock
]);

export const stockMovements = pgTable("stock_movements", {
  id:               uuid("id").primaryKey().defaultRandom(),
  tenantId:         uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  variantId:        uuid("variant_id").notNull().references(() => productVariants.id),

  movementType:     stockMovementTypeEnum("movement_type").notNull(),

  // Delta : positif = entrée / négatif = sortie
  qtyUnitsDelta:    integer("qty_units_delta").notNull(),
  qtyUnitsBefore:   integer("qty_units_before").notNull(),
  qtyUnitsAfter:    integer("qty_units_after").notNull(),

  // Références optionnelles
  saleId:           uuid("sale_id").references(() => sales.id),
  adjustmentId:     uuid("adjustment_id").references(() => saleAdjustments.id),

  reason:           text("reason"),
  notes:            text("notes"),

  createdBy:        uuid("created_by").notNull().references(() => users.id),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  tenant:     one(tenants, { fields: [stockMovements.tenantId], references: [tenants.id] }),
  variant:    one(productVariants, { fields: [stockMovements.variantId], references: [productVariants.id] }),
  sale:       one(sales, { fields: [stockMovements.saleId], references: [sales.id] }),
  adjustment: one(saleAdjustments, { fields: [stockMovements.adjustmentId], references: [saleAdjustments.id] }),
  createdByUser: one(users, { fields: [stockMovements.createdBy], references: [users.id] }),
}));

export type StockMovement    = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;