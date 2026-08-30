import { GazetteThrones } from "@/components/gazette-thrones";
import { getThrones } from "@/lib/thrones";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unpaid King", description: "Every category already has a king. Most of them paid $0. Steal the seat.", openGraph: { images: ["/og"] }, twitter: { card: "summary_large_image", images: ["/og"] } };
export default async function HomePage() { const thrones = await getThrones(); return <GazetteThrones thrones={thrones} />; }
