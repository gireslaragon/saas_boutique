import { NextResponse } from "next/server";

import { db } from "@/db";
import { notifications } from "@/db/schema/notifications";

import { lt } from "drizzle-orm";

export async function GET(request: Request) {

  const secret = request.headers.get("x-cron-secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  await db
    .delete(notifications)
    .where(
      lt(
        notifications.expiresAt,
        new Date()
      )
    );

  return NextResponse.json({
    success: true,
  });
}