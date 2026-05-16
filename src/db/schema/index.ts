/**
 * INDEX DES SCHÉMAS DRIZZLE
 *
 * Ce fichier est le point d'entrée unique pour tous les schémas.
 * Il est référencé dans drizzle.config.ts et dans db/index.ts.
 *
 * Ordre d'import : du moins dépendant au plus dépendant
 * (évite les références circulaires à l'initialisation)
 */

// ── Niveau 0 : Plateforme SaaS (aucune dépendance inter-tenant)
export * from "./platform-admins";
export * from "./platform-events";
export * from "./platform-notifications";
export * from "./impersonation-sessions";

// ── Niveau 1 : Tenant (dépend de platform-admins)
export * from "./tenants";
export * from "./tenant-subscriptions";

// ── Niveau 2 : Utilisateurs tenant (dépend de tenants)
export * from "./users";
export * from "./categories";

// ── Niveau 3 : Produits (dépend de tenants + categories)
export * from "./products";
export * from "./product-variants";
export * from "./stock-snapshots";

// ── Niveau 4 : Sessions de caisse (dépend de tenants + users)
export * from "./cash-sessions";
export * from "./group-invoices";

// ── Niveau 5 : Ventes (dépend de tous les niveaux précédents)
export * from "./sales";
export * from "./sale-items";

// ── Niveau 6 : Ajustements (dépend de sales + variants)
export * from "./sale-adjustments";
export * from "./sale-adjustment-items";

// ── Niveau 7 : Mouvements de stock (dépend de sales + adjustments)
export * from "./stock-movements";

// ── Niveau 8 : Opérations (dépend de variants + users)
export * from "./restockings";
export * from "./stock-losses";

// ── Niveau 9 : Event Store (dépend de tenants + users)
export * from "./events";