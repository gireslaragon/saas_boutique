import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";
import { users } from "./users";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    userId: uuid("user_id")
      .references(() => users.id, {
        onDelete: "set null",
      }),

    type: varchar("type", { length: 50 })
      .notNull(),

    title: varchar("title", { length: 255 })
      .notNull(),

    message: text("message")
      .notNull(),

    data: jsonb("data"),

    readAt: timestamp("read_at", {
      mode: "date",
    }),

    expiresAt: timestamp("expires_at", {
      mode: "date",
    }).notNull(),

    createdAt: timestamp("created_at", {
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdx: index("notifications_tenant_idx")
      .on(table.tenantId),

    readIdx: index("notifications_read_idx")
      .on(table.readAt),

    expiresIdx: index("notifications_expires_idx")
      .on(table.expiresAt),

    createdIdx: index("notifications_created_idx")
      .on(table.createdAt),
  })
);