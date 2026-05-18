import { NextResponse } from "next/server";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { purgeExpiredNotifications } from "@/repositories/notification.repository";

export async function POST() {
  const auth = await guardAdminAction();
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    await purgeExpiredNotifications();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Purge failed" }, { status: 500 });
  }
}
