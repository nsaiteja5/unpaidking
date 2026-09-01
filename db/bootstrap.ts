import type { Pool } from "mysql2/promise";
import { randomBytes, randomUUID } from "node:crypto";
import { seedThrones } from "./seed-data";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
function generatePublicId(length = 10): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

let bootstrapPromise: Promise<void> | null = null;

export async function ensureDatabaseReady(pool: Pool): Promise<void> {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      // 1. Users table
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

      // 2. Thrones table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`thrones\` (
          \`id\` char(36) NOT NULL,
          \`slug\` varchar(80) NOT NULL,
          \`category\` varchar(80) NOT NULL,
          \`definition\` varchar(255) NOT NULL DEFAULT '',
          \`source\` enum('seeded','user_created') NOT NULL DEFAULT 'seeded',
          \`status\` enum('live','suspended') NOT NULL DEFAULT 'live',
          \`aliases\` varchar(512) DEFAULT NULL,
          \`default_king_name\` varchar(40) NOT NULL,
          \`default_king_url\` varchar(2048) NOT NULL,
          \`default_king_x_handle\` varchar(40) DEFAULT NULL,
          \`created_by_domain\` varchar(255) DEFAULT NULL,
          \`created_by_x_handle\` varchar(40) DEFAULT NULL,
          \`king_name\` varchar(40) NOT NULL,
          \`king_url\` varchar(2048) NOT NULL,
          \`stake_cents\` int NOT NULL DEFAULT 0,
          \`recorded_visits\` int NOT NULL DEFAULT 0,
          \`outbound_clicks\` int NOT NULL DEFAULT 0,
          \`reign_started_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`thrones_slug_unique\` (\`slug\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Reigns table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`reigns\` (
          \`id\` char(36) NOT NULL,
          \`public_id\` varchar(24) NOT NULL,
          \`throne_id\` char(36) NOT NULL,
          \`user_id\` char(36) DEFAULT NULL,
          \`king_name\` varchar(40) NOT NULL,
          \`king_url\` varchar(2048) NOT NULL,
          \`product_x_handle\` varchar(40) DEFAULT NULL,
          \`product_logo_url\` varchar(2048) DEFAULT NULL,
          \`offer_headline\` varchar(120) DEFAULT NULL,
          \`offer_pitch\` text DEFAULT NULL,
          \`cta_label\` varchar(40) DEFAULT NULL,
          \`offer_expires_at\` timestamp NULL DEFAULT NULL,
          \`amount_cents\` int NOT NULL,
          \`from_name\` varchar(40) DEFAULT NULL,
          \`from_url\` varchar(2048) DEFAULT NULL,
          \`from_stake_cents\` int DEFAULT NULL,
          \`started_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`ended_at\` timestamp NULL DEFAULT NULL,
          \`paid_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`recorded_visits\` int NOT NULL DEFAULT 0,
          \`outbound_clicks\` int NOT NULL DEFAULT 0,
          \`status\` enum('current','former','suspended') NOT NULL DEFAULT 'current',
          \`checkout_id\` char(36) DEFAULT NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`reigns_public_id_unique\` (\`public_id\`),
          UNIQUE KEY \`reigns_checkout_id_unique\` (\`checkout_id\`),
          KEY \`reigns_throne_id_idx\` (\`throne_id\`),
          KEY \`reigns_public_id_idx\` (\`public_id\`),
          KEY \`reigns_user_id_idx\` (\`user_id\`),
          CONSTRAINT \`reigns_throne_id_thrones_id_fk\` FOREIGN KEY (\`throne_id\`) REFERENCES \`thrones\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Checkouts table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`checkouts\` (
          \`id\` char(36) NOT NULL,
          \`throne_id\` char(36) DEFAULT NULL,
          \`user_id\` char(36) DEFAULT NULL,
          \`proposed_throne\` json DEFAULT NULL,
          \`name\` varchar(40) NOT NULL,
          \`url\` varchar(2048) NOT NULL,
          \`product_x_handle\` varchar(40) DEFAULT NULL,
          \`product_logo_url\` varchar(2048) DEFAULT NULL,
          \`offer_headline\` varchar(120) NOT NULL,
          \`offer_pitch\` text NOT NULL,
          \`cta_label\` varchar(40) NOT NULL,
          \`offer_expires_at\` timestamp NULL DEFAULT NULL,
          \`expected_previous_king\` varchar(40) DEFAULT NULL,
          \`expected_previous_stake_cents\` int DEFAULT NULL,
          \`amount_cents\` int NOT NULL,
          \`kind\` enum('steal','defend') NOT NULL DEFAULT 'steal',
          \`status\` enum('pending','paid','stale','canceled') NOT NULL DEFAULT 'pending',
          \`client_ip\` varchar(64) DEFAULT NULL,
          \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`checkouts_throne_id_thrones_id_fk\` FOREIGN KEY (\`throne_id\`) REFERENCES \`thrones\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 5. Events table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`events\` (
          \`id\` char(36) NOT NULL,
          \`type\` enum('throne_view','reign_view','throne_click','reign_click') NOT NULL,
          \`throne_id\` char(36) DEFAULT NULL,
          \`reign_id\` char(36) DEFAULT NULL,
          \`visitor_day_hash\` varchar(64) NOT NULL,
          \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`events_day_hash_idx\` (\`visitor_day_hash\`),
          KEY \`events_throne_id_idx\` (\`throne_id\`),
          KEY \`events_reign_id_idx\` (\`reign_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 6. Reports table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`reports\` (
          \`id\` char(36) NOT NULL,
          \`throne_id\` char(36) DEFAULT NULL,
          \`reign_id\` char(36) DEFAULT NULL,
          \`reason\` varchar(255) NOT NULL,
          \`details\` text DEFAULT NULL,
          \`status\` enum('pending','reviewed','actioned') NOT NULL DEFAULT 'pending',
          \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 7. Admin Logs table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`admin_logs\` (
          \`id\` char(36) NOT NULL,
          \`actor\` varchar(40) NOT NULL DEFAULT 'admin',
          \`action\` varchar(80) NOT NULL,
          \`target_type\` varchar(40) NOT NULL,
          \`target_id\` varchar(80) NOT NULL,
          \`before_summary\` text DEFAULT NULL,
          \`after_summary\` text DEFAULT NULL,
          \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`admin_logs_created_at_idx\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 8. Blocked Entities table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`blocked_entities\` (
          \`id\` char(36) NOT NULL,
          \`entity_type\` enum('domain','handle') NOT NULL,
          \`value\` varchar(255) NOT NULL,
          \`reason\` varchar(255) DEFAULT NULL,
          \`notes\` text DEFAULT NULL,
          \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`blocked_entities_value_unique\` (\`value\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 9. Admin Settings table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`admin_settings\` (
          \`key\` varchar(80) NOT NULL,
          \`value\` text NOT NULL,
          \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`key\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Backward compatibility column checks for existing databases
      try {
        const [reignsCols] = await pool.query("SHOW COLUMNS FROM `reigns` LIKE 'user_id'");
        if (Array.isArray(reignsCols) && reignsCols.length === 0) {
          await pool.query("ALTER TABLE `reigns` ADD COLUMN `user_id` char(36) DEFAULT NULL AFTER `throne_id`, ADD KEY `reigns_user_id_idx` (`user_id`)");
        }
      } catch {}

      try {
        const [checkoutsCols] = await pool.query("SHOW COLUMNS FROM `checkouts` LIKE 'user_id'");
        if (Array.isArray(checkoutsCols) && checkoutsCols.length === 0) {
          await pool.query("ALTER TABLE `checkouts` ADD COLUMN `user_id` char(36) DEFAULT NULL AFTER `throne_id`");
        }
      } catch {}

      try {
        const [checkoutsKindCols] = await pool.query("SHOW COLUMNS FROM `checkouts` LIKE 'kind'");
        if (Array.isArray(checkoutsKindCols) && checkoutsKindCols.length === 0) {
          await pool.query("ALTER TABLE `checkouts` ADD COLUMN `kind` enum('steal','defend') NOT NULL DEFAULT 'steal' AFTER `amount_cents`");
        }
      } catch {}

      // Check if starter thrones need to be seeded
      const [rows] = await pool.query("SELECT COUNT(*) AS count FROM `thrones`");
      const count = Array.isArray(rows) && rows[0] && typeof rows[0] === "object" && "count" in rows[0]
        ? Number((rows[0] as { count: number | string }).count)
        : 0;

      if (count === 0) {
        console.log("[db] Empty database detected. Auto-seeding starter thrones...");
        for (const item of seedThrones) {
          const throneId = randomUUID();
          await pool.execute(
            `INSERT INTO \`thrones\` (
              \`id\`, \`slug\`, \`category\`, \`definition\`, \`source\`, \`status\`, \`aliases\`,
              \`default_king_name\`, \`default_king_url\`, \`default_king_x_handle\`,
              \`king_name\`, \`king_url\`, \`stake_cents\`
            ) VALUES (?, ?, ?, ?, 'seeded', 'live', ?, ?, ?, ?, ?, ?, 0)`,
            [
              throneId,
              item.slug,
              item.category,
              item.definition,
              item.aliases ?? null,
              item.kingName,
              item.kingUrl,
              item.defaultKingXHandle ?? null,
              item.kingName,
              item.kingUrl,
            ],
          );

          const reignId = randomUUID();
          const publicId = generatePublicId(10);
          await pool.execute(
            `INSERT INTO \`reigns\` (
              \`id\`, \`public_id\`, \`throne_id\`, \`king_name\`, \`king_url\`, \`product_x_handle\`,
              \`amount_cents\`, \`status\`
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 'current')`,
            [
              reignId,
              publicId,
              throneId,
              item.kingName,
              item.kingUrl,
              item.defaultKingXHandle ?? null,
            ],
          );
        }
        console.log(`[db] Auto-seeded ${seedThrones.length} starter thrones.`);
      }
    } catch (err) {
      console.error("[db] Database initialization error:", err);
      bootstrapPromise = null;
      throw err;
    }
  })();

  return bootstrapPromise;
}
