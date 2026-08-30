import { and, desc, eq, gt, sql, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, ensureDatabaseReady, pool } from "@/db";
import {
  adminLogs,
  adminSettings,
  blockedEntities,
  events,
  reigns,
  reports,
  thrones,
} from "@/db/schema";
import { seedThrones } from "@/db/seed-data";
import { generatePublicId } from "@/lib/id";
import { canonicalUrl } from "@/lib/format";

export async function logAdminAction(
  action: string,
  targetType: string,
  targetId: string,
  beforeSummary?: string | null,
  afterSummary?: string | null,
) {
  try {
    await ensureDatabaseReady(pool);
    await db.insert(adminLogs).values({
      id: randomUUID(),
      actor: "admin",
      action,
      targetType,
      targetId,
      beforeSummary: beforeSummary ?? null,
      afterSummary: afterSummary ?? null,
    });
  } catch (err) {
    console.error("Failed to write admin log:", err);
  }
}

export async function getAdminLogs(limit = 25) {
  return db
    .select()
    .from(adminLogs)
    .orderBy(desc(adminLogs.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Dashboard Statistics & Overview
// ---------------------------------------------------------------------------

export async function getAdminDashboardStats() {
  await ensureDatabaseReady(pool);
  const allThrones = await db.select().from(thrones);
  const liveThronesCount = allThrones.filter((t) => t.status === "live").length;
  const suspendedThronesCount = allThrones.filter((t) => t.status === "suspended").length;
  const unpaidDefaultsCount = allThrones.filter(
    (t) => t.stakeCents === 0 && t.kingName === t.defaultKingName,
  ).length;

  const currentPaidReigns = await db
    .select()
    .from(reigns)
    .where(and(eq(reigns.status, "current"), gt(reigns.amountCents, 0)));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [visits7dRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(and(inArray(events.type, ["throne_view", "reign_view"]), gt(events.createdAt, sevenDaysAgo)));

  const [clicks7dRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(and(inArray(events.type, ["throne_click", "reign_click"]), gt(events.createdAt, sevenDaysAgo)));

  const openReportsList = await db
    .select()
    .from(reports)
    .where(eq(reports.status, "pending"))
    .orderBy(desc(reports.createdAt))
    .limit(10);

  const recentTakeoversList = await db
    .select({
      id: reigns.id,
      publicId: reigns.publicId,
      kingName: reigns.kingName,
      kingUrl: reigns.kingUrl,
      amountCents: reigns.amountCents,
      paidAt: reigns.paidAt,
      status: reigns.status,
      throneId: reigns.throneId,
      fromName: reigns.fromName,
    })
    .from(reigns)
    .where(gt(reigns.amountCents, 0))
    .orderBy(desc(reigns.paidAt))
    .limit(8);

  const recentLogs = await getAdminLogs(10);

  return {
    counts: {
      liveThrones: liveThronesCount,
      suspendedThrones: suspendedThronesCount,
      currentPaidReigns: currentPaidReigns.length,
      unpaidDefaults: unpaidDefaultsCount,
      visits7d: Number(visits7dRow?.count ?? 0),
      clicks7d: Number(clicks7dRow?.count ?? 0),
      openReports: openReportsList.length,
    },
    openReports: openReportsList,
    recentTakeovers: recentTakeoversList,
    recentLogs,
  };
}

// ---------------------------------------------------------------------------
// Thrones Management
// ---------------------------------------------------------------------------

export async function getAllThronesForAdmin() {
  const list = await db
    .select()
    .from(thrones)
    .orderBy(desc(thrones.updatedAt));

  return list;
}

export async function createThroneAdmin(data: {
  category: string;
  slug: string;
  definition: string;
  defaultKingName: string;
  defaultKingUrl: string;
  defaultKingXHandle?: string;
  aliases?: string;
}) {
  const slug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  
  const [existing] = await db
    .select({ id: thrones.id })
    .from(thrones)
    .where(eq(thrones.slug, slug))
    .limit(1);

  if (existing) {
    throw new Error(`A throne with slug "${slug}" already exists.`);
  }

  const throneId = randomUUID();
  const canonicalKingUrl = canonicalUrl(data.defaultKingUrl.trim());

  await db.insert(thrones).values({
    id: throneId,
    slug,
    category: data.category.trim(),
    definition: data.definition.trim(),
    source: "seeded",
    status: "live",
    aliases: data.aliases ? data.aliases.trim() : null,
    defaultKingName: data.defaultKingName.trim(),
    defaultKingUrl: canonicalKingUrl,
    defaultKingXHandle: data.defaultKingXHandle?.replace(/^@/, "").trim() || null,
    kingName: data.defaultKingName.trim(),
    kingUrl: canonicalKingUrl,
    stakeCents: 0,
  });

  const publicId = generatePublicId(10);
  await db.insert(reigns).values({
    id: randomUUID(),
    publicId,
    throneId,
    kingName: data.defaultKingName.trim(),
    kingUrl: canonicalKingUrl,
    productXHandle: data.defaultKingXHandle?.replace(/^@/, "").trim() || null,
    amountCents: 0,
    status: "current",
  });

  await logAdminAction(
    "create_throne",
    "throne",
    slug,
    null,
    `Created throne "${data.category}" with default king ${data.defaultKingName} ($0)`,
  );

  return { slug, throneId };
}

export async function editThroneAdmin(
  currentSlug: string,
  data: {
    category?: string;
    newSlug?: string;
    definition?: string;
    defaultKingName?: string;
    defaultKingUrl?: string;
    defaultKingXHandle?: string;
    aliases?: string;
  },
) {
  const [throne] = await db
    .select()
    .from(thrones)
    .where(eq(thrones.slug, currentSlug))
    .limit(1);

  if (!throne) throw new Error("Throne not found.");

  const updates: Partial<typeof thrones.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.category) updates.category = data.category.trim();
  if (data.definition !== undefined) updates.definition = data.definition.trim();
  if (data.defaultKingName) updates.defaultKingName = data.defaultKingName.trim();
  if (data.defaultKingUrl) updates.defaultKingUrl = canonicalUrl(data.defaultKingUrl.trim());
  if (data.defaultKingXHandle !== undefined) {
    updates.defaultKingXHandle = data.defaultKingXHandle ? data.defaultKingXHandle.replace(/^@/, "").trim() : null;
  }
  if (data.aliases !== undefined) updates.aliases = data.aliases.trim() || null;

  if (data.newSlug && data.newSlug !== currentSlug) {
    const cleanNewSlug = data.newSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const [clash] = await db
      .select({ id: thrones.id })
      .from(thrones)
      .where(eq(thrones.slug, cleanNewSlug))
      .limit(1);
    if (clash) throw new Error(`Slug "${cleanNewSlug}" already in use.`);
    updates.slug = cleanNewSlug;
    
    // Add old slug to aliases
    const currentAliases = (throne.aliases || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!currentAliases.includes(currentSlug)) {
      currentAliases.push(currentSlug);
      updates.aliases = currentAliases.join(", ");
    }
  }

  await db.update(thrones).set(updates).where(eq(thrones.id, throne.id));

  await logAdminAction(
    "edit_throne",
    "throne",
    currentSlug,
    `Category: ${throne.category}, King: ${throne.defaultKingName}`,
    `Updated to: ${JSON.stringify(updates)}`,
  );
}

export async function suspendThrone(slug: string) {
  const [throne] = await db.select().from(thrones).where(eq(thrones.slug, slug)).limit(1);
  if (!throne) throw new Error("Throne not found");

  await db
    .update(thrones)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(thrones.id, throne.id));

  await logAdminAction("suspend_throne", "throne", slug, `Status was: ${throne.status}`, "Status: suspended");
}

export async function restoreThrone(slug: string) {
  const [throne] = await db.select().from(thrones).where(eq(thrones.slug, slug)).limit(1);
  if (!throne) throw new Error("Throne not found");

  await db
    .update(thrones)
    .set({ status: "live", updatedAt: new Date() })
    .where(eq(thrones.id, throne.id));

  await logAdminAction("restore_throne", "throne", slug, `Status was: ${throne.status}`, "Status: live");
}

export async function deleteThroneAdmin(slug: string) {
  const allLive = await db.select().from(thrones).where(eq(thrones.status, "live"));
  if (allLive.length <= 1 && allLive.some((t) => t.slug === slug)) {
    throw new Error("Safety check: Cannot delete the last remaining live throne.");
  }

  const [throne] = await db.select().from(thrones).where(eq(thrones.slug, slug)).limit(1);
  if (!throne) throw new Error("Throne not found");

  // Check if throne ever had a paid takeover
  const paidReigns = await db
    .select()
    .from(reigns)
    .where(and(eq(reigns.throneId, throne.id), gt(reigns.amountCents, 0)));

  if (paidReigns.length > 0) {
    throw new Error(
      "Cannot permanently delete a throne with paid historical reigns. Suspend and archive it instead.",
    );
  }

  // Safe to delete unpaid throne
  await db.delete(thrones).where(eq(thrones.id, throne.id));
  await logAdminAction("delete_throne", "throne", slug, `Deleted unpaid throne ${throne.category}`, "Deleted");
}

export async function mergeThronesAdmin(
  sourceSlug: string,
  targetSlug: string,
  paidReignAction: "archive" | "reassign" = "archive",
) {
  if (sourceSlug === targetSlug) throw new Error("Source and target thrones cannot be the same.");

  const [source] = await db.select().from(thrones).where(eq(thrones.slug, sourceSlug)).limit(1);
  const [target] = await db.select().from(thrones).where(eq(thrones.slug, targetSlug)).limit(1);

  if (!source || !target) throw new Error("Source or target throne missing.");

  // Merge aliases
  const targetAliases = (target.aliases || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!targetAliases.includes(source.slug)) targetAliases.push(source.slug);
  if (!targetAliases.includes(source.category)) targetAliases.push(source.category);

  if (source.aliases) {
    source.aliases.split(",").forEach((a) => {
      const clean = a.trim();
      if (clean && !targetAliases.includes(clean)) targetAliases.push(clean);
    });
  }

  await db
    .update(thrones)
    .set({ aliases: targetAliases.join(", "), updatedAt: new Date() })
    .where(eq(thrones.id, target.id));

  if (paidReignAction === "reassign") {
    await db
      .update(reigns)
      .set({ throneId: target.id })
      .where(eq(reigns.throneId, source.id));
  } else {
    // Archive / suspend source reigns
    await db
      .update(reigns)
      .set({ status: "former", endedAt: new Date() })
      .where(and(eq(reigns.throneId, source.id), eq(reigns.status, "current")));
  }

  // Suspend source throne
  await db
    .update(thrones)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(thrones.id, source.id));

  await logAdminAction(
    "merge_thrones",
    "throne",
    `${sourceSlug} -> ${targetSlug}`,
    `Source: ${source.category}, Target: ${target.category}`,
    `Merged aliases, source suspended, paid reigns action: ${paidReignAction}`,
  );
}

export async function setFeaturedThrone(slug: string) {
  await db
    .insert(adminSettings)
    .values({ key: "featured_throne", value: slug, updatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { value: slug, updatedAt: new Date() } });

  await logAdminAction("set_featured_throne", "setting", slug, null, `Featured throne set to ${slug}`);
}

export async function getFeaturedThroneSlug(): Promise<string | null> {
  const [row] = await db
    .select()
    .from(adminSettings)
    .where(eq(adminSettings.key, "featured_throne"))
    .limit(1);
  return row?.value ?? null;
}

export async function resetToDefaultKing(slug: string) {
  return db.transaction(async (tx) => {
    const [throne] = await tx
      .select()
      .from(thrones)
      .where(eq(thrones.slug, slug))
      .for("update");

    if (!throne) throw new Error("Throne not found");

    // Mark current active reign as former
    await tx
      .update(reigns)
      .set({ status: "former", endedAt: new Date() })
      .where(and(eq(reigns.throneId, throne.id), eq(reigns.status, "current")));

    // Revert throne to default king
    await tx
      .update(thrones)
      .set({
        kingName: throne.defaultKingName,
        kingUrl: throne.defaultKingUrl,
        stakeCents: 0,
        reignStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(thrones.id, throne.id));

    await logAdminAction(
      "reset_to_default",
      "throne",
      slug,
      `Former king: ${throne.kingName} ($${throne.stakeCents / 100})`,
      `Reset to default king ${throne.defaultKingName} ($0)`,
    );
  });
}

export async function restorePreviousKing(slug: string) {
  return db.transaction(async (tx) => {
    const [throne] = await tx
      .select()
      .from(thrones)
      .where(eq(thrones.slug, slug))
      .for("update");

    if (!throne) throw new Error("Throne not found");

    const allReigns = await tx
      .select()
      .from(reigns)
      .where(eq(reigns.throneId, throne.id))
      .orderBy(desc(reigns.paidAt));

    if (allReigns.length <= 1) {
      await resetToDefaultKing(slug);
      return;
    }

    const currentReign = allReigns[0];
    const previousReign = allReigns[1];

    await tx
      .update(reigns)
      .set({ status: "suspended", endedAt: new Date() })
      .where(eq(reigns.id, currentReign.id));

    await tx
      .update(reigns)
      .set({ status: "current", endedAt: null })
      .where(eq(reigns.id, previousReign.id));

    await tx
      .update(thrones)
      .set({
        kingName: previousReign.kingName,
        kingUrl: previousReign.kingUrl,
        stakeCents: previousReign.amountCents,
        reignStartedAt: previousReign.startedAt,
        updatedAt: new Date(),
      })
      .where(eq(thrones.id, throne.id));

    await logAdminAction(
      "restore_previous_king",
      "throne",
      slug,
      `Suspended current: ${currentReign.kingName}`,
      `Restored: ${previousReign.kingName} ($${previousReign.amountCents / 100})`,
    );
  });
}

export async function forceReign(
  slug: string,
  name: string,
  url: string,
  amountCents: number,
  offerHeadline = "Administrative Takeover",
  offerPitch = "Special placement verified by court administration.",
  ctaLabel = "Try Product",
  productXHandle?: string,
  productLogoUrl?: string,
) {
  return db.transaction(async (tx) => {
    const [throne] = await tx
      .select()
      .from(thrones)
      .where(eq(thrones.slug, slug))
      .for("update");

    if (!throne) throw new Error("Throne not found");

    await tx
      .update(reigns)
      .set({ status: "former", endedAt: new Date() })
      .where(and(eq(reigns.throneId, throne.id), eq(reigns.status, "current")));

    const publicId = generatePublicId(10);
    const cleanUrl = canonicalUrl(url);

    await tx.insert(reigns).values({
      id: randomUUID(),
      publicId,
      throneId: throne.id,
      kingName: name,
      kingUrl: cleanUrl,
      productXHandle: productXHandle ? productXHandle.replace(/^@/, "").trim() : null,
      productLogoUrl: productLogoUrl ? canonicalUrl(productLogoUrl) : null,
      offerHeadline,
      offerPitch,
      ctaLabel,
      amountCents,
      fromName: throne.kingName,
      fromUrl: throne.kingUrl,
      fromStakeCents: throne.stakeCents,
      status: "current",
    });

    await tx
      .update(thrones)
      .set({
        kingName: name,
        kingUrl: cleanUrl,
        stakeCents: amountCents,
        reignStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(thrones.id, throne.id));

    await logAdminAction(
      "force_reign",
      "throne",
      slug,
      `Old King: ${throne.kingName} ($${throne.stakeCents / 100})`,
      `Forced King: ${name} ($${amountCents / 100}), publicId: ${publicId}`,
    );
  });
}

// ---------------------------------------------------------------------------
// Reigns Management
// ---------------------------------------------------------------------------

export async function getAllReignsForAdmin() {
  const list = await db
    .select({
      id: reigns.id,
      publicId: reigns.publicId,
      throneId: reigns.throneId,
      kingName: reigns.kingName,
      kingUrl: reigns.kingUrl,
      productXHandle: reigns.productXHandle,
      productLogoUrl: reigns.productLogoUrl,
      offerHeadline: reigns.offerHeadline,
      offerPitch: reigns.offerPitch,
      ctaLabel: reigns.ctaLabel,
      amountCents: reigns.amountCents,
      fromName: reigns.fromName,
      fromStakeCents: reigns.fromStakeCents,
      startedAt: reigns.startedAt,
      endedAt: reigns.endedAt,
      paidAt: reigns.paidAt,
      recordedVisits: reigns.recordedVisits,
      outboundClicks: reigns.outboundClicks,
      status: reigns.status,
      category: thrones.category,
      slug: thrones.slug,
    })
    .from(reigns)
    .leftJoin(thrones, eq(reigns.throneId, thrones.id))
    .orderBy(desc(reigns.paidAt))
    .limit(100);

  return list;
}

export async function editReignAdmin(
  publicId: string,
  data: {
    offerHeadline?: string;
    offerPitch?: string;
    ctaLabel?: string;
    kingName?: string;
    kingUrl?: string;
    productXHandle?: string;
    productLogoUrl?: string;
  },
) {
  const [reign] = await db.select().from(reigns).where(eq(reigns.publicId, publicId)).limit(1);
  if (!reign) throw new Error("Reign not found");

  const updates: Partial<typeof reigns.$inferInsert> = {};
  if (data.offerHeadline !== undefined) updates.offerHeadline = data.offerHeadline.trim() || null;
  if (data.offerPitch !== undefined) updates.offerPitch = data.offerPitch.trim() || null;
  if (data.ctaLabel !== undefined) updates.ctaLabel = data.ctaLabel.trim() || null;
  if (data.kingName) updates.kingName = data.kingName.trim();
  if (data.kingUrl) updates.kingUrl = canonicalUrl(data.kingUrl.trim());
  if (data.productXHandle !== undefined) {
    updates.productXHandle = data.productXHandle ? data.productXHandle.replace(/^@/, "").trim() : null;
  }
  if (data.productLogoUrl !== undefined) {
    updates.productLogoUrl = data.productLogoUrl ? canonicalUrl(data.productLogoUrl.trim()) : null;
  }

  await db.update(reigns).set(updates).where(eq(reigns.id, reign.id));

  // If this reign is current, update throne king fields too
  if (reign.status === "current") {
    const throneUpdates: Partial<typeof thrones.$inferInsert> = { updatedAt: new Date() };
    if (data.kingName) throneUpdates.kingName = data.kingName.trim();
    if (data.kingUrl) throneUpdates.kingUrl = canonicalUrl(data.kingUrl.trim());
    await db.update(thrones).set(throneUpdates).where(eq(thrones.id, reign.throneId));
  }

  await logAdminAction(
    "edit_reign",
    "reign",
    publicId,
    `Headline: ${reign.offerHeadline}`,
    `Updated to: ${JSON.stringify(updates)}`,
  );
}

export async function suspendReign(publicId: string) {
  const [reign] = await db.select().from(reigns).where(eq(reigns.publicId, publicId)).limit(1);
  if (!reign) throw new Error("Reign not found");

  await db.update(reigns).set({ status: "suspended" }).where(eq(reigns.id, reign.id));

  // If this was current sitting reign, revert throne to default
  if (reign.status === "current") {
    const [throne] = await db.select().from(thrones).where(eq(thrones.id, reign.throneId)).limit(1);
    if (throne) {
      await db
        .update(thrones)
        .set({
          kingName: throne.defaultKingName,
          kingUrl: throne.defaultKingUrl,
          stakeCents: 0,
          reignStartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(thrones.id, throne.id));
    }
  }

  await logAdminAction("suspend_reign", "reign", publicId, `Status was: ${reign.status}`, "Status: suspended");
}

export async function restoreReign(publicId: string) {
  const [reign] = await db.select().from(reigns).where(eq(reigns.publicId, publicId)).limit(1);
  if (!reign) throw new Error("Reign not found");

  await db.update(reigns).set({ status: "former" }).where(eq(reigns.id, reign.id));
  await logAdminAction("restore_reign", "reign", publicId, "Status was: suspended", "Status: former");
}

export async function deleteReignAdmin(publicId: string) {
  const [reign] = await db.select().from(reigns).where(eq(reigns.publicId, publicId)).limit(1);
  if (!reign) throw new Error("Reign not found");

  const throneId = reign.throneId;
  const reignId = reign.id;
  const isSittingKing = reign.status === "current";

  // Hard delete the reign row
  await db.delete(reigns).where(eq(reigns.id, reignId));

  // If it was the sitting king, revert
  if (isSittingKing) {
    const [throne] = await db.select().from(thrones).where(eq(thrones.id, throneId)).limit(1);
    if (throne) {
      // Find the most recent remaining reign for this throne (status: 'former')
      const [prevReign] = await db
        .select()
        .from(reigns)
        .where(and(eq(reigns.throneId, throneId), eq(reigns.status, "former")))
        .orderBy(desc(reigns.paidAt))
        .limit(1);

      if (prevReign) {
        // Promote previous reign to current
        await db
          .update(reigns)
          .set({ status: "current", endedAt: null })
          .where(eq(reigns.id, prevReign.id));

        // Revert throne to the previous reign
        await db
          .update(thrones)
          .set({
            kingName: prevReign.kingName,
            kingUrl: prevReign.kingUrl,
            stakeCents: prevReign.amountCents,
            reignStartedAt: prevReign.startedAt,
            updatedAt: new Date(),
          })
          .where(eq(thrones.id, throneId));
      } else {
        // Revert to unpaid default king
        await db
          .update(thrones)
          .set({
            kingName: throne.defaultKingName,
            kingUrl: throne.defaultKingUrl,
            stakeCents: 0,
            reignStartedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(thrones.id, throneId));
      }
    }
  }

  await logAdminAction(
    "delete_reign",
    "reign",
    publicId,
    `King: ${reign.kingName}`,
    `Hard deleted. ${isSittingKing ? "Throne reverted." : "Was not sitting king."}`,
  );
}

// ---------------------------------------------------------------------------
// Products / Domains Registry
// ---------------------------------------------------------------------------

export async function getProductRegistry() {
  const allReigns = await db.select().from(reigns);
  const allThrones = await db.select().from(thrones);
  const blockedList = await db.select().from(blockedEntities);

  const blockedMap = new Map(blockedList.map((b) => [b.value.toLowerCase(), b]));

  const domainMap = new Map<
    string,
    {
      domain: string;
      displayName: string;
      xHandle: string | null;
      linkedThrones: Set<string>;
      campaignsCount: number;
      totalSpentCents: number;
      isBlocked: boolean;
      strikeNotes: string | null;
    }
  >();

  function extractDomain(urlStr: string) {
    try {
      return new URL(urlStr).hostname.toLowerCase();
    } catch {
      return urlStr.toLowerCase();
    }
  }

  // From default thrones
  for (const t of allThrones) {
    const domain = extractDomain(t.defaultKingUrl);
    if (!domainMap.has(domain)) {
      const blocked = blockedMap.get(domain) || (t.defaultKingXHandle ? blockedMap.get(t.defaultKingXHandle.toLowerCase()) : undefined);
      domainMap.set(domain, {
        domain,
        displayName: t.defaultKingName,
        xHandle: t.defaultKingXHandle ?? null,
        linkedThrones: new Set([t.category]),
        campaignsCount: 0,
        totalSpentCents: 0,
        isBlocked: Boolean(blocked),
        strikeNotes: blocked?.notes ?? null,
      });
    } else {
      domainMap.get(domain)!.linkedThrones.add(t.category);
    }
  }

  // From reigns
  for (const r of allReigns) {
    const domain = extractDomain(r.kingUrl);
    const blocked = blockedMap.get(domain) || (r.productXHandle ? blockedMap.get(r.productXHandle.toLowerCase()) : undefined);
    
    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        domain,
        displayName: r.kingName,
        xHandle: r.productXHandle ?? null,
        linkedThrones: new Set(),
        campaignsCount: 1,
        totalSpentCents: r.amountCents,
        isBlocked: Boolean(blocked),
        strikeNotes: blocked?.notes ?? null,
      });
    } else {
      const entry = domainMap.get(domain)!;
      entry.campaignsCount += 1;
      entry.totalSpentCents += r.amountCents;
      if (blocked) {
        entry.isBlocked = true;
        entry.strikeNotes = blocked.notes ?? null;
      }
    }
  }

  return Array.from(domainMap.values()).map((p) => ({
    ...p,
    linkedThrones: Array.from(p.linkedThrones),
  }));
}

export async function blockEntity(
  entityType: "domain" | "handle",
  value: string,
  reason: string,
  notes?: string,
) {
  const cleanVal = value.toLowerCase().trim().replace(/^@/, "");
  await db
    .insert(blockedEntities)
    .values({
      id: randomUUID(),
      entityType,
      value: cleanVal,
      reason,
      notes: notes ?? null,
    })
    .onDuplicateKeyUpdate({
      set: { reason, notes: notes ?? null },
    });

  await logAdminAction(
    "block_entity",
    entityType,
    cleanVal,
    null,
    `Blocked ${entityType} "${cleanVal}". Reason: ${reason}`,
  );
}

export async function unblockEntity(value: string) {
  const cleanVal = value.toLowerCase().trim().replace(/^@/, "");
  await db.delete(blockedEntities).where(eq(blockedEntities.value, cleanVal));
  await logAdminAction("unblock_entity", "entity", cleanVal, "Was blocked", "Unblocked");
}

// ---------------------------------------------------------------------------
// Reports Queue
// ---------------------------------------------------------------------------

export async function getReportsList() {
  return db
    .select()
    .from(reports)
    .orderBy(desc(reports.createdAt))
    .limit(100);
}

export async function actionReport(
  reportId: string,
  actionType: "dismiss" | "suspend_throne" | "restore_previous" | "refund_flag" | "block_domain",
  notes?: string,
) {
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!report) throw new Error("Report not found");

  if (actionType === "dismiss") {
    await db.update(reports).set({ status: "reviewed" }).where(eq(reports.id, reportId));
  } else {
    await db.update(reports).set({ status: "actioned", details: notes ? `${report.details ?? ""}\n[Admin]: ${notes}` : report.details }).where(eq(reports.id, reportId));
  }

  await logAdminAction("action_report", "report", reportId, `Reason: ${report.reason}`, `Action: ${actionType}, Notes: ${notes || ""}`);
}

export async function repairSeed() {
  for (const item of seedThrones) {
    const [existing] = await db
      .select()
      .from(thrones)
      .where(eq(thrones.slug, item.slug))
      .limit(1);

    if (!existing) {
      const throneId = randomUUID();
      await db.insert(thrones).values({
        id: throneId,
        slug: item.slug,
        category: item.category,
        definition: item.definition,
        source: "seeded",
        status: "live",
        aliases: item.aliases ?? null,
        defaultKingName: item.kingName,
        defaultKingUrl: item.kingUrl,
        defaultKingXHandle: item.defaultKingXHandle ?? null,
        kingName: item.kingName,
        kingUrl: item.kingUrl,
        stakeCents: 0,
      });

      await db.insert(reigns).values({
        id: randomUUID(),
        publicId: generatePublicId(10),
        throneId,
        kingName: item.kingName,
        kingUrl: item.kingUrl,
        productXHandle: item.defaultKingXHandle ?? null,
        amountCents: 0,
        status: "current",
      });
    }
  }
}
