# Unpaid King — build spec (`unpaidking.lol`)

Ship this. Do not invent a leaderboard, a landing-page marketing site, or an Outbid skin.

A founder should understand the product in **one second**, feel the insult in **two**, and see a steal button in **three**. If they have to scroll to learn the rules, the page failed.

---

## 0. What you are building

**One throne per category. Someone already sits on it. They paid $0. Anyone can steal it by paying.**

Not a ranked list. Not 10 slots. Not “pay to rank.” Not Outbid with hats.

| This product | Not this product |
|---|---|
| One king | A ladder of #1–#50 |
| Default incumbent, marked UNPAID | Empty board / $0 vs $0 duel |
| Steal | Bid / claim / outrank |
| Clicks go to whoever is king *right now* | A meme slot with no destination |
| Gazette / court / wanted-poster | Neon SaaS, purple gradient, trophy emoji |

**Useful part (tell it once, then shut up):** visitors who click the king go to the king’s site. That is the ad. Do not write “ROI,” “leads,” “pipeline,” or “grow your SaaS.”

**Launch truth (do not encode this in UI, encode it in copy tone):** the first dollar is a $9 public dare, not proven traffic. The page must still *look* like a real seat, not a joke generator.

---

## 1. Non-goals (do not build)

- User accounts, login, OAuth, profiles
- Logos, favicons scraped from targets, brand colors of Instantly/Cursor/etc.
- Auto-detected categories, user-created thrones, “suggest a category”
- All-time / 24h / daily boards
- Chat, comments, reactions
- Leaderboard of spenders
- Confetti, bounce-in crowns, emoji rain
- “Drop your clone” energy, “built in 3 hours,” “inspired by outbid”
- Pricing page, blog, waitlist, newsletter
- Admin dashboard beyond a tiny `/admin` seed/repair page (password via env)
- Real payment provider code — **stub only** (see §11)

---

## 2. Brand

**Name:** Unpaid King  
**Domain:** unpaidking.lol  
**Object:** a throne (one per category)  
**Villain:** the default — the company everyone already treats as #1, who paid nothing  
**Hero:** whoever pays to steal it  
**Voice:** court clerk who enjoys the execution. Dry. Short. Slightly cruel. Never hype.

### Voice rules

- No exclamation marks.
- No emoji in the product UI. (OG image: none either.)
- No “Welcome to Unpaid King.” No “Let’s steal some thrones.”
- Prefer verbs: steal, sit, dethrone, reign. Never: bid, rank, boost, grow.
- Money is a number, not a flex sentence. `$9` not “only nine dollars!”
- Defaults are stamped, not explained in a paragraph.

**Tagline (use once, under the wordmark):**  
They already sit on the throne. They never paid.

**Alt line (rules / footer only):**  
Clicks go to the king.

### Positioning sentence (for the coding agent, not on the homepage)

Unpaid King is a public gazette of category thrones. Incumbents start as unpaid defaults. A steal is a paid coup. The current king receives the clicks until the next coup.

---

## 3. Psychology — first 3 seconds

The page is not a pitch. It is a **scene already in progress**.

1. **Comprehension:** “There is a king of cold email.”  
2. **Insult:** “Instantly. DEFAULT. UNPAID.” The big company looks cheap, not glamorous.  
3. **Urge:** A single hot control: **Steal for $9**. The founder should think: *I can take this from them for the price of lunch.*

Design implications:

- Do **not** put a hero, three feature columns, or a screenshot of the product. The thrones *are* the product.
- The default king’s name is the largest type on the card. Bigger than our brand.
- `UNPAID` is a stamp, not a grey badge. It should feel like a verdict.
- `$0` must be visible. Hide the zero and the insult dies.
- The steal button is the only saturated color on the page. Everything else is ink and paper.
- Do not name the #2 on the throne (“vs Lemlist”). That makes us look like we work for them. The visitor should imagine *themselves* on the seat.
- Empty / loading states must never look like “nobody uses this.” Defaults mean the court is always occupied.

**The feeling to protect:** a small company can publicly unseat a default giant, tonight, for $9, and the receipt is a screenshot.

---

## 4. Visual identity

Think **royal gazette printed on cheap paper, pinned in a hallway**, not a crypto king or a Game of Thrones fan site.

