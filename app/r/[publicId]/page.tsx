import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReignByPublicId } from "@/lib/reigns";
import { dollars } from "@/lib/format";
import { ViewTracker } from "@/components/view-tracker";
import { ReportButton } from "@/components/report-button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ publicId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const publicId = (await params).publicId;
  const details = await getReignByPublicId(publicId);
  if (!details) return { title: "Unpaid King" };

  const { reign, throne } = details;
  const title = `${reign.kingName} · ${throne.category} | Unpaid King`;
  const description = reign.offerHeadline
    ? `"${reign.offerHeadline}" — ${reign.kingName}`
    : `${reign.kingName} took the throne of ${throne.category}.`;
  const ogImage = `/r/${publicId}/og`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ReignPage({ params }: Props) {
  const publicId = (await params).publicId;
  const details = await getReignByPublicId(publicId);

  if (!details) {
    notFound();
  }

  const {
    reign,
    throne,
    isCurrentlySitting,
    durationHeld,
    dethronedBy,
  } = details;

  const previousKing = reign.fromName || throne.defaultKingName;
  const claimedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(reign.paidAt);

  const ctaText = reign.ctaLabel || `Try ${reign.kingName}`;

  return (
    <article className="reign-page" aria-label={`Permanent reign receipt for ${reign.kingName}`}>
      <ViewTracker type="reign_view" publicId={publicId} />

      {/* Reign Status Header */}
      <header className="reign-header">
        <div className="reign-status-badge">
          <span className={`stamp ${isCurrentlySitting ? "stamp-live" : "stamp-former"}`}>
            {isCurrentlySitting ? "CURRENT REIGN" : "FORMER REIGN"}
          </span>
          <span className="reign-category smallcaps">{throne.category} throne</span>
        </div>

        <div className="reign-dethroning-story">
          <h1 className="reign-story-heading display">
            <span className="reign-hero-name">{reign.kingName}</span>{" "}
            {reign.amountCents === 0 ? "seeded the throne by default" : "dethroned"}{" "}
            {reign.amountCents > 0 && <span className="reign-rival-name">{previousKing}</span>}
          </h1>
          <p className="reign-story-sub">
            for the <strong>{throne.category}</strong> throne
          </p>

          {!isCurrentlySitting && (
            <div className="former-reign-callout">
              <p>
                Held the {throne.category} throne for <strong>{durationHeld}</strong>.
                {dethronedBy && (
                  <>
                    {" "}
                    <strong>{dethronedBy.name}</strong> took the live throne on{" "}
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
                      dethronedBy.date,
                    )}
                    .
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Campaign & Offer Box */}
      <section className="reign-offer-card" aria-label="Product Offer">
        {reign.offerHeadline ? (
          <>
            <p className="offer-kicker smallcaps">Exclusive Founder Offer</p>
            <h2 className="offer-headline display">"{reign.offerHeadline}"</h2>
            {reign.offerPitch && <p className="offer-pitch">{reign.offerPitch}</p>}
          </>
        ) : (
          <>
            <p className="offer-kicker smallcaps">Permanent Placement</p>
            <h2 className="offer-headline display">
              {reign.kingName} challenges {throne.category}
            </h2>
            <p className="offer-pitch">
              Direct competitor serving founders and builders in the {throne.category} market.
            </p>
          </>
        )}

        <div className="offer-cta-zone">
          <a
            href={`/go/reign/${publicId}`}
            className="reign-primary-cta"
            target="_blank"
            rel="noopener nofollow"
          >
            <span>{ctaText}</span>
            <span aria-hidden="true">↗</span>
          </a>

          {reign.productXHandle && (
            <a
              href={`https://x.com/${reign.productXHandle}`}
              target="_blank"
              rel="noopener nofollow"
              className="reign-x-handle"
            >
              @{reign.productXHandle} on X
            </a>
          )}
        </div>
      </section>

      {/* Honest Reign Record & Analytics */}
      <section className="reign-audit-record" aria-label="Audit Record">
        <h3 className="smallcaps">Campaign Record & Tracking</h3>
        <dl className="audit-grid">
          <div className="audit-item">
            <dt>Claimed Date</dt>
            <dd>{claimedDate}</dd>
          </div>
          <div className="audit-item">
            <dt>Placement Value</dt>
            <dd className="money">{reign.amountCents === 0 ? "Default ($0)" : dollars(reign.amountCents)}</dd>
          </div>
          <div className="audit-item">
            <dt>Recorded Visits</dt>
            <dd className="money">{reign.recordedVisits}</dd>
          </div>
          <div className="audit-item">
            <dt>Outbound Clicks Sent</dt>
            <dd className="money">{reign.outboundClicks}</dd>
          </div>
        </dl>
      </section>

      {/* Navigation & Transparency Disclosures */}
      <footer className="reign-page-footer">
        <div className="reign-footer-links">
          {isCurrentlySitting ? (
            <a href={`/t/${throne.slug}`} className="ink-link live-throne-link">
              ← See the live {throne.category} throne
            </a>
          ) : (
            <a href={`/t/${throne.slug}`} className="ink-link live-throne-link">
              See who sits on {throne.category} now →
            </a>
          )}
        </div>

        <p className="reign-disclosure">
          A rotating paid placement, not an award, ranking, or endorsement. This campaign link always promotes {reign.kingName} and cannot be transferred to competitors.
        </p>

        <ReportButton publicId={publicId} slug={throne.slug} />
      </footer>
    </article>
  );
}
