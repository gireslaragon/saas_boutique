import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { guardAdminAction } from "@/lib/auth/role-guards";

import {
  eq,
  isNull,
  desc,
  sql,
  and,
  or,
  gte,
} from "drizzle-orm";

export async function GET() {
  const auth = await guardAdminAction();

  if (!auth.success) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error,
      },
      { status: 401 }
    );
  }

  const tenantId = auth.data.tenantId;
  const now = new Date();

  // ─── Notifications visibles ─────────────────────────────────────────────

  const rows = await db
    .select({
      id:        notifications.id,
      title:     notifications.title,
      message:   notifications.message,
      data:      notifications.data,
      readAt:    notifications.readAt,
      expiresAt: notifications.expiresAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),

        or(
          isNull(notifications.expiresAt),
          gte(notifications.expiresAt, now)
        )
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  // ─── Nombre de notifications non lues ──────────────────────────────────

  const unreadCountRow = await db
    .select({
      cnt: sql<number>`count(*)`.as("cnt"),
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),

        isNull(notifications.readAt),

        or(
          isNull(notifications.expiresAt),
          gte(notifications.expiresAt, now)
        )
      )
    );

  const unread = Number(unreadCountRow[0]?.cnt ?? 0);

  return NextResponse.json({
    success: true,

    data: {
      unreadCount: unread,

      notifications: rows.map((r) => ({
        id:         r.id,
        title:      r.title,
        message:    r.message,
        data:       r.data,

        readAt: r.readAt
          ? r.readAt.toISOString()
          : null,

        expiresAt: r.expiresAt
          ? r.expiresAt.toISOString()
          : null,

        createdAt: r.createdAt.toISOString(),
      })),
    },
  });
}