import {
  pgTable,
  uuid,
  numeric,
  integer,
  date,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { sales } from "./sales";

export const groupInvoiceStatusEnum = pgEnum("group_invoice_status", ["open", "closed"]);

export const groupInvoices = pgTable("group_invoices", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  tenantId:           uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  invoiceDate:        date("invoice_date").notNull().defaultNow(),
  status:             groupInvoiceStatusEnum("status").default("open").notNull(),

  // Totaux cumulés (mis à jour à chaque ajout de vente)
  totalTransactions:  integer("total_transactions").default(0),
  totalAmount:        numeric("total_amount", { precision: 12, scale: 2 }).default("0"),

  closedAt:           timestamp("closed_at", { withTimezone: true }),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Une seule facture groupée ouverte par jour par tenant
  uniquePerDay: unique("uq_group_invoice_day").on(t.tenantId, t.invoiceDate),
}));

export const groupInvoicesRelations = relations(groupInvoices, ({ one, many }) => ({
  tenant: one(tenants, { fields: [groupInvoices.tenantId], references: [tenants.id] }),
  sales:  many(sales),
}));

export type GroupInvoice    = typeof groupInvoices.$inferSelect;
export type NewGroupInvoice = typeof groupInvoices.$inferInsert;