import { Stamp } from "@/components/stamp";
import { StealButton } from "@/components/steal-button";
import { dollars, relativeTime } from "@/lib/format";
import type { ThroneView } from "@/lib/thrones";

export function ThroneSheet({
  throne,
  full = false,
  onSteal,
  onSheetClick,
}: {
  throne: ThroneView;
  full?: boolean;
  onSteal?: () => void;
  onSheetClick?: () => void;
}) {
  const isDefault = throne.isDefault;
  const status = isDefault ? "default" : "paid";
  const stakeLabel = isDefault ? "UNPAID" : "CURRENT STAKE";
  const stateLine = isDefault
    ? "Sits here by default."
    : `Took it from ${throne.lastFromName ?? throne.defaultKingName} · King for ${relativeTime(throne.reignStartedAt)}`;
  const action = onSteal ? (
    <button
      className="steal-button"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSteal();
      }}
    >
      <span>Steal for {dollars(throne.stakeCents + 900)}</span>
      <span className="steal-arrow" aria-hidden="true">
        →
      </span>
    </button>
  ) : (
    <StealButton stakeCents={throne.stakeCents} href={`/t/${throne.slug}#steal`} />
  );
  const clickLine =
    throne.outboundClicks > 0 ? (
      <>{throne.outboundClicks} throne clicks went to {throne.kingName}</>
    ) : (
      <>Clicks go to {throne.kingName}</>
    );

  return (
    <article
      className={`throne-sheet ${full ? "throne-full" : ""} ${onSheetClick ? "throne-linked" : ""}`}
      onClick={onSheetClick}
    >
      <div className="sheet-top">
        <p className="smallcaps category">{throne.category}</p>
        <Stamp status={status} />
      </div>
      {full && <p className="kicker">The throne of {throne.category.toLowerCase()}</p>}
      <div className="king-block">
        <p className="king-overline">
          <span className="king-mark" aria-hidden="true" />
          The king
        </p>
        <a
          className="king-name display"
          href={full ? `/go/throne/${throne.slug}` : `/t/${throne.slug}`}
          rel={full ? "nofollow noopener" : undefined}
        >
          {throne.kingName}
        </a>
        <p className={`stake money ${isDefault ? "unpaid-stake" : "paid-stake"}`}>
          <span>{dollars(throne.stakeCents)}</span>
          <span className="stake-caption"> · {stakeLabel}</span>
        </p>
        <p className="subline">{stateLine}</p>
      </div>
      <div className="sheet-lower">
        <p className="click-destination">
          <span aria-hidden="true">↗</span> {clickLine}
        </p>
        {action}
      </div>
    </article>
  );
}
