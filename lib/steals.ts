import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, ensureDatabaseReady, pool } from "@/db";
import { checkouts, reigns, thrones } from "@/db/schema";
import { generatePublicId } from "@/lib/id";
import { extractRegistrableDomain } from "@/lib/guardrails";
import { nextStealPrice } from "@/lib/format";

export type ApplyStealResult =
  | {
      outcome: "sitting";
      slug: string;
      category: string;
      previous: string;
      price: number;
      oldStake: number;
      name: string;
      publicId: string;
      isNewThrone?: boolean;
    }
  | { outcome: "stale" }
  | { outcome: "missing" };

export async function applySteal(checkoutId: string): Promise<ApplyStealResult> {
  await ensureDatabaseReady(pool);
  return db.transaction(async (tx) => {
    const [checkout] = await tx
      .select()
      .from(checkouts)
      .where(eq(checkouts.id, checkoutId))
      .for("update");

    if (!checkout) return { outcome: "missing" };

    // Idempotency: check if already applied
    const [alreadyApplied] = await tx
      .select()
      .from(reigns)
      .where(eq(reigns.checkoutId, checkoutId))
      .limit(1);

    if (alreadyApplied) {
      const [throne] = await tx
        .select()
        .from(thrones)
        .where(eq(thrones.id, alreadyApplied.throneId));

      return throne
        ? {
            outcome: "sitting",
            slug: throne.slug,
            category: throne.category,
            previous: alreadyApplied.fromName ?? throne.defaultKingName,
            price: alreadyApplied.amountCents,
            oldStake: alreadyApplied.fromStakeCents ?? 0,
            name: alreadyApplied.kingName,
            publicId: alreadyApplied.publicId,
          }
        : { outcome: "missing" };
    }

    if (checkout.status === "stale" || checkout.status === "canceled") {
      return { outcome: "stale" };
    }

    // 1. Existing throne takeover
    if (checkout.throneId) {
      const [throne] = await tx
        .select()
        .from(thrones)
        .where(eq(thrones.id, checkout.throneId))
        .for("update");

      if (!throne) return { outcome: "missing" };

      const isUnpaidDefault = throne.stakeCents === 0 && throne.kingName === throne.defaultKingName;
      const requiredPrice = nextStealPrice(throne.stakeCents, isUnpaidDefault);

      if (checkout.amountCents !== requiredPrice || checkout.url === throne.kingUrl) {
        await tx.update(checkouts).set({ status: "stale" }).where(eq(checkouts.id, checkout.id));
        return { outcome: "stale" };
      }

      await tx.update(checkouts).set({ status: "paid" }).where(eq(checkouts.id, checkout.id));

      // Mark current reigns as former
      await tx
        .update(reigns)
        .set({ status: "former", endedAt: new Date() })
        .where(and(eq(reigns.throneId, throne.id), eq(reigns.status, "current")));

      const publicId = generatePublicId(10);

      await tx.insert(reigns).values({
        id: randomUUID(),
        publicId,
        throneId: throne.id,
        userId: checkout.userId ?? null,
        kingName: checkout.name,
        kingUrl: checkout.url,
        productXHandle: checkout.productXHandle,
        productLogoUrl: checkout.productLogoUrl,
        offerHeadline: checkout.offerHeadline,
        offerPitch: checkout.offerPitch,
        ctaLabel: checkout.ctaLabel,
        offerExpiresAt: checkout.offerExpiresAt,
        amountCents: checkout.amountCents,
        fromName: throne.kingName,
        fromUrl: throne.kingUrl,
        fromStakeCents: throne.stakeCents,
        startedAt: new Date(),
        paidAt: new Date(),
        status: "current",
        checkoutId: checkout.id,
      });

      await tx
        .update(thrones)
        .set({
          kingName: checkout.name,
          kingUrl: checkout.url,
          stakeCents: checkout.amountCents,
          reignStartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(thrones.id, throne.id));

      return {
        outcome: "sitting",
        slug: throne.slug,
        category: throne.category,
        previous: throne.kingName,
        price: checkout.amountCents,
        oldStake: throne.stakeCents,
        name: checkout.name,
        publicId,
      };
    }

    // 2. New throne proposed creation
    if (checkout.proposedThrone) {
      const prop = checkout.proposedThrone;
      let baseSlug = prop.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      if (!baseSlug) baseSlug = "category";

      // Check if slug already exists
      const [existingSlug] = await tx
        .select({ id: thrones.id })
        .from(thrones)
        .where(eq(thrones.slug, baseSlug))
        .limit(1);

      const slug = existingSlug ? `${baseSlug}-${generatePublicId(4)}` : baseSlug;
      const throneId = randomUUID();
      const buyerPublicId = generatePublicId(10);
      const seedPublicId = generatePublicId(10);

      // Insert into thrones FIRST to satisfy foreign key constraint
      await tx.insert(thrones).values({
        id: throneId,
        slug,
        category: prop.name,
        definition: prop.definition,
        source: "user_created",
        status: "live",
        defaultKingName: prop.defaultRivalName,
        defaultKingUrl: prop.defaultRivalUrl,
        defaultKingXHandle: prop.defaultRivalXHandle ?? null,
        createdByDomain: extractRegistrableDomain(checkout.url),
        createdByXHandle: checkout.productXHandle ? checkout.productXHandle.replace(/^@/, "").toLowerCase() : null,
        kingName: checkout.name,
        kingUrl: checkout.url,
        stakeCents: 900,
        reignStartedAt: new Date(),
        updatedAt: new Date(),
      });

      // Update checkout status and link throneId
      await tx.update(checkouts).set({ status: "paid", throneId }).where(eq(checkouts.id, checkout.id));

      // Default rival $0 seed reign
      await tx.insert(reigns).values({
        id: randomUUID(),
        publicId: seedPublicId,
        throneId,
        kingName: prop.defaultRivalName,
        kingUrl: prop.defaultRivalUrl,
        productXHandle: prop.defaultRivalXHandle ?? null,
        amountCents: 0,
        status: "former",
        startedAt: new Date(Date.now() - 60000),
        endedAt: new Date(),
        paidAt: new Date(Date.now() - 60000),
      });

      // Buyer $9 paid reign
      await tx.insert(reigns).values({
        id: randomUUID(),
        publicId: buyerPublicId,
        throneId,
        userId: checkout.userId ?? null,
        kingName: checkout.name,
        kingUrl: checkout.url,
        productXHandle: checkout.productXHandle,
        productLogoUrl: checkout.productLogoUrl,
        offerHeadline: checkout.offerHeadline,
        offerPitch: checkout.offerPitch,
        ctaLabel: checkout.ctaLabel,
        offerExpiresAt: checkout.offerExpiresAt,
        amountCents: 900,
        fromName: prop.defaultRivalName,
        fromUrl: prop.defaultRivalUrl,
        fromStakeCents: 0,
        startedAt: new Date(),
        paidAt: new Date(),
        status: "current",
        checkoutId: checkout.id,
      });

      return {
        outcome: "sitting",
        slug,
        category: prop.name,
        previous: prop.defaultRivalName,
        price: 900,
        oldStake: 0,
        name: checkout.name,
        publicId: buyerPublicId,
        isNewThrone: true,
      };
    }

    return { outcome: "missing" };
  });
}
