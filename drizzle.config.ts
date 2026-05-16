import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Charge .env.local en dehors du contexte Next.js (ex: CLI drizzle-kit)
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL manquant dans .env.local");
}

export default defineConfig({
  // Dossier des fichiers de schéma Drizzle
  schema: "./src/db/schema/index.ts",

  // Dossier de sortie des migrations SQL générées
  out: "./src/db/migrations",

  // Driver PostgreSQL
  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  // Affiche les requêtes SQL dans le terminal en dev
  verbose: true,

  // Vérifie la cohérence du schéma avant migration
  strict: true,
});
