# Unpaid King — product conversion upgrade

This instruction supersedes earlier specifications wherever they conflict.

Do **not** perform another cosmetic redesign. The current single-Throne-Room visual direction is acceptable. Preserve its dark court aesthetic, typography, colors, category switching, routes, race-safe payment mechanics, and one-throne-per-category concept.

The problem is the offer, not the polish.

Today, $9 buys only a volatile title and an unproven promise of platform traffic. The success screen then asks the buyer to share a link that may later promote whoever dethrones them. That is not a rational buyer-owned asset.

Upgrade the product so every paid takeover buys:

1. A **temporary live throne** that receives platform traffic until dethroned.
2. A **permanent reign page** that always promotes that buyer, even after the throne changes.
3. An **offer-first social card and tracked campaign link** the buyer has a reason to post.

The throne creates the story. The buyer’s offer creates the click.

---

## 1. Preserve the current core

Keep:

- One active throne displayed at a time.
- One current king per category.
- Default king starts at `$0`.
- First paid takeover costs `$9`.
- Existing throne’s next price is `current stake + $9`.
- Payer pays the full new stake.
- No refunds for an ordinary dethroning.
- Current throne changes atomically after confirmed payment.
- Current king receives click-through traffic from the live throne.
- Dark ceremonial court / gazette identity.
- Existing routes and admin unless this document explicitly extends them.

Do not add:

- Leaderboards.
- Ranked product lists.
- Voting.
- Likes, comments, followers, points, badges, XP, or profiles.
- Fake traffic, fake activity, fake scarcity, fake buyers, or fake testimonials.
- Countdown timers, confetti, casino language, or compulsory social posting.

---

## 2. Correct the value proposition

The current page says:

`Every click on this throne goes to Stripe.`

That is incomplete. It makes traffic sound guaranteed while showing no evidence.

The product must clearly distinguish:

### Live throne

A rotating paid placement. It sends its platform-originated outbound clicks to the current king until another valid payment replaces them.

### Permanent reign page

A buyer-owned campaign receipt. It keeps the buyer’s product, offer, CTA, social card, link, and recorded clicks forever. Losing the live throne must never redirect or transfer this page to a competitor.

Use this concise promise before payment:

> Take the live throne. Keep the campaign forever.

And this disclosure:

> No traffic or reign duration is guaranteed. Your permanent reign page and share card remain yours after a takeover.

---

## 3. Change the takeover form

Replace the current two-field form with a short three-part takeover builder.

Do not make this feel like onboarding. Use one compact modal/sheet with visible progress:

`1 · PRODUCT` → `2 · OFFER` → `3 · PREVIEW`

### Step 1 — Product

Heading:

`Who is taking this throne?`

Fields:

- `PRODUCT NAME` — required, 2–40 characters.
- `PRODUCT URL` — required, canonical public HTTPS URL.
- `PRODUCT X HANDLE` — required for v1; normalize `@handle`.
- `PRODUCT LOGO` — optional URL/upload, buyer-supplied only. Never scrape a default king’s logo.

Required checkbox:

> I own or represent this product, and it directly competes in this category.

Do not prefill production forms with Lemlist or any demo product. The screenshot’s `Lemlist` under `Indie payments` must never be possible without failing the direct-category attestation/moderation checks.

### Step 2 — Offer

Heading:

`Give people a reason to click.`

Helper:

> The throne gets attention. Your offer earns the click.

Required field:

- `OFFER HEADLINE` — 20–90 characters.

Placeholder:

`Free migration from Stripe for the first 10 founders`

Required field:

- `WHY SHOULD THEY CHOOSE YOU?` — 40–180 characters.

Placeholder:

`Move subscriptions, taxes, and global payments without rebuilding your billing stack.`

Required field:

- `CTA LABEL` — choose one:
  - `Try {Product}`
  - `Get the offer`
  - `Book a demo`
  - `Start free`
  - `Learn more`

Optional:

- `OFFER EXPIRES` — date or `No expiry`.

Rules:

- Block `#1`, `best`, guaranteed results, fake comparison statistics, profanity, and unverified superiority claims.
- The offer may be a concrete benefit, migration help, discount, free resource, demo, trial, or clear product promise.
- Do not require a discount. A strong reason to switch is sufficient.

