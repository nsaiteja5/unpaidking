"use client";
import { useState, useEffect } from "react";
import { dollars } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";

const CTA_OPTIONS = [
  "Try {Product}",
  "Get the offer",
  "Book a demo",
  "Start free",
  "Learn more",
];

export default function StartThronePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [previewTab, setPreviewTab] = useState<"throne" | "card">("throne");
  const [user, setUser] = useState<SessionUser | null>(null);

  // Market & Competitors
  const [categoryName, setCategoryName] = useState("");
  const [definition, setDefinition] = useState("");
  const [defaultRivalName, setDefaultRivalName] = useState("");
  const [defaultRivalUrl, setDefaultRivalUrl] = useState("");
  const [defaultRivalXHandle, setDefaultRivalXHandle] = useState("");
  const [competitorUrl1, setCompetitorUrl1] = useState("");
  const [competitorUrl2, setCompetitorUrl2] = useState("");

  // Buyer Product
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Offer
  const [headline, setHeadline] = useState("");
  const [pitch, setPitch] = useState("");
  const [ctaChoice, setCtaChoice] = useState(CTA_OPTIONS[0]);
  const [expiresAt, setExpiresAt] = useState("");

  const [attestation, setAttestation] = useState(false);
  const [throneSlug, setThroneSlug] = useState("");
  const [deployedNotice, setDeployedNotice] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((d) => {
        if (d?.user) {
          setUser(d.user);
          if (!handle) setHandle(`@${d.user.xHandle}`);
        }
      })
      .catch(() => {});
  }, []);

  const formattedCta = ctaChoice.replace("{Product}", name || "Product");

  function validateStep1() {
    setError("");
    const words = categoryName.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4) {
      setError("Throne name must be between 2 and 4 words.");
      return false;
    }
    if (categoryName.length > 32) {
      setError("Throne name must be 32 characters or fewer.");
      return false;
    }
    if (definition.trim().length < 40 || definition.trim().length > 140) {
      setError("Category definition must be between 40 and 140 characters.");
      return false;
    }
    if (!defaultRivalName.trim() || !defaultRivalUrl.trim()) {
      setError("Default rival name and URL are required.");
      return false;
    }
    if (!competitorUrl1.trim() || !competitorUrl2.trim()) {
      setError("Two other independent competitor URLs in this market are required.");
      return false;
    }
    return true;
  }

  function validateStep2() {
    setError("");
    if (!name.trim() || name.trim().length < 2 || name.trim().length > 40) {
      setError("Product name must be 2 to 40 characters.");
      return false;
    }
    if (!url.trim() || !url.startsWith("http")) {
      setError("Product URL must be a valid public http(s) URL.");
      return false;
    }
    if (!handle.trim()) {
      setError("Product X handle is required.");
      return false;
    }
    if (headline.trim().length < 20 || headline.trim().length > 90) {
      setError("Offer headline must be between 20 and 90 characters.");
      return false;
    }
    if (pitch.trim().length < 40 || pitch.trim().length > 180) {
      setError("Why choose you pitch must be between 40 and 180 characters.");
      return false;
    }
    if (!attestation) {
      setError("You must confirm you compete with the default rival and at least 4 products serve this market.");
      return false;
    }
    return true;
  }

  async function deployThrone() {
    if (!user) {
      window.location.assign(`/api/auth/x/login?returnTo=${encodeURIComponent("/start")}`);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/thrones/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryName: categoryName.trim(),
          definition: definition.trim(),
          defaultRivalName: defaultRivalName.trim(),
          defaultRivalUrl: defaultRivalUrl.trim(),
          defaultRivalXHandle: defaultRivalXHandle.trim() || undefined,
          competitorUrl1: competitorUrl1.trim(),
          competitorUrl2: competitorUrl2.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign(`/api/auth/x/login?returnTo=${encodeURIComponent("/start")}`);
          return;
        }
        setError(result.error || "Cannot deploy this throne right now.");
        return;
      }

      setThroneSlug(result.slug);
      setDeployedNotice(true);
      setStep(2);
    } catch {
      setError("Network error. Cannot deploy this throne right now.");
    } finally {
      setBusy(false);
    }
  }

  function openProductStep() {
    if (!validateStep1()) return;
    if (throneSlug) {
      setStep(2);
      return;
    }
    void deployThrone();
  }

  async function submitConquest() {
    if (!throneSlug) {
      setError("Deploy the throne before attempting a conquest.");
      setStep(1);
      return;
    }
    if (!user) {
      window.location.assign(`/api/auth/x/login?returnTo=${encodeURIComponent("/start")}`);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: throneSlug,
          name: name.trim(),
          url: url.trim(),
          productXHandle: handle.replace(/^@/, "").trim(),
          productLogoUrl: logoUrl.trim() || undefined,
          offerHeadline: headline.trim(),
          offerPitch: pitch.trim(),
          ctaLabel: ctaChoice,
          offerExpiresAt: expiresAt || undefined,
          attestation: true,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign(`/api/auth/x/login?returnTo=${encodeURIComponent("/start")}`);
          return;
        }
        setError(result.error || "Cannot start the conquest right now.");
        return;
      }

      window.location.assign(result.redirectUrl);
    } catch {
      setError("Network error. Cannot start the conquest right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="start-throne-page prose-page-wide">
      <header className="start-header">
        <h1 className="display">Start a Real Fight</h1>
        <p className="start-lead">
          Name a buying decision founders already make—not a category only your product can win.
        </p>
      </header>

      {/* Progress navigation */}
      <div className="builder-progress start-progress">
        <div className="progress-steps">
          <button
            type="button"
            className={`step-badge ${step === 1 ? "is-active" : step > 1 ? "is-done" : ""}`}
            onClick={() => setStep(1)}
          >
            1 · THE FIGHT & MARKET
          </button>
          <span className="step-sep">→</span>
          <button
            type="button"
            className={`step-badge ${step === 2 ? "is-active" : step > 2 ? "is-done" : ""}`}
            onClick={openProductStep}
          >
            2 · YOUR PRODUCT & OFFER
          </button>
          <span className="step-sep">→</span>
          <button
            type="button"
            className={`step-badge ${step === 3 ? "is-active" : ""}`}
            onClick={() => {
              if (validateStep1() && validateStep2()) setStep(3);
            }}
          >
            3 · PREVIEW & OPEN
          </button>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {deployedNotice && (
        <div className="throne-deployed-overlay" role="dialog" aria-modal="true" aria-labelledby="throne-deployed-title">
          <div className="throne-deployed-popup">
            <p className="smallcaps">THE KINGDOM HAS EXPANDED</p>
            <h2 id="throne-deployed-title" className="display">NEW THRONE DEPLOYED.</h2>
            <p>
              The seat is live. The default rival is sitting on borrowed time. Now put your product in the arena and make them pay to keep it.
            </p>
            <button type="button" className="steal-button" onClick={() => setDeployedNotice(false)}>
              ENTER THE PRODUCT ARENA →
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: The Fight & Market */}
      {step === 1 && (
        <section className="start-form-section">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              openProductStep();
            }}
          >
            <div className="form-grid">
              <label>
                Throne Name (2–4 words, max 32 chars)
                <input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. AI Code Editors"
                  maxLength={32}
                  required
                />
                <span className="field-hint">Neutral market name founders search for.</span>
              </label>

              <label>
                What belongs here? (40–140 chars)
                <textarea
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  placeholder="e.g. Code editors with native generative AI autocompletion and agent capabilities."
                  minLength={40}
                  maxLength={140}
                  rows={2}
                  required
                />
                <span className="field-count">{definition.length}/140</span>
              </label>

              <fieldset className="form-fieldset">
                <legend className="smallcaps">Default Rival (The Current Incumbent)</legend>
                <div className="field-row">
                  <label>
                    Default Rival Name
                    <input
                      value={defaultRivalName}
                      onChange={(e) => setDefaultRivalName(e.target.value)}
                      placeholder="e.g. Cursor"
                      required
                    />
                  </label>
                  <label>
                    Default Rival URL
                    <input
                      value={defaultRivalUrl}
                      onChange={(e) => setDefaultRivalUrl(e.target.value)}
                      placeholder="https://cursor.com"
                      type="url"
                      required
                    />
                  </label>
                </div>
                <label>
                  Default Rival X Handle (Optional)
                  <input
                    value={defaultRivalXHandle}
                    onChange={(e) => setDefaultRivalXHandle(e.target.value)}
                    placeholder="@cursor_ai"
                  />
                </label>
              </fieldset>

              <fieldset className="form-fieldset">
                <legend className="smallcaps">Two Other Products In This Market</legend>
                <p className="field-hint">Proves this is a real multi-player category founders evaluate.</p>
                <div className="field-row">
                  <label>
                    Competitor #1 URL
                    <input
                      value={competitorUrl1}
                      onChange={(e) => setCompetitorUrl1(e.target.value)}
                      placeholder="https://windsurf.ai"
                      type="url"
                      required
                    />
                  </label>
                  <label>
                    Competitor #2 URL
                    <input
                      value={competitorUrl2}
                      onChange={(e) => setCompetitorUrl2(e.target.value)}
                      placeholder="https://github.com/features/copilot"
                      type="url"
                      required
                    />
                  </label>
                </div>
              </fieldset>
            </div>

            <div className="builder-actions">
              <a href="/" className="checkout-cancel">Cancel</a>
              <button type="submit" className="steal-button next-button" disabled={busy}>
                {busy ? "DEPLOYING THRONE..." : "DEPLOY THRONE & CONTINUE →"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* STEP 2: Product & Offer */}
      {step === 2 && (
        <section className="start-form-section">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validateStep2()) setStep(3);
            }}
          >
            <div className="form-grid">
              <fieldset className="form-fieldset">
                <legend className="smallcaps">Your Product</legend>
                <div className="field-row">
                  <label>
                    Product Name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Void Editor"
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
                      placeholder="https://voideditor.com"
                      type="url"
                      required
                    />
                  </label>
                </div>
                <div className="field-row">
                  <label>
                    Product X Handle
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="@voideditor"
                      required
                    />
                  </label>
                  <label>
                    Product Logo URL (Optional)
                    <input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://voideditor.com/logo.png"
                      type="url"
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="form-fieldset">
                <legend className="smallcaps">Your Founder Offer</legend>
                <label>
                  Offer Headline (20–90 chars)
                  <input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Open-source AI editor with local model support and full privacy"
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
                    placeholder="Keep your code private on your machine while getting Cursor-quality AI inline edits."
                    minLength={40}
                    maxLength={180}
                    rows={3}
                    required
                  />
                  <span className="field-count">{pitch.length}/180</span>
                </label>

                <div className="field-row">
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
                </div>
              </fieldset>

              <label className="attestation-checkbox">
                <input
                  type="checkbox"
                  checked={attestation}
                  onChange={(e) => setAttestation(e.target.checked)}
                  required
                />
                <span>
                  My product directly competes with {defaultRivalName || "the named default"}, and at least four independent products serve this buying decision.
                </span>
              </label>
            </div>

            <div className="builder-actions">
              <button type="button" className="checkout-cancel" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button type="submit" className="steal-button next-button">
                Preview & Open Throne →
              </button>
            </div>
          </form>
        </section>
      )}

      {/* STEP 3: Preview & Pay */}
      {step === 3 && (
        <section className="start-form-section">
          <h2 className="builder-heading display">
            CONQUER THE {categoryName.toUpperCase()} THRONE
          </h2>

          <div className="new-throne-story-preview">
            <p className="story-step-1">
              <strong>{defaultRivalName || "Default Rival"}</strong> sits here by default for <strong>$0</strong>.
            </p>
            <p className="story-step-2">
              <strong>{name || "Your Product"}</strong> can conquer the throne by removing them for <strong>$9</strong>.
            </p>
          </div>

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

          {previewTab === "throne" && (
            <div className="mock-throne-preview">
              <p className="smallcaps">The Throne of {categoryName}</p>
              <p className="mock-occupied">is occupied by</p>
              <h3 className="mock-king display">{name || "Your Product"}</h3>
              <div className="mock-verdict">
                <span className="stamp stamp-live">CURRENT REIGN</span>
                <span className="money">$9</span>
              </div>
              <div className="mock-offer-box">
                <p className="mock-headline">"{headline}"</p>
                <p className="mock-pitch">{pitch}</p>
                <div className="mock-cta">{formattedCta} ↗</div>
              </div>
            </div>
          )}

          {previewTab === "card" && (
            <div className="mock-share-card">
              <div className="card-top">
                <span className="card-tag">UNPAID KING · REIGN RECEIPT</span>
                <span className="card-cat">{categoryName.toUpperCase()}</span>
              </div>
              <div className="card-headline display">"{headline}"</div>
              <div className="card-product">by {name}</div>
              <div className="card-footer">
                <span className="card-dethrone">DETHRONED {defaultRivalName.toUpperCase()}</span>
                <span className="card-link">unpaidking.lol/r/...</span>
              </div>
            </div>
          )}

          <div className="deliverables-grid">
            <div className="deliverable-col you-get">
              <h4 className="smallcaps">YOU GET</h4>
              <ul>
                <li>The newly created live {categoryName} throne</li>
                <li>A permanent campaign page that always promotes {name}</li>
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
            <button type="button" className="checkout-cancel" onClick={() => setStep(2)}>
              ← Edit Details
            </button>
            <button
              type="button"
              className="steal-button create-reign-btn"
              disabled={busy}
              onClick={submitConquest}
            >
              {busy ? "PREPARING CONQUEST..." : "CONQUER THIS THRONE — $9"}
            </button>
          </div>
        </section>
      )}
    </article>
  );
}
