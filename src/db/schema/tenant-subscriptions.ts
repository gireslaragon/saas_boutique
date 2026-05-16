import {
  pgTable,
  uuid,
  integer,
  numeric,
  varchar,
  text,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
// import { tenants } from "./tenants";
import { platformAdmins } from "./platform-admins";
import { tenants } from "./tenants";

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "starter",
  "pro",
  "enterprise",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trial",
  "suspended",
  "cancelled",
  "expired",
]);

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  tenantId:             uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  plan:                 subscriptionPlanEnum("plan").default("free").notNull(),
  status:               subscriptionStatusEnum("status").default("trial").notNull(),

  trialEndsAt:          timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart:   timestamp("current_period_start", { withTimezone: true }).defaultNow(),
  currentPeriodEnd:     timestamp("current_period_end", { withTimezone: true }),
  cancelledAt:          timestamp("cancelled_at", { withTimezone: true }),

  // Limites par plan (dénormalisées pour lecture rapide)
  maxProducts:          integer("max_products").default(50),
  maxUsers:             integer("max_users").default(2),
  maxCategories:        integer("max_categories").default(5),

  // Paiement
  monthlyPrice:         numeric("monthly_price", { precision: 10, scale: 2 }).default("0"),
  currency:             varchar("currency", { length: 10 }).default("FCFA"),
  lastPaymentAt:        timestamp("last_payment_at", { withTimezone: true }),
  nextPaymentAt:        timestamp("next_payment_at", { withTimezone: true }),

  updatedByAdmin:       uuid("updated_by_admin").references(() => platformAdmins.id),
  notes:                text("notes"),

  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueTenant: unique("uq_tenant_subscription").on(t.tenantId),
}));

export const tenantSubscriptionsRelations = relations(tenantSubscriptions, ({ one }) => ({
  tenant:       one(tenants, { fields: [tenantSubscriptions.tenantId], references: [tenants.id] }),
  updatedBy:    one(platformAdmins, { fields: [tenantSubscriptions.updatedByAdmin], references: [platformAdmins.id] }),
}));

export type TenantSubscription    = typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscription = typeof tenantSubscriptions.$inferInsert;