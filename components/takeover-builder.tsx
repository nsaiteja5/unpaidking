"use client";
import { useState, useEffect } from "react";
import { dollars, nextStealPrice } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";

type FormerReignSummary = {
  id: string;
  userId: string | null;
  productXHandle: string | null;
  kingName: string;
  kingUrl: string;
  amountCents: number;
  offerHeadline: string | null;
  offerPitch: string | null;
  ctaLabel: string | null;
  productLogoUrl: string | null;
};

type Props = {
  slug: string;
  category: string;
  currentKing: string;
  stakeCents: number;
  currentUser?: SessionUser | null;
  formerReigns?: FormerReignSummary[];
  onClose?: () => void;
};

const CTA_OPTIONS = [
  "Try {Product}",
  "Get the offer",
  "Book a demo",
  "Start free",
  "Learn more",
];

export function TakeoverBuilder({
  slug,
  category,
  currentKing,
  stakeCents,
  currentUser,
  formerReigns,
  onClose,
}: Props) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [previewTab, setPreviewTab] = useState<"throne" | "card">("throne");
  const [user, setUser] = useState<SessionUser | null>(currentUser ?? null);

  // Detect if user previously reigned on this throne
  const userFormerReigns = (formerReigns || []).filter(
    (r) =>
      user &&
      (r.userId === user.id ||
        (r.productXHandle &&
          user.xHandle &&
          r.productXHandle.toLowerCase() === user.xHandle.toLowerCase()))
  );
  const userMaxPreviousStake = userFormerReigns.reduce((max, r) => Math.max(max, r.amountCents), 0);
  const latestFormerReign = userFormerReigns[0];
  const isReconquer = userMaxPreviousStake > 0;

  // Step 0: Stake calculations
  const minTargetStakeCents = nextStealPrice(stakeCents, stakeCents === 0);
  const [chosenStakeCents, setChosenStakeCents] = useState(minTargetStakeCents);
  const [inputValue, setInputValue] = useState(String(Math.ceil(minTargetStakeCents / 100)));

  // Net out-of-pocket payment
  const currentNetToPay = isReconquer
    ? Math.max(100, chosenStakeCents - userMaxPreviousStake)
    : chosenStakeCents;

  // Step 1: Product (Pre-filled from previous reign if re-conquering)
  const [name, setName] = useState(latestFormerReign?.kingName || "");
  const [url, setUrl] = useState(latestFormerReign?.kingUrl || "");
  const [handle, setHandle] = useState(
    latestFormerReign?.productXHandle
      ? `@${latestFormerReign.productXHandle}`
      : currentUser?.xHandle
        ? `@${currentUser.xHandle}`
        : ""
  );
  const [logoUrl, setLogoUrl] = useState(latestFormerReign?.productLogoUrl || "");
  const [attestation, setAttestation] = useState(false);

  useEffect(() => {
    if (!user) {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((d) => {
          if (d?.user) {
            setUser(d.user);
            if (!handle) setHandle(`@${d.user.xHandle}`);
          }
        })
        .catch(() => {});
    }
  }, [user, handle]);

  // Step 2: Offer (Pre-filled from previous reign if re-conquering)
  const [headline, setHeadline] = useState(latestFormerReign?.offerHeadline || "");
  const [pitch, setPitch] = useState(latestFormerReign?.offerPitch || "");
  const [ctaChoice, setCtaChoice] = useState(latestFormerReign?.ctaLabel || CTA_OPTIONS[0]);
  const [expiresAt, setExpiresAt] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const formattedCta = ctaChoice.replace("{Product}", name || "Product");

  function handleAmountChange(raw: string) {
    // Only allow digits
    const cleaned = raw.replace(/[^0-9]/g, "");
    setInputValue(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num > 0) {
      setChosenStakeCents(num * 100);
    }
  }

  function applyStakeDollars(dollarsAmount: number) {
    const clamped = Math.max(Math.ceil(minTargetStakeCents / 100), dollarsAmount);
    setChosenStakeCents(clamped * 100);
    setInputValue(String(clamped));
    setError("");
  }

  function addStakeDollars(delta: number) {
    const currentDollars = Math.ceil(chosenStakeCents / 100);
    applyStakeDollars(currentDollars + delta);
  }

  function validateStep0() {
    setError("");
    if (chosenStakeCents < minTargetStakeCents) {
      setError(`Minimum throne stake is ${dollars(minTargetStakeCents)} to outbid ${currentKing}.`);
      return false;
    }
    if (chosenStakeCents > 100000) {
      setError("Maximum stake is $1,000 per throne.");
      return false;
    }
    return true;
  }

  function validateStep1() {
    setError("");
    if (!name.trim() || name.trim().length < 2 || name.trim().length > 40) {
      setError("Product name must be 2 to 40 characters.");
      return false;
    }
    if (!url.trim() || !url.startsWith("http")) {
      setError("Product URL must be a valid http(s) URL.");
      return false;
    }
    if (!handle.trim()) {
      setError("Product X handle is required.");
      return false;
    }
    if (!attestation) {
      setError("You must confirm you represent this product and compete in this category.");
      return false;
    }
    return true;
  }

  function validateStep2() {
    setError("");
    if (headline.trim().length < 20 || headline.trim().length > 90) {
      setError("Offer headline must be between 20 and 90 characters.");
      return false;
    }
    if (pitch.trim().length < 40 || pitch.trim().length > 180) {
      setError("Why choose you pitch must be between 40 and 180 characters.");
      return false;
    }
    const combined = `${headline} ${pitch}`.toLowerCase();
    for (const banned of ["#1", "best", "guaranteed 100%", "guaranteed sales"]) {
      if (combined.includes(banned)) {
        setError(`Please remove unverified superiority claims like "${banned}".`);
        return false;
      }
    }
    return true;
  }

  async function submitTakeover() {
    if (!user) {
      const returnTo = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      window.location.assign(`/api/auth/x/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          url: url.trim(),
          productXHandle: handle.replace(/^@/, "").trim(),
          productLogoUrl: logoUrl.trim() || undefined,
          offerHeadline: headline.trim(),
          offerPitch: pitch.trim(),
          ctaLabel: ctaChoice,
          offerExpiresAt: expiresAt || undefined,
          attestation: true,
          chosenStakeCents: chosenStakeCents,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          const returnTo = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
          window.location.assign(`/api/auth/x/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        setError(result.error || "Cannot create takeover right now.");
        return;
      }

      window.location.assign(result.redirectUrl);
    } catch {
      setError("Network error. Cannot create takeover right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="takeover-builder" aria-label={`Takeover builder for ${category}`}>
      {/* Step Indicator Header */}
      <div className="builder-progress">
        <div className="progress-steps">
          <button
            type="button"
            className={`step-badge ${step === 0 ? "is-active" : step > 0 ? "is-done" : ""}`}
            onClick={() => setStep(0)}
          >
            1 · STAKE
          </button>
          <span className="step-sep">→</span>
          <button
            type="button"
            className={`step-badge ${step === 1 ? "is-active" : step > 1 ? "is-done" : ""}`}
            onClick={() => {
              if (validateStep0()) setStep(1);
            }}
          >
            2 · PRODUCT
          </button>
          <span className="step-sep">→</span>
          <button
            type="button"
            className={`step-badge ${step === 2 ? "is-active" : step > 2 ? "is-done" : ""}`}
            onClick={() => {
              if (validateStep0() && validateStep1()) setStep(2);
            }}
          >
            3 · OFFER
          </button>
          <span className="step-sep">→</span>
          <button
            type="button"
            className={`step-badge ${step === 3 ? "is-active" : ""}`}
            onClick={() => {
              if (validateStep0() && validateStep1() && validateStep2()) setStep(3);
            }}
          >
            4 · PREVIEW
          </button>
        </div>

        {onClose && (
          <button type="button" className="builder-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {/* STEP 0: Straightforward Stake Selection with Blinker */}
      {step === 0 && (
        <div className="builder-step step-stake">
          <h2 className="builder-heading display">
            {isReconquer ? "Re-conquer your throne." : "Set your stake."}
          </h2>
          <p className="builder-sub">
            {isReconquer
              ? `You previously staked ${dollars(userMaxPreviousStake)}. Outbid ${currentKing} to take back your crown.`
              : `Challenging ${currentKing} on the ${category} throne.`}
          </p>

          <div className="stake-hero-card">
            <p className="smallcaps stake-hero-tag">
              {isReconquer ? "YOUR NEW THRONE STAKE" : "YOUR THRONE STAKE"}
            </p>

            <div className="stake-input-container">
              <span className="stake-symbol display">$</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="stake-hero-input display money"
                value={inputValue}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder={String(Math.ceil(minTargetStakeCents / 100))}
                autoFocus={Boolean(onClose)}
              />
            </div>

            {/* Quick Add Pills */}
            <div className="stake-pills-row">
              <button
                type="button"
                className={`stake-pill ${chosenStakeCents === minTargetStakeCents ? "is-active" : ""}`}
                onClick={() => applyStakeDollars(Math.ceil(minTargetStakeCents / 100))}
              >
                Min ({dollars(minTargetStakeCents)})
              </button>
              <button
                type="button"
                className="stake-pill"
                onClick={() => addStakeDollars(5)}
              >
                +$5
              </button>
              <button
                type="button"
                className="stake-pill"
                onClick={() => addStakeDollars(10)}
              >
                +$10
              </button>
              <button
                type="button"
                className="stake-pill"
                onClick={() => addStakeDollars(25)}
              >
                +$25
              </button>
              <button
                type="button"
                className="stake-pill"
                onClick={() => addStakeDollars(50)}
              >
                +$50
              </button>
            </div>

            {/* Real-time Math Breakdown */}
            <div className="stake-breakdown-bar">
              {isReconquer ? (
                <div className="breakdown-equation">
                  <div className="breakdown-col">
                    <span className="breakdown-label smallcaps">New Stake</span>
                    <span className="breakdown-val money">{dollars(chosenStakeCents)}</span>
                  </div>
                  <span className="breakdown-op">−</span>
                  <div className="breakdown-col">
                    <span className="breakdown-label smallcaps">Past Credit</span>
                    <span className="breakdown-val money credit-val">{dollars(userMaxPreviousStake)}</span>
                  </div>
                  <span className="breakdown-op">=</span>
                  <div className="breakdown-col highlight-col">
                    <span className="breakdown-label smallcaps">You Pay Today</span>
                    <span className="breakdown-val money pay-val">{dollars(currentNetToPay)}</span>
                  </div>
                </div>
              ) : (
                <div className="breakdown-summary-line">
                  <span>Next challenger must pay <strong>{dollars(chosenStakeCents + 100)}</strong> to dethrone you.</span>
                </div>
              )}
            </div>
          </div>

          <div className="builder-actions">
            <button
              type="button"
              className="steal-button next-button"
              onClick={() => {
                if (validateStep0()) setStep(1);
              }}
            >
              {isReconquer ? `Lock Stake · Pay ${dollars(currentNetToPay)} →` : "Lock Stake & Continue →"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Product */}
      {step === 1 && (
        <div className="builder-step step-1">
          <h2 className="builder-heading display">Who is taking this throne?</h2>
          <p className="builder-sub">
            {isReconquer ? (
              <>
                Reclaiming from <strong>{currentKing}</strong> · Throne Stake: <strong className="money">{dollars(chosenStakeCents)}</strong> (You pay <strong className="money">{dollars(currentNetToPay)}</strong>)
              </>
            ) : (
              <>
                Challenging <strong>{currentKing}</strong> for the <strong>{category}</strong> throne · Stake: <strong className="money">{dollars(chosenStakeCents)}</strong>
              </>
            )}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validateStep1()) setStep(2);
            }}
          >
            <label>
              Product Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MySaaS"
                minLength={2}
                maxLength={40}
                required
              />
            </label>

            <label>
              Product URL
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mysaas.com"
                type="url"
                required
              />
            </label>

            <label>
              Product X Handle
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@mysaas"
                required
              />
            </label>

            <label>
              Product Logo URL (Optional)
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://mysaas.com/logo.png"
                type="url"
              />
            </label>

            <label className="attestation-checkbox">
              <input
                type="checkbox"
                checked={attestation}
                onChange={(e) => setAttestation(e.target.checked)}
                required
              />
              <span>
                I own or represent this product, and it directly competes in this category.
              </span>
            </label>

            <div className="builder-actions">
              <button
                type="button"
                className="checkout-cancel"
                onClick={() => setStep(0)}
              >
                ← Change Stake
              </button>
              <button type="submit" className="steal-button next-button">
                Continue to Offer →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Offer */}
      {step === 2 && (
        <div className="builder-step step-2">
          <h2 className="builder-heading display">Give people a reason to click.</h2>
          <p className="builder-sub">The throne gets attention. Your offer earns the click.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validateStep2()) setStep(3);
            }}
          >
            <label>
              Offer Headline (20–90 chars)
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Free migration from Stripe for the first 10 founders"
                minLength={20}
                maxLength={90}
                required
              />
              <span className="field-count">{headline.length}/90</span>
            </label>

            <label>
              Why should they choose you? (40–180 chars)
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="Move subscriptions, taxes, and global payments without rebuilding your billing stack."
                minLength={40}
                maxLength={180}
                rows={3}
                required
              />
              <span className="field-count">{pitch.length}/180</span>
            </label>

            <label>
              CTA Label
              <select
                value={ctaChoice}
                onChange={(e) => setCtaChoice(e.target.value)}
                className="report-select"
              >
                {CTA_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.replace("{Product}", name || "Product")}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Offer Expires (Optional)
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>

            <div className="builder-actions">
              <button
                type="button"
                className="checkout-cancel"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button type="submit" className="steal-button next-button">
                Preview My Reign →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: Preview & Checkout */}
      {step === 3 && (
        <div className="builder-step step-3">
          <h2 className="builder-heading display">
            {isReconquer
              ? `Reclaiming the ${category} throne for ${dollars(currentNetToPay)}.`
              : `This is what your ${dollars(chosenStakeCents)} creates.`}
          </h2>

          {/* Preview Tabs */}
          <div className="preview-tabs" role="tablist">
            <button
              type="button"
              className={`preview-tab-btn ${previewTab === "throne" ? "is-active" : ""}`}
              onClick={() => setPreviewTab("throne")}
            >
              LIVE THRONE PREVIEW
            </button>
            <button
              type="button"
              className={`preview-tab-btn ${previewTab === "card" ? "is-active" : ""}`}
              onClick={() => setPreviewTab("card")}
            >
              SHARE CARD PREVIEW
            </button>
          </div>

          {/* Tab 1: Live Throne Preview */}
          {previewTab === "throne" && (
            <div className="mock-throne-preview">
              <p className="smallcaps">The Throne of {category}</p>
              <p className="mock-occupied">is occupied by</p>
              <h3 className="mock-king display">{name || "Your Product"}</h3>
              <div className="mock-verdict">
                <span className="stamp stamp-live">
                  {isReconquer ? "RECLAIMED REIGN" : "CURRENT REIGN"}
                </span>
                <span className="money">{dollars(chosenStakeCents)}</span>
              </div>
              <div className="mock-offer-box">
                <p className="mock-headline">"{headline || "Your Offer Headline"}"</p>
                <p className="mock-pitch">{pitch || "Your compelling pitch goes here."}</p>
                <div className="mock-cta">{formattedCta} ↗</div>
              </div>
            </div>
          )}

          {/* Tab 2: Share Card Preview */}
          {previewTab === "card" && (
            <div className="mock-share-card">
              <div className="card-top">
                <span className="card-tag">UNPAID KING · REIGN RECEIPT</span>
                <span className="card-cat">{category.toUpperCase()}</span>
              </div>
              <div className="card-headline display">
                "{headline || "Your Offer Headline"}"
              </div>
              <div className="card-product">by {name || "Your Product"}</div>
              <div className="card-footer">
                <span className="card-dethrone">
                  {isReconquer
                    ? `RECLAIMED FROM ${currentKing.toUpperCase()}`
                    : `DETHRONED ${currentKing.toUpperCase()}`}
                </span>
                <span className="card-link">unpaidking.lol/r/...</span>
              </div>
            </div>
          )}

          {/* Deliverables Breakdown */}
          <div className="deliverables-grid">
            <div className="deliverable-col you-get">
              <h4 className="smallcaps">YOU GET</h4>
              <ul>
                <li>The live {category} throne until the next paid takeover</li>
                <li>A permanent page that always promotes {name || "your product"}</li>
                <li>A brutal share card built around your offer and conquest</li>
                <li>Tracked visits and outbound clicks</li>
              </ul>
            </div>

            <div className="deliverable-col not-guaranteed">
              <h4 className="smallcaps">NOT GUARANTEED</h4>
              <ul>
                <li>Views, clicks, sales, or minimum reign duration</li>
              </ul>
            </div>
          </div>

          <div className="builder-actions final-actions">
            <button
              type="button"
              className="checkout-cancel"
              onClick={() => setStep(2)}
            >
              ← Edit Offer
            </button>
            <button
              type="button"
              className="steal-button create-reign-btn"
              disabled={busy}
              onClick={submitTakeover}
            >
              {busy
                ? "PREPARING CHECKOUT..."
                : isReconquer
                  ? `RECLAIM MY THRONE — ${dollars(currentNetToPay)}`
                  : `CREATE MY REIGN — ${dollars(chosenStakeCents)}`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
