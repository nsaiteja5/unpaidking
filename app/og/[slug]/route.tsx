import { ImageResponse } from "next/og";
import { OgTemplate } from "@/components/og-template";
import { getThroneView } from "@/lib/thrones";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) { const throne = await getThroneView((await params).slug); if (!throne) return new Response("That throne does not exist.", { status: 404 }); return new ImageResponse(<OgTemplate throne={throne} />, { width: 1200, height: 630, headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=600" } }); }
