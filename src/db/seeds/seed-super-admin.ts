/**
 * SEED — Super Admin initial
 *
 * Crée le premier super admin de la plateforme.
 * À exécuter une seule fois après le déploiement initial.
 *
 * Usage: npx tsx src/db/seeds/seed-super-admin.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../index";
import { platformAdmins } from "../schema/platform-admins";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@boutique-saas.cm";
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "Ballon2026!";

  if (!password) {
    throw new Error("SUPER_ADMIN_PASSWORD manquant dans .env.local");
  }

  console.log("🔍 Vérification super admin existant...");

  const existing = await db
    .select({ id: platformAdmins.id })
    .from(platformAdmins)
    .where(eq(platformAdmins.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`✅ Super admin déjà existant: ${email}`);
    return;
  }

  console.log("🔐 Hashage du mot de passe...");
  const passwordHash = await bcrypt.hash(password, 12);

  console.log("👤 Création du super admin...");
  const [admin] = await db
    .insert(platformAdmins)
    .values({
      firstName:    "Super",
      lastName:     "Admin",
      email,
      passwordHash,
      accessLevel:  "super",
      isActive:     true,
    })
    .returning({ id: platformAdmins.id, email: platformAdmins.email });

  console.log(`✅ Super admin créé avec succès !`);
  console.log(`   ID    : ${admin.id}`);
  console.log(`   Email : ${admin.email}`);
  console.log(`⚠️  Changez le mot de passe en production !`);
}

seedSuperAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erreur seed super admin:", err);
    process.exit(1);
  });