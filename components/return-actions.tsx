"use client";
import { useState } from "react";

export function ReturnActions({
  publicUrl,
  ogImageUrl,
  xIntentUrl,
  throneSlug,
}: {
  publicUrl: string;
  ogImageUrl: string;
  xIntentUrl: string;
  throneSlug: string;
}) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="return-actions-container">
      {/* Primary Action: Post on X */}
      <a
        href={xIntentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="steal-button post-x-btn"
      >
        <span>POST MY TAKEOVER ON X</span>
        <span aria-hidden="true">↗</span>
      </a>

      {/* Secondary Actions */}
      <div className="return-secondary-row">
        <button
          type="button"
          className="secondary-action-btn"
          onClick={copyLink}
        >
          {copied ? "✓ Copied Link" : "Copy Permanent Link"}
        </button>

        <a
          href={ogImageUrl}
          download="unpaidking-reign-card.png"
          target="_blank"
          rel="noopener noreferrer"
          className="secondary-action-btn"
        >
          Download Share Card
        </a>

        <a
          href={`/t/${throneSlug}`}
          className="secondary-action-btn live-throne-btn"
        >
          See the Live Throne →
        </a>
      </div>
    </div>
  );
}
