import { pool, ensureDatabaseReady } from "@/db";

async function main() {
  console.log("Checking and ensuring database tables...");
  await ensureDatabaseReady(pool);
  console.log("✓ Database is ready and fully initialized.");
  await pool.end();
}

main().catch((err) => {
  console.error("Database setup failed:", err);
  process.exit(1);
});