### Color (lock these)

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#14110e` | Page background |
| `--ink-2` | `#1c1814` | Raised panels |
| `--paper` | `#e8dcc8` | Throne sheets, wordmark, primary text on dark |
| `--paper-dim` | `#b7a890` | Secondary text |
| `--rule` | `#3a342c` | Hairline rules |
| `--stamp` | `#9a2b1f` | DEFAULT / UNPAID stamp, steal button, stolen flash |
| `--stamp-hover` | `#b43526` | Steal hover |
| `--gold` | `#c4a574` | Hairline crown mark, paid stake numbers after a steal |
| `--live` | `#d7c4a0` | “Stolen 4m ago” |
| `--danger-text` | `#e8dcc8` | Text on stamp buttons |

Dark page. Each throne is a **paper sheet** (`--paper` background, `--ink` text) so it screenshots well on X (light rectangle on dark — readable in both app themes).

Do **not** use purple, electric blue, neon green, glassmorphism, or gradients.

### Type

- **Display / king names:** `Newsreader` (or `Fraunces`) — old-style serif, optical size 72–96 on a throne.
- **UI / labels:** `Geist` or `Inter` — small caps for meta (`COLD EMAIL`, `DEFAULT`, `REIGN`).
- **Money:** `Geist Mono` or `Tabular lining` — always tabular nums. `$9` `$0` `$18`.

Load from `next/font`. No Google Fonts runtime FOUC if you can avoid it.

### Texture

- 2–3% paper grain on throne sheets (CSS noise or a tiny PNG). Subtle.
- Hairline rules, not 1px heavy borders.
- Stamp: slightly rotated (`-3deg`), letter-spaced, boxed, looks hand-inked. CSS only. Not an image of a cartoon wax seal.

### Motion (every animation must mean something)

| Event | Motion | Do not |
|---|---|---|
| Page load | Thrones fade up 120ms, no stagger circus | Bounce, spring, 3D flip |
| Hover steal | Button darkens, cursor `pointer` | Scale the whole card |
| Successful steal | 180ms red flash on the sheet, king name crossfades, stamp changes DEFAULT → STOLEN, stake ticks | Confetti, crown drop, sound |
| New steal on another throne (if live) | That sheet’s “reign” line updates | Toast spam |
| Stamp | Static. It does not pulse | Pulse / glow |

Respect `prefers-reduced-motion`.

### Layout

- Max width `720px` for the gazette column. Centered. Not a 12-column SaaS grid.
- Mobile first. X traffic is a phone. Steal button full-width on small screens, never a tiny text link.
- One column of thrones. Not a card grid of 10 equal tiles — a **stack of warrants**, like a docket.

---

## 5. Information architecture

```
/                       gazette (all thrones)
/t/[slug]               one throne (canonical share URL)
/steal/[slug]           GET redirects to /t/[slug]#steal  (optional alias)
/rules                  six lines, not a legal novel
/how                    4 beats, then a link back
/go/[slug]              click-out to current king URL (count + 302)
/og/[slug]              dynamic OG image
/checkout               stub checkout page (see §11)
/checkout/return        success / fail after stub payment
/admin                  password; seed + force-reign (dev)
```

Share URLs must be **per throne**: `https://unpaidking.lol/t/cold-email`  
Never share only the homepage if a steal just happened.

---

## 6. Copy deck — use these strings, do not rewrite to be friendlier

### Chrome

- Wordmark: `Unpaid King`
- Tagline: `They already sit on the throne. They never paid.`
- Nav: `Rules` · `How it works`
- Footer: `Not affiliated with any king. Names are used as category labels. No logos. No endorsement. Payments are final. Clicks go to whoever sits on the throne.`
- Footer secondary: `unpaidking.lol`

### Homepage intro (exactly this, under the wordmark)

```
Every category already has a king.
Most of them paid $0.
Steal the seat. Clicks follow.
```

Three lines. No fourth.

### Throne sheet — default state

Category (small caps): `COLD EMAIL`  
Overline: `The king`  
King name: `Instantly`  
Stamp: `DEFAULT`  
Stake: `$0`  
Subline: `Unpaid.`  
Meta: `Clicks today · 0` (hide clicks if 0; show once > 0)  
Button: `Steal for $9`

### Throne sheet — stolen state

Stamp: `STOLEN` (replace DEFAULT; do not show both)  
Stake: `$9` (gold)  
Subline: `Took it from Instantly.`  
Reign: `King for 4m` (relative)  
Button: `Steal for $18`  
If the current king *is* the default who paid later: stamp `PAID`, subline `The default, now paying.`

### Throne page (`/t/cold-email`) — additional lines

