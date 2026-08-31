import { createHash } from "node:crypto";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
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
}): Promise<{ recorded: boolean; reignId?: string; kingUrl?: string }> {
  if (params.userAgent && isBot(params.userAgent)) {
    return { recorded: false };
  }

  const isView = params.type === "throne_view" || params.type === "reign_view";
  const isClick = params.type === "throne_click" || params.type === "reign_click";

  try {
    return await db.transaction(async (tx) => {
      // Lock the throne for the whole operation. This makes the check/insert/counter
      // sequence atomic across tabs, devices, and multiple application instances.
      let throneId = params.throneId;
      if (!throneId && params.reignId) {
        const [reign] = await tx
          .select({ throneId: reigns.throneId })
          .from(reigns)
          .where(eq(reigns.id, params.reignId))
          .for("update")
          .limit(1);
        throneId = reign?.throneId;
      }
      if (!throneId) return { recorded: false };

      const [throne] = await tx
        .select({ id: thrones.id, kingUrl: thrones.kingUrl })
        .from(thrones)
        .where(eq(thrones.id, throneId))
        .for("update")
        .limit(1);
      if (!throne) return { recorded: false };

      // A throne event without an explicit reign belongs to the reign sitting at
      // commit time, avoiding attribution to a reign that was just dethroned.
      let reignId = params.reignId;
      if (!reignId) {
        const [currentReign] = await tx
          .select({ id: reigns.id })
          .from(reigns)
          .where(and(eq(reigns.throneId, throneId), eq(reigns.status, "current")))
          .orderBy(desc(reigns.paidAt))
          .limit(1);
        reignId = currentReign?.id;
      }

      const targetId = reignId ?? throneId;
      const dayHash = computeDayHash(params.visitorId, params.type, targetId);
      const [existing] = await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.visitorDayHash, dayHash))
        .limit(1);

      if (existing) {
        return { recorded: false, reignId, kingUrl: throne.kingUrl };
      }

      await tx.insert(events).values({
        type: params.type,
        throneId,
        reignId: reignId ?? null,
        visitorDayHash: dayHash,
      });

      if (isView) {
        await tx
          .update(thrones)
          .set({ recordedVisits: sql`${thrones.recordedVisits} + 1` })
          .where(eq(thrones.id, throneId));
      } else if (isClick) {
        await tx
          .update(thrones)
          .set({ outboundClicks: sql`${thrones.outboundClicks} + 1` })
          .where(eq(thrones.id, throneId));
      }

      if (reignId && isView) {
        await tx
          .update(reigns)
          .set({ recordedVisits: sql`${reigns.recordedVisits} + 1` })
          .where(eq(reigns.id, reignId));
      } else if (reignId && isClick) {
        await tx
          .update(reigns)
          .set({ outboundClicks: sql`${reigns.outboundClicks} + 1` })
          .where(eq(reigns.id, reignId));
      }

      return { recorded: true, reignId, kingUrl: throne.kingUrl };
    });
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
        inArray(events.type, ["throne_view", "reign_view"]),
        gt(events.createdAt, sevenDaysAgo),
      ),
    );

  const [clickRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(
      and(
        eq(events.throneId, throneId),
        inArray(events.type, ["throne_click", "reign_click"]),
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
        inArray(events.type, ["throne_view", "reign_view"]),
        gt(events.createdAt, sevenDaysAgo),
      ),
    );

  const [clickRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(
      and(
        eq(events.reignId, reignId),
        inArray(events.type, ["throne_click", "reign_click"]),
        gt(events.createdAt, sevenDaysAgo),
      ),
    );

  return {
    visits7d: Number(visitRow?.count ?? 0),
    clicks7d: Number(clickRow?.count ?? 0),
  };
}
