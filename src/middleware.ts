import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, verifySuperAdminToken } from "@/lib/auth/jwt";
import { COOKIE_NAMES } from "@/lib/auth/session";

// ─── Routes publiques (pas de token requis) ───────────────────────────────────

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

// ─── Préfixes de routes protégées ────────────────────────────────────────────

const ADMIN_PREFIX       = "/dashboard";
const CASHIER_PREFIX     = "/caisse";
const SUPER_ADMIN_PREFIX = "/super-admin";

// Routes API qui ne passent pas par le middleware JWT
// (elles gèrent leur propre auth)
const UNPROTECTED_API = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/health",
  "/api/pwa",
];

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Laisse passer les routes statiques et Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/offline.html") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Routes API non protégées
  if (UNPROTECTED_API.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // 3. Routes cron — vérification du secret partagé
  if (pathname.startsWith("/api/cron")) {
    const secret = request.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 4. Routes publiques — pas de vérification
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    AUTH_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    // Si déjà connecté et tente d'accéder à une page auth → redirect dashboard
    const token = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
    if (token && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
      return await redirectConnectedUser(token, request);
    }
    return NextResponse.next();
  }

  // 5. Récupération du token depuis les cookies
  const accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;

  if (!accessToken) {
    return redirectToLogin(request);
  }

  // 6. Protection des routes SUPER ADMIN
  if (pathname.startsWith(SUPER_ADMIN_PREFIX) || pathname.startsWith("/api/super-admin")) {
    const superAdmin = await verifySuperAdminToken(accessToken);
    if (!superAdmin) {
      return redirectToLogin(request);
    }

    // Inject super admin info dans les headers pour les Server Components
    const response = NextResponse.next();
    response.headers.set("x-admin-id", superAdmin.sub);
    response.headers.set("x-admin-level", superAdmin.accessLevel);
    response.headers.set("x-user-role", "super_admin");
    return response;
  }

  // 7. Protection des routes ADMIN (patron)
  if (isAdminRoute(pathname)) {
    const user = await verifyAccessToken(accessToken);

    if (!user) {
      return redirectToLogin(request);
    }

    if (user.role !== "admin") {
      // Une caissière qui tente d'accéder à l'admin → unauthorized
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    const response = NextResponse.next();
    injectUserHeaders(response, user.sub, user.tenantId, user.role);
    return response;
  }

  // 8. Protection des routes CAISSIÈRE
  if (isCashierRoute(pathname)) {
    const user = await verifyAccessToken(accessToken);

    if (!user) {
      return redirectToLogin(request);
    }

    // Admin peut accéder aux routes caissière (pour tests)
    if (user.role !== "cashier" && user.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    const response = NextResponse.next();
    injectUserHeaders(response, user.sub, user.tenantId, user.role);
    return response;
  }

  // 9. Routes API protégées génériques
  if (pathname.startsWith("/api/")) {
    const user = await verifyAccessToken(accessToken);
    const superAdmin = !user ? await verifySuperAdminToken(accessToken) : null;

    if (!user && !superAdmin) {
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
    }

    const response = NextResponse.next();
    if (user) {
      injectUserHeaders(response, user.sub, user.tenantId, user.role);
    } else if (superAdmin) {
      response.headers.set("x-admin-id", superAdmin.sub);
      response.headers.set("x-admin-level", superAdmin.accessLevel);
      response.headers.set("x-user-role", "super_admin");
    }
    return response;
  }

  return NextResponse.next();
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

function isAdminRoute(pathname: string): boolean {
  const adminPrefixes = [
    ADMIN_PREFIX,
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
  return adminPrefixes.some((p) => pathname.startsWith(p));
}

function isCashierRoute(pathname: string): boolean {
  const cashierPrefixes = [CASHIER_PREFIX, "/ventes", "/session", "/historique"];
  // /factures et /profil sont partagés — vérifiés après détermination du rôle
  return cashierPrefixes.some((p) => pathname.startsWith(p));
}

function injectUserHeaders(
  response: NextResponse,
  userId: string,
  tenantId: string,
  role: string
) {
  response.headers.set("x-user-id", userId);
  response.headers.set("x-tenant-id", tenantId);
  response.headers.set("x-user-role", role);
}

async function redirectConnectedUser(token: string, request: NextRequest) {
  const user = await verifyAccessToken(token);
  const superAdmin = !user ? await verifySuperAdminToken(token) : null;

  if (user?.role === "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (user?.role === "cashier") {
    return NextResponse.redirect(new URL("/caisse", request.url));
  }
  if (superAdmin) {
    return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
  }
  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  // Sauvegarde l'URL demandée pour redirect après login
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

// ─── Config matcher ───────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Applique le middleware à toutes les routes SAUF :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};