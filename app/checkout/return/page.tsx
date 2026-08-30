import { getCheckoutContext } from "@/lib/checkouts";
import { dollars } from "@/lib/format";
import { ReturnActions } from "@/components/return-actions";

export const dynamic = "force-dynamic";

export default async function ReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; id?: string }>;
}) {
  const { ok, id } = await searchParams;
  const context = id ? await getCheckoutContext(id) : undefined;

  if (ok !== "1" || !context?.reign) {
    return (
      <article className="prose-page return-failed">
        <h1 className="display">Payment not completed</h1>
        <p>Payment did not go through. The king did not move.</p>
        <p>
          <a
            className="steal-button"
            href={context?.throne ? `/t/${context.throne.slug}#steal` : "/"}
          >
            Try again →
          </a>
        </p>
      </article>
    );
  }

  const { checkout, throne, reign } = context;
  const previousKing = reign.fromName || (("defaultKingName" in throne) ? throne.defaultKingName : throne.kingName);
  const isDefaultPrev = (reign.fromStakeCents ?? 0) === 0 || reign.amountCents === 900;
  const isReconquest = checkout.amountCents < reign.amountCents;
  const publicId = reign.publicId;

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://unpaidking.lol";
  const publicUrl = `${base}/r/${publicId}`;
  const ogImageUrl = `/r/${publicId}/og`;

  const headlineText = reign.offerHeadline || `${reign.kingName} takes the throne`;
  const postText = isReconquest
    ? `${headlineText}\n\n${reign.kingName} just RECLAIMED the ${throne.category} throne from ${previousKing}.\n\nThe crown is back where it belongs. Live throne restored.\n\n${publicUrl}`
    : isDefaultPrev
      ? `${headlineText}\n\n${reign.kingName} just dethroned ${previousKing} for the ${throne.category} throne.\n\nThey were king by default and paid $0. We paid ${dollars(checkout.amountCents)} to remove them.\n\n${publicUrl}`
      : `${headlineText}\n\n${reign.kingName} just dethroned ${previousKing} for the ${throne.category} throne.\n\nThey sat there for ${dollars(reign.fromStakeCents ?? 0)}. We paid ${dollars(checkout.amountCents)} to take the seat.\n\n${publicUrl}`;

  const xIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}`;

  return (
    <article className="checkout-sheet return-sheet" aria-label="Takeover Success">
      <header className="return-header">
        <h1 className="display return-title">
          {isReconquest
            ? `${reign.kingName.toUpperCase()} RECLAIMED THE ${throne.category.toUpperCase()} THRONE.`
            : `${reign.kingName.toUpperCase()} TOOK THE ${throne.category.toUpperCase()} THRONE.`}
        </h1>
        <p className="return-sub">
          {isReconquest
            ? `The crown was returned to ${reign.kingName}. ${previousKing} is dethroned.`
            : `${previousKing} is off the live throne.`}
        </p>
      </header>

      {/* Share Card Preview */}
      <section className="return-card-preview-box" aria-label="Social Share Card">
        <p className="smallcaps preview-box-tag">Generated Share Card</p>
        <div className="card-image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogImageUrl}
            alt={`Share card for ${reign.kingName} on ${throne.category}`}
            className="generated-card-image"
          />
        </div>
      </section>

      {/* Permanent Reign Info */}
      <section className="return-permanent-asset" aria-label="Your Permanent Asset">
        <p className="smallcaps">Your Permanent Reign</p>
        <div className="permanent-link-display">
          <a href={`/r/${publicId}`} className="permanent-url-text">
            unpaidking.lol/r/{publicId}
          </a>
        </div>
        <p className="permanent-helper-note">
          This link always promotes <strong>{reign.kingName}</strong>, even after another founder takes the live throne.
        </p>
      </section>

      {/* Actions */}
      <ReturnActions
        publicUrl={publicUrl}
        ogImageUrl={ogImageUrl}
        xIntentUrl={xIntentUrl}
        throneSlug={throne.slug}
      />
    </article>
  );
}
