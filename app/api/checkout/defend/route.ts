import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reigns } from "@/db/schema";
import { paymentProvider } from "@/lib/payments";
import { getThrone } from "@/lib/thrones";
import { getCurrentUser, getBaseUrl } from "@/lib/auth";

const inputSchema = z.object({
  slug: z.string().min(1),
  amount: z.number().int().min(1).max(1000),
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
        { error: "Sign in with X is required to defend your throne." },
        { status: 401 },
      );
    }

    const json = await request.json();
    const parsed = inputSchema.safeParse(json);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message ?? "Invalid form input.";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { slug, amount } = parsed.data;

    const throne = await getThrone(slug);
    if (!throne) {
      return NextResponse.json({ error: "Throne not found." }, { status: 404 });
    }

    const [currentReign] = await db
      .select()
      .from(reigns)
      .where(and(eq(reigns.throneId, throne.id), eq(reigns.status, "current")))
      .limit(1);

    if (!currentReign) {
      return NextResponse.json({ error: "No active reign on this throne." }, { status: 400 });
    }

    const isOwner =
      currentReign.userId === user.id ||
      (currentReign.productXHandle && currentReign.productXHandle.toLowerCase() === user.xHandle.toLowerCase());

    if (!isOwner) {
      return NextResponse.json({ error: "You are not the current king of this throne." }, { status: 403 });
    }

    const amountCents = amount * 100;
    const base = getBaseUrl(request);

    const checkout = await paymentProvider.createCheckout({
      kind: "defend",
      throneSlug: throne.slug,
      userId: user.id,
      name: currentReign.kingName,
      url: currentReign.kingUrl,
      productXHandle: currentReign.productXHandle || undefined,
      productLogoUrl: currentReign.productLogoUrl || undefined,
      offerHeadline: currentReign.offerHeadline || `${currentReign.kingName} defends the ${throne.category} throne`,
      offerPitch:
        currentReign.offerPitch ||
        `${currentReign.kingName} is raising the buyout price to stay king of ${throne.category}.`,
      ctaLabel: currentReign.ctaLabel || `Try ${currentReign.kingName}`,
      amountCents,
      expectedPreviousKing: throne.kingName,
      expectedPreviousStakeCents: throne.stakeCents,
      successUrl: `${base}/checkout/return?ok=1`,
      cancelUrl: `${base}/t/${throne.slug}#steal`,
    });

    return NextResponse.json({ redirectUrl: checkout.redirectUrl });
  } catch (error: any) {
    console.error("Defend checkout error:", error);
    const message = error?.message || "Cannot create defense checkout right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
