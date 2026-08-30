"use client";
import { useState } from "react";

export function ReportButton({ slug, publicId }: { slug?: string; publicId?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Off-category product / wrong fight");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, publicId, reason, details }),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="report-wrap">
      <button
        type="button"
        className="report-link-button"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
        }}
      >
        Report wrong category
      </button>

      {open && (
        <div className="steal-modal" role="dialog" aria-modal="true" onMouseDown={() => setOpen(false)}>
          <div className="modal-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <section className="steal-form">
              <h2 className="display">Report category</h2>
              <p>We review categories to ensure fair, direct product competition. Spam, fake markets, or off-category products will be suspended.</p>

              {status === "sent" ? (
                <div className="report-success">
                  <p>Report received. Our court clerk will review this category.</p>
                  <button type="button" className="steal-button" onClick={() => setOpen(false)}>
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <label>
                    Reason
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="report-select"
                    >
                      <option value="Off-category product / wrong fight">Off-category product / wrong fight</option>
                      <option value="Duplicate or fake category">Duplicate or fake category</option>
                      <option value="Impersonation / trademark violation">Impersonation / trademark violation</option>
                      <option value="Misleading claims / spam">Misleading claims / spam</option>
                    </select>
                  </label>

                  <label>
                    Details (optional)
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Why does this product not compete in this category?"
                      rows={3}
                      className="report-textarea"
                    />
                  </label>

                  {status === "error" && <p className="form-error">Failed to submit report. Please try again.</p>}

                  <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                    <button type="submit" className="steal-button" disabled={status === "sending"}>
                      {status === "sending" ? "Submitting..." : "Submit report"}
                    </button>
                    <button
                      type="button"
                      className="checkout-cancel"
                      onClick={() => setOpen(false)}
                      style={{ margin: 0, padding: "10px 14px" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
