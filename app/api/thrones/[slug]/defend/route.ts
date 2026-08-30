import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reigns, thrones } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getThrone } from "@/lib/thrones";

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
      return NextResponse.json({ error: "Sign in with X required to defend your throne." }, { status: 401 });
    }

    // Find the current live reign for this throne
    const [currentReign] = await db
      .select()
      .from(reigns)
      .where(and(eq(reigns.throneId, throne.id), eq(reigns.status, "current")))
      .limit(1);

    if (!currentReign) {
      return NextResponse.json({ error: "No active reign on this throne." }, { status: 400 });
    }

    // Verify ownership
    const isOwner =
      currentReign.userId === user.id ||
      (currentReign.productXHandle && currentReign.productXHandle.toLowerCase() === user.xHandle.toLowerCase());

    if (!isOwner) {
      return NextResponse.json({ error: "You are not the current king of this throne." }, { status: 403 });
    }

    const body = await request.json();
    const amountDollars = Number(body.amount);
    if (isNaN(amountDollars) || amountDollars < 1 || !Number.isInteger(amountDollars)) {
      return NextResponse.json({ error: "Defense amount must be a whole number of at least $1." }, { status: 400 });
    }

    const amountCents = amountDollars * 100;

    await db.transaction(async (tx) => {
      // 1. Update throne stake
      await tx
        .update(thrones)
        .set({
          stakeCents: throne.stakeCents + amountCents,
          updatedAt: new Date(),
        })
        .where(eq(thrones.id, throne.id));

      // 2. Update current reign amount
      await tx
        .update(reigns)
        .set({
          amountCents: currentReign.amountCents + amountCents,
        })
        .where(eq(reigns.id, currentReign.id));
    });

    return NextResponse.json({
      ok: true,
      newStakeCents: throne.stakeCents + amountCents,
      nextStealCents: throne.stakeCents + amountCents + 100,
    });
  } catch (err: any) {
    console.error("Defend throne error:", err);
    return NextResponse.json({ error: err.message || "Failed to defend throne." }, { status: 500 });
  }
}
