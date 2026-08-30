import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rules | Unpaid King" };

export default function RulesPage() {
  return (
    <article className="prose-page">
      <h1 className="display">Rules of the Court</h1>

      <section className="rules-block">
        <h2 className="display rules-h2">1. One Throne, One King</h2>
        <p>Every category has exactly one live throne. There is no #2. No leaderboard. No ranked list of spenders. Default incumbents start as unpaid kings at $0.</p>
      </section>

      <section className="rules-block">
        <h2 className="display rules-h2">2. The Economy</h2>
        <table className="rules-table">
          <thead>
            <tr>
              <th>Situation</th>
              <th>What you pay</th>
              <th>What happens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unpaid default ($0)</td>
              <td><strong>$9</strong> first takeover</td>
              <td>You become king. Stake = $9.</td>
            </tr>
            <tr>
              <td>Someone else sits at $N</td>
              <td><strong>$N + $1</strong> (full new stake)</td>
              <td>New king. Old king is not refunded.</td>
            </tr>
            <tr>
              <td>You are the sitting king</td>
              <td><strong>+$1 or more</strong> (defend)</td>
              <td>Same king, same campaign. Stake rises. Next steal = new stake + $1.</td>
            </tr>
            <tr>
              <td>Dethroned former king</td>
              <td>Full <strong>current stake + $1</strong> again</td>
              <td>No credit for previous spend. Full price to reclaim.</td>
            </tr>
          </tbody>
        </table>
        <p className="microcopy" style={{ marginTop: "8px" }}>Whole dollars only. No wallets. No refunds. No credits.</p>
      </section>

      <section className="rules-block">
        <h2 className="display rules-h2">3. Dual Asset: Live Throne & Permanent Receipt</h2>
        <p>
          Every paid takeover buys two things:
        </p>
        <ul>
          <li><strong>The live throne:</strong> Receives outbound clicks until another competitor pays to dethrone you.</li>
          <li><strong>A permanent reign page:</strong> A buyer-owned campaign receipt (<code>/r/[id]</code>) that always promotes your product, offer, CTA, and social share card forever — even after you lose the live throne.</li>
        </ul>
      </section>

      <section className="rules-block">
        <h2 className="display rules-h2">4. X Authentication Required</h2>
        <p>
          Browsing is always public. Taking a throne, defending a throne, creating a new throne, and editing a live offer all require <strong>Sign in with X</strong>.
        </p>
      </section>

      <section className="rules-block">
        <h2 className="display rules-h2">5. Starting New Thrones</h2>
        <p>
          New categories publish instantly upon first $9 payment with the buyer already sitting. We require naming the default rival plus two other competitors to verify a real multi-player market.
        </p>
      </section>

      <section className="rules-block">
        <h2 className="display rules-h2">6. Moderation & Review Policy</h2>
        <p>
          New thrones publish after payment. We may suspend duplicates, fake markets, trademark impersonation, spam, or off-category products. If we remove a paid throne because our category review failed, we refund its current king.
        </p>
      </section>

      <section className="rules-block">
        <h2 className="display rules-h2">7. Disclosures & Truth</h2>
        <p>
          Traffic and reign duration depend on distribution and future takeovers. Results are not guaranteed. Payments are final.
        </p>
        <p style={{ marginTop: "8px" }}>
          Unpaid King provides honest recorded visits and outbound click metrics with 24-hour visitor deduplication. No inflated numbers.
        </p>
      </section>

      <p style={{ marginTop: "32px" }}>
        <a className="ink-link" href="/">
          ← Return to the Throne Room
        </a>
      </p>
    </article>
  );
}
