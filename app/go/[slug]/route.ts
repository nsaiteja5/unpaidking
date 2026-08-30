import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const slug = (await params).slug;
  return NextResponse.redirect(new URL(`/go/throne/${slug}`, request.url), 307);
}
