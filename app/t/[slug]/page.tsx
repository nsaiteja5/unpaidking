import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReignList } from "@/components/reign-list";
import { ThroneStage } from "@/components/throne-stage";
import { TakeoverBuilder } from "@/components/takeover-builder";
import { LiveRefresh } from "@/components/live-refresh";
import { ViewTracker } from "@/components/view-tracker";
import { dollars } from "@/lib/format";
import { getThroneReigns, getThroneView } from "@/lib/thrones";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const throne = await getThroneView((await params).slug);
  if (!throne) return { title: "Unpaid King" };

  const title = throne.isDefault
    ? `${throne.kingName} is the unpaid king of ${throne.category}`
    : `${throne.kingName} holds the throne of ${throne.category} · ${dollars(throne.stakeCents)}`;

  const description = throne.definition || `The live throne of ${throne.category} on Unpaid King.`;
  const image = `/og/${throne.slug}?v=${throne.updatedAt.getTime()}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function ThronePage({ params }: Props) {
  const slug = (await params).slug;
  const throne = await getThroneView(slug);

  if (!throne) {
    notFound();
  }

  const reigns = await getThroneReigns(throne.id);
  const user = await getCurrentUser();

  return (
    <>
      <LiveRefresh slug={throne.slug} updatedAt={throne.updatedAt.getTime()} />
      <ViewTracker type="throne_view" slug={throne.slug} />

      <ThroneStage throne={throne} currentUser={user} />

      <div id="steal" style={{ marginTop: "32px" }}>
        <TakeoverBuilder
          slug={throne.slug}
          category={throne.category}
          currentKing={throne.kingName}
          stakeCents={throne.stakeCents}
          currentUser={user}
          formerReigns={throne.formerReigns}
        />
      </div>

      <ReignList reigns={reigns} />
    </>
  );
}
