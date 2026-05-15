"use server";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { platformAdmins } from "@/db/schema/platform-admins";
import { eq } from "drizzle-orm";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  signSuperAdminToken,
} from "@/lib/auth/jwt";
import { getRefreshToken, setAuthCookies } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import type { ActionResult } from "@/lib/auth/role-guards";

export async function refreshTokenAction(): Promise<ActionResult<{ refreshed: boolean }>> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return { success: false, error: "Pas de refresh token", code: "NO_REFRESH_TOKEN" };
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return { success: false, error: "Refresh token invalide", code: "INVALID_REFRESH_TOKEN" };
  }

  // ── Tenant user ───────────────────────────────────────────────────────────
  if (payload.scope === "tenant") {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!user || user.status !== "active" || !user.refreshTokenHash) {
      return { success: false, error: "Utilisateur invalide", code: "INVALID_USER" };
    }

    // Vérifie que le refresh token correspond au hash stocké
    const tokenValid = await verifyPassword(refreshToken, user.refreshTokenHash);
    if (!tokenValid) {
      return { success: false, error: "Refresh token révoqué", code: "REVOKED" };
    }

    // Génère de nouveaux tokens (rotation)
    const newAccessToken  = await signAccessToken({
      sub:      user.id,
      tenantId: user.tenantId,
      role:     user.role,
      email:    user.email,
    });
    const newRefreshToken = await signRefreshToken(user.id, "tenant");
    const newRefreshHash  = await hashPassword(newRefreshToken);

    await db
      .update(users)
      .set({
        refreshTokenHash:      newRefreshHash,
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updatedAt:             new Date(),
      })
      .where(eq(users.id, user.id));

    await setAuthCookies(newAccessToken, newRefreshToken);
    return { success: true, data: { refreshed: true } };
  }

  // ── Platform admin ────────────────────────────────────────────────────────
  if (payload.scope === "platform") {
    const admin = await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.id, payload.sub))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!admin || !admin.isActive || !admin.refreshTokenHash) {
      return { success: false, error: "Admin invalide", code: "INVALID_ADMIN" };
    }

    const tokenValid = await verifyPassword(refreshToken, admin.refreshTokenHash);
    if (!tokenValid) {
      return { success: false, error: "Refresh token révoqué", code: "REVOKED" };
    }

    const newAccessToken  = await signSuperAdminToken({
      sub:         admin.id,
      role:        "super_admin",
      accessLevel: admin.accessLevel,
      email:       admin.email,
    });
    const newRefreshToken = await signRefreshToken(admin.id, "platform");
    const newRefreshHash  = await hashPassword(newRefreshToken);

    await db
      .update(platformAdmins)
      .set({
        refreshTokenHash:      newRefreshHash,
        refreshTokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        updatedAt:             new Date(),
      })
      .where(eq(platformAdmins.id, admin.id));

    await setAuthCookies(newAccessToken, newRefreshToken);
    return { success: true, data: { refreshed: true } };
  }

  return { success: false, error: "Scope invalide", code: "INVALID_SCOPE" };
}