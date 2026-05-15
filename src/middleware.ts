// import { NextRequest, NextResponse } from "next/server";
// import { verifyAccessToken, verifySuperAdminToken } from "@/lib/auth/jwt";
// import { COOKIE_NAMES } from "@/lib/auth/session";

// // ─── Routes publiques (pas de token requis) ───────────────────────────────────

// const PUBLIC_ROUTES = [
//   "/",
//   "/pricing",
//   "/features",
//   "/contact",
//   "/demo",
// ];

// const AUTH_ROUTES = [
//   "/login",
//   "/register",
//   "/forgot-password",
//   "/reset-password",
// ];

// // ─── Préfixes de routes protégées ────────────────────────────────────────────

// const ADMIN_PREFIX       = "/dashboard";
// const CASHIER_PREFIX     = "/caisse";
// const SUPER_ADMIN_PREFIX = "/super-admin";

// // Routes API qui ne passent pas par le middleware JWT
// // (elles gèrent leur propre auth)
// const UNPROTECTED_API = [
//   "/api/auth/login",
//   "/api/auth/register",
//   "/api/auth/refresh",
//   "/api/health",
//   "/api/pwa",
// ];

// // ─── Middleware ───────────────────────────────────────────────────────────────

// export async function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;

//   // 1. Laisse passer les routes statiques et Next.js internals
//   if (
//     pathname.startsWith("/_next") ||
//     pathname.startsWith("/icons") ||
//     pathname.startsWith("/sw.js") ||
//     pathname.startsWith("/manifest.json") ||
//     pathname.startsWith("/offline.html") ||
//     pathname.includes(".")
//   ) {
//     return NextResponse.next();
//   }

//   // 2. Routes API non protégées
//   if (UNPROTECTED_API.some((r) => pathname.startsWith(r))) {
//     return NextResponse.next();
//   }

//   // 3. Routes cron — vérification du secret partagé
//   if (pathname.startsWith("/api/cron")) {
//     const secret = request.headers.get("x-cron-secret");
//     if (secret !== process.env.CRON_SECRET) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     return NextResponse.next();
//   }

//   // 4. Routes publiques — pas de vérification
//   if (
//     PUBLIC_ROUTES.includes(pathname) ||
//     AUTH_ROUTES.some((r) => pathname.startsWith(r))
//   ) {
//     // Si déjà connecté et tente d'accéder à une page auth → redirect dashboard
//     const token = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
//     if (token && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
//       return await redirectConnectedUser(token, request);
//     }
//     return NextResponse.next();
//   }

//   // 5. Récupération du token depuis les cookies
//   const accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;

//   if (!accessToken) {
//     return redirectToLogin(request);
//   }

//   // 6. Protection des routes SUPER ADMIN
//   if (pathname.startsWith(SUPER_ADMIN_PREFIX) || pathname.startsWith("/api/super-admin")) {
//     const superAdmin = await verifySuperAdminToken(accessToken);
//     if (!superAdmin) {
//       return redirectToLogin(request);
//     }

//     // Inject super admin info dans les headers pour les Server Components
//     const response = NextResponse.next();
//     response.headers.set("x-admin-id", superAdmin.sub);
//     response.headers.set("x-admin-level", superAdmin.accessLevel);
//     response.headers.set("x-user-role", "super_admin");
//     return response;
//   }

//   // 7. Protection des routes ADMIN (patron)
//   if (isAdminRoute(pathname)) {
//     const user = await verifyAccessToken(accessToken);

//     if (!user) {
//       return redirectToLogin(request);
//     }

//     if (user.role !== "admin") {
//       // Une caissière qui tente d'accéder à l'admin → unauthorized
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     const response = NextResponse.next();
//     injectUserHeaders(response, user.sub, user.tenantId, user.role);
//     return response;
//   }

//   // 8. Protection des routes CAISSIÈRE
//   if (isCashierRoute(pathname)) {
//     const user = await verifyAccessToken(accessToken);

//     if (!user) {
//       return redirectToLogin(request);
//     }

//     // Admin peut accéder aux routes caissière (pour tests)
//     if (user.role !== "cashier" && user.role !== "admin") {
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     const response = NextResponse.next();
//     injectUserHeaders(response, user.sub, user.tenantId, user.role);
//     return response;
//   }

//   // 9. Routes API protégées génériques
//   if (pathname.startsWith("/api/")) {
//     const user = await verifyAccessToken(accessToken);
//     const superAdmin = !user ? await verifySuperAdminToken(accessToken) : null;

//     if (!user && !superAdmin) {
//       return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
//     }

