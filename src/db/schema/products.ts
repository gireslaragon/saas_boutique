import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { categories } from "./categories";
import { productVariants } from "./product-variants";

export const products = pgTable("products", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tenantId:     uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId:   uuid("category_id").references(() => categories.id, { onDelete: "set null" }),

  name:         varchar("name", { length: 200 }).notNull(),
  description:  text("description"),
  imageUrl:     text("image_url"),
  barcode:      varchar("barcode", { length: 100 }),

  // Prix d'achat — pour le calcul du bénéfice
  costPrice:    numeric("cost_price", { precision: 12, scale: 2 }).default("0").notNull(),

  isActive:     boolean("is_active").default(true).notNull(),

  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant:   one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
}));

export type Product    = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;