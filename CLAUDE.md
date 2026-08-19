# CLAUDE.md — austingymprices.com

Build brief for Claude Code. This file is the source of truth for product decisions.
When something here conflicts with a "better idea" mid-build, this file wins.
Product questions not answered here go back to the owner — do not decide unilaterally.

---

## 1. What this is

A gym-price transparency site for Austin, TX — "Zillow for gyms."
Every gym's real membership cost (monthly rate + enrollment fee + annual fee + contract
terms) shown side by side on a searchable list + map. Prices pulled from each gym's own
website, verified dates shown. Modeled on gympricing.com (NYC) but Austin-only.

**V1 scope: 39 gyms, 7 regions, memberships + day passes. Nothing else.**
(The seed sheet lists 40; row 36, EOS Fitness Parmer, does not open until 2027 and is
excluded from v1 entirely — no "coming soon" placeholder ships.)

Explicitly OUT of v1 (do not build, even partially):
- User accounts, sign-in, favorites/hearts
- Reviews or star ratings (Yelp owns that; we are the pricing site)
- Gym-owner portal / "claim your listing"
- Lead-gen ("have them reach out" style buttons)
- Class-pack pricing for boutique studios (they get a day-pass row + website link only)
- Crowdsourced equipment submissions (the UI slots exist; the write path does not)
- Blog/content pages

---

## 2. Stack (locked)

| Layer      | Choice                                             | Why |
|------------|----------------------------------------------------|-----|
| Framework  | **Astro** (static output)                          | Content site, SEO-first, minimal JS |
| Interactivity | Vanilla JS or a single small island for filters/map | No React needed for v1; keep bundle tiny |
| Map        | **Leaflet + OpenStreetMap tiles**                  | $0 forever; no API key to leak |
| Data       | **JSON files in repo** (`/data/gyms/*.json`)       | 39 gyms needs no database |
| Hosting    | **Cloudflare Pages**                               | Free tier, CDN, survives Reddit launch traffic |
| Scrapers   | **Python scripts** in `/scrapers`, run by **GitHub Actions nightly cron**, calling the **Firecrawl API** (free tier: 1,000 credits/mo; we use ~420) | Scrapers commit updated JSON back to the repo via PR |
| Domains    | austingymprices.com (primary), atxgymprices.com (301 redirect via Cloudflare Redirect Rule) | |
| Email      | Cloudflare Email Routing → owner's inbox           | hello@ + reports@ forwarding |
| Errors     | **Sentry** (client + scraper), free tier           | See §8 |

Do not introduce: React/Next, Supabase, Tailwind (hand-rolled CSS per design system below),
any paid service, any additional third-party script (analytics exception: one privacy-light
option like Cloudflare Web Analytics or Plausible — no Google Analytics).

If a future phase adds a backend (accounts, crowdsourcing, owner portal), it will be
Supabase — §8 includes the security rules for that day so they're on record now.

---

## 3. Data model

One JSON file per gym: `/data/gyms/{slug}.json`. Slug = kebab-case name (`big-tex-gym`).

