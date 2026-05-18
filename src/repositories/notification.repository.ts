import { db } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { lt } from "drizzle-orm";

export type NewNotificationInput = {
	tenantId: string;
	userId?: string | null;
	type: string;
	title: string;
	message: string;
	data?: unknown;
	expiresAt?: Date;
};

/**
 * Create a notification. If `expiresAt` is not provided, default to now + 7 days.
 */
export async function createNotification(input: NewNotificationInput) {
	const expires = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	const [row] = await db.insert(notifications).values({
		tenantId: input.tenantId,
		userId: input.userId ?? null,
		type: input.type,
		title: input.title,
		message: input.message,
		data: input.data ?? null,
		expiresAt: expires,
		createdAt: new Date(),
	}).returning({ id: notifications.id });

	return { success: true as const, data: { id: row.id } };
}

/**
 * Purge expired notifications (expires_at < now).
 * Intended to be called from a daily cron job.
 */
export async function purgeExpiredNotifications() {
	await db.delete(notifications).where(lt(notifications.expiresAt, new Date()));
	return { success: true as const };
}

