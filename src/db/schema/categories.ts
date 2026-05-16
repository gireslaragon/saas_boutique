import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { products } from "./products";

export const categories = pgTable("categories", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tenantId:     uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  name:         varchar("name", { length: 100 }).notNull(),
  color:        varchar("color", { length: 7 }).default("#2E75B6"),
  icon:         varchar("icon", { length: 50 }),
  sortOrder:    integer("sort_order").default(0),
  isDefault:    boolean("is_default").default(false),   // 3 catégories créées auto à l'onboarding

  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueNamePerTenant: unique("uq_categories_name_tenant").on(t.tenantId, t.name),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant:   one(tenants, { fields: [categories.tenantId], references: [tenants.id] }),
  products: many(products),
}));

export type Category    = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;