/**
 * SEED — Premier tenant (boutique démo)
 *
 * Crée la boutique de l'oncle avec :
 * - Le tenant
 * - L'abonnement (trial 30 jours)
 * - Le patron (admin)
 * - Les 3 catégories par défaut
 *
 * Usage: npx tsx src/db/seeds/seed-tenant.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../index";
import { tenants } from "../schema/tenants";
import { tenantSubscriptions } from "../schema/tenant-subscriptions";
import { users } from "../schema/users";
import { categories } from "../schema/categories";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ─── Configuration du tenant démo ────────────────────────────────────────────

const TENANT_CONFIG = {
  name:                   "Boutique Chez Maman",
  slug:                   "chez-maman-yaounde",
  slogan:                 "La qualité au meilleur prix !",
  phone:                  "+237 6XX XXX XXX",
  address:                "Quartier Bastos, Rue des Fleurs",
  city:                   "Yaoundé",
  country:                "Cameroun",
  currency:               "FCFA",
  currencySymbol:         "F",
  invoicePrefix:          "BCM",
  groupInvoiceThreshold:  500,
  sessionTimeoutMinutes:  30,
};

const ADMIN_CONFIG = {
  firstName:  "Jean",
  lastName:   "Mballa",
  email:      "patron@chez-maman.cm",
  password:   "Patron2024!@#", // À changer après le premier login
};

const DEFAULT_CATEGORIES = [
  { name: "Épicerie générale", color: "#2E75B6", sortOrder: 1 },
  { name: "Mini-bar",          color: "#C0392B", sortOrder: 2 },
  { name: "Boulangerie",       color: "#E67E22", sortOrder: 3 },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seedTenant() {
  console.log("🏪 Création du tenant démo...\n");

  // 1. Vérifier si le tenant existe déjà
  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, TENANT_CONFIG.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`✅ Tenant '${TENANT_CONFIG.slug}' déjà existant.`);
    return;
  }

  // 2. Créer le tenant
  console.log("1️⃣  Création du tenant...");
  const [tenant] = await db
    .insert(tenants)
    .values({
      ...TENANT_CONFIG,
      isActive:             true,
      onboardingCompleted:  false,
    })
    .returning({ id: tenants.id });

  console.log(`   ✅ Tenant créé — ID: ${tenant.id}`);

  // 3. Créer l'abonnement (trial 30 jours)
  console.log("2️⃣  Création de l'abonnement (trial 30j)...");
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  await db.insert(tenantSubscriptions).values({
    tenantId:           tenant.id,
    plan:               "free",
    status:             "trial",
    trialEndsAt:        trialEnd,
    currentPeriodEnd:   trialEnd,
    maxProducts:        50,
    maxUsers:           2,
    maxCategories:      5,
    monthlyPrice:       "0",
    currency:           "FCFA",
  });

  console.log(`   ✅ Abonnement trial créé — expire le ${trialEnd.toLocaleDateString("fr-FR")}`);

  // 4. Créer le patron (admin)
  console.log("3️⃣  Création du patron...");
  const passwordHash = await bcrypt.hash(ADMIN_CONFIG.password, 12);

  const [admin] = await db
    .insert(users)
    .values({
      tenantId:     tenant.id,
      firstName:    ADMIN_CONFIG.firstName,
      lastName:     ADMIN_CONFIG.lastName,
      email:        ADMIN_CONFIG.email,
      passwordHash,
      role:         "admin",
      status:       "active",
    })
    .returning({ id: users.id, email: users.email });

  console.log(`   ✅ Patron créé — ${admin.email}`);

  // 5. Créer les catégories par défaut
  console.log("4️⃣  Création des catégories par défaut...");

  for (const cat of DEFAULT_CATEGORIES) {
    await db.insert(categories).values({
      tenantId:   tenant.id,
      name:       cat.name,
      color:      cat.color,
      sortOrder:  cat.sortOrder,
      isDefault:  true,
    });
    console.log(`   ✅ Catégorie: ${cat.name}`);
  }

  // ─── Résumé ─────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(50));
  console.log("🎉 Tenant démo créé avec succès !\n");
  console.log("📋 RÉCAPITULATIF:");
  console.log(`   Boutique  : ${TENANT_CONFIG.name}`);
  console.log(`   Slug      : ${TENANT_CONFIG.slug}`);
  console.log(`   Tenant ID : ${tenant.id}`);
  console.log(`   Admin ID  : ${admin.id}`);
  console.log("\n🔑 CONNEXION PATRON:");
  console.log(`   Email     : ${ADMIN_CONFIG.email}`);
  console.log(`   Password  : ${ADMIN_CONFIG.password}`);
  console.log("\n⚠️  Changez le mot de passe après le premier login !");
  console.log("═".repeat(50));
}

seedTenant()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erreur seed tenant:", err);
    process.exit(1);
  });