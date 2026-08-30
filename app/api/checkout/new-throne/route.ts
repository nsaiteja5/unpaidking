import { NextResponse } from "next/server";
import { z } from "zod";
import { canonicalUrl } from "@/lib/format";
import { paymentProvider } from "@/lib/payments";
import { getThrones } from "@/lib/thrones";
import { getCurrentUser } from "@/lib/auth";
import {
  checkDuplicateCategory,
  checkRateLimits,
  extractRegistrableDomain,
  validateDisallowedCategoryTerms,
  validateFourDistinctDomains,
  validateOfferContent,
} from "@/lib/guardrails";

const newThroneSchema = z.object({
  categoryName: z.string().trim().min(2).max(32),
  definition: z.string().trim().min(40).max(140),
  defaultRivalName: z.string().trim().min(2).max(40),
  defaultRivalUrl: z.string().trim(),
  defaultRivalXHandle: z.string().trim().optional().or(z.literal("")),
  competitorUrl1: z.string().trim(),
  competitorUrl2: z.string().trim(),
  name: z.string().trim().min(2).max(40),
  url: z.string().trim(),
  productXHandle: z.string().trim().min(1).max(40),
  productLogoUrl: z.string().trim().optional().or(z.literal("")),
  offerHeadline: z.string().trim().min(20).max(90),
  offerPitch: z.string().trim().min(40).max(180),
  ctaLabel: z.string().trim().min(1),
  offerExpiresAt: z.string().optional().or(z.literal("")),
  attestation: z.boolean().refine((val) => val === true, {
    message: "You must attest that your product competes directly and at least 4 independent products serve this decision.",
  }),
});

export async function POST(request: Request) {
  try {
    if (process.env.STUB_PAYMENTS !== "true") {
      return NextResponse.json(
        { error: "Cannot create thrones right now." },
        { status: 503 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in with X is required to start a new throne." },
        { status: 401 },
      );
    }

    const json = await request.json();
    const parsed = newThroneSchema.safeParse(json);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message ?? "Invalid form input.";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const data = parsed.data;

    // 1. Validate disallowed category terms & length/word-count
    const termCheck = validateDisallowedCategoryTerms(data.categoryName, data.name);
    if (!termCheck.valid) {
      return NextResponse.json({ error: termCheck.reason }, { status: 400 });
    }

    // 2. Canonicalize URLs
    let buyerUrl: string;
    let defaultRivalUrl: string;
    let compUrl1: string;
    let compUrl2: string;

    try {
      buyerUrl = canonicalUrl(data.url);
      defaultRivalUrl = canonicalUrl(data.defaultRivalUrl);
      compUrl1 = canonicalUrl(data.competitorUrl1);
      compUrl2 = canonicalUrl(data.competitorUrl2);
    } catch {
      return NextResponse.json(
        { error: "All product URLs must be valid public http(s) URLs." },
        { status: 400 },
      );
    }

    let logoUrl: string | undefined = undefined;
    if (data.productLogoUrl) {
      try {
        logoUrl = canonicalUrl(data.productLogoUrl);
      } catch {
        // Optional
      }
    }

    // 3. 4 distinct registrable domains check
    const domainCheck = validateFourDistinctDomains([
      buyerUrl,
      defaultRivalUrl,
      compUrl1,
      compUrl2,
    ]);
    if (!domainCheck.valid) {
      return NextResponse.json({ error: domainCheck.reason }, { status: 400 });
    }

    // 4. Duplicate category similarity check (threshold 0.72)
    const existingThrones = await getThrones();
    const duplicateCheck = checkDuplicateCategory(
      data.categoryName,
      existingThrones.map((t) => ({ category: t.category, aliases: t.aliases })),
    );
    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        {
          error: `Category is too similar to existing fight "${duplicateCheck.matchedWith}" (${Math.round(duplicateCheck.similarity * 100)}% match). Please challenge the existing throne instead.`,
        },
        { status: 400 },
      );
    }

    // 5. Offer content validation
    const offerCheck = validateOfferContent(data.offerHeadline, data.offerPitch);
    if (!offerCheck.valid) {
      return NextResponse.json({ error: offerCheck.reason }, { status: 400 });
    }

    // 6. Rate limits & domain checks
    const buyerDomain = extractRegistrableDomain(buyerUrl);
    const normalizedHandle = data.productXHandle.replace(/^@/, "").trim();
    const rateCheck = await checkRateLimits(buyerDomain, normalizedHandle);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason }, { status: 400 });
    }

    const formattedCta = data.ctaLabel.replace("{Product}", data.name);
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const defaultRivalHandle = data.defaultRivalXHandle
      ? data.defaultRivalXHandle.replace(/^@/, "").trim()
      : undefined;

    const checkout = await paymentProvider.createCheckout({
      userId: user.id,
      proposedThrone: {
        name: data.categoryName,
        definition: data.definition,
        defaultRivalName: data.defaultRivalName,
        defaultRivalUrl,
        defaultRivalXHandle: defaultRivalHandle,
        competitorUrls: [compUrl1, compUrl2],
      },
      name: data.name,
      url: buyerUrl,
      productXHandle: normalizedHandle,
      productLogoUrl: logoUrl,
      offerHeadline: data.offerHeadline,
      offerPitch: data.offerPitch,
      ctaLabel: formattedCta,
      offerExpiresAt: data.offerExpiresAt ? new Date(data.offerExpiresAt) : undefined,
      expectedPreviousKing: data.defaultRivalName,
      expectedPreviousStakeCents: 0,
      amountCents: 900,
      successUrl: `${base}/checkout/return?ok=1`,
      cancelUrl: `${base}/start`,
    });

    return NextResponse.json({ redirectUrl: checkout.redirectUrl });
  } catch (error) {
    console.error("New throne checkout error:", error);
    return NextResponse.json(
      { error: "Cannot create throne right now. Please try again." },
      { status: 500 },
    );
  }
}
