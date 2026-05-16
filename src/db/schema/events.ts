import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";

export const eventTypeEnum = pgEnum("event_type", [
  "SALE_CREATED",
  "SALE_CANCELLED",
  "ITEM_RETURNED",
  "ITEM_ADDED",
  "ITEM_REPLACED",
  "SALE_ADJUSTMENT_CREATED",
  "STOCK_DECREASED",
  "STOCK_INCREASED",
  "STOCK_ADJUSTED",
  "STOCK_LOSS_DECLARED",
  "CASH_SESSION_OPENED",
  "CASH_SESSION_CLOSED",
  "PRODUCT_CREATED",
  "PRODUCT_UPDATED",
  "PRODUCT_DEACTIVATED",
  "USER_CREATED",
  "USER_DEACTIVATED",
  "USER_REACTIVATED",
  "TENANT_SETTINGS_UPDATED",
]);

export const events = pgTable("events", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tenantId:     uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  eventType:    eventTypeEnum("event_type").notNull(),

  // Payload complet — permet la reconstruction de l'état
  payload:      jsonb("payload").default({}).notNull(),

  triggeredBy:  uuid("triggered_by").references(() => users.id),

  // Références optionnelles aux entités concernées
  saleId:       uuid("sale_id"),
  variantId:    uuid("variant_id"),
  userId:       uuid("user_id"),
  adjustmentId: uuid("adjustment_id"),

  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const eventsRelations = relations(events, ({ one }) => ({
  tenant:       one(tenants, { fields: [events.tenantId], references: [tenants.id] }),
  triggeredByUser: one(users, { fields: [events.triggeredBy], references: [users.id] }),
}));

export type Event    = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;