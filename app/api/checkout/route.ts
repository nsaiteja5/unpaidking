import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { reigns } from "@/db/schema";
import { canonicalUrl, nextStealPrice } from "@/lib/format";
import { paymentProvider } from "@/lib/payments";
import { getThrone } from "@/lib/thrones";
import { validateOfferContent } from "@/lib/guardrails";
import { getCurrentUser, getBaseUrl } from "@/lib/auth";

const CTA_OPTIONS = ["Try {Product}", "Get the offer", "Book a demo", "Start free", "Learn more"] as const;

const inputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(2).max(40),
  url: z.string().trim(),
  productXHandle: z.string().trim().min(1).max(40),
  productLogoUrl: z.string().trim().optional().or(z.literal("")),
  offerHeadline: z.string().trim().min(20).max(90),
  offerPitch: z.string().trim().min(40).max(180),
  ctaLabel: z.string().trim().min(1),
  offerExpiresAt: z.string().optional().or(z.literal("")),
  attestation: z.boolean().refine((val) => val === true, {
    message: "You must attest that your product directly competes in this category.",
  }),
  chosenStakeCents: z.number().int().min(100).max(100000).optional(),
});

export async function POST(request: Request) {
  try {
    if (process.env.STUB_PAYMENTS !== "true" && !process.env.DODO_PAYMENTS_API_KEY) {
      return NextResponse.json(
        { error: "Payment gateway is not configured. The king stays." },
        { status: 503 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in with X is required to take a throne." },
        { status: 401 },
      );
    }

    const json = await request.json();
    const parsed = inputSchema.safeParse(json);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message ?? "Invalid form input.";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      slug,
      name,
      url: rawUrl,
      productXHandle,
      productLogoUrl,
      offerHeadline,
      offerPitch,
      ctaLabel,
      offerExpiresAt,
      chosenStakeCents,
    } = parsed.data;

    let url: string;
    try {
      url = canonicalUrl(rawUrl);
    } catch {
      return NextResponse.json({ error: "Need a public http(s) URL." }, { status: 400 });
    }

    let logoUrl: string | undefined = undefined;
    if (productLogoUrl) {
      try {
        logoUrl = canonicalUrl(productLogoUrl);
      } catch {
        // Optional logo url
      }
    }

    const throne = await getThrone(slug);
    if (!throne) {
      return NextResponse.json({ error: "That throne does not exist." }, { status: 404 });
    }

    let isAlreadySitting = false;
    try {
      isAlreadySitting = canonicalUrl(throne.kingUrl) === url;
    } catch {
      isAlreadySitting = (throne.kingUrl || "").trim().toLowerCase() === url.toLowerCase();
    }

    if (isAlreadySitting) {
      return NextResponse.json({ error: "That product URL is already sitting on this throne." }, { status: 400 });
    }

    const offerValidation = validateOfferContent(offerHeadline, offerPitch);
    if (!offerValidation.valid) {
      return NextResponse.json({ error: offerValidation.reason }, { status: 400 });
    }

    const formattedCta = ctaLabel.replace("{Product}", name);
    const normalizedHandle = productXHandle.replace(/^@/, "").trim();

    let userMaxPreviousStake = 0;
    const userFormerReigns = await db
      .select({ amountCents: reigns.amountCents })
      .from(reigns)
      .where(
        and(
          eq(reigns.throneId, throne.id),
          eq(reigns.status, "former"),
          or(eq(reigns.userId, user.id), eq(reigns.productXHandle, normalizedHandle))
        )
      );
    userMaxPreviousStake = userFormerReigns.reduce((max, r) => Math.max(max, r.amountCents), 0);

    const isUnpaidDefault = throne.stakeCents === 0 && throne.kingName === throne.defaultKingName;
    const minTargetStake = nextStealPrice(throne.stakeCents, isUnpaidDefault);
    const targetStake = chosenStakeCents && chosenStakeCents >= minTargetStake ? chosenStakeCents : minTargetStake;
    const amountToCharge = userMaxPreviousStake > 0
      ? Math.max(100, targetStake - userMaxPreviousStake)
      : targetStake;

    const base = getBaseUrl(request);

    const checkout = await paymentProvider.createCheckout({
      throneSlug: throne.slug,
      userId: user.id,
      name,
      url,
      productXHandle: normalizedHandle,
      productLogoUrl: logoUrl,
      offerHeadline,
      offerPitch,
      ctaLabel: formattedCta,
      offerExpiresAt: offerExpiresAt ? new Date(offerExpiresAt) : undefined,
      amountCents: amountToCharge,
      expectedPreviousKing: throne.kingName,
      expectedPreviousStakeCents: throne.stakeCents,
      successUrl: `${base}/checkout/return?ok=1`,
      cancelUrl: `${base}/t/${throne.slug}#steal`,
    });

    return NextResponse.json({ redirectUrl: checkout.redirectUrl });
  } catch (error: any) {
    console.error("Checkout creation error:", error);
    const message = error?.message || "Cannot create takeover right now. Please try again.";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
