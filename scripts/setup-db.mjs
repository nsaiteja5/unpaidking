import nextEnv from "@next/env";
import { createPool } from "mysql2/promise";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = createPool(process.env.DATABASE_URL);

try {
  console.log("Setting up database schema updates...");

  // 1. Create users table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` char(36) NOT NULL,
      \`x_user_id\` varchar(64) NOT NULL,
      \`x_handle\` varchar(40) NOT NULL,
      \`x_name\` varchar(80) NOT NULL,
      \`x_avatar_url\` varchar(2048) DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`users_x_user_id_unique\` (\`x_user_id\`),
      KEY \`users_x_user_id_idx\` (\`x_user_id\`),
      KEY \`users_x_handle_idx\` (\`x_handle\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("✓ users table verified");

  // 2. Add user_id to reigns if not exists
  const [reignsCols] = await pool.query(`SHOW COLUMNS FROM \`reigns\` LIKE 'user_id'`);
  if (!Array.isArray(reignsCols) || reignsCols.length === 0) {
    await pool.query(`
      ALTER TABLE \`reigns\`
      ADD COLUMN \`user_id\` char(36) DEFAULT NULL AFTER \`throne_id\`,
      ADD KEY \`reigns_user_id_idx\` (\`user_id\`);
    `);
    console.log("✓ user_id column added to reigns");
  } else {
    console.log("✓ reigns.user_id column already exists");
  }

  // 3. Add user_id to checkouts if not exists
  const [checkoutsCols] = await pool.query(`SHOW COLUMNS FROM \`checkouts\` LIKE 'user_id'`);
  if (!Array.isArray(checkoutsCols) || checkoutsCols.length === 0) {
    await pool.query(`
      ALTER TABLE \`checkouts\`
      ADD COLUMN \`user_id\` char(36) DEFAULT NULL AFTER \`throne_id\`;
    `);
    console.log("✓ user_id column added to checkouts");
  } else {
    console.log("✓ checkouts.user_id column already exists");
  }

  console.log("Database schema updates complete.");
} catch (err) {
  console.error("Database setup error:", err);
} finally {
  await pool.end();
}
