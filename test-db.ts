import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function test() {
  try {
    const result = await sql`SELECT 1 as ok`;
    console.log("✅ Connexion OK", result);
  } catch (err) {
    console.error("❌ Connexion FAILED", err);
  } finally {
    await sql.end();
  }
}

test();