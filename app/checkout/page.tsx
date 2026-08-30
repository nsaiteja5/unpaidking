import { PayButton } from "@/components/pay-button";
import { dollars } from "@/lib/format";
import { getCheckoutContext } from "@/lib/checkouts";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const id = (await searchParams).id;
  const context = id ? await getCheckoutContext(id) : undefined;

  if (!context) {
    return (
      <section className="prose-page">
        <p>Checkout session expired or not found.</p>
        <p>
          <a className="ink-link" href="/">
            Back to thrones
          </a>
        </p>
      </section>
    );
  }

  const { checkout, throne } = context;
  const priceFormatted = dollars(checkout.amountCents);
  const previousKing = checkout.expectedPreviousKing || throne.kingName;

  const cancelUrl = checkout.throneId ? `/t/${throne.slug}#steal` : "/start";

  return (
    <article className="checkout-sheet" aria-label="Review and Pay Checkout">
      <header className="checkout-header">
        <p className="smallcaps">You are buying</p>
        <h1 className="display checkout-title">
          The {throne.category} throne for {checkout.name}
        </h1>
        <div className="checkout-total-row">
          <span className="smallcaps">Total</span>
          <span className="checkout-price money">{priceFormatted}</span>
        </div>
      </header>

      {/* Mini preview */}
      <section className="checkout-mini-preview" aria-label="Order Summary">
        <div className="mini-preview-row">
          <span className="mini-label">Product:</span>
          <strong>{checkout.name}</strong>
        </div>
        <div className="mini-preview-row">
          <span className="mini-label">Offer:</span>
          <em>"{checkout.offerHeadline}"</em>
        </div>
        <div className="mini-preview-row">
          <span className="mini-label">Dethroning:</span>
          <span>{previousKing}</span>
        </div>
        <div className="mini-preview-row">
          <span className="mini-label">Permanent URL:</span>
          <span>Permanent campaign URL created after payment</span>
        </div>
      </section>

      {/* Deliverables Included */}
      <section className="checkout-inclusions" aria-label="Deliverables Included">
        <div className="checkout-inclusion-item">
          <h2 className="smallcaps">LIVE UNTIL DETHRONED</h2>
          <p className="checkout-inclusion-desc">
            The throne stays yours until another founder takes it.
          </p>
        </div>
        <div className="checkout-inclusion-item">
          <h2 className="smallcaps">YOURS FOREVER</h2>
          <p className="checkout-inclusion-desc">
            Your campaign page, share card, and tracked link never expire.
          </p>
        </div>
      </section>

      <div className="checkout-actions">
        <PayButton
          checkoutId={checkout.id}
          amountCents={checkout.amountCents}
        />
        <p className="checkout-footnote">
          {priceFormatted} once. Your throne may change hands. Your campaign stays yours.
        </p>
        <a className="checkout-cancel-link" href={cancelUrl}>
          Edit my takeover
        </a>
      </div>
    </article>
  );
}
