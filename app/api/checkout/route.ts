import { NextResponse } from "next/server";
import { z } from "zod";
import { canonicalUrl, nextStealPrice } from "@/lib/format";
import { paymentProvider } from "@/lib/payments";
import { getThrone } from "@/lib/thrones";
import { validateOfferContent } from "@/lib/guardrails";
import { getCurrentUser } from "@/lib/auth";

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
});

export async function POST(request: Request) {
  try {
    if (process.env.STUB_PAYMENTS !== "true") {
      return NextResponse.json(
        { error: "Cannot steal right now. The king stays." },
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

    if (canonicalUrl(throne.kingUrl) === url) {
      return NextResponse.json({ error: "That product URL is already sitting on this throne." }, { status: 400 });
    }

    const offerValidation = validateOfferContent(offerHeadline, offerPitch);
    if (!offerValidation.valid) {
      return NextResponse.json({ error: offerValidation.reason }, { status: 400 });
    }

    const formattedCta = ctaLabel.replace("{Product}", name);
    const isUnpaidDefault = throne.stakeCents === 0 && throne.kingName === throne.defaultKingName;
    const price = nextStealPrice(throne.stakeCents, isUnpaidDefault);
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const normalizedHandle = productXHandle.replace(/^@/, "").trim();

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
      amountCents: price,
      expectedPreviousKing: throne.kingName,
      expectedPreviousStakeCents: throne.stakeCents,
      successUrl: `${base}/checkout/return?ok=1`,
      cancelUrl: `${base}/t/${throne.slug}#steal`,
    });

    return NextResponse.json({ redirectUrl: checkout.redirectUrl });
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: "Cannot create takeover right now. Please try again." },
      { status: 500 },
    );
  }
}
