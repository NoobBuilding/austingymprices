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
      "commit_months": 0,             // 0 = no contract / month-to-month
      "note": "The $45/yr maintenance fee is charged 75 days after signup, then annually.",
      "is_default": true              // exactly one plan per gym; drives card price + map pin
    }
  ],
  "sub_locality": "North Loop",       // display-only neighbourhood, shown after the region
  "billing_period": "monthly",        // "monthly" (default) | "4-week" | "weekly"
  "day_pass": 15,                     // null if unknown/none
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
- Price tier: 1 (< $40), 2 ($40–100), 3 ($100+) — computed on **all-in**, not sticker

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
4. Leaflet map island + pin/card sync. Mobile map toggle.
5. Gym detail pages + region pages + JSON-LD + sitemap.
6. Scrapers: lib + the 6 "Low complexity" targets first; Actions cron + PR flow; Sentry.
   (Low = planetfitness, lifetime, lacampeones, bigtex, hydepark, eaac.)
7. Remaining 8 "Medium" scrapers; stale-flag handling; photo build step.
   (Medium = crunch, goldsgym, 24hour, ymca, castlehill, crux, abp, lafitness.)
8. FAQ / for-gym-owners pages; OG images; final a11y + Lighthouse pass (target ≥95 across the board).
9. Deploy to Cloudflare Pages, wire domains + redirect, smoke test, ship.

**Definition of done for launch:** ≥31 of 39 gyms with confirmed prices ("Need price" ≤ 8),
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
