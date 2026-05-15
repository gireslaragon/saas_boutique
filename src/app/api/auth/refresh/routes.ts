import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { platformAdmins } from "@/db/schema/platform-admins";
import { eq } from "drizzle-orm";
import {
  verifyRefreshToken,
  signAccessToken,
  signSuperAdminToken,
  signRefreshToken,
} from "@/lib/auth/jwt";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { COOKIE_NAMES } from "@/lib/auth/session";
import { env } from "@/env";

export const runtime = "nodejs"; // Accès DB — pas Edge

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure:   env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path:     "/",
  maxAge:   7 * 24 * 60 * 60,
};

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
  }

  try {
    // ── Tenant user ─────────────────────────────────────────────────────────
    if (payload.scope === "tenant") {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!user || user.status !== "active" || !user.refreshTokenHash) {
        return NextResponse.json({ error: "User not found" }, { status: 401 });
      }

      // Vérifie l'expiration du refresh token en DB
      if (
        user.refreshTokenExpiresAt &&
        user.refreshTokenExpiresAt < new Date()
      ) {
        return NextResponse.json({ error: "Refresh token expired" }, { status: 401 });
      }

      const valid = await verifyPassword(refreshToken, user.refreshTokenHash);
      if (!valid) {
        return NextResponse.json({ error: "Token revoked" }, { status: 401 });
      }

      // Nouveaux tokens (rotation)
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

      const response = NextResponse.json({ accessToken: newAccessToken });
      response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, newRefreshToken, REFRESH_COOKIE_OPTS);
      return response;
    }

    // ── Platform admin ───────────────────────────────────────────────────────
    if (payload.scope === "platform") {
      const admin = await db
        .select()
        .from(platformAdmins)
        .where(eq(platformAdmins.id, payload.sub))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!admin || !admin.isActive || !admin.refreshTokenHash) {
        return NextResponse.json({ error: "Admin not found" }, { status: 401 });
      }

      // Vérifie l'expiration du refresh token en DB
      if (
        admin.refreshTokenExpiresAt &&
        admin.refreshTokenExpiresAt < new Date()
      ) {
        return NextResponse.json({ error: "Refresh token expired" }, { status: 401 });
      }

      const valid = await verifyPassword(refreshToken, admin.refreshTokenHash);
      if (!valid) {
        return NextResponse.json({ error: "Token revoked" }, { status: 401 });
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
          refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          updatedAt:             new Date(),
        })
        .where(eq(platformAdmins.id, admin.id));

      const response = NextResponse.json({ accessToken: newAccessToken });
      response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, newRefreshToken, REFRESH_COOKIE_OPTS);
      return response;
    }

    return NextResponse.json({ error: "Invalid scope" }, { status: 401 });

  } catch (err) {
    console.error("[refresh] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}