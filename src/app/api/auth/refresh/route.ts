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

import {
  verifyPassword,
  hashPassword,
} from "@/lib/auth/password";

import { COOKIE_NAMES } from "@/lib/auth/session";
import { env } from "@/env";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const refreshToken =
    request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: "No refresh token" },
      { status: 401 }
    );
  }

  const payload = await verifyRefreshToken(refreshToken);

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid refresh token" },
      { status: 401 }
    );
  }

  try {

    // ─────────────────────────────────────────────────────────────────────
    // TENANT USER
    // ─────────────────────────────────────────────────────────────────────

    if (payload.scope === "tenant") {

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (
        !user ||
        user.status !== "active" ||
        !user.refreshTokenHash
      ) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 401 }
        );
      }

      // Vérifie expiration DB
      if (
        !user.refreshTokenExpiresAt ||
        user.refreshTokenExpiresAt < new Date()
      ) {
        return NextResponse.json(
          { error: "Refresh token expired" },
          { status: 401 }
        );
      }

      // Vérifie hash
      const valid = await verifyPassword(
        refreshToken,
        user.refreshTokenHash
      );

      if (!valid) {
        return NextResponse.json(
          { error: "Token revoked" },
          { status: 401 }
        );
      }

      // ── Nouveaux tokens ─────────────────────────────

      const newAccessToken = await signAccessToken({
        sub:      user.id,
        tenantId: user.tenantId,
        role:     user.role,
        email:    user.email,
      });

      const newRefreshToken = await signRefreshToken(
        user.id,
        "tenant"
      );

      const newRefreshHash = await hashPassword(
        newRefreshToken
      );

      // Rotation refresh token
      await db
        .update(users)
        .set({
          refreshTokenHash:      newRefreshHash,
          refreshTokenExpiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // SUPER ADMIN
    // ─────────────────────────────────────────────────────────────────────

    if (payload.scope === "platform") {

      const admin = await db
        .select()
        .from(platformAdmins)
        .where(eq(platformAdmins.id, payload.sub))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (
        !admin ||
        !admin.isActive ||
        !admin.refreshTokenHash
      ) {
        return NextResponse.json(
          { error: "Admin not found" },
          { status: 401 }
        );
      }

      if (
        !admin.refreshTokenExpiresAt ||
        admin.refreshTokenExpiresAt < new Date()
      ) {
        return NextResponse.json(
          { error: "Refresh token expired" },
          { status: 401 }
        );
      }

      const valid = await verifyPassword(
        refreshToken,
        admin.refreshTokenHash
      );

      if (!valid) {
        return NextResponse.json(
          { error: "Token revoked" },
          { status: 401 }
        );
      }

      const newAccessToken = await signSuperAdminToken({
        sub:         admin.id,
        role:        "super_admin",
        accessLevel: admin.accessLevel,
        email:       admin.email,
      });

      const newRefreshToken = await signRefreshToken(
        admin.id,
        "platform"
      );

      const newRefreshHash = await hashPassword(
        newRefreshToken
      );

      await db
        .update(platformAdmins)
        .set({
          refreshTokenHash:      newRefreshHash,
          refreshTokenExpiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ),
          updatedAt: new Date(),
        })
        .where(eq(platformAdmins.id, admin.id));

      return NextResponse.json({
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
      });
    }

    return NextResponse.json(
      { error: "Invalid scope" },
      { status: 401 }
    );

  } catch (error) {
    console.error("[REFRESH_ERROR]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}