```jsonc
{
  "slug": "big-tex-gym",
  "name": "Big Tex Gym",
  "region": "hyde-park",            // one of the 7 region ids below
  "category": "gym-weights",         // gym-weights | gym-classes | luxury | crossfit-hiit |
                                     // pilates | yoga | boxing | bjj-mma | climbing | community
  "website": "https://bigtexgym.com",
  "pricing_url": "https://bigtexgym.com/membership",
  "address": "1921 Cedar Bend Dr, Austin, TX 78758",
  "lat": 30.4021,
  "lng": -97.7015,
  "known_for": "Serious lifting crowd, old-school and specialty equipment, loud floor, 24/7 key-tag access.",
  "amenities": ["24/7", "Infrared sauna", "Parking"],
  "photo": "google-places",          // "google-places" | filename in /public/photos | null
  "data_source": "scrape",           // "scrape" | "manual"
  "verified_date": "2026-08-16",
  "plans": [
    {
      "name": "Month-to-Month",
      "monthly": 55,                  // advertised monthly rate, USD
      "enroll_fee": 0,
      "annual_fee": 45,
      "commit_months": 0,             // 0 = no contract; null = terms NOT PUBLISHED
      "restricted": null,             // null | "student" | "youth" | "young-adult" |
                                      // "senior" | "military" | "household" | "scope"
      "note": "The $45/yr maintenance fee is charged 75 days after signup, then annually.",
      "is_default": true              // exactly one plan per gym; drives card price + map pin
    }
  ],
  "sub_locality": "North Loop",       // display-only neighbourhood, shown after the region
  "billing_period": "monthly",        // "monthly" (default) | "4-week" | "weekly"
  "day_pass": 15,                     // null if unknown/none
  "day_pass_qualifier": "+ tax",      // folded into the price line, or null
  "day_pass_terms": [                 // MAX 3, and only if they materially change
    "Single use, expires 24 hours",   // what you are buying
    "No sauna access"
  ],
  "day_pass_alternative": null,       // AT MOST ONE, and only when it is a
                                      // dramatically better deal for the same use case
  "price_history": [                  // append-only; never overwritten, never hand-edited
    {
      "date": "2026-08-18",           // date the change was observed
      "plan_name": "Month-to-Month",  // which plan object changed
      "field": "monthly",             // monthly | enroll_fee | annual_fee | commit_months | day_pass
      "old": 49,
      "new": 55
    }
  ]
}
```

**Card content is tab-aware.** The active tab defines the question the user is asking,
and every element on the card answers *that* question. On the **Memberships** tab the card
shows the all-in monthly price, the commitment badge and the membership cost receipt. On
the **Day passes** tab it shows the day-pass price and `day_pass_terms`, and membership
appears only as one secondary line ("Membership from $X/mo all-in — Full details →").
**Commitment badges never render on the Day passes tab** — commitment is a membership
concept, and a "2-mo minimum" badge above a $10 headline reads as a contradiction.
Day-pass restrictions live in `day_pass_terms` as structured data so they render from the
data rather than being buried in prose.

**Show the math on multi-day passes.** Where a week/month/punchcard pass sits next to a
single-day price, state what it includes *and* how it compares — "Week pass $35 — 7 days
with sauna and 24/7 key-tag access, against $70 for seven day passes". The products usually
differ, so an unexplained $35 beside $10/day reads as broken arithmetic. This is the same
principle as all-in pricing: do the comparison for the reader rather than leaving them to
guess at it.

**Cards scan; detail pages explain.** The show-the-math rule above applies in full on the
gym detail page, which is where someone deciding *between products* goes. A card answers
one question, so the day-pass card carries only: the price line (with any qualifier folded
in, "$15 + tax"), at most **three** restrictions and only where they materially change what
you are buying, at most **one** alternative and only when it is a dramatically better deal
for the same use case, then the membership line and "Full details →". Punchcards, class
passes, multi-week options and the fuller comparison maths all belong on the detail page,
not the card.

