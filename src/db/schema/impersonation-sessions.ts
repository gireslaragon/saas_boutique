import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { platformAdmins } from "./platform-admins";
import { tenants } from "./tenants";

export const impersonationAccessEnum = pgEnum("impersonation_access", [
  "read_only",
  "full",
]);

export const impersonationSessions = pgTable("impersonation_sessions", {
  id:           uuid("id").primaryKey().defaultRandom(),

  adminId:      uuid("admin_id").notNull().references(() => platformAdmins.id),
  tenantId:     uuid("tenant_id").notNull().references(() => tenants.id),

  reason:       text("reason").notNull(),
  ticketRef:    varchar("ticket_ref", { length: 100 }),

  startedAt:    timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt:      timestamp("ended_at", { withTimezone: true }),

  accessLevel:  impersonationAccessEnum("access_level").default("read_only").notNull(),
  ipAddress:    varchar("ip_address", { length: 45 }),
});

export const impersonationSessionsRelations = relations(impersonationSessions, ({ one }) => ({
  admin:  one(platformAdmins, { fields: [impersonationSessions.adminId], references: [platformAdmins.id] }),
  tenant: one(tenants, { fields: [impersonationSessions.tenantId], references: [tenants.id] }),
}));

export type ImpersonationSession    = typeof impersonationSessions.$inferSelect;
export type NewImpersonationSession = typeof impersonationSessions.$inferInsert;