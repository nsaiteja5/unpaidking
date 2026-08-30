import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { getThrone } from "@/lib/thrones";
import { getReignByPublicId } from "@/lib/reigns";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, publicId, reason, details } = body;

    if (!reason || typeof reason !== "string") {
      return NextResponse.json({ error: "Please specify a reason." }, { status: 400 });
    }

    let throneId: string | null = null;
    let reignId: string | null = null;

    if (slug) {
      const throne = await getThrone(slug);
      if (throne) throneId = throne.id;
    }

    if (publicId) {
      const reignDetails = await getReignByPublicId(publicId);
      if (reignDetails) {
        reignId = reignDetails.reign.id;
        if (!throneId) throneId = reignDetails.throne.id;
      }
    }

    await db.insert(reports).values({
      id: randomUUID(),
      throneId,
      reignId,
      reason: reason.trim().slice(0, 255),
      details: details ? String(details).trim().slice(0, 2000) : null,
      status: "pending",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Report submission error:", error);
    return NextResponse.json({ error: "Failed to submit report." }, { status: 500 });
  }
}