### Step 3 — Preview

Heading:

`This is what your $9 creates.`

Show two tabs:

- `LIVE THRONE`
- `SHARE CARD`

The preview must use the real submitted data before checkout.

Under the preview, show:

`YOU GET`

- `The live {Category} throne until the next paid takeover`
- `A permanent page that always promotes {Product}`
- `A share card built around your offer`
- `Tracked visits and outbound clicks`

Then:

`NOT GUARANTEED`

- `Views, clicks, sales, or minimum reign duration`

Primary button:

`CREATE MY REIGN — ${PRICE}`

Do not use `Pay $9 and sit` anymore. It describes the transaction, not the asset.

---

## 4. Make paid thrones useful to visitors

A default throne may remain visually close to the current version.

### Default throne

Show:

- Category.
- Default company.
- `UNPAID KING · $0`.
- `We seated {Default} by default. They did not buy this throne.`
- Current honest traffic record.
- CTA: `BUILD YOUR TAKEOVER — $9`.

Do not claim that default status is an award or objective ranking.

### Paid throne

The paid king’s offer must become the reason to stay and click.

Structure:

`THE THRONE OF {CATEGORY}`

`IS OCCUPIED BY`

`{PRODUCT}`

`CURRENT REIGN · ${STAKE}`

Large offer headline:

`{OFFER HEADLINE}`

Supporting pitch:

`{WHY SHOULD THEY CHOOSE YOU?}`

Primary outbound CTA:

`{CTA LABEL} ↗`

Traffic record:

`THIS REIGN · {N} RECORDED VISITS · {M} OUTBOUND CLICKS`

Takeover CTA:

`DETHRONE {PRODUCT} — ${NEXT_PRICE}`

Subcopy:

`Take the live throne. Keep your campaign forever.`

The offer CTA and takeover CTA must not look like equal competing buttons. The offer CTA serves visitors; the takeover CTA serves competing founders. Give them separate visual zones.

---

## 5. Add honest traffic records

The user specifically needs founders to evaluate potential traffic. Never fake or hide the numbers.

Track:

- Throne/category recorded visits.
- Permanent reign-page recorded visits.
- Outbound clicks from the live throne.
- Outbound clicks from each permanent reign page.

Use a first-party anonymous visitor cookie and deduplicate each page/reign view once per browser per 24 hours. Filter obvious bots when practical. Do not call these `verified humans` unless real bot verification exists. Call them `recorded visits`.

Before checkout, show the selected throne’s real trailing-seven-day record:

`LAST 7 DAYS · {N} RECORDED VISITS · {M} CLICKS SENT`

If both are zero, show:

`NEW FIGHT · NO TRAFFIC HISTORY YET`

Then show:

`Your share card and permanent campaign page are included regardless of traffic.`

Do not suppress zeroes to imply demand.

Click destinations should append buyer-safe UTMs:

- Live throne: `utm_source=unpaidking&utm_medium=throne&utm_campaign={categorySlug}`
- Permanent reign: `utm_source=unpaidking&utm_medium=reign&utm_campaign={reignPublicId}`

Preserve existing query parameters without overwriting buyer-defined values.

---

## 6. Add the permanent reign page

Create:

`/r/[publicId]`

This is the URL every buyer shares.

It must never redirect to a later king. It always promotes the reign owner’s product and offer.

### Current reign state

Show:

`CURRENT REIGN`

`{Product} dethroned {PreviousKing}`

`for the {Category} throne`

Then make the offer the largest useful content:

`{Offer headline}`

`{Pitch}`

Primary CTA:

`{CTA label} ↗`

Record:

- `Claimed {absolute date/time}`
- `Paid placement · ${amount}`
- `{N} recorded visits`
- `{M} outbound clicks sent to {Product}`

Secondary link:

`See the live {Category} throne`

Disclosure:

`A rotating paid placement, not an award, ranking, or endorsement.`

### Former reign state

When dethroned, do not delete, redirect, or replace the buyer’s content.

Change only the status area:

`FORMER REIGN`

`Held the {Category} throne for {duration}`

`{NewKing} took the live throne on {date}.`

Keep:

- Product.
- Offer.
- CTA to that product.
- Visit/click record.
- Permanent URL.
- Original historical statement that it dethroned the previous king.