//     const response = NextResponse.next();
//     if (user) {
//       injectUserHeaders(response, user.sub, user.tenantId, user.role);
//     } else if (superAdmin) {
//       response.headers.set("x-admin-id", superAdmin.sub);
//       response.headers.set("x-admin-level", superAdmin.accessLevel);
//       response.headers.set("x-user-role", "super_admin");
//     }
//     return response;
//   }

//   return NextResponse.next();
// }

// // ─── Helpers internes ─────────────────────────────────────────────────────────

// function isAdminRoute(pathname: string): boolean {
//   const adminPrefixes = [
//     ADMIN_PREFIX,
//     "/produits",
//     "/categories",
//     "/stock",
//     "/approvisionnements",
//     "/pertes",
//     "/analytics",
//     "/personnel",
//     "/factures",
//     "/grouped-invoices",
//     "/events",
//     "/settings",
//     "/abonnement",
//     "/boutique",
//     "/onboarding",
//   ];
//   return adminPrefixes.some((p) => pathname.startsWith(p));
// }

// function isCashierRoute(pathname: string): boolean {
//   const cashierPrefixes = [CASHIER_PREFIX, "/ventes", "/session", "/historique"];
//   // /factures et /profil sont partagés — vérifiés après détermination du rôle
//   return cashierPrefixes.some((p) => pathname.startsWith(p));
// }

// function injectUserHeaders(
//   response: NextResponse,
//   userId: string,
//   tenantId: string,
//   role: string
// ) {
//   response.headers.set("x-user-id", userId);
//   response.headers.set("x-tenant-id", tenantId);
//   response.headers.set("x-user-role", role);
// }

// async function redirectConnectedUser(token: string, request: NextRequest) {
//   const user = await verifyAccessToken(token);
//   const superAdmin = !user ? await verifySuperAdminToken(token) : null;

//   if (user?.role === "admin") {
//     return NextResponse.redirect(new URL("/dashboard", request.url));
//   }
//   if (user?.role === "cashier") {
//     return NextResponse.redirect(new URL("/caisse", request.url));
//   }
//   if (superAdmin) {
//     return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
//   }
//   return NextResponse.next();
// }

// function redirectToLogin(request: NextRequest) {
//   const loginUrl = new URL("/login", request.url);
//   // Sauvegarde l'URL demandée pour redirect après login
//   loginUrl.searchParams.set("from", request.nextUrl.pathname);
//   return NextResponse.redirect(loginUrl);
// }

// // ─── Config matcher ───────────────────────────────────────────────────────────

// export const config = {
//   matcher: [
//     /*
//      * Applique le middleware à toutes les routes SAUF :
//      * - _next/static (fichiers statiques)
//      * - _next/image (optimisation images)
//      * - favicon.ico
//      */
//     "/((?!_next/static|_next/image|favicon.ico).*)",
//   ],
// };



import { NextRequest, NextResponse } from "next/server";
import {
  verifyAccessToken,
  verifySuperAdminToken,
  verifyRefreshToken,
  signAccessToken,
  signSuperAdminToken,
} from "@/lib/auth/jwt";
import { COOKIE_NAMES } from "@/lib/auth/session";
import { env } from "@/env";

// ─── Routes ───────────────────────────────────────────────────────────────────

const PUBLIC_ROUTES   = ["/", "/pricing", "/features", "/contact", "/demo"];
const AUTH_ROUTES     = ["/login", "/register", "/forgot-password", "/reset-password"];
const UNPROTECTED_API = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/health",
  "/api/pwa",
];

const ADMIN_PREFIXES = [
  "/dashboard", "/produits", "/categories", "/stock",
  "/approvisionnements", "/pertes", "/analytics",
  "/personnel", "/factures", "/grouped-invoices",
  "/events", "/settings", "/abonnement", "/boutique", "/onboarding",
];

const CASHIER_PREFIXES = ["/caisse", "/ventes", "/session", "/historique"];

// ─── Cookie options partagées ─────────────────────────────────────────────────

const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure:   env.NODE_ENV === "production",
  sameSite: "lax"  as const,
  path:     "/",
  maxAge:   15 * 60,
};

