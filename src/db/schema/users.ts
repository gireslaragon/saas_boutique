import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { sales } from "./sales";
import { cashSessions } from "./cash-sessions";
import { saleAdjustments } from "./sale-adjustments";
import { stockLosses } from "./stock-losses";
import { restockings } from "./restockings";
import { unique } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "cashier"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);

export const users = pgTable("users", {
  id:                     uuid("id").primaryKey().defaultRandom(),
  tenantId:               uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  firstName:              varchar("first_name", { length: 100 }).notNull(),
  lastName:               varchar("last_name", { length: 100 }).notNull(),
  email:                  varchar("email", { length: 255 }).notNull(),
  passwordHash:           text("password_hash").notNull(),

  role:                   userRoleEnum("role").default("cashier").notNull(),
  status:                 userStatusEnum("status").default("active").notNull(),

  // JWT
  refreshTokenHash:       text("refresh_token_hash"),
  refreshTokenExpiresAt:  timestamp("refresh_token_expires_at", { withTimezone: true }),

  // RH
  hiredAt:                timestamp("hired_at", { withTimezone: true }).defaultNow(),
  deactivatedAt:          timestamp("deactivated_at", { withTimezone: true }),
  deactivationReason:     text("deactivation_reason"),

  lastLoginAt:            timestamp("last_login_at", { withTimezone: true }),
  createdAt:              timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:              timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueEmailPerTenant: unique("uq_users_email_tenant").on(t.tenantId, t.email),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant:           one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  sales:            many(sales),
  cashSessions:     many(cashSessions),
  adjustments:      many(saleAdjustments),
  stockLosses:      many(stockLosses),
  restockings:      many(restockings),
}));

export type User    = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;