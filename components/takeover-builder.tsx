"use client";
import { useState, useEffect } from "react";
import { dollars, nextStealPrice } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";

type Props = {
  slug: string;
  category: string;
  currentKing: string;
  stakeCents: number;
  currentUser?: SessionUser | null;
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
  onClose,
}: Props) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [previewTab, setPreviewTab] = useState<"throne" | "card">("throne");
  const [user, setUser] = useState<SessionUser | null>(currentUser ?? null);

  // Step 0: Stake
  const minPrice = nextStealPrice(stakeCents, stakeCents === 0);
  const [chosenStakeCents, setChosenStakeCents] = useState(minPrice);
  const [customInput, setCustomInput] = useState("");
  const [usingCustom, setUsingCustom] = useState(false);

  // Quick-pick tiers based on minimum price
  const presetTiers = [
    { cents: minPrice, label: dollars(minPrice), tag: "MINIMUM" },
    { cents: minPrice + 1600, label: dollars(minPrice + 1600), tag: "BOLD" },
    { cents: minPrice + 4100, label: dollars(minPrice + 4100), tag: "FORTRESS" },
  ];

  // Step 1: Product
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState(currentUser?.xHandle ? `@${currentUser.xHandle}` : "");
  const [logoUrl, setLogoUrl] = useState("");
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
  }, [user]);

  // Step 2: Offer
  const [headline, setHeadline] = useState("");
  const [pitch, setPitch] = useState("");
  const [ctaChoice, setCtaChoice] = useState(CTA_OPTIONS[0]);
  const [expiresAt, setExpiresAt] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const price = chosenStakeCents;
  const formattedCta = ctaChoice.replace("{Product}", name || "Product");

  function handleCustomInputChange(val: string) {
    setCustomInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= Math.ceil(minPrice / 100)) {
      setChosenStakeCents(num * 100);
    }
  }

  function handleSelectPreset(cents: number) {
    setUsingCustom(false);
    setCustomInput("");
    setChosenStakeCents(cents);
  }

  function handleUseCustom() {
    setUsingCustom(true);
    const num = parseInt(customInput, 10);
    if (!isNaN(num) && num >= Math.ceil(minPrice / 100)) {
      setChosenStakeCents(num * 100);
    }
  }

  function validateStep0() {
    setError("");
    if (chosenStakeCents < minPrice) {
      setError(`Minimum stake is ${dollars(minPrice)}. The current king must be outbid.`);
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

      {/* STEP 0: Stake Selection */}
      {step === 0 && (
        <div className="builder-step step-stake">
          <h2 className="builder-heading display">Set your stake.</h2>
          <p className="builder-sub">
            Higher stakes cost more to dethrone. Stake your claim on the <strong>{category}</strong> throne.
          </p>

          <div className="stake-context">
            <div className="stake-context-row">
              <span className="stake-label smallcaps">Current King</span>
              <span className="stake-value">{currentKing}</span>
            </div>
            <div className="stake-context-row">
              <span className="stake-label smallcaps">Their Stake</span>
              <span className="stake-value money">{stakeCents === 0 ? "$0 (Unpaid)" : dollars(stakeCents)}</span>
            </div>
            <div className="stake-context-row stake-min-row">
              <span className="stake-label smallcaps">Minimum to Conquer</span>
              <span className="stake-value money stake-min-value">{dollars(minPrice)}</span>
            </div>
          </div>

          <div className="stake-tiers">
            {presetTiers.map((tier) => (
              <button
                key={tier.cents}
                type="button"
                className={`stake-tier-btn ${!usingCustom && chosenStakeCents === tier.cents ? "is-selected" : ""}`}
                onClick={() => handleSelectPreset(tier.cents)}
              >
                <span className="tier-amount money">{tier.label}</span>
                <span className="tier-tag smallcaps">{tier.tag}</span>
                <span className="tier-detail">
                  {tier.tag === "MINIMUM"
                    ? "Take the throne."
                    : tier.tag === "BOLD"
                      ? `Next challenger pays ${dollars(tier.cents + 100)}+`
                      : `Next challenger pays ${dollars(tier.cents + 100)}+`}
                </span>
              </button>
            ))}
          </div>

          <div className="stake-custom-section">
            <button
              type="button"
              className={`stake-custom-toggle ${usingCustom ? "is-active" : ""}`}
              onClick={handleUseCustom}
            >
              Or set a custom amount
            </button>
            {usingCustom && (
              <div className="stake-custom-input-wrap">
                <span className="stake-currency-sign">$</span>
                <input
                  type="number"
                  className="stake-custom-input"
                  value={customInput}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  placeholder={String(Math.ceil(minPrice / 100))}
                  min={Math.ceil(minPrice / 100)}
                  max={1000}
                  autoFocus
                />
                <span className="stake-custom-hint smallcaps">
                  Min ${Math.ceil(minPrice / 100)} · Max $1,000
                </span>
              </div>
            )}
          </div>

          <div className="stake-chosen-summary">
            <span className="stake-chosen-label">Your stake</span>
            <span className="stake-chosen-amount display money">{dollars(chosenStakeCents)}</span>
            <span className="stake-chosen-detail">
              Next challenger must pay at least {dollars(chosenStakeCents + 100)} to dethrone you.
            </span>
          </div>

          <div className="builder-actions">
            <button
              type="button"
              className="steal-button next-button"
              onClick={() => {
                if (validateStep0()) setStep(1);
              }}
            >
              Lock Stake & Continue →
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Product */}
      {step === 1 && (
        <div className="builder-step step-1">
          <h2 className="builder-heading display">Who is taking this throne?</h2>
          <p className="builder-sub">
            Challenging <strong>{currentKing}</strong> for the <strong>{category}</strong> throne · Stake: <strong className="money">{dollars(chosenStakeCents)}</strong>
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

      {/* STEP 3: Preview */}
      {step === 3 && (
        <div className="builder-step step-3">
          <h2 className="builder-heading display">This is what your {dollars(price)} creates.</h2>

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
                <span className="stamp stamp-live">CURRENT REIGN</span>
                <span className="money">{dollars(price)}</span>
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
                <span className="card-dethrone">DETHRONED {currentKing.toUpperCase()}</span>
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
                <li>A share card built around your offer</li>
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
              {busy ? "PREPARING CHECKOUT..." : `CREATE MY REIGN — ${dollars(price)}`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