Add:

`See who sits now`

A founder’s old X post must continue advertising that founder—not their replacement.

---

## 7. Generate an offer-first share card

Update `next/og` to create a permanent reign card for `/r/[publicId]`.

The card must remain historically true after a takeover.

Do not write `CURRENT KING` into the cached permanent card.

Layout:

`{OFFER HEADLINE}` — largest text.

`by {PRODUCT}`

`DETHRONED {PREVIOUS KING}`

`{CATEGORY} THRONE · ${AMOUNT} PAID`

`unpaidking.lol/r/{publicId}`

Optional buyer-supplied logo may appear small. Never show a scraped incumbent logo.

The product’s offer must be more visually prominent than Unpaid King’s wordmark.

The card should make sense when seen alone in an X timeline. A viewer should understand:

1. What the buyer offers.
2. Who they challenged.
3. What happened.
4. Where to click.

---

## 8. Replace the success screen

Delete the current sparse screen whose only primary action is `COPY THE TWEET`.

Use:

Heading:

`{PRODUCT} TOOK THE {CATEGORY} THRONE.`

Subheading:

`{PREVIOUS KING} is off the live throne.`

Then show the actual generated share card preview.

Show:

`YOUR PERMANENT REIGN`

`unpaidking.lol/r/{publicId}`

Helper:

`This link always promotes {Product}, even after another founder takes the live throne.`

Primary action:

`POST MY TAKEOVER ON X`

This opens an X intent with editable text; never auto-post.

Suggested post:

```
{OFFER HEADLINE}

{PRODUCT} just dethroned {PREVIOUS KING} for the {CATEGORY} throne.

They sat there for ${PREVIOUS_STAKE}. We paid ${AMOUNT} to remove them.

{PERMANENT_REIGN_URL}
```

If the previous king was the default, use:

```
{OFFER HEADLINE}

{PRODUCT} just dethroned {PREVIOUS KING} for the {CATEGORY} throne.

They were king by default and paid $0. We paid $9 to remove them.

{PERMANENT_REIGN_URL}
```

Do not add hashtags or mention Outbid.

Secondary actions:

- `DOWNLOAD SHARE CARD`
- `COPY PERMANENT LINK`
- `SEE THE LIVE THRONE`

Do not require posting to activate a paid reign. Sharing should be attractive because it promotes the buyer’s offer, not compulsory because Unpaid King needs traffic.

---

## 9. Improve checkout truth and trust

The current checkout displays an internal-looking slug such as `indiepayments → king`. Remove that.

Checkout must show:

`YOU ARE BUYING`

`The {Category} throne for {Product}`

`TOTAL · ${PRICE}`

Mini-preview of:

- Product.
- Offer headline.
- Previous king being removed.
- Permanent reign URL placeholder.

Included:

- `Live throne until another valid paid takeover`
- `Permanent reign page`
- `Share card`
- `Visit and click tracking`

Disclosure before payment:

`No traffic, sales, or minimum reign duration is guaranteed. Ordinary takeovers are final and non-refundable.`

Button:

`PAY ${PRICE} AND CREATE MY REIGN`

Cancel:

`EDIT MY TAKEOVER`

Keep the stub provider architecture. Do not add a real payment SDK in this task.

---

## 10. Allow instant new-throne creation — with hard guardrails

The product owner selected instant creation rather than manual approval.

Implement this carefully.

### Governing rule

A user-created throne is never published empty.

Creating the category and completing its first paid dethroning must be one atomic transaction.

Before payment, the proposed category exists only inside the pending checkout. After confirmed payment:

1. Create the throne.
2. Record the named starting/default rival as the `$0` seed reign.
3. Immediately create the buyer’s `$9` paid reign.
4. Publish the throne with the buyer already occupying it.

The public story is therefore:

`{Product} opened the {Category} throne by dethroning {DefaultRival}.`

Never publish hundreds of `$0` user-created categories.

### Entry point

Under the category selector/search, add:

`DON’T SEE YOUR FIGHT?`

`Create the throne. Name the default. Remove them for $9.`

Button:

`START A NEW THRONE`

### New-throne form

Heading:

`START A REAL FIGHT`

Helper:

