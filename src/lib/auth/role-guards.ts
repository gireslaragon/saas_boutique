import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole, AccessTokenPayload, SuperAdminTokenPayload, AdminAccessLevel } from "./jwt";
import { verifyAccessToken, verifySuperAdminToken } from "./jwt";
import { getAccessToken } from "./session";
import type { Permission, PlatformPermission } from "./permissions";
import { hasPermission, hasPlatformPermission } from "./permissions";

// ─── Types retournés par les guards ──────────────────────────────────────────

export interface AuthenticatedUser {
  id:       string;
  tenantId: string;
  role:     UserRole;
  email:    string;
}

export interface AuthenticatedSuperAdmin {
  id:          string;
  role:        "super_admin";
  accessLevel: AdminAccessLevel;
  email:       string;
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

/**
 * Lit l'utilisateur depuis les headers injectés par le middleware
 * Plus rapide que re-vérifier le JWT (déjà fait par le middleware)
 */
async function getUserFromHeaders(): Promise<AuthenticatedUser | null> {
  const headersList = await headers();

  const userId   = headersList.get("x-user-id");
  const tenantId = headersList.get("x-tenant-id");
  const roleHeader = headersList.get("x-user-role");

  // Si le header indique un super admin, ce n'est pas un user tenant
  if (!userId || !tenantId || !roleHeader || roleHeader === "super_admin") return null;

  const role = roleHeader as UserRole;

  // On re-vérifie le token pour avoir l'email (pas dans les headers)
  const token = await getAccessToken();
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  return {
    id:       userId,
    tenantId,
    role,
    email:    payload.email,
  };
}

async function getSuperAdminFromHeaders(): Promise<AuthenticatedSuperAdmin | null> {
  const headersList = await headers();

  const adminId     = headersList.get("x-admin-id");
  const accessLevel = headersList.get("x-admin-level") as AdminAccessLevel | null;
  const role        = headersList.get("x-user-role");

  if (!adminId || !accessLevel || role !== "super_admin") return null;

  const token = await getAccessToken();
  if (!token) return null;

  const payload = await verifySuperAdminToken(token);
  if (!payload) return null;

  return {
    id:          adminId,
    role:        "super_admin",
    accessLevel,
    email:       payload.email,
  };
}

// ─── Guards publics ───────────────────────────────────────────────────────────

/**
 * Guard de base — vérifie qu'un utilisateur tenant est connecté
 * Redirige vers /login si non connecté
 *
 * Usage dans un Server Component ou Server Action :
 *   const user = await requireAuth();
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getUserFromHeaders();
  if (!user) redirect("/login");
  return user;
}

/**
 * Guard admin — vérifie que l'utilisateur connecté est un patron (admin)
 * Redirige vers /unauthorized si c'est une caissière
 *
 * Usage :
 *   const user = await requireAdmin();
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role !== "admin") redirect("/unauthorized");
  return user;
}

/**
 * Guard caissière — vérifie que l'utilisateur est une caissière ou un admin
 *
 * Usage :
 *   const user = await requireCashier();
 */
export async function requireCashier(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role !== "cashier" && user.role !== "admin") redirect("/unauthorized");
  return user;
}

/**
 * Guard super admin — vérifie que c'est bien un platform admin
 * Redirige vers /login si non connecté
 *
 * Usage :
 *   const admin = await requireSuperAdmin();
 */
export async function requireSuperAdmin(): Promise<AuthenticatedSuperAdmin> {
  const admin = await getSuperAdminFromHeaders();
  if (!admin) redirect("/login");
  return admin;
}

/**
 * Guard permission — vérifie qu'un utilisateur a une permission spécifique
 *
 * Usage :
 *   const user = await requirePermission("stock:declare-loss");
 */
export async function requirePermission(permission: Permission): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    redirect("/unauthorized");
  }
  return user;
}

/**
 * Guard permission plateforme — vérifie qu'un super admin a une permission
 *
 * Usage :
 *   const admin = await requirePlatformPermission("tenants:suspend");
 */
export async function requirePlatformPermission(
  permission: PlatformPermission
): Promise<AuthenticatedSuperAdmin> {
  const admin = await requireSuperAdmin();
  if (!hasPlatformPermission(admin.accessLevel, permission)) {
    redirect("/unauthorized");
  }
  return admin;
}

// ─── Guards pour Server Actions (retournent une erreur au lieu de redirect) ──

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Guard pour Server Actions — ne redirige pas, retourne une erreur structurée
 *
 * Usage dans une Server Action :
 *   const authResult = await guardAction();
 *   if (!authResult.success) return authResult;
 *   const user = authResult.data;
 */
export async function guardAction(): Promise<ActionResult<AuthenticatedUser>> {
  const user = await getUserFromHeaders();
  if (!user) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }
  return { success: true, data: user };
}

export async function guardAdminAction(): Promise<ActionResult<AuthenticatedUser>> {
  const result = await guardAction();
  if (!result.success) return result;
  if (result.data.role !== "admin") {
    return { success: false, error: "Accès réservé au patron", code: "FORBIDDEN" };
  }
  return result;
}

export async function guardPermissionAction(
  permission: Permission
): Promise<ActionResult<AuthenticatedUser>> {
  const result = await guardAction();
  if (!result.success) return result;
  if (!hasPermission(result.data.role, permission)) {
    return {
      success: false,
      error:   `Permission manquante : ${permission}`,
      code:    "FORBIDDEN",
    };
  }
  return result;
}

export async function guardSuperAdminAction(): Promise<ActionResult<AuthenticatedSuperAdmin>> {
  const admin = await getSuperAdminFromHeaders();
  if (!admin) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }
  return { success: true, data: admin };
}