Kicker: `The throne of cold email`  
If default: `Instantly sits here by default. They have not paid.`  
If stolen: `{King} paid ${n} to sit here.`  
Proof line (always, small): `A click on the king goes to their site.`  
The king name is a link styled as ink underline, pointing at `/go/cold-email` (never raw-affiliate ugly).  
History heading: `Reigns`  
History row: `$9 · Lemlist · took it from Instantly · 2h ago`  
First history row for seed: `$0 · Instantly · seated by default · launch`

### Steal panel (modal or `#steal` section on the throne page)

Title: `Steal the throne of {category}`  
Lead: `{King} is sitting unpaid.` (or `for ${n}.`)  
`You pay ${price}. They keep nothing. You become king. Clicks go to you until someone pays ${next}.`

Fields:

- Label `Product name` · placeholder `Lemlist`
- Label `URL` · placeholder `https://lemlist.com`
- Hidden: throne slug, amount

Button: `Pay ${price} and sit`  
Microcopy under button: `No refunds. No logos. Not affiliated.`

Validation errors:

- `Need a public http(s) URL.`
- `That URL is already on this throne.`
- `Name is too short.`

### Checkout stub page (`/checkout`)

Title: `Pay ${price}`  
Line: `Throne of {category}`  
Line: `{name} → king`  
Button: `Pay ${price}` (stub: marks paid in dev, see §11)  
Cancel: `Back to the throne`

### Return success (`/checkout/return?ok=1`)

Title: `You sit on {category}.`  
Sub: `{Previous} is off the throne.`  
Primary: `Copy the tweet`  
Secondary: `See the throne`  
Tweet (prefilled, copy + optional `twitter.com/intent/tweet`):

Default stolen:

```
{DefaultKing} was king of {category} by default. They paid $0.

I stole it for ${price}.

unpaidking.lol/t/{slug}
```

War (stealing a paid king):

```
{King} paid ${old} to be king of {category}.

I took it for ${price}.

unpaidking.lol/t/{slug}
```

Do not add hashtags. Do not mention Outbid.

### Return fail

`Payment did not go through. The king did not move.`  
Button: `Try again`

### How it works (`/how`) — four beats, no illustrations

```
1. Every niche has a king. We seated the obvious one. They paid $0.
2. Anyone can steal the throne by paying $9 more than the current stake.
3. The old king is not refunded.
4. Clicks on the king go to the king. That is the whole ad.
```

Then: `Steal a throne` → `/`

### Rules (`/rules`)

```
One king per category.
New steal: current stake + $9. First steal is $9.
You pay the full new stake. Previous spend is not refunded.
Same product can steal back later.
Rank is public. Clicks go to the current king.
No accounts. No logos. Not affiliated. No refunds.
We can remove spam, malware, or impersonation.
```

### Empty / error

- Unknown slug: `That throne does not exist.` + link home  
- Payment provider down: `Cannot steal right now. The king stays.`  
- Never: `No thrones yet.` The gazette is pre-seeded.

### `<title>` / meta

- Home: `Unpaid King`  
- Throne default: `{King} is the unpaid king of {category}`  
- Throne stolen: `{King} is king of {category} · ${n}`  
- Description (home): `Every category already has a king. Most of them paid $0. Steal the seat.`

---

## 7. Page structure (wire in words)

### `/` Gazette

```
[ wordmark Unpaid King          Rules · How ]

They already sit on the throne. They never paid.

Every category already has a king.
Most of them paid $0.
Steal the seat. Clicks follow.

──────────────

COLD EMAIL
The king
Instantly                    [DEFAULT]
$0 · Unpaid
                    [ Steal for $9 ]

──────────────

AI CODE EDITOR
The king
Cursor                       [DEFAULT]
$0 · Unpaid
                    [ Steal for $9 ]

... (10 sheets)

──────────────
footer
```

Steal button on the gazette **opens the steal panel** (modal on desktop, full-sheet on mobile) for that slug. King name / sheet click goes to `/t/[slug]`.

### `/t/[slug]` Throne

Full paper sheet, more room:

- Category kicker
- King name ~72–96px
- Stamp + stake + subline
- Click-out: the name itself
- Steal panel **inlined below the fold of the sheet** (no extra click on mobile if they arrived from a tweet — `#steal` scrolls to it)
- Reigns list (newest first, max 20)
- Tiny: `Next steal · $18`

Live: poll every 5s or SSE. If king changes while you’re staring, the name updates. Do not pop a modal “someone stole it.”

---

## 8. Mechanics (lock)

