import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, ensureDatabaseReady, pool } from "@/db";
import { reigns, thrones } from "@/db/schema";
import { generatePublicId } from "@/lib/id";
import { canonicalUrl } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import {
  checkDuplicateCategory,
  extractRegistrableDomain,
  validateDisallowedCategoryTerms,
} from "@/lib/guardrails";
import { getThrones } from "@/lib/thrones";

const inputSchema = z.object({
  categoryName: z.string().trim().min(2).max(32),
  definition: z.string().trim().min(40).max(140),
  defaultRivalName: z.string().trim().min(2).max(40),
  defaultRivalUrl: z.string().trim(),
  defaultRivalXHandle: z.string().trim().optional().or(z.literal("")),
  competitorUrl1: z.string().trim(),
  competitorUrl2: z.string().trim(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in with X is required to deploy a throne." }, { status: 401 });
    }

    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid throne details." },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const termCheck = validateDisallowedCategoryTerms(data.categoryName, data.defaultRivalName);
    if (!termCheck.valid) return NextResponse.json({ error: termCheck.reason }, { status: 400 });

    let rivalUrl: string;
    let competitorUrl1: string;
    let competitorUrl2: string;
    try {
      rivalUrl = canonicalUrl(data.defaultRivalUrl);
      competitorUrl1 = canonicalUrl(data.competitorUrl1);
      competitorUrl2 = canonicalUrl(data.competitorUrl2);
    } catch {
      return NextResponse.json({ error: "All product URLs must be valid public http(s) URLs." }, { status: 400 });
    }

    const marketDomains = [rivalUrl, competitorUrl1, competitorUrl2].map(extractRegistrableDomain);
    if (new Set(marketDomains).size !== marketDomains.length) {
      return NextResponse.json({ error: "The default rival and two competitors must use three different domains." }, { status: 400 });
    }

    const existingThrones = await getThrones();
    const duplicateCheck = checkDuplicateCategory(
      data.categoryName,
      existingThrones.map((throne) => ({ category: throne.category, aliases: throne.aliases })),
    );
    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        { error: `Category is too similar to existing fight "${duplicateCheck.matchedWith}". Challenge that throne instead.` },
        { status: 400 },
      );
    }

    await ensureDatabaseReady(pool);
    const baseSlug = data.categoryName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "category";
    const [existingSlug] = await db.select({ id: thrones.id }).from(thrones).where(eq(thrones.slug, baseSlug)).limit(1);
    const slug = existingSlug ? `${baseSlug}-${generatePublicId(4)}` : baseSlug;
    const throneId = randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(thrones).values({
        id: throneId,
        slug,
        category: data.categoryName,
        definition: data.definition,
        source: "user_created",
        status: "live",
        defaultKingName: data.defaultRivalName,
        defaultKingUrl: rivalUrl,
        defaultKingXHandle: data.defaultRivalXHandle?.replace(/^@/, "").trim() || null,
        createdByDomain: extractRegistrableDomain(rivalUrl),
        createdByXHandle: user.xHandle?.replace(/^@/, "").trim().toLowerCase() || null,
        kingName: data.defaultRivalName,
        kingUrl: rivalUrl,
        stakeCents: 0,
      });

      await tx.insert(reigns).values({
        id: randomUUID(),
        publicId: generatePublicId(10),
        throneId,
        userId: null,
        kingName: data.defaultRivalName,
        kingUrl: rivalUrl,
        productXHandle: data.defaultRivalXHandle?.replace(/^@/, "").trim() || null,
        amountCents: 0,
        status: "current",
      });
    });

    return NextResponse.json({ slug, throneUrl: `/t/${slug}` });
  } catch (error: any) {
    console.error("Free throne deployment error:", error);
    return NextResponse.json({ error: error?.message || "Cannot deploy this throne right now." }, { status: 500 });
  }
}

export const runtime = "nodejs";
