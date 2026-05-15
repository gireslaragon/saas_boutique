import {
  pgTable,
  uuid,
  numeric,
  varchar,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { cashSessions } from "./cash-sessions";
import { saleItems } from "./sale-items";
import { saleAdjustments } from "./sale-adjustments";
import { stockMovements } from "./stock-movements";
import { groupInvoices } from "./group-invoices";

export const saleStatusEnum = pgEnum("sale_status", [
  "completed",
  "cancelled",
  "adjusted",
]);

export const sales = pgTable("sales", {
  id:               uuid("id").primaryKey().defaultRandom(),
  tenantId:         uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  cashierId:        uuid("cashier_id").notNull().references(() => users.id),
  cashSessionId:    uuid("cash_session_id").references(() => cashSessions.id),

  status:           saleStatusEnum("status").default("completed").notNull(),

  // Facturation
  // NULL si achat sous seuil → rejoint une group_invoice
  invoiceNumber:    varchar("invoice_number", { length: 50 }),
  groupInvoiceId:   uuid("group_invoice_id").references(() => groupInvoices.id),

  // Montants figés à la vente — JAMAIS modifiés
  subtotal:         numeric("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  totalAmount:      numeric("total_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  amountReceived:   numeric("amount_received", { precision: 12, scale: 2 }).default("0").notNull(),
  changeGiven:      numeric("change_given", { precision: 12, scale: 2 }).default("0").notNull(),

  // Annulation
  cancelledAt:      timestamp("cancelled_at", { withTimezone: true }),
  cancelledBy:      uuid("cancelled_by").references(() => users.id),
  cancellationReason: text("cancellation_reason"),

  notes:            text("notes"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const salesRelations = relations(sales, ({ one, many }) => ({
  tenant:         one(tenants, { fields: [sales.tenantId], references: [tenants.id] }),
  cashier:        one(users, { fields: [sales.cashierId], references: [users.id] }),
  cancelledByUser: one(users, { fields: [sales.cancelledBy], references: [users.id], relationName: "cancelledBy" }),
  cashSession:    one(cashSessions, { fields: [sales.cashSessionId], references: [cashSessions.id] }),
  groupInvoice:   one(groupInvoices, { fields: [sales.groupInvoiceId], references: [groupInvoices.id] }),
  items:          many(saleItems),
  adjustments:    many(saleAdjustments),
  stockMovements: many(stockMovements),
}));

export type Sale    = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;