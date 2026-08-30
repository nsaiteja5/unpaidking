"use client";
import { useState } from "react";
import { dollars } from "@/lib/format";

type Props = {
  slug: string;
  category: string;
  currentStakeCents: number;
  onClose: () => void;
  onDefended: (newStakeCents: number) => void;
};

export function DefendSheet({
  slug,
  category,
  currentStakeCents,
  onClose,
  onDefended,
}: Props) {
  const [amount, setAmount] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const newStakeCents = currentStakeCents + (isNaN(amount) || amount < 1 ? 0 : amount * 100);
  const nextStealCents = newStakeCents + 100;

  const handleDefend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(amount) || amount < 1 || !Number.isInteger(amount)) {
      setError("Please enter a whole dollar amount of at least $1.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch(`/api/thrones/${slug}/defend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to raise buyout.");
        return;
      }

      onDefended(data.newStakeCents);
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
      aria-labelledby="defend-sheet-title"
      onMouseDown={onClose}
    >
      <div className="modal-sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="takeover-builder defend-sheet-card">
          <div className="builder-progress">
            <span className="smallcaps" style={{ color: "var(--gold)" }}>
              DEFEND THRONE · {category}
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

          <h2 id="defend-sheet-title" className="builder-heading display">
            Raise the buyout
          </h2>

          <p className="builder-sub">
            Your current stake is <strong>{dollars(currentStakeCents)}</strong>. Adding to your stake raises the price for any competitor to dethrone you.
          </p>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleDefend}>
            <label>
              Add to stake ($ whole dollars)
              <div className="defend-input-wrap">
                <span className="defend-currency-prefix">$</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value, 10))}
                  required
                  className="defend-number-input"
                  autoFocus
                />
              </div>
            </label>

            {/* Quick Increment Buttons */}
            <div className="defend-quick-pills">
              <span className="smallcaps quick-pills-label">Quick add:</span>
              {[1, 5, 10, 25, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`defend-pill ${amount === val ? "is-active" : ""}`}
                  onClick={() => setAmount(val)}
                >
                  +${val}
                </button>
              ))}
            </div>

            <div className="defend-calculation-box">
              <p className="defend-helper-text">
                You stay king. The next founder must pay <strong>{dollars(nextStealCents)}</strong>.
              </p>
              <div className="defend-math-row">
                <span>New buyout stake:</span>
                <span className="money">{dollars(newStakeCents)}</span>
              </div>
            </div>

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
                className="steal-button defend-submit-btn"
                disabled={busy}
              >
                {busy ? "DEFENDING..." : `PAY ${dollars((isNaN(amount) || amount < 1 ? 1 : amount) * 100)} TO DEFEND`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
