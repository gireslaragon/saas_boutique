import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { platformAdmins } from "./platform-admins";
import { users } from "./users";
import { categories } from "./categories";
import { products } from "./products";
import { sales } from "./sales";
import { events } from "./events";
import { tenantSubscriptions } from "./tenant-subscriptions";
import { cashSessions } from "./cash-sessions";
import { stockLosses } from "./stock-losses";
import { groupInvoices } from "./group-invoices";

export const tenants = pgTable("tenants", {
  id:                       uuid("id").primaryKey().defaultRandom(),

  // Infos boutique
  name:                     varchar("name", { length: 150 }).notNull(),
  slug:                     varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl:                  text("logo_url"),
  slogan:                   varchar("slogan", { length: 255 }),
  phone:                    varchar("phone", { length: 30 }),
  address:                  text("address"),
  city:                     varchar("city", { length: 100 }),
  country:                  varchar("country", { length: 100 }).default("Cameroun"),

  // Config financière
  currency:                 varchar("currency", { length: 10 }).default("FCFA"),
  currencySymbol:           varchar("currency_symbol", { length: 5 }).default("F"),

  // Config facturation
  invoicePrefix:            varchar("invoice_prefix", { length: 20 }).default("FAC"),
  invoiceCounter:           integer("invoice_counter").default(0).notNull(),
  groupInvoiceThreshold:    integer("group_invoice_threshold").default(500),

  // Config sécurité
  sessionTimeoutMinutes:    integer("session_timeout_minutes").default(30),

  // Abonnement (géré via tenant_subscriptions)
  isActive:                 boolean("is_active").default(true).notNull(),

  // Super admin
  suspendedAt:              timestamp("suspended_at", { withTimezone: true }),
  suspendedReason:          text("suspended_reason"),
  suspendedBy:              uuid("suspended_by").references(() => platformAdmins.id),
  onboardingCompleted:      boolean("onboarding_completed").default(false),
  createdByAdmin:           uuid("created_by_admin").references(() => platformAdmins.id),

  createdAt:                timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:                timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  subscription:   one(tenantSubscriptions, { fields: [tenants.id], references: [tenantSubscriptions.tenantId] }),
  suspendedByAdmin: one(platformAdmins, { fields: [tenants.suspendedBy], references: [platformAdmins.id] }),
  users:          many(users),
  categories:     many(categories),
  products:       many(products),
  sales:          many(sales),
  events:         many(events),
  groupInvoices:  many(groupInvoices),
  cashSessions:   many(cashSessions),
  stockLosses:    many(stockLosses),
}));

export type Tenant    = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;