// ─── Middleware principal ─────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Statiques
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    /\.(ico|png|svg|jpg|webp|json|js|css|txt|woff2?)$/.test(pathname)
  ) return NextResponse.next();

  // Cron jobs — secret partagé
  if (pathname.startsWith("/api/cron")) {
    const secret = request.headers.get("x-cron-secret");
    if (secret !== env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // API non protégées
  if (UNPROTECTED_API.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  const accessToken  = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value  ?? null;
  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;

  // Pages publiques / auth
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    AUTH_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    // Déjà connecté → redirige vers le bon dashboard
    if (accessToken) {
      const dest = await getDestinationForToken(accessToken);
      if (dest) return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // ── Zone protégée ──────────────────────────────────────────────────────────

  // 1. Tente avec l'access token
  if (accessToken) {
    const result = await authorizeWithAccessToken(accessToken, pathname, request);
    if (result) return result;
    // Access token invalide/expiré → tente refresh
  }

  // 2. Refresh silencieux
  if (refreshToken) {
    return await silentRefresh(refreshToken, pathname, request);
  }

  return redirectToLogin(request);
}

// ─── Autorisation avec access token ──────────────────────────────────────────

async function authorizeWithAccessToken(
  token: string,
  pathname: string,
  request: NextRequest
): Promise<NextResponse | null> {

  // Super admin
  if (pathname.startsWith("/super-admin") || pathname.startsWith("/api/super-admin")) {
    const superAdmin = await verifySuperAdminToken(token);
    if (!superAdmin) return null;
    return buildSuperAdminResponse(superAdmin.sub, superAdmin.accessLevel);
  }

  // Routes admin
  if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    const user = await verifyAccessToken(token);
    if (!user) return null;
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return buildUserResponse(user.sub, user.tenantId, user.role);
  }

  // Routes caissière
  if (CASHIER_PREFIXES.some((p) => pathname.startsWith(p))) {
    const user = await verifyAccessToken(token);
    if (!user) return null;
    return buildUserResponse(user.sub, user.tenantId, user.role);
  }

  // API génériques
  if (pathname.startsWith("/api/")) {
    const user       = await verifyAccessToken(token);
    const superAdmin = !user ? await verifySuperAdminToken(token) : null;
    if (user)       return buildUserResponse(user.sub, user.tenantId, user.role);
    if (superAdmin) return buildSuperAdminResponse(superAdmin.sub, superAdmin.accessLevel);
    return null;
  }

  return NextResponse.next();
}

// ─── Refresh silencieux ───────────────────────────────────────────────────────
// Note : le middleware Edge Runtime ne peut pas importer drizzle/postgres directement.
// On délègue le refresh à une API route dédiée qui elle tourne en Node.js runtime.

async function silentRefresh(
  refreshToken: string,
  pathname: string,
  request: NextRequest
): Promise<NextResponse> {

  // Vérifie d'abord que le refresh token est syntaxiquement valide (Edge-safe)
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return redirectToLogin(request);

  try {
    // Appelle la route API Node.js pour faire le refresh (accès DB)
    const refreshUrl = new URL("/api/auth/refresh", request.url);
    const refreshRes = await fetch(refreshUrl.toString(), {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        // Transmet le refresh token via header (le cookie est dans la request)
        cookie: request.headers.get("cookie") ?? "",
      },
    });

    if (!refreshRes.ok) return redirectToLogin(request);

    const { accessToken: newToken } = await refreshRes.json() as { accessToken: string };
    if (!newToken) return redirectToLogin(request);

    // Ré-autorise avec le nouveau token
    const authResponse = await authorizeWithAccessToken(newToken, pathname, request);
    const response = authResponse ?? NextResponse.next();

    // Pose le nouveau access token
    response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, newToken, ACCESS_COOKIE_OPTS);

    // Propage le nouveau refresh token depuis la réponse API (rotation)
    const setCookieHeader = refreshRes.headers.get("set-cookie");
    if (setCookieHeader) {
      response.headers.append("set-cookie", setCookieHeader);
    }

    return response;

  } catch {
    return redirectToLogin(request);
  }
}

// ─── API Route /api/auth/refresh (Node.js runtime) ───────────────────────────
// Voir : src/app/api/auth/refresh/route.ts

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildUserResponse(userId: string, tenantId: string, role: string): NextResponse {
  const res = NextResponse.next();
  res.headers.set("x-user-id",   userId);
  res.headers.set("x-tenant-id", tenantId);
  res.headers.set("x-user-role", role);
  return res;
}

function buildSuperAdminResponse(adminId: string, accessLevel: string): NextResponse {
  const res = NextResponse.next();
  res.headers.set("x-admin-id",    adminId);
  res.headers.set("x-admin-level", accessLevel);
  res.headers.set("x-user-role",   "super_admin");
  return res;
}

async function getDestinationForToken(token: string): Promise<string | null> {
  const user       = await verifyAccessToken(token);
  const superAdmin = !user ? await verifySuperAdminToken(token) : null;
  if (user?.role === "admin")   return "/dashboard";
  if (user?.role === "cashier") return "/caisse";
  if (superAdmin)               return "/super-admin/dashboard";
  return null;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = new URL("/login", request.url);
  const from = request.nextUrl.pathname;
  if (from !== "/") url.searchParams.set("from", from);
  return NextResponse.redirect(url);
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};