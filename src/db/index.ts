import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema/index";

/**
 * Singleton de connexion PostgreSQL
 *
 * En développement Next.js, le hot-reload crée de nouvelles instances
 * à chaque modification. Sans singleton, on sature les connexions PostgreSQL.
 *
 * Ce pattern stocke l'instance dans global pour la réutiliser.
 */

// Type global pour éviter les erreurs TypeScript
declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof drizzle> | undefined;
  // eslint-disable-next-line no-var
  var __client: ReturnType<typeof postgres> | undefined;
}

function createConnection() {
  const client = postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 20 : 5, // Pool de connexions
    idle_timeout: 20,                              // Ferme les connexions inactives après 20s
    connect_timeout: 10,                           // Timeout de connexion 10s
    prepare: false,                                // Requis pour certains hébergeurs (Supabase, etc.)
  });

  const db = drizzle(client, {
    schema,
    logger: env.NODE_ENV === "development", // Log les requêtes SQL en dev
  });

  return { client, db };
}

// Singleton : réutilise la connexion existante en dev
let db: ReturnType<typeof drizzle>;
let client: ReturnType<typeof postgres>;

if (env.NODE_ENV === "production") {
  // En production, on crée toujours une nouvelle instance (pas de global)
  const conn = createConnection();
  db = conn.db;
  client = conn.client;
} else {
  // En développement, on réutilise depuis global
  if (!global.__db) {
    const conn = createConnection();
    global.__db = conn.db;
    global.__client = conn.client;
  }
  db = global.__db;
  client = global.__client!;
}

export { db, client };

/**
 * Helper pour les transactions Drizzle
 *
 * Usage:
 * await withTransaction(async (tx) => {
 *   await tx.insert(sales).values(...)
 *   await tx.update(stockSnapshots).set(...)
 * })
 */
export async function withTransaction<T>(
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}