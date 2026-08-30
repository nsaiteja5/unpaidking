export function GazetteIntro({ total, unpaid, stolen }: { total: number; unpaid: number; stolen: number }) {
  return <section className="gazette-intro"><p>Every category already has a king.<br />Most of them <em>paid $0.</em><br /><strong>Steal the seat.</strong> Clicks follow.</p><div className="market-strip" aria-label={`${total} thrones · ${unpaid} unpaid · ${stolen} stolen`}>{total} thrones <span>·</span> {unpaid} unpaid <span>·</span> {stolen} stolen</div></section>;
}