`Name a buying decision founders already make—not a category only your product can win.`

Required:

- `THRONE NAME` — 2–4 words, maximum 32 characters.
- `WHAT BELONGS HERE?` — neutral definition, 40–140 characters.
- `DEFAULT RIVAL NAME`.
- `DEFAULT RIVAL URL`.
- `DEFAULT RIVAL X HANDLE` — optional but strongly encouraged.
- `TWO OTHER PRODUCTS IN THIS MARKET` — two distinct product URLs.
- All Product + Offer fields from the ordinary takeover form.

Required checkbox:

> My product directly competes with the named default, and at least four independent products serve this buying decision.

Preview heading:

`OPEN THE {CATEGORY} THRONE`

Preview story:

`{DEFAULT_RIVAL} sits here by default for $0.`

`{PRODUCT} opens the throne by removing them for $9.`

Payment button:

`OPEN THIS THRONE — $9`

### Automatic guards

Normalize names and detect likely duplicates before checkout:

- Lowercase.
- Remove punctuation.
- Singularize simple plurals.
- Ignore generic suffixes such as `tool`, `tools`, `software`, and `app` for similarity matching.
- Flag/reject similarity of `0.72` or greater against an existing throne name/alias.
- Flag matching default rival or overlapping competitor URLs with an existing throne.
- Require four distinct registrable domains: buyer, default, competitor 1, competitor 2.

Reject categories based only on:

- `best`, `top`, `#1`, `cheapest`, or `free`.
- The buyer’s brand name.
- A geography.
- Adding `AI` to an existing category.
- One tiny feature.
- A category deliberately narrow enough for only one product.
- Individuals rather than products/companies.
- Adult, gambling, illegal, hateful, malicious, or impersonation use.

### Limits

- One new throne per product domain every 30 days.
- A product may currently hold at most two live thrones.
- One X handle may create at most one new throne per 30 days.
- Rate-limit proposals/checkouts by IP.
- Include Turnstile or an equivalent placeholder integration point.
- Add `REPORT WRONG CATEGORY` to each throne/reign page.

Instant publication is subject to moderation. Add to Rules:

> New thrones publish after payment. We may suspend duplicates, fake markets, impersonation, or off-category products. If we remove a paid throne because our category review failed, we refund its current king.

Add admin actions:

- Suspend throne.
- Restore previous king.
- Mark refund required.
- Merge aliases without silently moving an active paid reign.

---

## 11. Replace the starter categories

Replace the incumbent-heavy infrastructure shelf with eight clearer indie-founder buying fights.

Seed exactly:

| slug | category | default king | URL |
|---|---|---|---|
| `saas-boilerplates` | SaaS boilerplates | ShipFast | `https://shipfa.st` |
| `testimonial-tools` | Testimonial tools | Senja | `https://senja.io` |
| `waitlist-tools` | Waitlist tools | Viral Loops | `https://viral-loops.com` |
| `feedback-boards` | Feedback boards | Canny | `https://canny.io` |
| `changelog-tools` | Changelog tools | Beamer | `https://www.getbeamer.com` |
| `uptime-monitors` | Uptime monitors | UptimeRobot | `https://uptimerobot.com` |
| `affiliate-tracking` | Affiliate tracking | Rewardful | `https://www.getrewardful.com` |
| `social-schedulers` | Social schedulers | Buffer | `https://buffer.com` |

Keep these as curated starter thrones. New paid thrones expand the set.

Before production, remove all demo reigns and mismatched test data. `Lemlist` must not remain under `Indie payments`.

---

## 12. Category discovery without another leaderboard

Keep the single active Throne Room.

Replace the fixed text dock with:

1. A compact horizontally scrollable row of the eight curated starter thrones.
2. `FIND A THRONE` search that searches all live throne names and aliases.
3. `START A NEW THRONE` action.

Do not display:

- Rank numbers.
- Most paid.
- Most viewed.
- Highest stake.
- Most clicks.
- Trending.
- Winners.

Search results are alphabetical. User-created thrones appear only after their first successful paid takeover.

The homepage still shows one throne at a time. Do not reintroduce a grid, feed, cards, or ranked directory.

---

## 13. Data-model extension

Extend existing models rather than rebuilding the app.

