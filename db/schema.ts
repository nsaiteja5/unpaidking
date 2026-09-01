import { char, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";
import { randomUUID } from "node:crypto";

const id = (name: string) => char(name, { length: 36 }).$defaultFn(() => randomUUID());

export const users = mysqlTable("users", {
  id: id("id").primaryKey(),
  xUserId: varchar("x_user_id", { length: 64 }).notNull().unique(),
  xHandle: varchar("x_handle", { length: 40 }).notNull(),
  xName: varchar("x_name", { length: 80 }).notNull(),
  xAvatarUrl: varchar("x_avatar_url", { length: 2048 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("users_x_user_id_idx").on(table.xUserId),
  index("users_x_handle_idx").on(table.xHandle),
]);

export const thrones = mysqlTable("thrones", {
  id: id("id").primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  category: varchar("category", { length: 80 }).notNull(),
  definition: varchar("definition", { length: 255 }).notNull().default(""),
  source: mysqlEnum("source", ["seeded", "user_created"]).notNull().default("seeded"),
  status: mysqlEnum("status", ["live", "suspended"]).notNull().default("live"),
  aliases: varchar("aliases", { length: 512 }),
  defaultKingName: varchar("default_king_name", { length: 40 }).notNull(),
  defaultKingUrl: varchar("default_king_url", { length: 2048 }).notNull(),
  defaultKingXHandle: varchar("default_king_x_handle", { length: 40 }),
  createdByDomain: varchar("created_by_domain", { length: 255 }),
  createdByXHandle: varchar("created_by_x_handle", { length: 40 }),
  kingName: varchar("king_name", { length: 40 }).notNull(),
  kingUrl: varchar("king_url", { length: 2048 }).notNull(),
  stakeCents: int("stake_cents").notNull().default(0),
  recordedVisits: int("recorded_visits").notNull().default(0),
  outboundClicks: int("outbound_clicks").notNull().default(0),
  reignStartedAt: timestamp("reign_started_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reigns = mysqlTable("reigns", {
  id: id("id").primaryKey(),
  publicId: varchar("public_id", { length: 24 }).notNull().unique(),
  throneId: char("throne_id", { length: 36 }).notNull().references(() => thrones.id, { onDelete: "cascade" }),
  userId: char("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  kingName: varchar("king_name", { length: 40 }).notNull(),
  kingUrl: varchar("king_url", { length: 2048 }).notNull(),
  productXHandle: varchar("product_x_handle", { length: 40 }),
  productLogoUrl: varchar("product_logo_url", { length: 2048 }),
  offerHeadline: varchar("offer_headline", { length: 120 }),
  offerPitch: text("offer_pitch"),
  ctaLabel: varchar("cta_label", { length: 40 }),
  offerExpiresAt: timestamp("offer_expires_at"),
  amountCents: int("amount_cents").notNull(),
  fromName: varchar("from_name", { length: 40 }),
  fromUrl: varchar("from_url", { length: 2048 }),
  fromStakeCents: int("from_stake_cents"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
  recordedVisits: int("recorded_visits").notNull().default(0),
  outboundClicks: int("outbound_clicks").notNull().default(0),
  status: mysqlEnum("status", ["current", "former", "suspended"]).notNull().default("current"),
  checkoutId: char("checkout_id", { length: 36 }).unique(),
}, (table) => [
  index("reigns_throne_id_idx").on(table.throneId),
  index("reigns_public_id_idx").on(table.publicId),
  index("reigns_user_id_idx").on(table.userId),
]);

export const checkouts = mysqlTable("checkouts", {
  id: id("id").primaryKey(),
  throneId: char("throne_id", { length: 36 }).references(() => thrones.id, { onDelete: "cascade" }),
  userId: char("user_id", { length: 36 }),
  proposedThrone: json("proposed_throne").$type<{
    name: string;
    definition: string;
    defaultRivalName: string;
    defaultRivalUrl: string;
    defaultRivalXHandle?: string;
    competitorUrls: [string, string];
  }>(),
  name: varchar("name", { length: 40 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  productXHandle: varchar("product_x_handle", { length: 40 }),
  productLogoUrl: varchar("product_logo_url", { length: 2048 }),
  offerHeadline: varchar("offer_headline", { length: 120 }).notNull(),
  offerPitch: text("offer_pitch").notNull(),
  ctaLabel: varchar("cta_label", { length: 40 }).notNull(),
  offerExpiresAt: timestamp("offer_expires_at"),
  expectedPreviousKing: varchar("expected_previous_king", { length: 40 }),
  expectedPreviousStakeCents: int("expected_previous_stake_cents"),
  amountCents: int("amount_cents").notNull(),
  kind: mysqlEnum("kind", ["steal", "defend"]).notNull().default("steal"),
  status: mysqlEnum("status", ["pending", "paid", "stale", "canceled"]).notNull().default("pending"),
  clientIp: varchar("client_ip", { length: 64 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = mysqlTable("events", {
  id: id("id").primaryKey(),
  type: mysqlEnum("type", ["throne_view", "reign_view", "throne_click", "reign_click"]).notNull(),
  throneId: char("throne_id", { length: 36 }),
  reignId: char("reign_id", { length: 36 }),
  visitorDayHash: varchar("visitor_day_hash", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("events_day_hash_idx").on(table.visitorDayHash),
  index("events_throne_id_idx").on(table.throneId),
  index("events_reign_id_idx").on(table.reignId),
]);

export const reports = mysqlTable("reports", {
  id: id("id").primaryKey(),
  throneId: char("throne_id", { length: 36 }),
  reignId: char("reign_id", { length: 36 }),
  reason: varchar("reason", { length: 255 }).notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["pending", "reviewed", "actioned"]).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminLogs = mysqlTable("admin_logs", {
  id: id("id").primaryKey(),
  actor: varchar("actor", { length: 40 }).notNull().default("admin"),
  action: varchar("action", { length: 80 }).notNull(),
  targetType: varchar("target_type", { length: 40 }).notNull(),
  targetId: varchar("target_id", { length: 80 }).notNull(),
  beforeSummary: text("before_summary"),
  afterSummary: text("after_summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("admin_logs_created_at_idx").on(table.createdAt),
]);

export const blockedEntities = mysqlTable("blocked_entities", {
  id: id("id").primaryKey(),
  entityType: mysqlEnum("entity_type", ["domain", "handle"]).notNull(),
  value: varchar("value", { length: 255 }).notNull().unique(),
  reason: varchar("reason", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminSettings = mysqlTable("admin_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

