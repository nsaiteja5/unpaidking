import { NextResponse } from "next/server";
import { getThroneView } from "@/lib/thrones";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const throne = await getThroneView(slug);
  if (!throne) {
    return NextResponse.json({ error: "That throne does not exist." }, { status: 404 });
  }

  return NextResponse.json({
    slug: throne.slug,
    category: throne.category,
    kingName: throne.kingName,
    kingUrl: throne.kingUrl,
    stakeCents: throne.stakeCents,
    isDefault: throne.isDefault,
    visits7d: throne.visits7d,
    clicks7d: throne.clicks7d,
    updatedAt: throne.updatedAt.getTime(),
    currentReign: throne.currentReign,
  });
}
