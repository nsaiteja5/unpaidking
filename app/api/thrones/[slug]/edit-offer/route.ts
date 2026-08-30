import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { reigns } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getThrone } from "@/lib/thrones";
import { validateOfferContent } from "@/lib/guardrails";

const editOfferSchema = z.object({
  offerHeadline: z.string().trim().min(20).max(90),
  offerPitch: z.string().trim().min(40).max(180),
  ctaLabel: z.string().trim().min(1).max(40),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const slug = (await params).slug;
    const throne = await getThrone(slug);
    if (!throne) {
      return NextResponse.json({ error: "Throne not found." }, { status: 404 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in with X required to edit your offer." }, { status: 401 });
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

    const body = await request.json();
    const parsed = editOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid offer data." }, { status: 400 });
    }

    const { offerHeadline, offerPitch, ctaLabel } = parsed.data;

    const offerValidation = validateOfferContent(offerHeadline, offerPitch);
    if (!offerValidation.valid) {
      return NextResponse.json({ error: offerValidation.reason }, { status: 400 });
    }

    const formattedCta = ctaLabel.replace("{Product}", currentReign.kingName);

    await db
      .update(reigns)
      .set({
        offerHeadline,
        offerPitch,
        ctaLabel: formattedCta,
      })
      .where(eq(reigns.id, currentReign.id));

    return NextResponse.json({
      ok: true,
      offerHeadline,
      offerPitch,
      ctaLabel: formattedCta,
    });
  } catch (err: any) {
    console.error("Edit offer error:", err);
    return NextResponse.json({ error: err.message || "Failed to edit offer." }, { status: 500 });
  }
}
