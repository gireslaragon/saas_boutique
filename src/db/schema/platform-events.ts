import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { platformAdmins } from "./platform-admins";
import { tenants } from "./tenants";

export const platformEventTypeEnum = pgEnum("platform_event_type", [
  "TENANT_CREATED",
  "TENANT_ACTIVATED",
  "TENANT_SUSPENDED",
  "TENANT_DELETED",
  "SUBSCRIPTION_CHANGED",
  "SUBSCRIPTION_CANCELLED",
  "ADMIN_LOGIN",
  "ADMIN_IMPERSONATED_TENANT",
  "PLATFORM_ADMIN_CREATED",
  "PLATFORM_ADMIN_DEACTIVATED",
  "USER_PASSWORD_RESET_FORCED",
  "PLAN_LIMIT_OVERRIDE",
]);

export const platformEvents = pgTable("platform_events", {
  id:           uuid("id").primaryKey().defaultRandom(),

  eventType:    platformEventTypeEnum("event_type").notNull(),
  payload:      jsonb("payload").default({}).notNull(),

  adminId:      uuid("admin_id").notNull().references(() => platformAdmins.id),
  tenantId:     uuid("tenant_id").references(() => tenants.id),

  ipAddress:    varchar("ip_address", { length: 45 }),
  userAgent:    text("user_agent"),

  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const platformEventsRelations = relations(platformEvents, ({ one }) => ({
  admin:  one(platformAdmins, { fields: [platformEvents.adminId], references: [platformAdmins.id] }),
  tenant: one(tenants, { fields: [platformEvents.tenantId], references: [tenants.id] }),
}));

export type PlatformEvent    = typeof platformEvents.$inferSelect;
export type NewPlatformEvent = typeof platformEvents.$inferInsert;