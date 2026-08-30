import type { Metadata } from "next";

export const metadata: Metadata = { title: "How It Works | Unpaid King" };

export default function HowPage() {
  return (
    <article className="prose-page">
      <h1 className="display">How It Works</h1>

      <p className="how-lead">
        The throne creates the story. Your offer creates the click.
      </p>

      <section className="how-step">
        <h2 className="display how-h2">1. The Default Sits Unpaid</h2>
        <p>
          Every category has an obvious incumbent. We seated them by default. They paid $0. They hold the live spotlight until a competitor takes it.
        </p>
      </section>

      <section className="how-step">
        <h2 className="display how-h2">2. Sign in with X, Take the Throne</h2>
        <p>
          Browsing is public, but taking or creating a throne requires <strong>Sign in with X</strong>. Pay <strong>$9</strong> to dethrone an unpaid default, or <strong>current stake + $1</strong> to dethrone a paid king. Your takeover creates two assets:
        </p>
        <ul>
          <li>
            <strong>The Live Throne:</strong> Sits in the category spotlight and routes platform clicks to your product until dethroned.
          </li>
          <li>
            <strong>Your Permanent Reign Page:</strong> A dedicated, unalterable receipt (<code>unpaidking.lol/r/…</code>) featuring your product, offer, pitch, outbound CTA, and dynamic social card. It always promotes your product forever, even after someone dethrones you.
          </li>
        </ul>
      </section>

      <section className="how-step">
        <h2 className="display how-h2">3. Defend While Sitting</h2>
        <p>
          Already the king? Raise the buyout by <strong>$1 or more</strong>. Same campaign, same reign page — your stake just goes up, making the next steal more expensive. No new campaign needed.
        </p>
      </section>

      <section className="how-step">
        <h2 className="display how-h2">4. No Credits, No Refunds</h2>
        <p>
          If you get dethroned and want the throne back, you pay the full current stake + $1 again. No credit for what you spent before. Whole dollars only.
        </p>
      </section>

      <section className="how-step">
        <h2 className="display how-h2">5. An Offer Founders Actually Click</h2>
        <p>
          Instead of just displaying a logo, paid thrones feature your concrete founder offer — migration deals, trials, audits, discounts, or switcher benefits.
        </p>
      </section>

      <section className="how-step">
        <h2 className="display how-h2">6. Share Your Takeover Story</h2>
        <p>
          Every paid takeover generates an offer-first social card and shareable campaign link. Posting your takeover promotes your product and offer — never the competitor who replaces you later.
        </p>
      </section>

      <div style={{ marginTop: "32px", display: "flex", gap: "16px", alignItems: "center" }}>
        <a className="steal-button" href="/">
          See the Thrones →
        </a>
        <a className="ink-link" href="/start">
          Start a new throne
        </a>
      </div>
    </article>
  );
}
