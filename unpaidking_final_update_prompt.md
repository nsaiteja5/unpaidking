# Unpaid King — final update

Implement this on the existing app. Do not redesign desktop from scratch. Do not change product mechanics, pricing, or copy decks except where this file specifies.

Two jobs only:

1. Make mobile actually usable.
2. Give the operator full admin control.

---

## 1. Mobile is messy. Fix the layout, not the brand.

The attached mobile screenshot fails because desktop ceremony was squeezed onto ~375px:

- Decorative arch / pillar lines clip, overlap, and add noise.
- Header + tagline consume too much first-screen space.
- King name, offer card, stats, and two CTAs stack into a long poster.
- `THIS REIGN · 1 RECORDED VISITS · 0 OUTBOUND CLICKS` wraps into junk.
- Category search / dock is easy to miss or collide with the stage.
- Touch targets and spacing are inconsistent.

### Mobile rules (`max-width: 640px`)

**Kill the architecture on small screens.**

- Hide the arch, pillars, and large geometric frame below `md`.
- Keep the dark court colors, serif king name, stamp, and paper/cream offer card.
- No extra illustration to “replace” the arch.

**Header**

```
Unpaid King                         Rules · How
They already sit on the throne. They never paid.
```

- Wordmark ~28–32px, one line.
- Nav on the same row, smaller.
- Tagline one line if possible; if it wraps, max two lines. No extra rules/dividers under it.
- Tight padding: ~16px sides, ~12px top.

**Stage — one column, tight rhythm**

Order, with ~12–16px gaps, not 40px voids:

1. `THE THRONE OF`
2. Category name (~28–36px, can wrap to 2 lines)
3. `IS OCCUPIED BY`
4. King name (`clamp(40px, 12vw, 56px)`, wrap safely, never overflow)
5. Stamp: `UNPAID KING · $0` or `CURRENT REIGN · $9`
6. One short status line (default or “Took it from X”)
7. Offer card (paid only)
8. One traffic line
9. Visitor CTA (paid only)
10. Competitor CTA
11. One helper line
12. `Report wrong category`

Do not repeat the same idea in three places.

**Offer card**

- Full width minus 16px page padding.
- Quote / headline wraps; max ~3 lines then ellipsis.
- Pitch max ~3 lines.
- `TRY {PRODUCT} ↗` full width, min 48px height.
- Do not put stats inside a second boxed row that wraps badly.

**Traffic line**

Single non-wrapping or gracefully wrapping line. Fix grammar.

- `1 visit · 0 clicks`
- `12 visits · 4 clicks`
- If both are 0 or only 1 self-visit: `New reign · traffic recording started`

Never show `1 RECORDED VISITS`.

**CTAs**

- One visitor button (cream): `TRY {PRODUCT} ↗`
- One competitor button (red, full width, 52px): `DETHRONE {PRODUCT} — $18`
- Change `COMPETING WITH {X}?` → `SELL A COMPETING PRODUCT?`
- Helper under competitor CTA stays: `Take the live throne. Keep your campaign forever.`

**Bottom chrome**

- `FIND A THRONE` search full width.
- Horizontal category chips under it, swipeable, 44px min height, no clipped labels.
- `+ Start a new throne` on its own row, not crammed beside search.
- Footer compact; don’t duplicate the legal paragraph twice.

**Other mobile screens**

Apply the same density to: steal/takeover form, new-throne form, checkout, success, `/t/[slug]`, `/r/[id]`, `/rules`, `/how`.

- Forms: labels above inputs, 16px tap targets, no tiny split buttons.
- Modals: full-screen sheets on mobile, not desktop-centered cards with 40px dead margin.
- Checkout: no unfinished tokens like `[created-on-payment]`. Show `Permanent campaign URL created after payment`.
- Success: share card preview scales to width; primary `POST MY TAKEOVER ON X` full width.

**QA**

Pass at 375, 390, and 430 width.

Fails if:

