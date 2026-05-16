"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { platformAdmins } from "@/db/schema/platform-admins";
import { eq } from "drizzle-orm";
import { clearAuthCookies, getAccessToken } from "@/lib/auth/session";
import { verifyAccessToken, verifySuperAdminToken } from "@/lib/auth/jwt";

export async function logoutAction() {
  const token = await getAccessToken();

  if (token) {
    // Invalide le refresh token en DB selon le type d'utilisateur
    const user = await verifyAccessToken(token);
    const superAdmin = !user ? await verifySuperAdminToken(token) : null;

    if (user) {
      await db
        .update(users)
        .set({ refreshTokenHash: null, refreshTokenExpiresAt: null, updatedAt: new Date() })
        .where(eq(users.id, user.sub));
    } else if (superAdmin) {
      await db
        .update(platformAdmins)
        .set({ refreshTokenHash: null, refreshTokenExpiresAt: null, updatedAt: new Date() })
        .where(eq(platformAdmins.id, superAdmin.sub));
    }
  }

  await clearAuthCookies();
  redirect("/login");
}