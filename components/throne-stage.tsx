"use client";
import { useState } from "react";
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

  // Synchronize with throne prop changes
  if (throne.currentReign !== currentReign && (!currentReign || throne.currentReign?.id !== currentReign.id)) {
    setCurrentReign(throne.currentReign);
  }
  if (throne.stakeCents !== stakeCents) {
    setStakeCents(throne.stakeCents);
  }

  // Detect if current session user is the sitting owner
  const isOwner = Boolean(
    currentUser &&
      currentReign &&
      (currentReign.userId === currentUser.id ||
        (currentReign.productXHandle &&
          currentReign.productXHandle.toLowerCase() === currentUser.xHandle.toLowerCase()))
  );

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
        <span className="stage-king display">{throne.kingName}</span>

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
                <span>BUILD YOUR TAKEOVER — $9</span>
                <span aria-hidden="true">→</span>
              </button>
              <p className="dethrone-subcopy">Take the live throne. Keep your campaign forever.</p>
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

              <a
                href={outboundHref}
                target="_blank"
                rel="noopener nofollow"
                className="visitor-outbound-cta"
              >
                <span>{ctaLabel}</span>
                <span aria-hidden="true">↗</span>
              </a>

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
                <p className="founder-kicker smallcaps">SELL A COMPETING PRODUCT?</p>
                <button
                  className="dethrone-button secondary-takeover-btn"
                  type="button"
                  onClick={handleDethroneClick}
                >
                  <span>DETHRONE {throne.kingName.toUpperCase()} — {nextPrice}</span>
                  <span aria-hidden="true">→</span>
                </button>
                <p className="dethrone-subcopy">Take the live throne. Keep your campaign forever.</p>
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
