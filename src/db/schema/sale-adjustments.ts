import {
  pgTable,
  uuid,
  numeric,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sales } from "./sales";
import { tenants } from "./tenants";
import { users } from "./users";
import { saleAdjustmentItems } from "./sale-adjustment-items";

export const adjustmentTypeEnum = pgEnum("adjustment_type", [
  "partial_return",     // retour partiel de produits
  "full_return",        // retour complet de la vente
  "exchange",           // échange de produits
  "price_correction",   // correction de prix (patron uniquement)
]);

export const saleAdjustments = pgTable("sale_adjustments", {
  id:                     uuid("id").primaryKey().defaultRandom(),
  tenantId:               uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  saleId:                 uuid("sale_id").notNull().references(() => sales.id),

  adjustmentType:         adjustmentTypeEnum("adjustment_type").notNull(),

  // OBLIGATOIRE — motif de l'ajustement (traçabilité)
  reason:                 text("reason").notNull(),

  // Différence financière
  // positif = remboursement dû / négatif = complément dû
  priceDifference:        numeric("price_difference", { precision: 12, scale: 2 }).default("0"),
  refundConfirmed:        boolean("refund_confirmed").default(false),
  extraPaymentConfirmed:  boolean("extra_payment_confirmed").default(false),

  createdBy:              uuid("created_by").notNull().references(() => users.id),
  createdAt:              timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const saleAdjustmentsRelations = relations(saleAdjustments, ({ one, many }) => ({
  tenant:   one(tenants, { fields: [saleAdjustments.tenantId], references: [tenants.id] }),
  sale:     one(sales, { fields: [saleAdjustments.saleId], references: [sales.id] }),
  createdByUser: one(users, { fields: [saleAdjustments.createdBy], references: [users.id] }),
  items:    many(saleAdjustmentItems),
}));

export type SaleAdjustment    = typeof saleAdjustments.$inferSelect;
export type NewSaleAdjustment = typeof saleAdjustments.$inferInsert;