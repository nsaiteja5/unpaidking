"use client";
import { useEffect, useState } from "react";
import { Stamp } from "@/components/stamp";
import { dollars, nextStealPrice } from "@/lib/format";
import { ReportButton } from "@/components/report-button";
import { DefendSheet } from "@/components/defend-sheet";
import { EditOfferModal } from "@/components/edit-offer-modal";
import type { ThroneView } from "@/lib/thrones";
import type { SessionUser } from "@/lib/auth";

type Props = {
  throne: ThroneView;
  currentUser?: SessionUser | null;
  onDethrone?: () => void;
  onThroneUpdated?: (updated: Partial<ThroneView>) => void;
  isClaimingFlash?: boolean;
};

function pluralize(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function ThroneStage({
  throne,
  currentUser,
  onDethrone,
  onThroneUpdated,
  isClaimingFlash,
}: Props) {
  const isDefault = throne.isDefault;
  const nextPrice = dollars(nextStealPrice(throne.stakeCents, isDefault));
  const outboundHref = `/go/throne/${throne.slug}`;

  const [currentReign, setCurrentReign] = useState(throne.currentReign);
  const [stakeCents, setStakeCents] = useState(throne.stakeCents);
  const [defendOpen, setDefendOpen] = useState(false);
  const [editOfferOpen, setEditOfferOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Keep live traffic counters in sync even when the same reign remains seated.
  useEffect(() => setCurrentReign(throne.currentReign), [throne.currentReign]);
  useEffect(() => setStakeCents(throne.stakeCents), [throne.stakeCents]);

  // Detect if current session user is the sitting owner
  const isOwner = Boolean(
    currentUser &&
      currentReign &&
      (currentReign.userId === currentUser.id ||
        (currentReign.productXHandle &&
          currentReign.productXHandle.toLowerCase() === currentUser.xHandle.toLowerCase()))
  );

  // Detect if current user previously held this throne and was dethroned
  const userFormerReigns = (throne.formerReigns || []).filter(
    (r) =>
      currentUser &&
      (r.userId === currentUser.id ||
        (r.productXHandle &&
          currentUser.xHandle &&
          r.productXHandle.toLowerCase() === currentUser.xHandle.toLowerCase()))
  );
  const userMaxPreviousStake = userFormerReigns.reduce((max, r) => Math.max(max, r.amountCents), 0);
  const isReconquer = userMaxPreviousStake > 0 && !isOwner;
  const minRequiredTargetStake = nextStealPrice(stakeCents, isDefault);
  const minNetReconquerToPay = Math.max(100, minRequiredTargetStake - userMaxPreviousStake);

  const offerHeadline = currentReign?.offerHeadline;
  const offerPitch = currentReign?.offerPitch;
  const ctaLabel = currentReign?.ctaLabel || `Try ${throne.kingName}`;

  // Honest traffic records
  const hasHistory = throne.visits7d > 0 || throne.clicks7d > 0;
  const trafficRecordLine = hasHistory
    ? `${pluralize(throne.visits7d, "visit")} · ${pluralize(throne.clicks7d, "click")}`
    : `New reign · traffic recording started`;

  const reignStatsLine = currentReign
    ? currentReign.recordedVisits > 0 || currentReign.outboundClicks > 0
      ? `This reign · ${pluralize(currentReign.recordedVisits, "visit")} · ${pluralize(currentReign.outboundClicks, "click")}`
      : `New reign · traffic recording started`
    : trafficRecordLine;

  const handleCopyCampaignLink = () => {
    if (!currentReign?.publicId) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://unpaidking.lol";
    const campaignUrl = `${origin}/r/${currentReign.publicId}`;
    navigator.clipboard.writeText(campaignUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const tweetIntentHref = currentReign
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `I hold the @unpaidking throne for ${throne.category}.\n\nOffer: "${offerHeadline || ctaLabel}"\n\nTake the seat if you dare:\n`
      )}&url=${encodeURIComponent(
        typeof window !== "undefined"
          ? `${window.location.origin}/r/${currentReign.publicId}`
          : `https://unpaidking.lol/r/${currentReign.publicId}`
      )}`
    : `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `The throne of ${throne.category} on @unpaidking is occupied by ${throne.kingName}.`
      )}`;

  const handleDefended = (newStake: number) => {
    setStakeCents(newStake);
    if (onThroneUpdated) {
      onThroneUpdated({ stakeCents: newStake });
    }
  };

  const handleOfferSaved = (saved: { offerHeadline: string; offerPitch: string; ctaLabel: string }) => {
    if (currentReign) {
      const updated = {
        ...currentReign,
        offerHeadline: saved.offerHeadline,
        offerPitch: saved.offerPitch,
        ctaLabel: saved.ctaLabel,
      };
      setCurrentReign(updated);
      if (onThroneUpdated) {
        onThroneUpdated({ currentReign: updated });
      }
    }
  };

  const handleDethroneClick = (e: React.MouseEvent) => {
    if (!currentUser) {
      e.preventDefault();
      const returnTo = typeof window !== "undefined" ? window.location.pathname : "/";
      window.location.assign(`/api/auth/x/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (onDethrone) {
      e.preventDefault();
      onDethrone();
    }
  };

  return (
    <section
      className={`throne-room-stage ${isDefault ? "is-default" : "is-stolen"} ${
        isClaimingFlash ? "is-claiming-flash" : ""
      }`}
      aria-label={`The throne of ${throne.category}`}
    >
      <div className="stage-architecture" aria-hidden="true">
        <span className="stage-pillar stage-pillar-left" />
        <span className="stage-crown">
          <i />
          <i />
          <i />
        </span>
        <span className="stage-pillar stage-pillar-right" />
        <span className="stage-arch" />
      </div>

      <div className="throne-room-content" key={throne.slug}>
        <p className="stage-kicker">The throne of</p>
        <h1 className="stage-category">
          <a
            href={`/t/${throne.slug}`}
            className="stage-category-link display"
            title={`View fight page for ${throne.category}`}
          >
            {throne.category}
          </a>
        </h1>
        <p className="stage-occupied">is occupied by</p>
        <a
          href={outboundHref}
          target="_blank"
          rel="noopener nofollow"
          className="stage-king display stage-king-link"
          title={`Visit ${throne.kingName} (${throne.kingUrl})`}
        >
          {throne.kingName}
        </a>

        {/* Verdict & Stake */}
        <div className="stage-verdict">
          <Stamp
            status={isDefault ? "default" : "paid"}
            label={isDefault ? "UNPAID KING · $0" : `CURRENT REIGN · ${dollars(stakeCents)}`}
          />
        </div>

        {/* DEFAULT UNPAID THRONE BODY */}
        {isDefault ? (
          <div className="default-stage-body">
            <p className="stage-state">
              We seated {throne.kingName} by default. They did not buy this throne.
            </p>

            <div className="stage-traffic-pill">
              <span>{trafficRecordLine}</span>
            </div>

            <div className="stage-action-zone">
              <button
                className="dethrone-button primary-takeover-btn"
                type="button"
                onClick={handleDethroneClick}
              >
                <span>
                  {isReconquer
                    ? `RE-CONQUER YOUR THRONE — ${dollars(minNetReconquerToPay)}`
                    : "CONQUER THIS THRONE — $9"}
                </span>
                <span aria-hidden="true">→</span>
              </button>
              <p className="dethrone-subcopy">
                {isReconquer
                  ? `You already staked ${dollars(userMaxPreviousStake)}. Pay just ${dollars(minNetReconquerToPay)} more to take it back.`
                  : "Take the live throne. Keep your campaign forever."}
              </p>
            </div>
          </div>
        ) : (
          /* PAID THRONE BODY */
          <div className="paid-stage-body">
            {/* Zone 1: Offer & Pitch */}
            <div className="visitor-offer-zone">
              {offerHeadline && (
                <h2 className="live-offer-headline display">"{offerHeadline}"</h2>
              )}
              {offerPitch && <p className="live-offer-pitch">{offerPitch}</p>}

              {/* Occupant's CTA Link */}
              <div className="visitor-cta-wrap">
                <a
                  href={outboundHref}
                  target="_blank"
                  rel="noopener nofollow"
                  className="visitor-cta-btn"
                >
                  <span>{ctaLabel}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>

              <div className="stage-traffic-pill">
                <span>{reignStatsLine}</span>
              </div>
            </div>

            {/* Zone 2: Owner Bar VS Visitor Dethrone Zone */}
            {isOwner ? (
              /* OWNER BAR (You sit here) */
              <div className="owner-throne-zone" aria-label="Owner throne actions">
                <div className="takeover-divider" />
                <p className="owner-kicker smallcaps">THIS IS YOUR THRONE</p>

                <div className="owner-actions-row">
                  <button
                    type="button"
                    className="owner-btn owner-defend-btn"
                    onClick={() => setDefendOpen(true)}
                  >
                    <span>DEFEND — from $1</span>
                  </button>

                  <button
                    type="button"
                    className="owner-btn owner-edit-btn"
                    onClick={() => setEditOfferOpen(true)}
                  >
                    <span>EDIT OFFER</span>
                  </button>

                  <button
                    type="button"
                    className="owner-btn owner-copy-btn"
                    onClick={handleCopyCampaignLink}
                  >
                    <span>{copiedLink ? "COPIED URL ✓" : "COPY CAMPAIGN LINK"}</span>
                  </button>

                  <a
                    href={tweetIntentHref}
                    target="_blank"
                    rel="noopener nofollow"
                    className="owner-btn owner-share-btn"
                  >
                    <span>POST ON X ↗</span>
                  </a>
                </div>

                <p className="owner-next-buyout">
                  Next steal price · <strong>{dollars(stakeCents + 100)}</strong>
                </p>
              </div>
            ) : (
              /* VISITOR / CHALLENGER TAKEOVER ZONE */
              <div className="founder-takeover-zone">
                <div className="takeover-divider" />
                <p className="founder-kicker smallcaps">
                  {isReconquer ? "THEY TOOK YOUR THRONE" : "SELL A COMPETING PRODUCT?"}
                </p>
                <button
                  className={`dethrone-button ${isReconquer ? "primary-takeover-btn" : "secondary-takeover-btn"}`}
                  type="button"
                  onClick={handleDethroneClick}
                >
                  <span>
                    {isReconquer
                      ? `RE-CONQUER YOUR THRONE — ${dollars(minNetReconquerToPay)}`
                      : `DETHRONE ${throne.kingName.toUpperCase()} — ${nextPrice}`}
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
                <p className="dethrone-subcopy">
                  {isReconquer
                    ? `You already staked ${dollars(userMaxPreviousStake)}. Pay just ${dollars(minNetReconquerToPay)} more to reclaim the live throne.`
                    : "Take the live throne. Keep your campaign forever."}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="stage-meta-footer">
          <ReportButton slug={throne.slug} />
        </div>
      </div>

      {/* Owner Defend Sheet Modal */}
      {defendOpen && (
        <DefendSheet
          slug={throne.slug}
          category={throne.category}
          currentStakeCents={stakeCents}
          onClose={() => setDefendOpen(false)}
          onDefended={handleDefended}
        />
      )}

      {/* Owner Edit Offer Modal */}
      {editOfferOpen && currentReign && (
        <EditOfferModal
          slug={throne.slug}
          category={throne.category}
          kingName={throne.kingName}
          initialHeadline={offerHeadline || ""}
          initialPitch={offerPitch || ""}
          initialCta={currentReign.ctaLabel || ""}
          onClose={() => setEditOfferOpen(false)}
          onSaved={handleOfferSaved}
        />
      )}
    </section>
  );
}
