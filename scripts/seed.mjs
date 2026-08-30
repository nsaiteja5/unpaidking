import { randomBytes, randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { createPool } from "mysql2/promise";

const seedThrones = [
  {
    slug: "saas-boilerplates",
    category: "SaaS boilerplates",
    kingName: "ShipFast",
    kingUrl: "https://shipfa.st",
    definition: "Next.js and React boilerplates for building and launching SaaS apps fast.",
    defaultKingXHandle: "marc_louvion",
    aliases: "starter kit, boilerplate, nextjs boilerplate, saas starter",
  },
  {
    slug: "testimonial-tools",
    category: "Testimonial tools",
    kingName: "Senja",
    kingUrl: "https://senja.io",
    definition: "Customer testimonial collection, wall of love widgets, and social proof.",
    defaultKingXHandle: "senja_io",
    aliases: "testimonials, reviews widget, social proof, wall of love",
  },
  {
    slug: "waitlist-tools",
    category: "Waitlist tools",
    kingName: "Viral Loops",
    kingUrl: "https://viral-loops.com",
    definition: "Pre-launch waitlists, viral referral campaigns, and lead milestone widgets.",
    defaultKingXHandle: "viralloops",
    aliases: "waitlist, viral waitlist, referral marketing, prelaunch",
  },
  {
    slug: "feedback-boards",
    category: "Feedback boards",
    kingName: "Canny",
    kingUrl: "https://canny.io",
    definition: "Customer feedback boards, feature voting, public roadmaps, and release notes.",
    defaultKingXHandle: "cannyHQ",
    aliases: "feature requests, user feedback, roadmap voting, feedback board",
  },
  {
    slug: "changelog-tools",
    category: "Changelog tools",
    kingName: "Beamer",
    kingUrl: "https://www.getbeamer.com",
    definition: "Product changelog widgets, in-app notification centers, and announcement bars.",
    defaultKingXHandle: "getbeamer",
    aliases: "changelog, product updates, release notes, in-app notifications",
  },
  {
    slug: "uptime-monitors",
    category: "Uptime monitors",
    kingName: "UptimeRobot",
    kingUrl: "https://uptimerobot.com",
    definition: "Website uptime monitoring, SSL monitoring, and public status pages.",
    defaultKingXHandle: "uptimerobot",
    aliases: "status page, ping monitor, uptime check, heartbeat monitor",
  },
  {
    slug: "affiliate-tracking",
    category: "Affiliate tracking",
    kingName: "Rewardful",
    kingUrl: "https://www.getrewardful.com",
    definition: "Affiliate and referral tracking software for Stripe and SaaS subscriptions.",
    defaultKingXHandle: "rewardful",
    aliases: "affiliate program, referral software, partner tracking, commission software",
  },
  {
    slug: "social-schedulers",
    category: "Social schedulers",
    kingName: "Buffer",
    kingUrl: "https://buffer.com",
    definition: "Social media scheduling, content publishing, and analytics across channels.",
    defaultKingXHandle: "buffer",
    aliases: "social media queue, twitter scheduler, post scheduler, buffer alternative",
  },
];

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
function generatePublicId(length = 10) {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = createPool(process.env.DATABASE_URL);

try {
  // Drop and re-create schema to ensure clean state with new fields and no stale demo data
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  await pool.query("DROP TABLE IF EXISTS `events`");
  await pool.query("DROP TABLE IF EXISTS `reports`");
  await pool.query("DROP TABLE IF EXISTS `reigns`");
  await pool.query("DROP TABLE IF EXISTS `checkouts`");
  await pool.query("DROP TABLE IF EXISTS `thrones`");
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");

  await pool.query(`
    CREATE TABLE \`thrones\` (
      \`id\` char(36) NOT NULL,
      \`slug\` varchar(80) NOT NULL,
      \`category\` varchar(80) NOT NULL,
      \`definition\` varchar(255) NOT NULL DEFAULT '',
      \`source\` enum('seeded','user_created') NOT NULL DEFAULT 'seeded',
      \`status\` enum('live','suspended') NOT NULL DEFAULT 'live',
      \`aliases\` varchar(512),
      \`default_king_name\` varchar(40) NOT NULL,
      \`default_king_url\` varchar(2048) NOT NULL,
      \`default_king_x_handle\` varchar(40),
      \`created_by_domain\` varchar(255),
      \`created_by_x_handle\` varchar(40),
      \`king_name\` varchar(40) NOT NULL,
      \`king_url\` varchar(2048) NOT NULL,
      \`stake_cents\` int NOT NULL DEFAULT 0,
      \`recorded_visits\` int NOT NULL DEFAULT 0,
      \`outbound_clicks\` int NOT NULL DEFAULT 0,
      \`reign_started_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`thrones_slug_unique\` (\`slug\`)
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE \`reigns\` (
      \`id\` char(36) NOT NULL,
      \`public_id\` varchar(24) NOT NULL,
      \`throne_id\` char(36) NOT NULL,
      \`king_name\` varchar(40) NOT NULL,
      \`king_url\` varchar(2048) NOT NULL,
      \`product_x_handle\` varchar(40),
      \`product_logo_url\` varchar(2048),
      \`offer_headline\` varchar(120),
      \`offer_pitch\` text,
      \`cta_label\` varchar(40),
      \`offer_expires_at\` timestamp NULL,
      \`amount_cents\` int NOT NULL,
      \`from_name\` varchar(40),
      \`from_url\` varchar(2048),
      \`from_stake_cents\` int,
      \`started_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`ended_at\` timestamp NULL,
      \`paid_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`recorded_visits\` int NOT NULL DEFAULT 0,
      \`outbound_clicks\` int NOT NULL DEFAULT 0,
      \`status\` enum('current','former','suspended') NOT NULL DEFAULT 'current',
      \`checkout_id\` char(36),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`reigns_public_id_unique\` (\`public_id\`),
      UNIQUE KEY \`reigns_checkout_id_unique\` (\`checkout_id\`),
      INDEX \`reigns_throne_id_idx\` (\`throne_id\`),
      INDEX \`reigns_public_id_idx\` (\`public_id\`),
      CONSTRAINT \`reigns_throne_id_thrones_id_fk\` FOREIGN KEY (\`throne_id\`) REFERENCES \`thrones\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE \`checkouts\` (
      \`id\` char(36) NOT NULL,
      \`throne_id\` char(36),
      \`proposed_throne\` json,
      \`name\` varchar(40) NOT NULL,
      \`url\` varchar(2048) NOT NULL,
      \`product_x_handle\` varchar(40),
      \`product_logo_url\` varchar(2048),
      \`offer_headline\` varchar(120) NOT NULL,
      \`offer_pitch\` text NOT NULL,
      \`cta_label\` varchar(40) NOT NULL,
      \`offer_expires_at\` timestamp NULL,
      \`expected_previous_king\` varchar(40),
      \`expected_previous_stake_cents\` int,
      \`amount_cents\` int NOT NULL,
      \`status\` enum('pending','paid','stale','canceled') NOT NULL DEFAULT 'pending',
      \`client_ip\` varchar(64),
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`checkouts_throne_id_thrones_id_fk\` FOREIGN KEY (\`throne_id\`) REFERENCES \`thrones\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE \`events\` (
      \`id\` char(36) NOT NULL,
      \`type\` enum('throne_view','reign_view','throne_click','reign_click') NOT NULL,
      \`throne_id\` char(36),
      \`reign_id\` char(36),
      \`visitor_day_hash\` varchar(64) NOT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`events_day_hash_idx\` (\`visitor_day_hash\`),
      INDEX \`events_throne_id_idx\` (\`throne_id\`),
      INDEX \`events_reign_id_idx\` (\`reign_id\`)
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE \`reports\` (
      \`id\` char(36) NOT NULL,
      \`throne_id\` char(36),
      \`reign_id\` char(36),
      \`reason\` varchar(255) NOT NULL,
      \`details\` text,
      \`status\` enum('pending','reviewed','actioned') NOT NULL DEFAULT 'pending',
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB;
  `);

  console.log("Tables created successfully.");

  for (const item of seedThrones) {
    const throneId = randomUUID();
    await pool.execute(
      `INSERT INTO thrones (
        id, slug, category, definition, source, status, aliases,
        default_king_name, default_king_url, default_king_x_handle,
        king_name, king_url, stake_cents
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
      `INSERT INTO reigns (
        id, public_id, throne_id, king_name, king_url, product_x_handle,
        amount_cents, status
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

  console.log(`Seeded ${seedThrones.length} starter thrones.`);
} finally {
  await pool.end();
}
