"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { platformAdmins } from "@/db/schema/platform-admins";
import { loginSchema, type LoginInput } from "@/lib/validators/auth.schema";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken, signSuperAdminToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import type { ActionResult } from "@/lib/auth/role-guards";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginSuccess {
  role:       "admin" | "cashier" | "super_admin";
  redirectTo: string;
}

// ─── Action principale ────────────────────────────────────────────────────────

export async function loginAction(
  input: LoginInput
): Promise<ActionResult<LoginSuccess>> {

  // 1. Validation Zod
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:   parsed.error.errors[0]?.message ?? "Données invalides",
      code:    "VALIDATION_ERROR",
    };
  }

  const { email, password } = parsed.data;

  // 2. Cherche d'abord dans les platform_admins (super admin)
  const superAdmin = await db
    .select()
    .from(platformAdmins)
    .where(
      and(
        eq(platformAdmins.email, email),
        eq(platformAdmins.isActive, true)
      )
    )
    .limit(1)
    .then((r) => r[0] ?? null);

  if (superAdmin) {
    const valid = await verifyPassword(password, superAdmin.passwordHash);
    if (!valid) {
      return { success: false, error: "Email ou mot de passe incorrect", code: "INVALID_CREDENTIALS" };
    }

    // Génère les tokens super admin
    const accessToken  = await signSuperAdminToken({
      sub:         superAdmin.id,
      role:        "super_admin",
      accessLevel: superAdmin.accessLevel,
      email:       superAdmin.email,
    });
    const refreshToken = await signRefreshToken(superAdmin.id, "platform");

    // Sauvegarde le refresh token hashé
    const refreshHash = await hashPassword(refreshToken);
    await db
      .update(platformAdmins)
      .set({
        refreshTokenHash:      refreshHash,
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastLoginAt:           new Date(),
        updatedAt:             new Date(),
      })
      .where(eq(platformAdmins.id, superAdmin.id));

    await setAuthCookies(accessToken, refreshToken);

    return {
      success: true,
      data:    { role: "super_admin", redirectTo: "/super-admin/dashboard" },
    };
  }

  // 3. Cherche dans les users tenant (patron ou caissière)
  const user = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, email),
        eq(users.status, "active")
      )
    )
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!user) {
    // Message générique pour ne pas révéler si l'email existe
    return { success: false, error: "Email ou mot de passe incorrect", code: "INVALID_CREDENTIALS" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Email ou mot de passe incorrect", code: "INVALID_CREDENTIALS" };
  }

  // 4. Génère les tokens tenant
  const accessToken = await signAccessToken({
    sub:      user.id,
    tenantId: user.tenantId,
    role:     user.role,
    email:    user.email,
  });
  const refreshToken = await signRefreshToken(user.id, "tenant");

  // Sauvegarde le refresh token hashé
  const refreshHash = await hashPassword(refreshToken);
  await db
    .update(users)
    .set({
      refreshTokenHash:      refreshHash,
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lastLoginAt:           new Date(),
      updatedAt:             new Date(),
    })
    .where(eq(users.id, user.id));

  await setAuthCookies(accessToken, refreshToken);

  // 5. Redirect selon le rôle
  const redirectTo = user.role === "admin" ? "/dashboard" : "/caisse";

  return {
    success: true,
    data:    { role: user.role, redirectTo },
  };
}