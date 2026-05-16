import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { platformAdmins } from "./platform-admins";
import { tenants } from "./tenants";

export const notificationTypeEnum = pgEnum("notification_type", [
  "info",
  "warning",
  "maintenance",
  "feature",
  "billing",
]);

export const notificationTargetEnum = pgEnum("notification_target", [
  "all",
  "plan_free",
  "plan_starter",
  "plan_pro",
  "plan_enterprise",
  "specific",
]);

export const platformNotifications = pgTable("platform_notifications", {
  id:                 uuid("id").primaryKey().defaultRandom(),

  title:              varchar("title", { length: 200 }).notNull(),
  message:            text("message").notNull(),
  notificationType:   notificationTypeEnum("notification_type").default("info").notNull(),

  target:             notificationTargetEnum("target").default("all").notNull(),
  targetTenantId:     uuid("target_tenant_id").references(() => tenants.id),

  scheduledAt:        timestamp("scheduled_at", { withTimezone: true }).defaultNow(),
  expiresAt:          timestamp("expires_at", { withTimezone: true }),
  isPublished:        boolean("is_published").default(false).notNull(),

  createdBy:          uuid("created_by").notNull().references(() => platformAdmins.id),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const platformNotificationsRelations = relations(platformNotifications, ({ one }) => ({
  creator:      one(platformAdmins, { fields: [platformNotifications.createdBy], references: [platformAdmins.id] }),
  targetTenant: one(tenants, { fields: [platformNotifications.targetTenantId], references: [tenants.id] }),
}));

export type PlatformNotification    = typeof platformNotifications.$inferSelect;
export type NewPlatformNotification = typeof platformNotifications.$inferInsert;