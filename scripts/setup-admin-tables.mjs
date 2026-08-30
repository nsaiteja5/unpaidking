import nextEnv from "@next/env";
import { createPool } from "mysql2/promise";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = createPool(process.env.DATABASE_URL);

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`admin_logs\` (
        \`id\` char(36) NOT NULL PRIMARY KEY,
        \`actor\` varchar(40) NOT NULL DEFAULT 'admin',
        \`action\` varchar(80) NOT NULL,
        \`target_type\` varchar(40) NOT NULL,
        \`target_id\` varchar(80) NOT NULL,
        \`before_summary\` text,
        \`after_summary\` text,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`admin_logs_created_at_idx\` (\`created_at\`)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`blocked_entities\` (
        \`id\` char(36) NOT NULL PRIMARY KEY,
        \`entity_type\` enum('domain', 'handle') NOT NULL,
        \`value\` varchar(255) NOT NULL UNIQUE,
        \`reason\` varchar(255),
        \`notes\` text,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`admin_settings\` (
        \`key\` varchar(80) NOT NULL PRIMARY KEY,
        \`value\` text NOT NULL,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    console.log("Admin tables initialized successfully.");
  } catch (err) {
    console.error("Error creating admin tables:", err);
  } finally {
    await pool.end();
  }
}

run();