| Rule | Value |
|---|---|
| Thrones at launch | 10, seeded, not user-created |
| Occupancy | Always occupied (default king) |
| First steal price | `$9` |
| Next steal price | `currentStake + 9` |
| What the stealer pays | The **full new stake**, not a diff against their old spend |
| Refunds | Never |
| Currency | USD |
| Identity of a listing | Canonical URL (strip tracking params, trailing slash, lowercase host) |
| Same URL on same throne | If they already sit, reject. If they sat before and were dethroned, they may steal again at the new price |
| Click-out | `/go/[slug]` increments `clicks` and 302s to current king URL |
| Default king URL | Official marketing URL, https, no affiliate tags |
| Min name | 2 characters |
| Max name | 40 |
| Blocked URLs | unpaidking.lol, localhost, non-http(s), known shorteners optional |

**Do not** implement “pay only the difference to top up while still sitting.” There is only one seat. You are on it or you are not. Top-up-in-place is Outbid’s ladder logic. Kill it.

When a steal confirms:

1. Insert `reigns` row: `{ throne, name, url, amount, fromName, fromUrl, paidAt }`
2. Update throne: current king, stake, stamp `stolen`, `reignStartedAt`
3. Invalidate OG cache for that slug
4. Return the tweet text

Race: unique constraint + transaction. Two checkouts for the same price: first webhook wins; second payment still captured in stub notes as `stale` and must not dethrone (real provider: refund later — out of scope; stub: show `The throne moved. Your stub payment did not sit.`).

---

## 9. Seed thrones (exact)

Use these 10. Do not add more for v1. Hungry #2s are for the founder’s outbound, **not shown in the UI**.

| slug | category label | default king | default URL |
|---|---|---|---|
| `cold-email` | Cold email | Instantly | `https://instantly.ai` |
| `ai-editor` | AI code editor | Cursor | `https://cursor.com` |
| `indie-payments` | Indie payments | Stripe | `https://stripe.com` |
| `auth` | Auth | Clerk | `https://clerk.com` |
| `postgres` | Postgres | Supabase | `https://supabase.com` |
| `analytics` | Product analytics | Mixpanel | `https://mixpanel.com` |
| `scheduling` | Scheduling | Calendly | `https://calendly.com` |
| `helpdesk` | Helpdesk | Intercom | `https://intercom.com` |
| `forms` | Forms | Typeform | `https://www.typeform.com` |
| `seo` | SEO | Ahrefs | `https://ahrefs.com` |

`indie-payments` defaulting to **Stripe unpaid** is intentional. Polar / Dodo / Creem are the likely first thieves. Do not default Polar — they would be paying to steal from themselves.

Order on the gazette: as in this table (hottest rivalries first).

---

## 10. Data model

Postgres (Neon or Vercel Postgres). Prisma or Drizzle.

```
thrones
  id, slug unique, category,   -- "cold-email", "Cold email"
  king_name, king_url,
  stake_cents int,             -- 0 for default
  status enum: default | stolen
  clicks int default 0
  reign_started_at timestamptz
  updated_at

reigns
  id, throne_id
  king_name, king_url
  amount_cents                 -- 0 for the seed reign
  from_name nullable, from_url nullable
  paid_at timestamptz
  checkout_id unique nullable  -- idempotency

checkouts                      -- stub
  id, throne_id
  name, url
  amount_cents
  status enum: pending | paid | stale | canceled
  created_at
```

Seed: 10 thrones + 10 reigns at `$0` / `seated by default`.

---

## 11. Payments — stub only

The founder will wire Dodo / Polar / Creem later. Build the **shape**, not the SDK.

```ts
// lib/payments.ts
export interface PaymentProvider {
  createCheckout(input: {
    throneSlug: string
    name: string
    url: string
    amountCents: number
    successUrl: string
    cancelUrl: string
  }): Promise<{ checkoutId: string; redirectUrl: string }>
  // webhook/verify later
}
```

**Stub provider (`STUB_PAYMENTS=true` default):**

- `createCheckout` inserts `checkouts` pending, redirects to `/checkout?id=...`
- `/checkout` shows amount, product, throne, button `Pay $X`
- Button sets status `paid` and runs the same `applySteal(checkoutId)` the future webhook will call
- `applySteal` is **idempotent** on `checkout_id`

Do not talk to Stripe/Dodo in v1. Leave `// PROVIDER: implement createCheckout` in one file.

Checkout page should look like the gazette (paper sheet), not a Stripe clone. Trust = continuity of brand. Include the no-refunds line.

Env:

```
DATABASE_URL=
ADMIN_PASSWORD=
STUB_PAYMENTS=true
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 12. OG image (`/og/[slug]`) — this is half the product

`next/og` (`ImageResponse`). 1200×630. Same paper-on-ink look.

**Default king:**

```
UNPAID KING
COLD EMAIL

Instantly
DEFAULT · $0

Steal for $9
unpaidking.lol
```

**Stolen:**

```
UNPAID KING
COLD EMAIL

Lemlist
STOLEN · $9

Took it from Instantly
unpaidking.lol/t/cold-email
```

King name huge. Stamp visible. No screenshots of UI chrome. No photos. No logos.

Cache: `s-maxage=60, stale-while-revalidate=600` and bust when stake changes (`?v={updated_at}` in metadata).

Every throne page and the homepage must set `og:image` to the relevant art (homepage: a composite or the first throne — prefer a dedicated home OG: the wordmark + line `They already sit on the throne. They never paid.`).

Twitter card: `summary_large_image`.

---

## 13. Stack

- Next.js App Router, TypeScript, Tailwind
- `next/font` for Newsreader + Geist
- Postgres + Prisma/Drizzle
- Deploy: Vercel
- No UI kit (no shadcn carnival). A few primitives: `Sheet`, `Stamp`, `StealButton`, `Wordmark`
- `zod` for steal form
- Relative time: tiny function, not a heavy lib

---

## 14. Components (build these, nothing else)

1. `Wordmark`
2. `GazetteIntro` — the three lines
3. `ThroneSheet` — used on home (compact) and `/t/[slug]` (full)
4. `Stamp` — DEFAULT | STOLEN | PAID
5. `StealButton`
6. `StealForm` — name, url, submit
7. `ReignList`
8. `SiteFooter`
9. `OgTemplate` (for image route)

---

## 15. Technical notes that protect the vibe

- Canonicalize URLs before store and compare.
- Do not iframe king sites.
- `rel="nofollow noopener"` on click-out.
- Count clicks server-side on `/go/[slug]` only (ignore bots with a simple UA allow/deny if easy; don’t spend hours).
- No cookie banners. No analytics popups. Optional: Plausible later. v1: none, or a single server log.
- `robots.txt` allow. Sitemap: `/`, `/rules`, `/how`, each `/t/[slug]`.
- Favicon: a tiny stamp-square, not a cartoon crown. Simple geometric “UK” or a circle-with-two-dots is fine; better: a red wax-dot on cream. One shape.

---

## 16. `/admin` (minimal)

Password via `ADMIN_PASSWORD`. Cookie session.

- List thrones, current king, stake
- Button: re-seed (dev only, guard with `NODE_ENV`)
- Button: force a reign (name, url, amount) — for filming OG / testing without checkout
- No user management

---

## 17. Build order (do this sequence)

1. App shell, fonts, colors, wordmark, footer, rules, how
2. Seed data + `ThroneSheet` static (all defaults)
3. `/t/[slug]` + reigns list
4. Steal form → stub checkout → `applySteal` → success tweet copy
5. `/go/[slug]` click-out
6. OG images + metadata
7. Live refresh on throne page
8. Polish stamp, grain, mobile steal button, reduced motion
9. Stop. Do not add a 11th throne or a blog.

---

## 18. QA — the page failed if

- A new visitor cannot say what it is before scrolling
- It looks like Outbid (table of URLs + dollar column + “#1”)
- DEFAULT / $0 is easy to miss
- Steal is a ghost button or a text link
- Homepage is a marketing landing with a “View thrones” CTA
- Any emoji, confetti, or “Welcome”
- Logos of Cursor/Instantly/etc.
- Light purple / Tailwind default blue buttons
- Checkout opens a blank unstyled page (stub must still look like Unpaid King)
- OG image is a generic Next.js default
- Two tabs can both become king at the same price
- Clicking the king does not leave the site

**Pass test:** screenshot the cold-email sheet. Mute it. A founder should still feel *I could take Instantly’s seat for $9.*

---

## 19. Identity recap (when the model wants to “improve” copy)

If you change copy, you are probably wrong.

We are not friendly. We are not a growth tool. We are not a game with XP.

We are a gazette that seated the obvious kings without their consent, stamped them UNPAID, and sells the coup.

---

## 20. Out of scope for the coding agent (founder does later)

- Real Dodo/Polar/Creem keys
- Domain DNS → Vercel
- First 5 DMs to #2s
- Tweet templates beyond the success copy already specified
- More categories

Do not leave `TODO: add more features`. Leave `TODO: swap StubProvider for Dodo` in `lib/payments.ts` only.