**`restricted` rules:** a nullable string marking a plan that a solo walk-in adult
cannot simply buy. `"scope"` is reserved for partial-access plans (EAAC's Strike Club is
striking classes only); `"household"` covers multi-person plans (YMCA's household tiers,
Crux's 2-Person Crew). Where the plan name already says so — "Two Adult Household",
"2 Person Crew" — render no badge rather than double-labelling. The value drives badge text on the detail page — "Students only",
"Striking classes only" — and its truthiness drives the default-plan rule below.
**Restricted plans always render in the plan table.** They are real options; they are
just not the headline.

**Badges render only from confirmed data — absence of data renders absence of badge.**
This is general, not specific to commitment. `commit_months: null` means the gym does not
publish its terms: **no badge renders at all** — not green, not neutral, nothing. The green
"No contract" badge requires `commit_months` to be explicitly `0` or `1` from a confirmed
source (the gym must carry a `verified_date`). Inferring "no contract" from silence is the
same class of error as inventing a price.

**Default-plan rule:** exactly one plan per gym carries `is_default`. It is the
**cheapest all-in** plan among those where `restricted` is `null` **and**
`commit_months ≤ 2`. Cheapest *all-in*, never cheapest sticker — at LA Fitness the
$29.99 plan costs $44/mo all-in while the $31.99 plan costs $38, because of a $99
initiation fee. That inversion is the entire point of the site, so the default must be
computed on the all-in figure or the headline number lies. Where no plan qualifies
(e.g. a promo-only gym), the card falls back to the "call for pricing" state.

**`billing_period` rules:** store the amount the gym actually bills, in the period it
actually bills it — never silently convert. EAAC bills $215 every 4 weeks, which is 13
payments a year, not 12. The normalized monthly equivalent is computed at build time and
used for all-in math, region medians, price tiers and map pins; the detail-page receipt
shows the gym's own reality alongside it: "$215 per 4 weeks (≈$233/mo)".

**`promo` rules:** any plan may carry an optional
`promo: {price, enroll_fee, annual_fee, note, expires}` (all fields optional). The
**standing** price always drives all-in math, medians, tiers and map pins; the promo
renders as a flag on the card and detail page ("$0 join fee through Aug 30"). Where the
standing rate is unknown because the page only ever shows a promo state, the standing
fields stay `null` and the plan is marked promo-only — **never promote a promo number to
standing**. This is deliberately the foundation for the §10 deals feed.

**Commitment badge rules:** the green "No contract" badge renders **only** when
`commit_months ≤ 1`. For 2–3 months, render a neutral grey badge stating the exact truth
("2-mo minimum"). The **"No contract" filter** includes `commit_months ≤ 2`, because a
two-month floor is not what people mean by a contract — but the badge never overstates.

**`price_history` rules:** on every scrape where any plan value changes, the scraper
**appends** a `{date, plan_name, field, old, new}` entry rather than silently overwriting
the plan. The current value still lives on the plan object — history is additive, not a
replacement for it. History starts accumulating from the first harvest; a gym harvested
once has an empty array, which is correct and not a gap. Entries are never edited or
deleted, because the whole point is an auditable trail behind every number we show.

**Derived at build time — never stored, never hand-edited:**
- `all_in_monthly` = round((monthly × 12 + enroll_fee + annual_fee) / 12)
- `first_year_total` = monthly × 12 + enroll_fee + annual_fee
- Region median all-in (across default plans of gyms in that region) — powers the
  "$8 below the Hyde Park median ($67)" headline on detail pages
- Price tier: 1 (< $40), 2 ($40–100), 3 ($100+) — computed on **all-in**, not sticker,
  and on the **normalized** monthly where `billing_period` is not `"monthly"`

**Edge cases the schema must handle (from the seed list):**
- Donation-based (Black Swan Yoga): `monthly: null`, `pricing_note` string shown instead
- Prepay plans (Big Tex 6/12-mo): additional plan objects, `commit_months` set, monthly = effective rate
- Consult-gated (Equinox, Kollective): `data_source: "manual"`, plans may be empty →
  card shows "Pricing not published — call" state, never a fake number
- Add-on fees (Crux gear/locker): fold into `note`, not into the math

**Regions (ids locked):** `downtown`, `east-austin`, `south-soco`, `hyde-park`,
`mueller`, `the-domain`, plus `all` as a filter state. Display names per the v2 mockup.

Seed data comes from `austin-gym-seed-list.xlsx` (in repo `/docs`). Numbers flagged
"verify" in that sheet MUST NOT ship until confirmed against the live gym site.
A gym with no confirmed price ships in the "call for pricing" state, never with a guess.

---

## 4. Pages

1. **`/` — index.** Implements `austingymprices-v2.html` mockup exactly:
   hero → tabs (Memberships / Day passes) → search → region chips → filter row
   (price tier, No contract, activity, sort) → split view: card list left, Leaflet map right.
   - Cards collapsed by default: name, badges, region, category, **all-in price** ("/mo all-in").
   - Card click → accordion cost receipt (per mockup) with "Full details →" link to gym page.
   - Map pins = white price bubbles showing all-in price; filtered-out pins dim to 18% opacity;
     pin click opens + scrolls to the matching card. Active pin inverts to ink.
   - Mobile: map hidden behind a bottom "Map" toggle button.
2. **`/gyms/{slug}` — gym detail.** Implements `austingymprices-detail.html` mockup exactly:
   breadcrumb → title + "Visit gym website ↗" → median-comparison headline (green below /
   orange above median) → Known for box → photo → plan table with commitment badges and
   ⓘ tooltips (**icon renders only when a note exists**) → cost receipt → equipment grid
   (static data, "+ Add" buttons render but open a mailto/report link in v1) → mini map →
   provenance footer ("Prices checked {date} · pulled from {domain}" + Report a wrong price).
3. **`/regions/{region}` — region pages.** Same list/map filtered to region, with an
   H1 like "Gym prices in Hyde Park, Austin" and the region median stated in intro copy. SEO pages.
4. **`/faq`** — data sourcing, update cadence, correction policy, "not affiliated with any gym."
5. **`/for-gym-owners`** — static page: how to submit corrections (email), note that a
   listing-management portal is planned. No forms in v1.

"Report a wrong price" everywhere = `mailto:reports@austingymprices.com` with subject
prefilled (`?subject=Price correction: {gym name}`). No form endpoint in v1 = no injection surface.

**SEO requirements:** unique title/meta per page ("Big Tex Gym Membership Cost — Austin Gym
Prices"), JSON-LD (`LocalBusiness` + `offers`) on gym pages, sitemap.xml, canonical URLs,
OpenGraph tags. Gym pages are the long-tail acquisition strategy — treat them as first-class.

---

## 5. Design system (from mockups — do not restyle)

- **Logo:** `AUSTINGYMPRICES` in Barlow Condensed 700 uppercase — **"AUSTIN" in orange,
  "GYMPRICES" in ink.** (Note: this is a deliberate change from the mockup files, which
  color "GYM". The word carrying the Austin identity gets the Austin color.)
- Colors: orange `#BF5700` (accent ONLY — chips, active states, links, fee warnings),
  orange-dark `#9E4800`, orange-tint `#FBF1E9`, ink `#211D19`, ink-soft `#6B635B`,
  line `#ECE7E1`, green `#1E7A46` (no-contract, below-median), map ground `#F5F2ED`.
  Orange is never a background wash — accent, not wallpaper.
- Type: Barlow Condensed 600/700 for display/headlines/prices, Inter for everything else.
  Self-host the fonts (no Google Fonts request at runtime — privacy + speed).
- `known_for` is the owner's editorial voice, never generated. When it is `null`,
  render **nothing** — no placeholder, no empty box.
- **Accessibility overrides "do not restyle."** The design system is fixed, with one
  standing exception: where a mockup value fails WCAG AA, it gets corrected and the
  correction is recorded at the token. This has happened once — `--ink-faint` was
  `#A79D92` (2.66:1 on white, against the 4.5:1 AA needs for small text) and renders the
  "Prices checked {date}" provenance line; it is now `#7A726A`, the lightest tone of the
  same hue clearing 4.5:1 on both white and the sunk card surface. Precedent, not drift:
  fix it, comment it at the token, and say so.
- Voice: neutral and factual. No "contract traps," no snark at gyms. Fee surprises are
  stated plainly ("charged 75 days after signup"), not editorialized. "Known for" lines
  are descriptive, never derogatory.
- Price unit everywhere: **"/mo all-in."** Sticker price appears only inside breakdowns.
- **Never claim a site-wide refresh cadence.** No "Updated daily" (the v2 mockup's hero
  subhead says this — it predates the tiered cadence and must not ship). Freshness is
  stated per gym, from that gym's own `verified_date`: **"Prices checked {date}."**
  A claim we cannot honour for every gym is worse than no claim.

---

## 6. Scrapers

- One Python module per target in `/scrapers/targets/` (14 targets — see "Scraper Targets"
  sheet in the seed xlsx for URLs and gotchas). Shared Firecrawl client in `/scrapers/lib.py`.
- GitHub Actions cron, three tiers — cadence follows how often a target's price
  actually moves, not how easy it is to scrape:

  | Tier | Targets | Cadence |
  |------|---------|---------|
  | Chains with promo churn | planetfitness, crunch, goldsgym, 24hour, lafitness, lifetime | **weekly** |
  | Stable locals | bigtex, hydepark, eaac, lacampeones, castlehill, crux, abp, ymca | **monthly** |
  | Manual-status gyms | the consult-gated set (Equinox, Kollective, F45, studios…) | **monthly probe**, watching for pricing becoming published |

  **Seasonal bump:** during **January and June** — the two months gyms actually change
  offers — every tier promotes one level. Monthly→weekly is the meaningful move; weekly
  stays weekly (2x/week buys nothing and doubles spend).

  Budget target: **~40–60 credits/month** against the 1,000 free, leaving ample headroom
  for re-runs, new targets, and the seasonal bump.
- Scrapers parse to the plan schema and open a **PR** with the JSON diff — never push to
  main. Human merges. A price change of >25% or a parse returning zero plans fails loudly
  (Sentry + failed check), does not write.
- Every scraper records `verified_date` on success. A gym whose scrape has failed for
  >14 days gets a `stale: true` flag; the UI shows "Prices last confirmed {date}" in the
  warning style.
- **Parsers must be defensive about mangled numbers.** The one-time harvest found
  two real corruptions that would have shipped catastrophic prices: an escaped footnote
  marker eating a decimal point (`$3699/mo` for $36.99 at Crunch) and bold markers
  splitting one number across two runs (`**$32** **0**` for $320 at Crux). `scrapers/money.py`
  rejoins split runs structurally, and repairs an eaten decimal **only when the repaired
  figure appears verbatim elsewhere on the page**. An implausible number that cannot be
  corroborated raises `ParseError` and fails the run. A missing price is recoverable; a
  wrong one is the failure this site exists to prevent. Both cases are regression tests
  in `scrapers/tests/test_parsers.py`, which runs against the real harvested pages.
- Respect robots.txt; identify with a honest User-Agent
  (`austingymprices.com price checker; reports@austingymprices.com`); one request per
  target per run; no auth-wall or paywall circumvention; scrape only public pricing pages.

---

## 7. Repo layout

```
/data/gyms/*.json        # source of truth, one file per gym
/data/regions.json       # region ids, display names, map label positions
/docs/austin-gym-seed-list.xlsx
/docs/mockups/           # the three HTML mockups (reference only, not served)
/scrapers/               # python, lib.py + targets/
/src/                    # astro site
/public/photos/          # owner-submitted photos only; Places photos fetched at build
.github/workflows/scrape.yml
CLAUDE.md                # this file
```

---

## 8. Security — day-1 requirements

These are non-negotiable from the first commit. V1's static architecture makes most attack
surface vanish — keep it that way. Items marked **[phase-2]** apply the moment a backend
exists; they are recorded now so they're inherited, not retrofitted.

**Secrets**
- **No secret keys in client code. Ever.** V1's only secrets are the Firecrawl API key and
  Sentry DSN-adjacent tokens: Firecrawl key lives ONLY in GitHub Actions secrets
  (`FIRECRAWL_API_KEY`), referenced via env. The client bundle must contain zero keys —
  Leaflet/OSM needs none, which is partly why it was chosen. If Google Places photos are
  fetched, that happens at build time with the key in CI secrets; the key never reaches
  the browser and is HTTP-referrer + API-restricted in the Google console regardless.
- **No secrets in git history.** `.env` and `.env.*` in `.gitignore` from commit #1;
  `.env.example` with placeholder values documents required vars. Enable GitHub push
  protection + secret scanning on the repo. If a key is ever committed, rotate it
  immediately — deleting the commit is not sufficient.
- Pin GitHub Actions to commit SHAs (not floating tags) and give the workflow least
  privilege (`permissions: contents: write, pull-requests: write` only).

**Input/output safety**
- **XSS:** all gym data (names, notes, known_for) renders through the framework's default
  escaping — Astro expressions / `textContent`, never `innerHTML`/`set:html` with data-derived
  strings. This matters even for "our own" JSON because scraper output is attacker-influenced:
  a gym's webpage content flows into our data. Treat scraped strings as untrusted input —
  scrapers strip HTML tags before writing JSON, and the renderer escapes anyway
  (defense in depth).
- **SQL injection:** no SQL in v1 (no database). **[phase-2]** all queries via parameterized
  statements / the Supabase client — never string-built SQL.
- Content-Security-Policy header via Cloudflare Pages `_headers`: default-src 'self';
  script/style tightened to self + Sentry; no inline event handlers in production markup.
  Also set: X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin,
  X-Frame-Options DENY.

**Backend rules [phase-2 — apply the day Supabase/auth arrives]**
- **RLS enabled on ALL tables with default-deny for anon**; policies grant the minimum
  read/write per role. No table ships without a policy.
- **Auth checks server-side only.** The client never asserts identity or role; the
  **backend always derives the user/host identity from the session** (server-verified JWT),
  never from request-body IDs.
- **Rate limiting on auth, apply, and create-waitlist routes** (and the report/correction
  endpoint when it becomes a form) — per-IP + per-account, via Cloudflare rate-limiting
  rules or middleware. Public write endpoints additionally get a honeypot field and
  server-side validation.
- Service-role keys are server-only, never in any bundle, rotated on any suspicion.

**Definition of verified (client-side JS)**
- `public/_headers` is a **Cloudflare Pages feature**. `astro dev` and `astro preview`
  do **not** apply it, so the CSP is absent locally and present in production. Anything
  the CSP would refuse — an inlined `<script>`, an inlined `<style>`, an `onclick=` —
  passes every local check and then fails silently on the deployed site.
- Therefore: **nothing involving client-side JS is "done" until it has been exercised on
  the deployed `.pages.dev` URL with the browser console open.** Local dev passing is
  necessary, not sufficient.
- `npm run check:csp` scans the build output for anything the CSP would refuse and fails
  the build. It runs in CI after `npm run build`. It is a backstop, not a replacement for
  looking at the deployed page.
- `npm run verify` runs the whole gate locally: lint → data validation → build → CSP check.
- `npm run smoke <deployed-url>` runs against the **deployed** site and asserts the
  security headers are actually being served and that the page's own assets are
  compatible with the policy they declare. It cannot click a button — that still needs a
  human with a browser console — but it proves the client script is reachable,
  same-origin and not inlined, which is the failure that shipped.

**Observability & hygiene**
- **Error boundaries + Sentry reporting:** Sentry on the client (the filter/map island) and
  in every scraper run. Map/filter JS wrapped so a JS failure degrades to the static list —
  the site must remain readable with JS off or broken.
- **Debug logs removed:** no `console.log`/`print` debugging in production paths. Lint rule
  (`no-console`, allow `console.error`) enforced in CI. Scraper logging goes through a
  logger at INFO, and **never logs secrets or full response bodies**.
- Dependabot/`npm audit` + `pip-audit` in CI; build fails on high-severity vulns.
- Scraper-created PRs are the only automated write path, and they require human merge —
  no bot has push access to main. Branch protection on main from day 1.

---

## 9. Build order

1. Repo scaffold, Astro, design tokens, fonts, CI (lint + audit), branch protection, `_headers`.
2. Data schema + loader; convert seed xlsx rows with confirmed prices into `/data/gyms/*.json`.
3. Index page: list + filters (no map yet). Cards + accordion per mockup.
4a. **Address collection + geocoding pass, all 41 gyms.** Addresses come from each
   gym's own site footer/contact page during normal scrapes where possible; the owner
   fills the stragglers. Geocode with **Nominatim** (OpenStreetMap's free geocoder) —
   zero key, zero cost, same rationale as Leaflet/OSM. Observe its usage policy:
   **max 1 request/second**, honest identifying User-Agent, cache results. Where
   Nominatim returns a low-confidence match, **flag it for a manual pin-drop by the
   owner** rather than accepting a fuzzy hit — a wrong pin is the map equivalent of a
   wrong price. `lat`/`lng` stay `null` until confirmed; a null pin is simply not drawn.
4. Leaflet map island + pin/card sync. Mobile map toggle. Requirements beyond the
   mockup — we differentiate on information, not decoration:
   - **Pins**: price bubbles per the mockup, background-tinted by price tier — tier 1
     green-tint, tier 2 neutral/white, tier 3 ink. Unpriced gyms get a hollow/dashed
     bubble reading "Call": visible, but visually secondary.
   - **A selection made from the list is brought into view.** Selecting a card pans
     the map smoothly to the gym's pin when it is not comfortably inside the frame —
     "comfortably" matters, because a bubble hard against the edge reads as absent.
     Zoom changes only when the gym is merged into a cluster and needs resolving.
     Clicking a pin does NOT pan: the user is already looking at it, and its
     list-side equivalent is the existing scroll-to-card.
   - **Pin ↔ gym matching is slug-keyed everywhere.** The list sorts cheapest-first
     while the map iterates data order, so any position-based lookup would light up
     the wrong gym. `scripts/check-map.mjs` asserts this with the two orderings
     deliberately different.
   - **Colour meanings on the map are exclusive and must stay that way.**
     **Ink = expensive** (tier 3). **Orange = selected**, and nothing else on the map
     uses orange as a fill. A selected cluster gets the identical treatment to a
     selected lone pin — orange fill, white text, ring, scale bump — never a partial
     version of it. Every pin state is a single-specificity class pair, so `.pin.active`
     must be declared **last**; `scripts/check-map.mjs` asserts that ordering, because
     both regressions here came from a later rule quietly winning.
   - **Clustering**: minimal. With 41 gyms individual pins should survive to fairly wide
     zoom. When clustering does trigger, the cluster label is the **price range** of its
     members ("$15–259"), never a count — a count tells you nothing you came for.
   - **Tab-aware** (per the §3 rule): on the Day passes tab pins show the day-pass price;
     gyms with no published pass fade to 25% and are excluded from cluster ranges.
   - **Tiles**: CartoDB Positron, or Voyager if Positron reads too grey against our
     palette. Free, no API key, keeps the CSP clean. Attribution rendered per their terms.
   - **Pin ↔ card sync**: click a pin to highlight and scroll to its card; the active pin
     inverts to ink. Filtered-out pins dim to ~18%.
   - **Mobile**: map behind a bottom toggle, per the mockup.
   - **Performance budget**: map JS lazy-loads below the fold or on toggle. The list must
     render before any map asset arrives.
   - **Default view frames CENTRAL Austin, never the full pin set.** Some gyms are far
     out — Life Time North sits at Lakeline / RR 620, ~10 miles north-west — and a
     `fitBounds` over everything would zoom out until central Austin, where almost every
     gym is, became unreadable. Outliers stay reachable by panning or zooming out; they
     do not get to set the frame.
5. Gym detail pages + region pages + JSON-LD + sitemap.
6. Scrapers: lib + the 6 "Low complexity" targets first; Actions cron + PR flow; Sentry.
   (Low = planetfitness, lifetime, lacampeones, bigtex, hydepark, eaac.)
7. Remaining "Medium" scrapers; stale-flag handling; photo build step.
   Of the 8 Medium targets, **5 are scrapable** (crunch, ymca, crux, abp, lafitness)
   and **3 are not**, confirmed by the harvest rather than assumed:
   - **goldsgym** — every fetch times out at 120s and 300s, ordinary and stealth,
     across two club URLs including an owner-verified one; the join flow returns
     HTTP 500. The site refuses automated access.
   - **castlehill** — rates are not in the page source at all; the membership
     content renders client-side. The fetch returns nav and footer only.
   - **24hour** — the public club listing carries no rates; prices sit behind a
     point-of-sale redirect (`salesredirect.html?flow=POS&clubId=...`).
   All three are `data_source: "manual"` and stay on the outreach list. No parser
   work changes this, so none was written for them.
8. FAQ / for-gym-owners pages; OG images; final a11y + Lighthouse pass (target ≥95 across the board).
9. Deploy to Cloudflare Pages, wire domains + redirect, smoke test, ship.

**Definition of done for launch:** ≥33 of 41 gyms with confirmed prices ("Need price" ≤ 8),
every shipped number traceable to a source, zero console errors, works without JS,
Lighthouse ≥95, and the owner has clicked through every gym page once.

---

## 10. Phase 2 (not v1 — recorded so v1 does not foreclose it)

Nothing here gets built, or partially built, in v1. It is written down so that v1's
data model stays compatible with it.

- **Deals feed + price-drop email alerts + price history charts**, built on scrape diffs;
  potential promo-placement revenue layer once traffic exists.

The `price_history` array in §3 is the v1 groundwork for this: it costs nothing now, and
without it from day one the charts would have no back-catalogue to draw. Everything else
this implies — accounts, email capture, a write path — remains firmly out of v1 per §1,
and inherits every **[phase-2]** security rule in §8 the day it arrives.
