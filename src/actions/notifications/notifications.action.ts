"use server";

import { db } from "@/db";
import { platformNotifications } from "@/db/schema/platform-notifications";
import { tenantSubscriptions } from "@/db/schema/tenant-subscriptions";
import { guardAdminAction } from "@/lib/auth/role-guards";
import { eq, and, lte, gte, or, isNull } from "drizzle-orm";

/**
 * Récupère les notifications visibles par le patron de cette boutique.
 * Une notification est visible si :
 *  - target = 'all'
 *  - target = 'plan_xxx' ET le tenant est sur ce plan
 *  - target = 'specific' ET target_tenant_id = tenantId
 *  - is_published = true
 *  - scheduled_at <= maintenant
 *  - expires_at est NULL ou > maintenant
 */
export async function getTenantNotificationsAction() {
  const auth = await guardAdminAction();
  if (!auth.success) return auth;
  const { tenantId } = auth.data;

  // Récupère le plan du tenant
  const [sub] = await db
    .select({ plan: tenantSubscriptions.plan })
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.tenantId, tenantId))
    .limit(1);

  const plan = sub?.plan ?? "free";
  const planTarget = `plan_${plan}` as
    | "plan_free" | "plan_starter" | "plan_pro" | "plan_enterprise";

  const now = new Date();

  const rows = await db
    .select({
      id:               platformNotifications.id,
      title:            platformNotifications.title,
      message:          platformNotifications.message,
      notificationType: platformNotifications.notificationType,
      scheduledAt:      platformNotifications.scheduledAt,
      expiresAt:        platformNotifications.expiresAt,
    })
    .from(platformNotifications)
    .where(and(
      eq(platformNotifications.isPublished, true),
      lte(platformNotifications.scheduledAt, now),
      or(
        isNull(platformNotifications.expiresAt),
        gte(platformNotifications.expiresAt, now),
      ),
      or(
        eq(platformNotifications.target, "all"),
        eq(platformNotifications.target, planTarget),
        and(
          eq(platformNotifications.target, "specific"),
          eq(platformNotifications.targetTenantId, tenantId),
        ),
      ),
    ))
    .orderBy(platformNotifications.scheduledAt);

  return {
    success: true as const,
    data: rows.map((r) => ({
      id:               r.id,
      title:            r.title,
      message:          r.message,
      notificationType: r.notificationType,
      scheduledAt:      r.scheduledAt?.toISOString() ?? "",
      expiresAt:        r.expiresAt?.toISOString()   ?? null,
    })),
  };
}