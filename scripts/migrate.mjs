import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createPool } from "mysql2/promise";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = createPool(process.env.DATABASE_URL);
const db = drizzle(pool, { mode: "default" });

try {
  await migrate(db, { migrationsFolder: "db/migrations" });
  console.log("Migrations complete.");
} finally {
  await pool.end();
}
