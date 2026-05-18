import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { guardAdminAction } from "@/lib/auth/role-guards";

import {
  eq,
  and,
  isNull,
} from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
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

  const resolvedParams = await params;
  const { id } = resolvedParams ?? {};
  const tenantId = auth.data.tenantId;

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing notification id" }, { status: 400 });
  }

  await db
    .update(notifications)
    .set({
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.tenantId, tenantId),
        isNull(notifications.readAt)
      )
    );

  return NextResponse.json({
    success: true,
  });
}