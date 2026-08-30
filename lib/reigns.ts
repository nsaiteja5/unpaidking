import { eq } from "drizzle-orm";
import { db, ensureDatabaseReady, pool } from "@/db";
import { reigns, thrones } from "@/db/schema";
import { getReignStats7d } from "@/lib/events";
import type { Throne, Reign } from "@/lib/thrones";

export type ReignDetails = {
  reign: Reign;
  throne: Throne;
  isCurrentlySitting: boolean;
  durationHeld: string;
  dethronedBy?: { name: string; date: Date } | null;
  visits7d: number;
  clicks7d: number;
};

export function formatDuration(start: Date, end: Date): string {
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "less than a minute";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"}`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

export async function getReignByPublicId(publicId: string): Promise<ReignDetails | undefined> {
  await ensureDatabaseReady(pool);
  const [reign] = await db
    .select()
    .from(reigns)
    .where(eq(reigns.publicId, publicId))
    .limit(1);

  if (!reign) return undefined;

  const [throne] = await db
    .select()
    .from(thrones)
    .where(eq(thrones.id, reign.throneId))
    .limit(1);

  if (!throne) return undefined;

  const isCurrentlySitting = reign.status === "current" && throne.kingUrl === reign.kingUrl;
  const endDate = reign.endedAt ?? (isCurrentlySitting ? new Date() : throne.updatedAt);
  const durationHeld = formatDuration(reign.startedAt, endDate);

  let dethronedBy: { name: string; date: Date } | null = null;
  if (!isCurrentlySitting) {
    dethronedBy = {
      name: throne.kingName,
      date: reign.endedAt ?? throne.reignStartedAt,
    };
  }

  const stats = await getReignStats7d(reign.id);

  return {
    reign,
    throne,
    isCurrentlySitting,
    durationHeld,
    dethronedBy,
    visits7d: stats.visits7d,
    clicks7d: stats.clicks7d,
  };
}
