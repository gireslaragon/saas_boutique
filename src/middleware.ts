import { NextRequest, NextResponse } from "next/server";

import {
  verifyAccessToken,
  verifySuperAdminToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";

import { COOKIE_NAMES } from "@/lib/auth/session";
import { env } from "@/env";

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/features",
  "/contact",
  "/demo",
];

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const UNPROTECTED_API = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/health",
  "/api/pwa",
];

const ADMIN_PREFIXES = [
  "/dashboard",
  "/produits",
  "/categories",
  "/stock",
  "/approvisionnements",
  "/pertes",
  "/analytics",
  "/personnel",
  "/factures",
  "/grouped-invoices",
  "/events",
  "/settings",
  "/abonnement",
  "/boutique",
  "/onboarding",
];

const CASHIER_PREFIXES = [
  "/caisse",
  "/ventes",
  "/session",
  "/historique",
];

// ─────────────────────────────────────────────────────────────────────────────

const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 15 * 60,
};

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
};

// ─────────────────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {

  const { pathname } = request.nextUrl;

  // ── Fichiers statiques ─────────────────────────

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    /\.(ico|png|svg|jpg|webp|json|js|css|txt|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ── Cron jobs ──────────────────────────────────

  if (pathname.startsWith("/api/cron")) {

    const secret = request.headers.get("x-cron-secret");

    if (secret !== env.CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // ── API publiques ──────────────────────────────

  if (
    UNPROTECTED_API.some((r) => pathname.startsWith(r))
  ) {
    return NextResponse.next();
  }

  const accessToken =
    request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;

  const refreshToken =
    request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;

  // ───────────────────────────────────────────────
  // PAGES PUBLIQUES / AUTH
  // ───────────────────────────────────────────────

  if (
    PUBLIC_ROUTES.includes(pathname) ||
    AUTH_ROUTES.some((r) => pathname.startsWith(r))
  ) {

    // Access token valide
    if (accessToken) {

      const dest =
        await getDestinationForToken(accessToken);

      if (dest) {
        return NextResponse.redirect(
          new URL(dest, request.url)
        );
      }
    }

    // Access expiré mais refresh valide
    if (!accessToken && refreshToken) {
      return await silentRefresh(
        refreshToken,
        pathname,
        request
      );
    }

    return NextResponse.next();
  }

  // ───────────────────────────────────────────────
  // ZONE PROTÉGÉE
  // ───────────────────────────────────────────────

  // Access token OK
  if (accessToken) {

    const result =
      await authorizeWithAccessToken(
        accessToken,
        pathname,
        request
      );

    if (result) return result;
  }

  // Refresh silencieux
  if (refreshToken) {
    return await silentRefresh(
      refreshToken,
      pathname,
      request
    );
  }

  return redirectToLogin(request);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZATION
// ─────────────────────────────────────────────────────────────────────────────

async function authorizeWithAccessToken(
  token: string,
  pathname: string,
  request: NextRequest
): Promise<NextResponse | null> {

  // SUPER ADMIN

  if (
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/api/super-admin")
  ) {

    const superAdmin =
      await verifySuperAdminToken(token);

    if (!superAdmin) return null;

    return buildSuperAdminResponse(
      superAdmin.sub,
      superAdmin.accessLevel
    );
  }

  // ADMIN

  if (
    ADMIN_PREFIXES.some((p) =>
      pathname.startsWith(p)
    )
  ) {

    const user =
      await verifyAccessToken(token);

    if (!user) return null;

    if (user.role !== "admin") {
      return NextResponse.redirect(
        new URL("/unauthorized", request.url)
      );
    }

    return buildUserResponse(
      user.sub,
      user.tenantId,
      user.role
    );
  }

  // CAISSIÈRE

  if (
    CASHIER_PREFIXES.some((p) =>
      pathname.startsWith(p)
    )
  ) {

    const user =
      await verifyAccessToken(token);

    if (!user) return null;

    return buildUserResponse(
      user.sub,
      user.tenantId,
      user.role
    );
  }

  // API protégées

  if (pathname.startsWith("/api/")) {

    const user =
      await verifyAccessToken(token);

    const superAdmin =
      !user
        ? await verifySuperAdminToken(token)
        : null;

    if (user) {
      return buildUserResponse(
        user.sub,
        user.tenantId,
        user.role
      );
    }

    if (superAdmin) {
      return buildSuperAdminResponse(
        superAdmin.sub,
        superAdmin.accessLevel
      );
    }

    return null;
  }

  return NextResponse.next();
}

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH
// ─────────────────────────────────────────────────────────────────────────────

async function silentRefresh(
  refreshToken: string,
  pathname: string,
  request: NextRequest
): Promise<NextResponse> {

  const payload =
    await verifyRefreshToken(refreshToken);

  if (!payload) {
    return redirectToLogin(request);
  }

  try {

    const refreshUrl =
      new URL("/api/auth/refresh", request.url);

    const refreshRes = await fetch(
      refreshUrl.toString(),
      {
        method: "POST",
        headers: {
          cookie:
            request.headers.get("cookie") ?? "",
        },
      }
    );

    if (!refreshRes.ok) {
      return redirectToLogin(request);
    }

    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    } = await refreshRes.json();

    const authResponse =
      await authorizeWithAccessToken(
        newAccessToken,
        pathname,
        request
      );

    const response =
      authResponse ?? NextResponse.next();

    // Nouveau access token
    response.cookies.set(
      COOKIE_NAMES.ACCESS_TOKEN,
      newAccessToken,
      ACCESS_COOKIE_OPTS
    );

    // Nouveau refresh token
    response.cookies.set(
      COOKIE_NAMES.REFRESH_TOKEN,
      newRefreshToken,
      REFRESH_COOKIE_OPTS
    );

    return response;

  } catch {
    return redirectToLogin(request);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildUserResponse(
  userId: string,
  tenantId: string,
  role: string
): NextResponse {

  const res = NextResponse.next();

  res.headers.set("x-user-id", userId);
  res.headers.set("x-tenant-id", tenantId);
  res.headers.set("x-user-role", role);

  return res;
}

function buildSuperAdminResponse(
  adminId: string,
  accessLevel: string
): NextResponse {

  const res = NextResponse.next();

  res.headers.set("x-admin-id", adminId);
  res.headers.set("x-admin-level", accessLevel);
  res.headers.set("x-user-role", "super_admin");

  return res;
}

async function getDestinationForToken(
  token: string
): Promise<string | null> {

  const user =
    await verifyAccessToken(token);

  const superAdmin =
    !user
      ? await verifySuperAdminToken(token)
      : null;

  if (user?.role === "admin") {
    return "/dashboard";
  }

  if (user?.role === "cashier") {
    return "/caisse";
  }

  if (superAdmin) {
    return "/super-admin/dashboard";
  }

  return null;
}

function redirectToLogin(
  request: NextRequest
): NextResponse {

  const loginUrl =
    new URL("/login", request.url);

  loginUrl.searchParams.set(
    "from",
    request.nextUrl.pathname
  );

  return NextResponse.redirect(loginUrl);
}

// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};