### Throne

Add:

- `definition`
- `source: seeded | user_created`
- `status: pending | live | suspended`
- `aliases[]`
- `defaultKingName`
- `defaultKingUrl`
- `defaultKingXHandle?`
- `createdByDomain?`
- `createdByXHandle?`
- `recordedVisits`
- `outboundClicks`

### Reign

Add:

- `publicId` unique, unguessable but short/shareable.
- `productXHandle`
- `productLogoUrl?`
- `offerHeadline`
- `offerPitch`
- `ctaLabel`
- `offerExpiresAt?`
- `startedAt`
- `endedAt?`
- `recordedVisits`
- `outboundClicks`
- `status: current | former | suspended`

### Pending checkout

Store a complete immutable snapshot of:

- Existing or proposed throne fields.
- Buyer product fields.
- Offer fields.
- Expected previous king.
- Expected price/stake.

On confirmation, `applySteal(checkoutId)` must:

- Remain idempotent.
- Lock the throne row for existing categories.
- Reject stale price/current-king state.
- For a new category, atomically create the throne, seed default reign, and paid reign.
- Return the permanent reign `publicId`.

### Recorded events

Add a simple event/dedupe model:

- `type: throne_view | reign_view | throne_click | reign_click`
- `throneId`
- `reignId?`
- `visitorDayHash`
- `createdAt`

Use a random first-party visitor cookie and day bucket for deduplication. Do not store raw IP addresses solely for this feature.

---

## 14. Required routes

Preserve existing routes and add:

- `/r/[publicId]` — permanent reign/campaign page.
- `/r/[publicId]/og` or equivalent dynamic OG route.
- `/start` — create a new throne and first takeover.
- `/api/events/view` — deduped recorded visit.
- `/go/throne/[slug]` — current throne outbound click.
- `/go/reign/[publicId]` — permanent reign outbound click.

The old `/go/[slug]` may redirect internally to the live-throne route for compatibility.

---

## 15. Exact conversion journey

### Existing throne

`Open throne`  
→ See current/default king + real traffic record  
→ `BUILD YOUR TAKEOVER` / `DETHRONE {KING}`  
→ Product  
→ Offer  
→ Preview live throne and permanent social card  
→ Checkout with exact deliverables  
→ Payment confirmation  
→ Live throne changes  
→ Permanent `/r/` page created  
→ Success screen displays buyer-first share asset  
→ Buyer optionally posts it  
→ Clicks on that shared permanent URL always go to that buyer

### New throne

`START A NEW THRONE`  
→ Define real market + default rival + two other competitors  
→ Add buyer product + concrete offer  
→ Preview: `{Product} dethrones {Default} to open {Category}`  
→ Pay `$9`  
→ Atomically create the live throne with buyer already sitting  
→ Create permanent reign page/share asset  
→ Buyer optionally posts the personally relevant fight

This is the intended self-marketing loop:

`Choose or create a personally relevant fight`  
→ `Pay for both live placement and permanent campaign asset`  
→ `Post an offer-first dethroning story`  
→ `Viewers click for the offer`  
→ `Relevant competitors discover the open fight`  
→ `Next paid takeover creates another permanent campaign`

---

## 16. Acceptance tests

The upgrade fails if:

- $9 still buys only a volatile link.
- The success share URL can later promote a competitor.
- The share card’s main message is Unpaid King rather than the buyer’s offer.
- A buyer cannot preview the permanent asset before payment.
- The site claims traffic without displaying real records.
- A new category can appear publicly at `$0` without a paying challenger.
- Someone can create a category only their own product fits.
- A mismatched product can casually enter an unrelated throne.
- Dynamic categories turn the homepage into a list, grid, or leaderboard.
- The checkout still shows internal slugs or hides what is and is not guaranteed.

The upgrade passes if a skeptical founder can truthfully say before paying:

> Even if Unpaid King sends zero visitors today, I receive a permanent offer page, a strong campaign card, tracked links, and a public story about dethroning a known competitor. If platform traffic grows, the live throne is additional upside.

And after paying:

> Posting this primarily promotes my product and offer—not Unpaid King or whoever replaces me later.

Implement this as a focused extension of the working app. Preserve existing functionality where compatible. Do not add unrelated features.