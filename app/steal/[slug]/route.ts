import { NextResponse } from "next/server";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) { return NextResponse.redirect(new URL(`/t/${(await params).slug}#steal`, request.url), 307); }
