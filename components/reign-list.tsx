import { dollars, relativeTime } from "@/lib/format";
import type { reigns } from "@/db/schema";

type Reign = typeof reigns.$inferSelect;

export function ReignList({ reigns }: { reigns: Reign[] }) {
  return (
    <section className="reign-list" aria-label="Reign History">
      <h2 className="display">Reign History</h2>
      <div className="reign-rows-wrap">
        {reigns.map((reign) => (
          <div key={reign.id} className="reign-row">
            <span className="money reign-stake">
              {reign.amountCents === 0 ? "Default ($0)" : dollars(reign.amountCents)}
            </span>
            <span className="reign-info">
              <strong>{reign.kingName}</strong> ·{" "}
              {reign.amountCents === 0
                ? "seated by default"
                : `dethroned ${reign.fromName || "previous king"} · ${relativeTime(reign.paidAt)} ago`}
            </span>
            {reign.publicId && (
              <a href={`/r/${reign.publicId}`} className="reign-receipt-link ink-link">
                View permanent receipt →
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
