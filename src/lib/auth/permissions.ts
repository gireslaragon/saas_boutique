import type { UserRole, AdminAccessLevel } from "./jwt";

// ─── Définition des permissions ───────────────────────────────────────────────

export type Permission =
  // Ventes
  | "sales:create"
  | "sales:view"
  | "sales:cancel"
  | "sales:cancel:any"       // admin peut annuler n'importe quelle vente
  // Ajustements
  | "adjustments:create"
  | "adjustments:create:past" // admin peut ajuster des ventes anciennes
  // Stock
  | "stock:view"
  | "stock:restock"
  | "stock:declare-loss"     // admin uniquement
  | "stock:adjust"           // admin uniquement
  // Produits
  | "products:view"
  | "products:create"
  | "products:update"
  | "products:deactivate"
  // Catégories
  | "categories:manage"
  // Factures
  | "invoices:view"
  | "invoices:download"
  // Personnel
  | "staff:view"
  | "staff:manage"
  | "staff:reset-password"
  // Dashboard
  | "dashboard:view"
  | "analytics:view"
  // Boutique
  | "settings:view"
  | "settings:update"
  // Session de caisse
  | "cash-session:manage"
  // Profil
  | "profile:view"
  | "profile:update";

// ─── Matrice de permissions par rôle ─────────────────────────────────────────

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Toutes les permissions
    "sales:create", "sales:view", "sales:cancel", "sales:cancel:any",
    "adjustments:create", "adjustments:create:past",
    "stock:view", "stock:restock", "stock:declare-loss", "stock:adjust",
    "products:view", "products:create", "products:update", "products:deactivate",
    "categories:manage",
    "invoices:view", "invoices:download",
    "staff:view", "staff:manage", "staff:reset-password",
    "dashboard:view", "analytics:view",
    "settings:view", "settings:update",
    "cash-session:manage",
    "profile:view", "profile:update",
  ],

  cashier: [
    // Permissions limitées à la caisse
    "sales:create", "sales:view", "sales:cancel",
    "adjustments:create",        // uniquement sur ventes du jour
    "stock:view",                // lecture seule
    "products:view",             // lecture seule
    "invoices:view", "invoices:download",
    "cash-session:manage",
    "profile:view", "profile:update",
  ],
};

// ─── Permissions super admin plateforme ──────────────────────────────────────

export type PlatformPermission =
  | "tenants:view"
  | "tenants:create"
  | "tenants:suspend"
  | "tenants:activate"
  | "subscriptions:manage"
  | "platform-admins:manage"
  | "impersonation:start"
  | "notifications:publish"
  | "analytics:platform"
  | "billing:view"
  | "audit-logs:view";

const PLATFORM_ACCESS_PERMISSIONS: Record<AdminAccessLevel, PlatformPermission[]> = {
  super: [
    "tenants:view", "tenants:create", "tenants:suspend", "tenants:activate",
    "subscriptions:manage", "platform-admins:manage", "impersonation:start",
    "notifications:publish", "analytics:platform", "billing:view", "audit-logs:view",
  ],
  support: [
    "tenants:view", "impersonation:start", "audit-logs:view",
  ],
  finance: [
    "tenants:view", "analytics:platform", "billing:view",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Vérifie si un rôle tenant a une permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Vérifie si un rôle tenant a toutes les permissions données
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Vérifie si un super admin a une permission plateforme
 */
export function hasPlatformPermission(
  accessLevel: AdminAccessLevel,
  permission: PlatformPermission
): boolean {
  return PLATFORM_ACCESS_PERMISSIONS[accessLevel]?.includes(permission) ?? false;
}

/**
 * Retourne toutes les permissions d'un rôle
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}