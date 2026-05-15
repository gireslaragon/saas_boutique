import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "cashier";
export type AdminAccessLevel = "super" | "support" | "finance";

export interface AccessTokenPayload extends JWTPayload {
  sub:          string;   // user ID
  tenantId:     string;
  role:         UserRole;
  email:        string;
  type:         "access";
}

export interface SuperAdminTokenPayload extends JWTPayload {
  sub:          string;   // platform admin ID
  role:         "super_admin";
  accessLevel:  AdminAccessLevel;
  email:        string;
  type:         "access";
}

export interface RefreshTokenPayload extends JWTPayload {
  sub:    string;  // user ID ou platform admin ID
  type:   "refresh";
  scope:  "tenant" | "platform";
}

export type AnyTokenPayload =
  | AccessTokenPayload
  | SuperAdminTokenPayload
  | RefreshTokenPayload;

// ─── Clé secrète ─────────────────────────────────────────────────────────────

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

// ─── Fonctions de signature ───────────────────────────────────────────────────

/**
 * Génère un access token pour un utilisateur tenant (patron ou caissière)
 */
export async function signAccessToken(payload: Omit<AccessTokenPayload, "type" | "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(SECRET);
}

/**
 * Génère un access token pour un super admin plateforme
 */
export async function signSuperAdminToken(
  payload: Omit<SuperAdminTokenPayload, "type" | "iat" | "exp">
): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(SECRET);
}

/**
 * Génère un refresh token
 */
export async function signRefreshToken(
  userId: string,
  scope: "tenant" | "platform" = "tenant"
): Promise<string> {
  return new SignJWT({ sub: userId, type: "refresh", scope })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(SECRET);
}

// ─── Fonctions de vérification ────────────────────────────────────────────────

/**
 * Vérifie et décode n'importe quel token
 * Lève une erreur si invalide ou expiré
 */
export async function verifyToken<T extends AnyTokenPayload>(token: string): Promise<T> {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as T;
}

/**
 * Vérifie un access token tenant — retourne null si invalide
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const payload = await verifyToken<AccessTokenPayload>(token);
    if (payload.type !== "access" || (payload.role !== "admin" && payload.role !== "cashier")) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Vérifie un access token super admin — retourne null si invalide
 */
export async function verifySuperAdminToken(token: string): Promise<SuperAdminTokenPayload | null> {
  try {
    const payload = await verifyToken<SuperAdminTokenPayload>(token);
    if (payload.type !== "access" || payload.role !== "super_admin") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Vérifie un refresh token — retourne null si invalide
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const payload = await verifyToken<RefreshTokenPayload>(token);
    if (payload.type !== "refresh") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extrait le token du header Authorization (Bearer xxx)
 * Compatible Edge Runtime (pas de dépendances Node.js)
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}