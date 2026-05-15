import {
  pgTable,
  uuid,
  numeric,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { sales } from "./sales";

export const cashSessionStatusEnum = pgEnum("cash_session_status", ["open", "closed"]);

export const cashSessions = pgTable("cash_sessions", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  tenantId:             uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  cashierId:            uuid("cashier_id").notNull().references(() => users.id),

  status:               cashSessionStatusEnum("status").default("open").notNull(),

  // Ouverture
  openedAt:             timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  openingAmount:        numeric("opening_amount", { precision: 12, scale: 2 }).default("0").notNull(),

  // Fermeture
  closedAt:             timestamp("closed_at", { withTimezone: true }),
  actualAmount:         numeric("actual_amount", { precision: 12, scale: 2 }),
  notes:                text("notes"),

  // Calculés à la fermeture
  totalSalesAmount:     numeric("total_sales_amount", { precision: 12, scale: 2 }).default("0"),
  totalRefundsAmount:   numeric("total_refunds_amount", { precision: 12, scale: 2 }).default("0"),
  expectedAmount:       numeric("expected_amount", { precision: 12, scale: 2 }),
  difference:           numeric("difference", { precision: 12, scale: 2 }),

  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cashSessionsRelations = relations(cashSessions, ({ one, many }) => ({
  tenant:   one(tenants, { fields: [cashSessions.tenantId], references: [tenants.id] }),
  cashier:  one(users, { fields: [cashSessions.cashierId], references: [users.id] }),
  sales:    many(sales),
}));

export type CashSession    = typeof cashSessions.$inferSelect;
export type NewCashSession = typeof cashSessions.$inferInsert;