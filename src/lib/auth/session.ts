import { cookies } from "next/headers";
import { env } from "@/env";

// ─── Noms des cookies ─────────────────────────────────────────────────────────

export const COOKIE_NAMES = {
  ACCESS_TOKEN:   "bs_access",   // bs = boutique saas
  REFRESH_TOKEN:  "bs_refresh",
} as const;

// ─── Configuration des cookies ────────────────────────────────────────────────

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path:     "/",
  maxAge:   15 * 60, // 15 minutes (synchronisé avec JWT_ACCESS_EXPIRES_IN)
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path:     "/",
  maxAge:   7 * 24 * 60 * 60, // 7 jours (synchronisé avec JWT_REFRESH_EXPIRES_IN)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pose les cookies d'authentification après login
 */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, accessToken, ACCESS_COOKIE_OPTIONS);
  cookieStore.set(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, REFRESH_COOKIE_OPTIONS);
}

/**
 * Supprime les cookies d'authentification (logout)
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAMES.ACCESS_TOKEN);
  cookieStore.delete(COOKIE_NAMES.REFRESH_TOKEN);
}

/**
 * Lit le token d'accès depuis les cookies
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
}

/**
 * Lit le refresh token depuis les cookies
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;
}