- decorative lines overlap text
- user must pinch-zoom
- king name overflows
- stats wrap into 3 broken lines
- two primary buttons fight for equal weight
- category chips are unusable

---

## 2. Admin: full operator control

Password-gated `/admin` is not a debug toy. It is how the operator runs the gazette.

Build a real control panel. Desktop-first is fine; make it usable on tablet. Do not expose it in the public nav.

### Auth

- Existing `ADMIN_PASSWORD` cookie/session.
- Sign out.
- All mutations audit-logged: who (admin), what, id, before/after summary, timestamp.

### Dashboard home

Counts:

- Live thrones
- Pending / suspended
- Current paid reigns vs unpaid defaults
- Recorded visits / outbound clicks (7d)
- Open reports

Lists:

- Recent takeovers
- Recent new-throne openings
- Open `wrong category` reports

### Thrones — full CRUD

Table of every throne: name, slug, status (`pending | live | suspended`), source (`seeded | user_created`), current king, stake, visits, clicks, created at.

Actions:

- **Create throne** (seed a default king without a paying challenger — operator only)
- **Edit** name, slug (alias old slug), definition, default king name/url/handle, aliases
- **Reorder** curated shelf / featured homepage throne
- **Set featured** (the one `/` opens on)
- **Suspend** / **restore**
- **Delete** only if never paid; otherwise suspend + archive
- **Merge into existing throne** (move aliases; do not silently transfer a paid reign — require explicit choice)
- **Force current king** (name, url, handle, offer fields, stake) — for filming/tests
- **Reset to default unpaid king** (ends current paid reign as `former`, does not delete `/r/` pages)
- **Refund flag** (mark refund required; do not talk to a payment SDK)

Creating a throne from admin may publish at `$0` with a default king. That power is admin-only. Public users still cannot publish an empty throne.

### Reigns / campaigns — full CRUD

Table: publicId, product, throne, status (`current | former | suspended`), amount, visits, clicks, started/ended.

Actions:

- View `/r/{id}`
- Edit offer headline, pitch, CTA, url, name, handle, logo
- Suspend / restore a reign page (404 or “removed” for public; keep row)
- End current reign without a replacement (reverts throne to default unpaid king)
- Never destroy historical `/r/` URLs unless operator explicitly **tombstone** (“This campaign was removed.”)

### Products / domains

Simple registry derived from reigns + defaults:

- Domain
- Display name
- X handle
- Linked thrones
- Strike count / notes
- Block / unblock domain or handle from creating thrones or taking seats

### Reports

`Report wrong category` queue:

- throne, reporter note if any, time
- actions: dismiss, suspend throne, restore previous king, mark refund required, block domain

### Content / copy overrides (optional but useful)

Key/value overrides for homepage tagline is **not** required. Do not build a CMS for every string.

Do allow editing:

- Featured throne
- Curated chip order
- Per-throne definition

### Safety

- Confirm destructive actions.
- Idempotent mutations.
- Cannot delete the last live throne.
- Admin force-reign still writes a proper `reigns` row and does not break `applySteal`.
- Public site never links to `/admin`.

---

## 3. Small copy fixes while you are in there

- `COMPETING WITH {X}?` → `SELL A COMPETING PRODUCT?`
- Pluralize visit/click counts correctly.
- Checkout: remove the red “no traffic/sales/duration guaranteed” danger box. Replace with two calm included lines:

  `LIVE UNTIL DETHRONED` — The throne stays yours until another founder takes it.  
  `YOURS FOREVER` — Your campaign page, share card, and tracked link never expire.

  Microcopy under the pay button:  
  `$9 once. Your throne may change hands. Your campaign stays yours.`

  Full legal stays on `/rules` only.

---

## 4. Do not

- Redesign desktop Throne Room
- Add a leaderboard, grid of all thrones, or fake traffic
- Add a payment SDK
- Add user accounts for buyers
- Expand scope past mobile + admin + the copy fixes above

Stop when mobile QA passes and admin can create, edit, suspend, restore, feature, and force-reign without touching the database by hand.
