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
import { platformEvents } from "./platform-events";
import { impersonationSessions } from "./impersonation-sessions";

export const platformAdminAccessLevelEnum = pgEnum("platform_admin_access_level", [
  "super",    // accès total plateforme
  "support",  // lecture seule + impersonation
  "finance",  // stats financières SaaS uniquement
]);

export const platformAdmins = pgTable("platform_admins", {
  id:                     uuid("id").primaryKey().defaultRandom(),

  firstName:              varchar("first_name", { length: 100 }).notNull(),
  lastName:               varchar("last_name", { length: 100 }).notNull(),
  email:                  varchar("email", { length: 255 }).notNull().unique(),
  passwordHash:           text("password_hash").notNull(),
  isActive:               boolean("is_active").default(true).notNull(),
  accessLevel:            platformAdminAccessLevelEnum("access_level").default("super").notNull(),

  // JWT refresh token
  refreshTokenHash:       text("refresh_token_hash"),
  refreshTokenExpiresAt:  timestamp("refresh_token_expires_at", { withTimezone: true }),

  lastLoginAt:            timestamp("last_login_at", { withTimezone: true }),
  createdAt:              timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:              timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const platformAdminsRelations = relations(platformAdmins, ({ many }) => ({
  platformEvents:         many(platformEvents),
  impersonationSessions:  many(impersonationSessions),
}));

export type PlatformAdmin    = typeof platformAdmins.$inferSelect;
export type NewPlatformAdmin = typeof platformAdmins.$inferInsert;