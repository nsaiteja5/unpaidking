"use client";
import { useState } from "react";

type Props = {
  slug: string;
  category: string;
  kingName: string;
  initialHeadline: string;
  initialPitch: string;
  initialCta: string;
  onClose: () => void;
  onSaved: (data: { offerHeadline: string; offerPitch: string; ctaLabel: string }) => void;
};

const CTA_OPTIONS = [
  "Try {Product}",
  "Get the offer",
  "Book a demo",
  "Start free",
  "Learn more",
];

export function EditOfferModal({
  slug,
  category,
  kingName,
  initialHeadline,
  initialPitch,
  initialCta,
  onClose,
  onSaved,
}: Props) {
  const [headline, setHeadline] = useState(initialHeadline);
  const [pitch, setPitch] = useState(initialPitch);
  const [ctaChoice, setCtaChoice] = useState(initialCta || CTA_OPTIONS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (headline.trim().length < 20 || headline.trim().length > 90) {
      setError("Offer headline must be between 20 and 90 characters.");
      return;
    }
    if (pitch.trim().length < 40 || pitch.trim().length > 180) {
      setError("Why choose you pitch must be between 40 and 180 characters.");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch(`/api/thrones/${slug}/edit-offer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offerHeadline: headline.trim(),
          offerPitch: pitch.trim(),
          ctaLabel: ctaChoice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to update offer.");
        return;
      }

      onSaved({
        offerHeadline: data.offerHeadline,
        offerPitch: data.offerPitch,
        ctaLabel: data.ctaLabel,
      });
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="steal-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-offer-title"
      onMouseDown={onClose}
    >
      <div className="modal-sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="takeover-builder">
          <div className="builder-progress">
            <span className="smallcaps" style={{ color: "var(--gold)" }}>
              EDIT LIVE OFFER · {category}
            </span>
            <button
              type="button"
              className="builder-close"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <h2 id="edit-offer-title" className="builder-heading display">
            Update your offer
          </h2>
          <p className="builder-sub">
            The throne gets attention. Your offer earns the click.
          </p>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSave}>
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
                    {opt.replace("{Product}", kingName)}
                  </option>
                ))}
              </select>
            </label>

            <div className="builder-actions" style={{ marginTop: "24px" }}>
              <button
                type="button"
                className="checkout-cancel"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="steal-button next-button"
                disabled={busy}
              >
                {busy ? "SAVING..." : "SAVE OFFER →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
