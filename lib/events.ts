import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, reigns, thrones } from "@/db/schema";

export function isBot(userAgent: string): boolean {
  return /bot|crawler|spider|facebookexternalhit|twitterbot|slackbot|discordbot|applebot|curl|wget|python|postman/i.test(
    userAgent,
  );
}

export function computeDayHash(visitorId: string, type: string, targetId: string): string {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return createHash("sha256")
    .update(`${visitorId}:${dateStr}:${type}:${targetId}`)
    .digest("hex");
}

export async function recordEvent(params: {
  type: "throne_view" | "reign_view" | "throne_click" | "reign_click";
  throneId?: string;
  reignId?: string;
  visitorId: string;
  userAgent?: string;
}): Promise<{ recorded: boolean }> {
  if (params.userAgent && isBot(params.userAgent)) {
    return { recorded: false };
  }

  const targetId = params.reignId ?? params.throneId;
  if (!targetId) return { recorded: false };

  const dayHash = computeDayHash(params.visitorId, params.type, targetId);

  try {
    // Check if already recorded in the current 24-hour day bucket
    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.visitorDayHash, dayHash))
      .limit(1);

    if (existing) {
      return { recorded: false };
    }

    // Insert event
    await db.insert(events).values({
      type: params.type,
      throneId: params.throneId ?? null,
      reignId: params.reignId ?? null,
      visitorDayHash: dayHash,
    });

    // Update aggregate counters
    if (params.type === "throne_view" && params.throneId) {
      await db
        .update(thrones)
        .set({ recordedVisits: sql`${thrones.recordedVisits} + 1` })
        .where(eq(thrones.id, params.throneId));
    } else if (params.type === "throne_click" && params.throneId) {
      await db
        .update(thrones)
        .set({ outboundClicks: sql`${thrones.outboundClicks} + 1` })
        .where(eq(thrones.id, params.throneId));
    } else if (params.type === "reign_view" && params.reignId) {
      await db
        .update(reigns)
        .set({ recordedVisits: sql`${reigns.recordedVisits} + 1` })
        .where(eq(reigns.id, params.reignId));
    } else if (params.type === "reign_click" && params.reignId) {
      await db
        .update(reigns)
        .set({ outboundClicks: sql`${reigns.outboundClicks} + 1` })
        .where(eq(reigns.id, params.reignId));
    }

    return { recorded: true };
  } catch (error) {
    console.error("Failed to record event:", error);
    return { recorded: false };
  }
}

export async function getThroneStats7d(throneId: string): Promise<{ visits7d: number; clicks7d: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [visitRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(
      and(
        eq(events.throneId, throneId),
        eq(events.type, "throne_view"),
        gt(events.createdAt, sevenDaysAgo),
      ),
    );

  const [clickRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(
      and(
        eq(events.throneId, throneId),
        eq(events.type, "throne_click"),
        gt(events.createdAt, sevenDaysAgo),
      ),
    );

  return {
    visits7d: Number(visitRow?.count ?? 0),
    clicks7d: Number(clickRow?.count ?? 0),
  };
}

export async function getReignStats7d(reignId: string): Promise<{ visits7d: number; clicks7d: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [visitRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(
      and(
        eq(events.reignId, reignId),
        eq(events.type, "reign_view"),
        gt(events.createdAt, sevenDaysAgo),
      ),
    );

  const [clickRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(
      and(
        eq(events.reignId, reignId),
        eq(events.type, "reign_click"),
        gt(events.createdAt, sevenDaysAgo),
      ),
    );

  return {
    visits7d: Number(visitRow?.count ?? 0),
    clicks7d: Number(clickRow?.count ?? 0),
  };
}
