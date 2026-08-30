import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, ensureDatabaseReady, pool } from "@/db";
import { adminSettings, reigns, thrones } from "@/db/schema";
import { seedThrones } from "@/db/seed-data";
import { getThroneStats7d } from "@/lib/events";

export type Throne = typeof thrones.$inferSelect;
export type Reign = typeof reigns.$inferSelect;

export type ThroneView = Throne & {
  isDefault: boolean;
  currentReign: Reign | null;
  lastFromName: string | null;
  visits7d: number;
  clicks7d: number;
};

export function isDefaultKing(slug: string, name: string) {
  return seedThrones.find((seed) => seed.slug === slug)?.kingName === name;
}

export async function toThroneView(throne: Throne): Promise<ThroneView> {
  const [currentReign] = await db
    .select()
    .from(reigns)
    .where(and(eq(reigns.throneId, throne.id), eq(reigns.status, "current")))
    .orderBy(desc(reigns.paidAt))
    .limit(1);

  const [lastReign] = await db
    .select({ fromName: reigns.fromName })
    .from(reigns)
    .where(eq(reigns.throneId, throne.id))
    .orderBy(desc(reigns.paidAt))
    .limit(1);

  const isDefault = throne.stakeCents === 0 && throne.kingName === throne.defaultKingName;
  const stats = await getThroneStats7d(throne.id);

  return {
    ...throne,
    isDefault,
    currentReign: currentReign ?? null,
    lastFromName: lastReign?.fromName ?? null,
    visits7d: stats.visits7d,
    clicks7d: stats.clicks7d,
  };
}

export async function getThrones(): Promise<ThroneView[]> {
  await ensureDatabaseReady(pool);
  const all = await db
    .select()
    .from(thrones)
    .where(eq(thrones.status, "live"));

  const rows = await Promise.all(all.map(toThroneView));

  let featuredSlug: string | null = null;
  try {
    const [featuredRow] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, "featured_throne"))
      .limit(1);
    featuredSlug = featuredRow?.value ?? null;
  } catch {}

  // Sort: featured first, then starter thrones in seed order, then user-created alphabetically
  return rows.sort((a, b) => {
    if (featuredSlug) {
      if (a.slug === featuredSlug) return -1;
      if (b.slug === featuredSlug) return 1;
    }
    const seedIndexA = seedThrones.findIndex((s) => s.slug === a.slug);
    const seedIndexB = seedThrones.findIndex((s) => s.slug === b.slug);

    if (seedIndexA !== -1 && seedIndexB !== -1) {
      return seedIndexA - seedIndexB;
    }
    if (seedIndexA !== -1) return -1;
    if (seedIndexB !== -1) return 1;
    return a.category.localeCompare(b.category);
  });
}

export async function getStarterThrones(): Promise<ThroneView[]> {
  const starterSlugs = seedThrones.map((s) => s.slug);
  const thronesList = await getThrones();
  return thronesList.filter((t) => starterSlugs.includes(t.slug));
}

export async function searchThrones(query: string): Promise<ThroneView[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return getThrones();

  const all = await getThrones();
  return all
    .filter((t) => {
      const catMatch = t.category.toLowerCase().includes(trimmed);
      const defMatch = t.definition.toLowerCase().includes(trimmed);
      const aliasMatch = t.aliases ? t.aliases.toLowerCase().includes(trimmed) : false;
      const kingMatch = t.kingName.toLowerCase().includes(trimmed);
      return catMatch || defMatch || aliasMatch || kingMatch;
    })
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function getThrone(slug: string): Promise<Throne | undefined> {
  await ensureDatabaseReady(pool);
  const [throne] = await db
    .select()
    .from(thrones)
    .where(eq(thrones.slug, slug))
    .limit(1);
  return throne;
}

export async function getThroneView(slug: string): Promise<ThroneView | undefined> {
  const throne = await getThrone(slug);
  return throne ? toThroneView(throne) : undefined;
}

export async function getThroneReigns(throneId: string): Promise<Reign[]> {
  return db
    .select()
    .from(reigns)
    .where(eq(reigns.throneId, throneId))
    .orderBy(desc(reigns.paidAt))
    .limit(20);
}
