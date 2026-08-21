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

**V1 scope: every Austin gym whose price we can definitively source, across
6 regions, on three surfaces — Memberships, Classes & studios, Day passes —
plus a side-by-side compare view.**

~~Superseded: "39 gyms, 7 regions, memberships + day passes."~~ The seed sheet was a
starter spec, not a census. A Google Places sweep of the region bounds found **381
fitness businesses, 294 of them unlisted**, of which **140 publish a price we can
source**. There are **6** regions (the seventh was the `all` filter chip being
miscounted). The site now stands at **51 gyms, 35 with confirmed prices**, and the
ambition is ~100 listed. **114 more sourceable businesses are already identified** and
awaiting owner triage (`docs/discovery-triage.md`).

~~Superseded: "class-pack pricing for boutique studios is out of v1."~~ The incoming
inventory is heavily class businesses, and listing "$130/mo for 4 classes" beside
"$23/mo unlimited access" breaks the sort and misleads in both directions. Studios get
their own tab, judged in the unit they are actually sold in — **price per class**.
See `access_model` in §3.

Explicitly OUT of v1 (do not build, even partially):
- User accounts, sign-in, favorites/hearts
- Reviews or star ratings (Yelp owns that; we are the pricing site)
- Gym-owner portal / "claim your listing" — §10
- Lead-gen ("have them reach out" style buttons)
- Crowdsourced equipment submissions (the UI slots exist; the write path does not)
- Blog/content pages
- Interrogative popups and budget-qualification surveys — **deliberately declined**, §10

**Businesses excluded from listing** (recorded in `docs/recheck-ledger.md`, never
silently dropped):
- **Not yet open.** EOS Fitness Parmer (2027) and JETSET Pilates Arboretum, whose
  page states billing begins 30 days after its Grand Opening and whose "Founders"
  rates are launch promotions, not standing prices. No row, no "coming soon"
  placeholder.
- **Pure personal-training studios.** Forge Strength (8-session PT packs at $999/$1498,
  no membership). Listing it would put a $124.88/session rate beside F45 at $23/class.
  ~~Superseded: "and recovery studios."~~ **Recovery-only businesses are now IN scope**
  as the `recovery` category (§3, §6), which **reverses the exclusion of Generator
  Athlete Lab** — it publishes a day pass and recovery passes, and the reason it was set
  aside was that there was nowhere to put it. There is now.
- **Gone dark, or never locatable.** FeV Iron Vault (site entirely down, no confirmed
  address, possibly closed — keeps a recheck condition, so a live site puts it back in
  the pipeline) and Rumble Boxing South Austin (only an intro offer published, and the
  studio the probe found is Southpark Meadows, outside all six region circles, so the
  row was carrying a region it had not earned).

---

## 2. Stack (locked)

| Layer      | Choice                                             | Why |
|------------|----------------------------------------------------|-----|
| Framework  | **Astro** (static output)                          | Content site, SEO-first, minimal JS |
| Interactivity | Vanilla JS or a single small island for filters/map | No React needed for v1; keep bundle tiny |
| Map        | **Leaflet + OpenStreetMap tiles**                  | $0 forever; no API key to leak |
| Data       | **JSON files in repo** (`/data/gyms/*.json`)       | Even at ~100 gyms this needs no database |
| Hosting    | **Cloudflare Pages**                               | Free tier, CDN, survives Reddit launch traffic |
| Scrapers   | **Python scripts** in `/scrapers`, run by **GitHub Actions cron on three cadence tiers** (§6 — *not* nightly), calling the **Firecrawl API** (free tier 1,000 credits/mo; budget ~40–60) | Scrapers open a PR with the JSON diff; a human merges |
| Discovery  | **`scrapers/discover.py`** — Google Places enumeration inside the region circles, diffed against what we list, then a free HTTP probe that classifies each new site | Finds the gyms the seed list never had. Proposes only |
| Events     | **Cloudflare D1** (`DB` binding) behind a Pages Function at `/api/event` | Anonymous counters; the outbound-click record cannot be rebuilt retroactively (§8) |
| Analytics  | **Cloudflare Web Analytics** (dashboard toggle; CSP already allows it) | Cookie-free, no consent banner. Custom events go to `/api/event`, not a third party |
| Domains    | austingymprices.com (primary), atxgymprices.com (301 redirect via Cloudflare Redirect Rule) | |
| Email      | Cloudflare Email Routing → owner's inbox           | hello@ + reports@ forwarding |
| Errors     | **Sentry** (client + scraper), free tier           | See §8 |

Do not introduce: React/Next, Supabase, Tailwind (hand-rolled CSS per design system below),
any paid service, any additional third-party script. Cloudflare Web Analytics is the one
allowed exception and is already wired; **anything requiring a cookie banner is the wrong
tool by definition.**

**D1 is not a retreat from "no backend".** It stores counters, never content: the site
still renders entirely from JSON at build time, and the endpoint is write-only from the
browser's side. Nothing the visitor sees depends on it, which is why a missing binding
degrades to "not counting" rather than to a broken page.

If a future phase adds a backend (accounts, crowdsourcing, owner portal), it will be
Supabase — §8 includes the security rules for that day so they're on record now.

---

## 3. Data model

One JSON file per gym: `/data/gyms/{slug}.json`. Slug = kebab-case name (`big-tex-gym`).

```jsonc
{
  "slug": "big-tex-gym",
  "name": "Big Tex Gym",
  "region": "hyde-park",            // one of the 6 region ids below
  "chain": null,                     // kebab-case brand key shared by sibling
                                     //   locations, or null for an independent.
                                     //   Links rows; creates NO page (§10).
  "access_model": "facility",        // "facility" (buy door access) | "classes" (buy sessions)
  "eligibility": null,               // null | women_only | men_only | students | seniors |
                                     //   members_only — WHO may join. Distinct from a
                                     //   plan's `restricted`, which is what a plan buys.
  "category": "gym-weights",         // gym-weights | gym-classes | luxury | crossfit-hiit |
                                     // pilates | yoga | boxing | bjj-mma | climbing |
                                     // community | recovery
  "website": "https://bigtexgym.com",
  "pricing_url": "https://bigtexgym.com/membership",
  "address": "1921 Cedar Bend Dr, Austin, TX 78758",
  "lat": 30.4021,
  "lng": -97.7015,
  "known_for": "Serious lifting crowd, old-school and specialty equipment, loud floor, 24/7 key-tag access.",
  "amenities": ["24/7", "Infrared sauna", "Parking"],
  "sauna": null,                     // true | false | null — tri-state, like accepts_classpass.
  "steam_room": null,                //   Sourced from the gym's OWN materials only: never
  "cold_plunge": null,               //   inferred from a photo, a review or an amenity string.
  "pool": null,                      //   Same family. Gated filter chip at 5+ sourced.
  "showers": null,                   //   Same family, same gate. Asked for twice independently.
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
      "is_default": true,             // exactly one plan per gym; drives card price + map pin
      "classes_per_period": null,     // classes included per billing period; null = unlimited
                                      // or not published. Drives the per-class figure
      "cancellation_fee": null,       // contingent exit cost. RENDERS, never enters all-in
      "promo": null                   // {price, enroll_fee, annual_fee, note, expires}, all optional
    }
  ],
  "class_packs": [                    // structured so the per-class figure can reach them
    { "name": "10-class pack", "price": 330, "classes": 10,
      "expires_days": 90, "promo": false }   // promo:true is EXCLUDED from per-class maths
  ],
  "accepts_classpass": null,          // true | false | null — null renders NOTHING
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
  ],
  "stale": false,                     // set by the scraper after >14 days of failure;
                                      // the UI then says "Prices last confirmed {date}"
  "intro_offer_url": null,            // §10 plumbing. https only. null renders NOTHING
  "listing_tier": "standard",         // §10 plumbing. No rendering difference today
  "sourcing_notes": []                // build-log register: DETAIL PAGE ONLY, never a card
}
```

**Every field is required present.** `null` is a value meaning "not published"; a missing
key is a bug and `npm run validate:data` fails the build on it. The distinction matters:
`0` means the page says zero, `null` means the page does not say.

**Card content is tab-aware.** The active tab defines the question the user is asking,
and every element on the card answers *that* question. On the **Memberships** tab the card
shows the all-in monthly price, the commitment badge and the membership cost receipt. On
the **Day passes** tab it shows the day-pass price and `day_pass_terms`, and membership
appears only as one secondary line ("Membership from $X/mo all-in — Full details →").
**Commitment badges never render on the Day passes tab** — commitment is a membership
concept, and a "2-mo minimum" badge above a $10 headline reads as a contradiction.
Day-pass restrictions live in `day_pass_terms` as structured data so they render from the
data rather than being buried in prose.

**Every tab answers the accordion.** A card's chevron must never open onto an empty box.
The Classes tab did exactly that for a while: it hid the membership receipt, hid the
day-pass body, and had nothing of its own to put in their place. The **Classes expanded
state is exactly three elements, and nothing else**: (a) the **receipt line** showing how
the per-class figure was derived — "$27.90/class = $279 10-class pack ÷ 10 classes",
read from the same function that computed the headline so the two cannot disagree;
(b) the **promo flag** where a deal exists, standard treatment; (c) **one "what's
included" line, only where the gym published one**. No schedules, no amenities — those
answer a different question and belong on the detail page. Where a studio publishes no
class count there is no receipt, and the card says so rather than inventing an arithmetic.

**Card notes are written for SHOPPERS. The build-log register is detail-page-only.**
A card carries **at most one short note per concern** — what someone deciding where to
train needs to know, in the voice the rest of the card is written in. **No section
references, no precedent names, no internal task language, no methodology narration.**
The floor note is the model, and the whole of it:

> "This gym does not publish its annual fee, so the all-in figure is a floor — the real
> cost is this or higher."

Everything behind that — how a figure was read, which precedent settled an ambiguity,
what is still unresolved, what we asked and have not been answered — moves to
**`sourcing_notes`**, a gym-level array rendered on the detail page under
**"Why this number?"**, low on the page and quiet in treatment because it answers a
question only some readers ask. **Honesty is layered, not deleted.** It is the same
rule as everything else here: the card scans, the page explains.

This is enforced, not merely stated. `npm run validate:data` scans **only the notes a
card can render** — the default plan's note, a plan-less row's `pricing_note`, promo
notes, class-pack notes, day-pass terms and the alternative — and **fails the build** on a
section reference, a precedent name, internal task vocabulary ("branch row", "owner-contact
list", "sourced zeros", "needs a human read"), or methodology narration ("flagged, not
guessed"). The detail page is deliberately **not** checked: carrying the full epistemics
is what that surface is for. The rule was earned — the Gold's South Central card shipped
a paragraph citing the compare-at precedent, "§6", "flagged, not guessed" and
"owner-contact list" to a consumer, and friend feedback caught it before the launch did.

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
computed on the all-in figure or the headline number lies. **Where no plan satisfies `commit_months ≤ 2`, the default falls back to the
cheapest all-in plan at the SHORTEST available commitment** — shortest first,
even if a longer lock-in is cheaper — and its commitment badge renders on the
card headline. **The price answers "what does it cost"; the badge answers
"what's the catch."** Suppressing the first because of the second helps nobody,
and studios whose every option carries a 3- or 6-month minimum are common
enough in the class inventory that the old behaviour would have shown "call for
pricing" for gyms whose prices we had read and recorded.
Only where **no plan carries a price at all** (a promo-only gym, or a
consult-gated one) does the card fall back to the "call for pricing" state.

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

**`accepts_classpass` rules:** a tri-state, and the tri-state is the point.
`true` renders the plain words "Accepts ClassPass" on the detail page — nominative
use only: **no logo, no mark, no link, no affiliate framing**, because we are not
a ClassPass partner and must never look like one. `false` is a confirmed no and
renders **nothing** — a negative does not earn space on the page, but it is worth
storing because it tells the owner's outreach not to ask twice. `null` means
unconfirmed and also renders nothing. **Silence is not a no:** a pricing page that
never says the word proves nothing, so a scrape that finds no mention leaves the
stored value alone rather than writing `false`. Same rule as the commitment badge —
absence of data renders absence of claim. Scrapers read for it opportunistically
off pages they already fetched (§6), so it costs no extra credits.

The index gets a **"ClassPass" filter chip only once ≥5 gyms are confirmed `true`**.
Below that it would cut 41 gyms to two and read as a broken filter rather than a
useful one. The gate is computed at build time, so the chip appears on its own the
day the data supports it — no code change.

**`day_pass_qualifier` / `day_pass_terms` / `day_pass_alternative` rules:** the qualifier
folds into the price line (`"$15 + tax"`), never a second sentence. `day_pass_terms` is
**at most three**, and only where they materially change what you are buying. Exactly
**one** alternative, and only when it is a dramatically better deal for the same use case.
Everything else — punchcards, class passes, multi-week options, the fuller comparison
maths — belongs on the detail page. Cards scan; detail pages explain.

**`stale` rules:** set by the scraper when a target has failed for more than 14 days.
The UI then shows "Prices last confirmed {date}" in the warning style. A gym marked
stale with no `verified_date` fails validation — there is nothing for it to be stale
relative to.

**Region is the STORED FIELD. Circles are enumeration machinery and nothing else.**
A gym's `region` is the value in its JSON, full stop. The search circles in `regions.json`
exist to enumerate candidates and to aim the map camera; they **never** determine a listed
gym's region, and no user-facing number is computed from them. **Region medians compute
from the stored field exclusively.**

This is settled rather than assumed. 73% of pins sit inside more than one circle and five
sit inside four, so "which circle contains it" has no single answer; where geometry and the
stored value disagree — 12 of 75 pins — **the stored value is right and the geometry is
wrong.** The nearest containing circle to `hyde-park-gym` is Downtown, and to
`24-hour-fitness-hancock` is Mueller. A rule that moves the gym Hyde Park is named after
out of Hyde Park refutes itself. Recomputing medians geometrically would also move Hyde
Park's by $22, changing a sentence on every one of its detail pages.

The nearest-circle heuristic survives for **candidate binning during triage only**, and the
harvest docs record its known distortion: East Austin's 10,500 m circle reaches deep into
South Austin, so roughly two fifths of a nominally East Austin harvest is really SoCo.
See `docs/circle-overlap-findings.md`.

**`sub_locality` rules:** display-only neighbourhood, shown after the region
("South / SoCo · South Lamar"). It is editorial, not geographic: it never affects
filtering, the map, or which region a gym belongs to.

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
- `from_per_class`, `class_tier`, `unlimited_monthly`, `has_class_price` — the Classes
  tab economics, from `classes_per_period` and `class_packs`

**Edge cases the schema must handle (from the seed list):**
- Donation-based (Black Swan Yoga): `monthly: null`, `pricing_note` string shown instead
- Prepay plans (Big Tex 6/12-mo): additional plan objects, `commit_months` set, monthly = effective rate
- Consult-gated (Equinox, Kollective): `data_source: "manual"`, plans may be empty →
  card shows "Pricing not published — call" state, never a fake number
- Add-on fees (Crux gear/locker): fold into `note`, not into the math

**`access_model` rules:** `"facility"` (you buy door access — gyms, climbing,
Castle Hill) or `"classes"` (you buy instructed sessions — solidcore, Club
Pilates, F45, yoga, BJJ). It decides which tab a gym appears on, and therefore
**which unit it is judged in**: a facility is comparable per month, a studio per
class. Listing "$130/mo for 4 classes" beside "$23/mo unlimited access" breaks
the sort and misleads in both directions. The test is what you are buying, not
what the category says — Grassiron is `gym-weights` but publishes only class and
PT rates, so it is `classes`; Korrect is `gym-classes` but sells unlimited open
gym, so it is `facility`.

**Classes-tab economics:** the headline is **"from $X/class"** — the best
per-class rate a walk-in can actually get. "Attainable" carries the same spirit
as the default-plan rule: packs always count (they commit you to nothing), plans
with `commit_months ≤ 2` count, and a rate reachable only through a twelve-month
lock-in does not — that is the price of a year, not of a class. Restricted plans
are excluded for the same reason they never take the headline. Derived at build
time from `classes_per_period` on plans and from `class_packs`; where no class
count is published there is **no figure**, never an inferred one. A promo pack is
excluded outright: letting "3 classes for $79 this month" set the per-class rate
would promote a promo to standing, and it becomes a wrong number the day the
offer ends. Class price tiers are **1 (< $22), 2 ($22–32), 3 ($32+)**, fitted to
what Austin studios actually charge rather than to round numbers that would drop
nearly everything into tier 1.

**`sauna` / `steam_room` / `cold_plunge` / `pool` / `showers` rules:** five tri-state
booleans on **every** gym, obeying the same rule as `accepts_classpass`. `true` is confirmed from the gym's own
materials, `false` is a confirmed no, `null` is unconfirmed — and **absence renders
absence**. They are never inferred from a photo, a review, or a Places attribute: a
picture of a wooden room is not a published amenity. There is **no site-wide population
pass**; they fill in opportunistically as rows are touched for other reasons, which is
why `null` is the honest majority state rather than a backlog.

**`showers` is the fifth, and it earns its field the way `pool` did — by being
DECISIVE.** It settles whether you can train on the way to work, which is a different
question from whether the gym is any good, and it was asked for twice independently
before the field existed. It gets a **filter chip gated at 5+ sourced `true`**, the same
mechanism as the Pool and ClassPass chips, computed at build time so the chip appears on
its own the day the fifth answer lands. `scrapers/probe_showers.py` proposes candidates
from the gym's own pages — robots-checked, honest User-Agent, and reporting **the
sentence around the match**, because "a dollar sign is not a price" generalises exactly:
a shower word in a class name or a blog post is not a published amenity. It PROPOSES;
the owner cherry-picks. A **negative is only ever recorded where the page positively says
so** — silence stays `null`, because silence is not a no. **This does not reopen the
closed list**: the five exist because they are what a *gym* is asked about, and
extending it per modality would turn the schema into an equipment inventory.

**The `recovery` category and its gated fourth tab.** Recovery businesses — sauna houses,
cold-plunge studios, contrast therapy — are `category: "recovery"` and
`access_model: "facility"`. They are facility-model in the full sense: **the same all-in
math, the same day-pass economics, nothing new**. What they do not get is a row on the
Memberships tab, because "$45/mo for a sauna" beside "$23/mo unlimited gym access" is
precisely the category error the Classes tab exists to prevent.

The **Recovery tab renders only once 6 or more recovery listings exist**. Below that it
does not render at all and the category **accumulates invisibly**. The gate is
constitutional, not cosmetic: a chip that filters badly is annoying, but an **empty tab is
a broken promise** — it invites a click and answers with nothing. Computed at build time
like the ClassPass chip, so the tab appears on its own the day the sixth listing lands,
with no code change.

**Unpriced rows are THREE states, not one, and each says something different.**
A row without a monthly membership is not automatically a row without an answer:

- **`per-visit`** — no membership, but a published day-pass or per-class figure. The site
  is showing its price right now, so it renders normally and is **never muted**. Cold
  Plunge Austin at $39 a session is priced; calling it "Price coming" would be false.
- **`not-published`** — we read the page and the gym does not publish. Renders
  **"Not published"**. "They don't publish it" is itself the answer a price-transparency
  site owes (§9), and it is a confirmed finding, not a gap.
- **`awaiting`** — not read yet. The only state where **"Price coming"** is true.

The split is stored as `unpriced_reason` (`null` | `not_published`) and derived into
`price_state`. Conflating the two would either promise a price that is never coming, or
imply we gave up on one nobody has tried.

Both unpriced states render **muted, with no price block at all** — never `$—`, which
reads as an error rather than an absence — and **cannot be added to compare**, with a
disabled control carrying a title that says why. A missing checkbox looks like a bug; a
disabled one explains itself.

On the map, `not-published` draws the dashed "Call" bubble and **`awaiting` draws a
label-free hollow marker**: "Call" is an instruction, and it is only honest where calling
would actually get you a price. Both stay fully opaque and clickable in both display
modes — **every drawn pin is clickable** has no exceptions (§9).

Unpriced rows carry **no `all_in`, no tier, and no per-tab figure**, so they are excluded
from region medians, price bands and any "from $X" copy by construction rather than by a
filter someone has to remember. Sorting is **tab-relative**: a gym with a membership but no
published class count has a figure on Memberships and none on Classes, and sinks to the
bottom of the Classes tab accordingly.

**`chain` rules:** a kebab-case brand key shared by every location of the same chain,
`null` for an independent. It does three things and deliberately no more:

- **Detail pages carry one "Also in Austin" line** — sibling locations, priced ones first
  and cheapest first, because "is there a cheaper one of these near me" is the actual next
  question a chain listing raises. An unpriced sibling is still named: "there is one in
  Mueller" is useful even where we cannot price it.
- **The index folds a chain to ONE row**, the cheapest location, with an expander that
  reveals the rest in place. Four near-identical rows pushing everything else down the
  list reads as padding.
- **The map is not folded. Every location keeps its own pin.** Collapsing is a property of
  the LIST, and the list and the map answer different questions (§9) — a chain that
  vanished from the map would hide exactly the thing a map is for. Selecting a pin whose
  card is folded opens its chain, so a tap is still never swallowed.

**A count describes GYMS, never rows.** Folding is a display convenience and must
never change the truth of a sentence — the same principle that keeps the map unfolded
while the list collapses. The result count once had folded siblings subtracted from it,
so "10 gyms with showers" rendered as **"6"** the moment the YMCA's five branches sat
behind one row and 24 Hour's two behind another. Where the two numbers differ, **both are
stated** — "11 gyms (6 listings)" — because a bare gym count standing over fewer tiles
reads wrong in the opposite direction. A control that counts rows may do so only if it
does not call them gyms: the pagination button reveals listings and says **listings**.
Asserted in `scripts/check-tabs.mjs` as drawn rows **plus** the ones folded behind a
chain, filtered and unfiltered, so the invariant is pinned rather than the day's numbers.

It creates **no roll-up page**: that is §10, a different product with its own SEO story.
The field costs nothing now and means the harvest has somewhere to land — a new sibling
row joins its chain with no code change.

**`eligibility` rules:** a nullable string on the GYM saying who may join, and it is a
different question from a plan's `restricted`, which says what a given plan buys you.
Austin Women's Boxing Club sells every plan to any adult woman: nothing about the product
is limited, so marking its plans `restricted: "scope"` would have made the plan table
state something false. `null` means open to any adult and renders nothing. The value
renders once, on the gym, never as a per-plan badge — and it never affects the
default-plan rule, because a plan a member of the eligible group can freely buy is not a
restricted plan.

**Fee fields carry the §3 distinction, and the validator now enforces it.** `0` means the
page states the fee is zero — a **sourced zero**, always legal. `null` means the page does
not say. `null` is legal too, with one hard exception: **never on the default plan of a
facility gym**, because `all_in` folds a missing fee in as `0` and the headline would
publish a number lower than the truth. A studio is sold per class and its per-class figure
never touches these fees, so an unstated fee there sits in the breakdown behind the plan's
own note. Any plan carrying a `null` fee must carry a note recording that the gym does not
publish it — the gap is stated, never silently absorbed.

**The floor state, in one sentence: where a default plan carries a `null` enrollment or
annual fee, `all_in_monthly` is a FLOOR rather than a figure — it renders as `$35+`, the
plan table reads "Not published" rather than "None", and the plan MUST carry a note naming
the missing fee, without which the row fails validation, because an unexplained `+` is
just a stranger number than the one it replaced.**

`all_in_monthly` folds
a missing fee in as `0`, which makes it right about everything it knows and silently low
about what it does not. Gold's publishes $34.99/mo and no annual fee anywhere, and is
historically an annual-fee chain — printing "$35/mo all-in" there would be exactly the
understatement this site exists to prevent. Refusing the row is no better: we read the
price, and dropping it loses real information.

So where the default plan carries a `null` enrollment or annual fee, the headline renders
**"$35+"**, the card names which fee is missing, and the plan table says **"Not published"**
rather than "None". The `+` is not decoration — it is the difference between a number we
can stand behind and one we cannot. A plan in that state **must** carry a note, and the
validator enforces it: without the note the `+` is unexplained.

**`cancellation_fee` rules:** a nullable number on a plan, for contingent exit
costs (Castle Hill charges $300 to leave a 12-month plan early). It renders on
the plan row and **never enters all-in math**: all-in is what you *will* pay,
a cancellation fee is what you *might*. It is stated anyway, because it is
exactly the kind of number a gym would rather you found in the contract.

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
4. **`/compare?gyms=slug,slug`** — side-by-side comparison, 2 to 4 gyms.
   **The URL is the only state**, so a comparison is shareable and survives a reload.
   Astro builds static output, so the page cannot be rendered per-query: every gym's
   column is server-rendered and the client hides the ones the URL does not name. That is
   what makes the no-JS state real content — it degrades to the full table, the same data
   unfiltered, rather than to a blank page.
   - Heading is **"Compare gyms"** with an "{N} selected" line. Gym names live in the
     column headers only — an "X vs Y vs Z" headline turns a comparison into a billing.
   - One neutral line states the spread ("Range: $23–59/mo all-in"). It anoints nothing.
   - **Nothing is scored, ranked, recommended, or marked as a winner.** Alternating row
     tint is applied per ROW precisely so it can never read as marking a column.
   - Rows: all-in (big), advertised rate, enrollment, annual, commitment badge,
     first-year total (receipt treatment), day pass, billing period where non-monthly,
     amenity families, verified date. An unpriced gym's column says "Call for pricing"
     rather than showing a grid of blanks that reads like zeros.
   - **Amenities are a TRI-STATE, not ✓/—.** Only 13 of the gyms have any amenity list
     recorded, so a dash for the rest would assert dozens of negatives nobody checked.
     ✓ = listed, — = not listed *by a gym that lists things*, blank = no list recorded,
     and the page says so in words.
   - Compare **refuses to mix access models**: a facility is priced per month and a studio
     per class, and putting both under one heading compares nothing.
   - **Compare is TAB-AWARE, exactly as the cards are.** A comparison inherits the
     question the tab was asking, carried in the URL as `&tab=` — because the URL is the
     view's only state, and a comparison that loses its question when reloaded or pasted
     to a friend only looks shareable. From **Classes**: the per-class from-price leads,
     its derivation follows (the same receipt line the card's chevron shows, from the
     same function, so the two cannot drift), then the single-class/drop-in price —
     **relabelled**, because "Day pass" beside a per-class headline invites a comparison
     against a gym's all-day access. From **Day passes**: the pass leads and membership
     economics follow. From **Memberships**: unchanged, and it stays the shape the static
     HTML ships in so the no-JS table is still membership-shaped.
     Rows are **reordered and relabelled, never dropped for being demoted** — a fact that
     stops being the headline is still a fact. The one exception is a lead-only row on a
     tab that does not lead with it: a per-class derivation under "Advertised rate"
     explains a figure no longer on screen.
   - **`noindex`** and out of the sitemap: the useful URLs are query strings with a
     combinatorial number of values and no search value.
5. **`/faq`** — data sourcing, update cadence, correction policy, "not affiliated with any gym.
6. **`/for-gym-owners`** — static page: how to submit corrections (email), note that a
   listing-management portal is planned. No forms in v1.
   **Copy rule: promise the INVARIANT, not the ABSENCE.** "We will never take a referral
   fee" is a promise about our business model that a future us might have to break;
   **"no payment alters a listed price, a fee disclosure, or a ranking"** is a promise
   about the product, and it is the one that actually protects the reader. If a
   disclosed link or a sponsored label ever exists it will be marked as such, and it will
   still not move a price or a rank.

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
- **Favicon / app mark:** a white "A" on an orange `#BF5700` rounded square —
  the logo's Austin-orange half, reduced to one letter. Shipped as
  `favicon.svg` (primary), `favicon.ico` (16/32/48 fallback) and
  `apple-touch-icon.png` (180, full-bleed square because iOS applies its own
  mask). The letter is the **real Barlow Condensed 700 glyph converted to a
  path**, not live text: a favicon cannot fetch a webfont, so an unconverted
  `<text>` element would silently render in whatever the OS substitutes. Cap
  height is 48/64 of the tile — the smallest size at which the counter stays
  open at 16px, which is the size that actually has to work.
- `known_for` is the owner's editorial voice, never generated. When it is `null`,
  render **nothing** — no placeholder, no empty box.
- **Accessibility overrides "do not restyle."** The design system is fixed, with one
  standing exception: where a mockup value fails WCAG AA, it gets corrected and the
  correction is recorded at the token. This has happened once — `--ink-faint` was
  `#A79D92` (2.66:1 on white, against the 4.5:1 AA needs for small text) and renders the
  "Prices checked {date}" provenance line; it is now `#7A726A`, the lightest tone of the
  same hue clearing 4.5:1 on both white and the sunk card surface. Precedent, not drift:
  fix it, comment it at the token, and say so.
- **Map legend** (bottom-right, above the attribution): tiny, quiet, and its swatches
  **reuse the real pin classes**, so a key entry cannot drift from the thing it
  describes. It overrides geometry only, never colour, and does so at higher specificity
  so `.pin.active` can stay declared last. Hidden below 420px. Note this puts `.pin`
  elements outside the marker pane — anything counting pins must scope to
  `.leaflet-marker-pane`.
- **Map display toggle** ("$ prices" / "dots"): prices is and stays the default, because
  the price on the pin is the reason the map exists. Dots drop the numbers for
  tier-tinted dots — a price on every pin invites writing a gym off before reading a word
  about it, and location-first browsing deserves its own mode rather than a compromise.
  Preference persists in `localStorage`, best-effort. The control is chrome, so it uses
  **neither orange nor ink** — both meanings are reserved for pins.
- **Compare page conventions:** a one-line disclaimer, never a paragraph — the table is
  the content. The first-year total takes the accordion receipt's treatment
  (orange-dark on orange-tint, existing tokens only), because it is the number the
  all-in argument builds to and should look like a receipt's bottom line.
  **No winner treatment of any kind.**
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
  Note that a site's `User-agent: *` block can permit us while naming AI crawlers it
  disallows — Rumble allows `*` but blocks `ClaudeBot`, `GPTBot` and
  `CloudflareBrowserRenderingCrawler`. **We identify as ourselves.** Where it is unclear
  which agent a third-party fetcher presents as, do not point it at that host.

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
**Parser and sourcing precedents, each earned the hard way:**

- **Corroborated-decimal repair only.** An escaped footnote marker ate a decimal point
  (`$3699` for $36.99 at Crunch) and bold markers split one number across two runs
  (`**$32** **0**` for $320 at Crux). `scrapers/money.py` rejoins split runs
  structurally and repairs an eaten decimal **only when the repaired figure appears
  verbatim elsewhere on the page**. An implausible number that cannot be corroborated
  raises `ParseError` and fails the run.
- **Struck-through compare-at prices are not prices.** Korrect renders `$179` before
  every tier in `class="price large strikethrough-small"`, and on two tiers it also
  carries Webflow's `w-condition-invisible` so it is not even displayed. Read the markup,
  not the text run.
- **A promo never derives anything.** Promo plans and `class_packs` marked `promo: true`
  are excluded from all-in maths, medians, tiers, map pins and the per-class figure.
  Club Pilates' "3 classes for $79 this month" would otherwise have set their per-class
  rate at $26.33 instead of the standing $35 — a wrong number the day the offer ends.
- **Pre-opening businesses are not listed.** EOS Fitness Parmer (2027) and JETSET
  Arboretum, whose page says billing begins 30 days after its Grand Opening. Founders and
  Pre-Opening rates are launch promotions; treating them as standing prices would ship a
  discount as a price for a gym that does not exist yet.
- **Pure personal-training studios are out of scope** (§1), even when they publish
  figures. Forge Strength's $999 is an 8-session PT pack, not a membership.
  ~~Superseded: "and recovery studios."~~ Recovery is a live CATEGORY now; only the
  pure-PT half of this precedent survives. Two later exclusions confirm the surviving
  half: **Barbells & BJJ** sells online coaching at $349/mo and $150 private 1:1 sessions,
  and **Austin Fight Team** sells only one-to-one park and in-home sessions ($85, $750 for
  ten, $120, $1,100 for ten). Neither publishes a group class or a membership.
- **A soft 404 is a 404.** 24 Hour Fitness's `/salez24/membership` returns HTTP 200 with
  the page title `404 | 24 Hour Fitness`. Check what came back, not just the status.
- **Bot walls are respected, never fought.** A Cloudflare managed challenge means STOP on
  that target and record it — [solidcore], Planet Fitness `/offers`, and Gold's `/join/`
  (which loads fine but is a checkout shell containing "Please verify that you are not a
  robot"). No stealth proxies, no fingerprint spoofing, no CAPTCHA solving, regardless of
  approved credits. `scrapers/discover.py` requires BOTH a real Cloudflare marker AND a
  refusing status (401/403/429/503) before calling something walled — a bare `captcha`
  match once mislabelled 139 ordinary sites with contact-form reCAPTCHA as bot walls,
  which would have written off half the city.

- **Pair probe results to candidates by URL, never by index.** The probe cache is written
  in the order of the candidate list as it stood at the time; every gym subsequently
  listed shortens that list, and a later `zip()` silently attaches the wrong result to the
  wrong gym. It produced "Generator Athlete Lab → crossfituncommon.com" and a count that
  was wrong by a third. A misattributed price is a wrong price by another route.
- **Region buckets from discovery are not regions.** `discover.py` assigns a candidate to
  the nearest *search circle*, and those circles are wide and overlapping — the downtown
  circle is 4.4km centred on the centroid of our downtown-assigned pins, which sits east
  of the actual downtown, so East 7th Street and Springdale Road addresses fall into it.
  The bucket is a search grouping; **a row's real region is settled at geocoding time.**

- **A checkout shell carries another club's data until you tell it otherwise.** Gold's
  `/join/` renders with **Gold's Gym Venice, 360 Hampton Dr, CA** preselected and a
  `Passport Gold Plus` plan at `$0.00`, on the Austin Downtown *and* Austin Burnet URLs
  alike. Any figure lifted from that page before walking the location selector belongs to
  a gym 1,400 miles away. Same class of error as pairing probe results by index: the page
  looked like it was about the club whose URL fetched it, and it was not.

- **A source URL that names a location is making a claim, and the validator now checks
  it.** The Gold's Venice trap has a second door: not the checkout shell, but the
  `pricing_url` itself. **Perspire North Lamar pointed at `/locations/hutto`** and
  **Restore South Lamar at `/locations/tx-round-rock-tx002`** — both pages self-identify
  as the other town throughout, and both published *exactly* the figures those rows
  carried. Two Austin rows were shipping another town's rate card. The check is offline
  and structural, because the URL states the location itself: where a path segment
  follows a location-ish parent (`/locations/`, `/tx/`, `/gyms/`…), at least one of its
  meaningful tokens must appear in the row's own name, address, `sub_locality` or region.
  A URL claiming no location (`/pricing`, `/join`) is not checked. **Uniformity remains a
  finding, not an assumption** — the Gold's precedent cuts both ways, and a membership
  being usable at every location nationwide says where you may spend it, not what it
  costs to buy. Both rows fell back to the unpriced state rather than carrying a figure
  read from another city.

**Scope precedents — what counts as a gym.** Triage law, applied to every candidate
before anything else is asked about it. These are the owner's rulings, recorded so a new
thread inherits them rather than re-litigating each studio one at a time:

- **Dance: technique out, sweat in.** A business selling technique or social/art-form
  instruction is **excluded** — ballet, tango, salsa, ballroom, competition and
  performance training. **Dance-fitness is in scope, as Classes** — Zumba-style and
  cardio-dance, where the product is a workout that happens to be choreographed. The test
  is **what is being sold: technique, or sweat.** Auditions, syllabi, levels, recitals and
  wedding-dance lessons are technique markers; calories, conditioning and "no experience
  needed" are sweat markers.
- **Fitness sold as fitness is in, whatever the medium.** Pole fitness (Brass Ovaries) and
  shuffle (Shuffle HQ) both pass rule 1's sweat test: the customer is buying a workout, and
  the fact that a technique exists to be learned does not make it a technique school. The
  line runs between **dance INSTRUCTION** — ballet, ballroom, tango, competition and
  performance training — and **movement sold and priced as exercise**. Medium is not the
  test; what is being sold is.
- **A dollar sign is not a price.** Probe hits must be read in the sentence around them,
  and this precedent has now stopped **six fake prices across two waves** — pet fees,
  seminar fees, meet entries, late-cancellation fees, ankle weights and a ceramic mug.
  Wave 1 found "$300" and "$25-$30" at Solomon — a **pet fee** and a **pet management fee**
  at an apartment complex — and "$549" and "$65" at Texas Barbell Club, which are a **USAW
  seminar fee** and a **meet entry**. AMLI Branch Park's "$1/$2/$3" were rental-page noise.
  Wave 2 added more of the same shape: **Evolution Pilates**' $10 and $15 are LATE
  CANCELLATION FEES; **Homebody Studios**' $75/$85/$55 are ankle weights, a zip top and a
  ceramic mug from their shop page; **Sauna House**'s "$25 / $10" is a REFERRAL CREDIT; and
  **Öli Saunas** and **Subzero** sell the equipment itself ($6,940 barrel sauna, $10,999
  plunge). Every one would have passed a numbers-only reading; four of the businesses were
  not gyms at all. **The probe proposes figures, it does not identify them.**
- **Martial arts: in scope as Classes, where an adult can actually buy.** A martial-arts
  school lists **where adult class or drop-in pricing exists** — the Old Guard precedent,
  which sells a $165/mo two-day plan and a $25 drop-in. A school publishing only
  kids' programmes and a "contact us" fails the adult test, not the martial-arts test.
- **PT: the exclusion is for PURE personal training only.** A business is excluded when
  1-on-1 training is the **sole product** and there is no self-directed membership and no
  group-class price to list — the Forge Strength and Generator Athlete Lab precedent,
  generalised. **PT offered as an add-on never affects a listing**: we list the
  membership and class economics and ignore the PT rates entirely. Nearly every gym sells
  personal training, and letting that disqualify them would empty the site.
- **Recovery: the category is recovery-as-PRIMARY-PRODUCT**, and it includes
  recovery-**tech** studios — cryotherapy, compression, red light, IV-adjacent hyper-wellness
  chains — not only sauna houses, cold-plunge studios and contrast therapy. The test is
  whether recovery is what the business sells, not which device it sells it with.
  Correspondingly, **device-level amenities are `known_for` material at most, never
  schema**: a room full of cryo chambers does not earn a `cryo` field. `sauna`,
  `steam_room` and `cold_plunge` exist because they are the three a *gym* is asked about,
  and the list is closed for that reason — extending it per modality would turn the
  schema into an equipment inventory. See §3 and the gated fourth tab.
  This **reverses the original exclusion** of Generator Athlete Lab, which was set aside
  as a "recovery studio" before the category existed.
- **Youth-only: excluded. An adult offering is required to list.** A gym with no product
  a walk-in adult can buy is not a gym this site can price. Where an adult price exists,
  a youth price is simply another plan — OPTML's youth rate stays, because its **adult
  price anchors the row**. The rule excludes youth-*only* businesses, never youth pricing.

- **A chain is N gyms wearing one logo. Verify per location, always.** Gold's prices
  Downtown at $49.99, Burnet at $69.99 and South Central at $34.99 — **three clubs, three
  rate cards, one brand**. The inverse also holds and must be sourced just as explicitly:
  the **YMCA publishes ONE association-wide card** and a membership admits you to every
  branch, so all five branches legitimately carry the same figures with the provenance
  stated on each plan. Neither uniformity nor variation may be assumed; both are findings.
  **One club's promo never propagates** — Planet Fitness' E. Riverside read cannot be
  reused across its six other clubs, because startup and Black Card pricing vary and that
  read is itself a promo state.
- **A brand's own locator can be WORSE than Places.** The intuition that the locator is
  the census and the API is not was tested and failed: F45's finder exposes **3** Austin
  slugs against Places' **18**; Anytime's sitemap yields 5 club URLs whose pages are
  JS-rendered with **no address in the HTML**; Planet Fitness returns **403 behind a
  Cloudflare challenge** on both locator and club pages, so it is a bot wall and we stop.
  The earlier undercount that prompted the doubt was not the API failing — it was **one
  query against a 20-result cap**. The fix is one text search PER REGION CIRCLE, which
  took Anytime from 3 to 9 and enumerated 115 recovery businesses. Disperse the queries
  before blaming the source.
- **A per-session figure in a note must RECONCILE with the plan math beside it, or be
  attributed.** EvolvE's card reads "$129, 6X | Month, $22 | Session" — and 6 × $22 is
  $132. Their whole card rounds up: 129/6 = $21.50 shown as $22, 199/16 = $12.44 as $13,
  279/30 = $9.30 as $10. Our note repeated their rounding as if it were our arithmetic.
  **The validator now enforces it**: where a class count exists the figure is checkable and
  one quoted figure must equal `monthly ÷ count`; the gym's rounded gloss may sit beside it
  only if the real one is there too. Where no count is published the figure cannot be
  checked at all, so it must be ATTRIBUTED — "the studio states", "the studio rounds" —
  never asserted. This is the per-class receipt's discipline imposed on free prose: **a
  derivation that must display cannot quietly disagree with itself.**
- **Reviews can describe the VENUE rather than the business.** F45 Downtown sits inside the
  Hilton, and **five of its five reviews are hotel guests praising the hotel's pool, sauna
  and showers** — none of which an F45 membership buys. The place match was correct; the
  claims belonged to the building. The `known_for` pipeline now flags a review set as
  venue-contaminated and the row takes no line.
- **A mention is not a verdict: complaints are not features.** Gold's South Central's
  "sauna" convergence was three reviewers saying it had been **broken for months**;
  Southwest Family YMCA's pool convergence was partly closure complaints. A matcher that
  counts mentions will confidently propose the opposite of the truth. The pipeline now
  excludes claims matched inside a negation or complaint and reports them separately —
  Gold's South Central left the draft set entirely once it did.

**Walled site → human transcription.** Where we will not or cannot read a page, the owner
reads it and transcribes. `docs/price-transcription.md` is the paste-friendly sheet, and
**a transcribed price carries exactly the same provenance burden as a scraped one**: one
block per plan, with `source_url` and `date_read` mandatory. A row missing either does not
get written — the same rule that stops a scraper writing an unverified number. `date_read`
becomes the gym's `verified_date` and is displayed in public as "Prices checked {date}",
so it must be the day the page was actually read.

- Respect robots.txt; identify with a honest User-Agent
  (`austingymprices.com price checker; reports@austingymprices.com`); one request per
  target per run; no auth-wall or paywall circumvention; scrape only public pricing pages.

---

## 7. Repo layout

```
/data/gyms/*.json           # source of truth, one file per gym
/data/regions.json          # region ids, display names, map labels, AND search circles
                            #   (centre + radius) used by discovery and the map camera
/docs/
  austin-gym-seed-list.xlsx # the original starter spec, not a census
  mockups/                  # the three HTML mockups (reference only, not served)
  discovery-report.md       # Places sweep, region-grouped, Downtown first. PROPOSES only
  harvest-queue.md          # probe-confirmed pricing URLs awaiting owner approval
  harvest-findings*.md      # per-gym findings tables awaiting owner review
  discovery-triage.md       # the sweep split three ways: keeps / needs-judgement / excludes
  triage-verdicts.md        # the 21 judgement items ruled on against the §6 scope rules
  recovery-scan.md          # why the Recovery category is empty and what would fill it
  awaiting-classification.md# every unpriced listed gym and what it would take to price it
  recheck-ledger.md         # excluded businesses + the condition to revisit each
  price-transcription.md    # paste-friendly sheet for owner-read (walled) prices
  launch-checklist.md       # the gates, including the launch-day sequence
  geocoding-report.md       # Nominatim confidence per gym
/scrapers/
  lib.py, money.py          # shared client, guardrails, defensive number parsing
  targets/                  # one module per scraper target
  harvest.py                # one-time seed harvest (never the nightly pipeline)
  discover.py               # Places enumeration -> diff -> probe -> classify
  geocode.py                # Nominatim, 1 req/sec, cached
/functions/api/event.js     # Cloudflare Pages Function: anonymous event counter
/migrations/0001_events.sql # D1 schema. The function never creates the table
/src/                       # astro site (pages, components, lib)
/scripts/                   # verify gate: lint, validate, csp, search, tabs, map,
                            #   compare, a11y, launch report, smoke
/public/photos/             # owner-submitted photos only; Places photos fetched at build
/public/_headers            # CSP + security headers (Cloudflare Pages feature)
.github/workflows/          # ci.yml, scrape.yml, lighthouse.yml
CLAUDE.md                   # this file
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

**Event counting — privacy by schema, not by promise (`/api/event`)**
- The table is `(day, event, subject, count)` and **nothing else**. There is no visitor
  column, no session column, no IP column: the data cannot be joined back to a person
  because nothing about a person is written down. That is a stronger guarantee than a
  policy, because it does not depend on anyone keeping it.
- No cookie is set or read; nothing is stored in the browser; there is deliberately no
  session concept, because **a session is an identifier by another name**.
- The event name and subject come from **whitelists the server re-checks** — an endpoint
  accepting arbitrary strings is a free write primitive pointed at our own storage. The
  date is server-assigned so a client cannot choose which day to write to. A same-origin
  guard stops another site inflating a gym's numbers from a visitor's browser.
- **Rate limited in the function** (60/min per IP), not as a WAF rule: it lives in the
  repo, deploys with the code, and cannot be silently absent on a fresh environment. The
  IP is a key only — never stored, never logged, gone with the request.
- **Failure is silent for the visitor and loud for the operator.** `sendBeacon` never
  blocks a click-through, and every path answers **204** (a non-2xx would log a console
  error on a page that promises none) — but each one names itself in an
  **`X-Event-Status`** header: `stored`, `no-binding`, `unknown-event`, `bad-subject`,
  `bad-json`, `cross-origin`, `rate-limited`, `write-failed:<reason>`. Identical 204s once
  made "stored fine" indistinguishable from "silently dropped" for a full debugging
  session. `GET /api/event` returns `{"bound": true|false}`.
- The function **never creates the table**; `migrations/0001_events.sql` is a separate
  step. **Cloudflare Pages applies bindings at deployment creation** — a "Retry
  deployment" does not reliably pick up a new binding, and a binding added to the wrong
  environment looks identical to a correct one in the dashboard. Only a fresh deployment
  proves it, which is what the health check exists to confirm.

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

## 9. Current state and what remains

Reframed from a build order: the numbered plan is complete through step 8 and the
project is now in data-gathering and launch preparation. **The map and interaction
contract below is normative, not historical** — it is the specification, not a record of
what was built.

### Ledger

**95 gyms listed, 57 with confirmed prices** (as of 2026-08-20).
**91 map pins · 94 addresses · 9 `known_for` lines · 10 sourced pools.**

~~Superseded: "51 gyms listed, 35 with confirmed prices."~~ The jump is mostly structural
rather than harvested: chain BRANCH rows (YMCA ×5, Anytime ×3, F45 ×10, Planet Fitness ×6)
replaced brand-level placeholder rows that could carry neither a pin nor an honest price.
**Listed count and coverage now pull in opposite directions** — the friends-and-family
phase is judged on rows, the launch gate on coverage — and that tension is real, not an
artifact. Coverage fell from 72% to 60% while the site got strictly more honest.

**Surfaces live:** four tabs — Memberships, Classes & studios, Day passes, and
**Recovery** (14 listings, gated at 6+). **Pool filter chip** (10 sourced, gated at 5+).
**Chain handling**: the list folds a chain to its cheapest location with an expander,
every location keeps its own map pin, and detail pages carry an "Also in Austin" line.
**Three unpriced states** with distinct rendering — `per-visit`, `not-published`,
`awaiting` (§3).

**Phase: friends-and-family soft launch imminent.** The domain flip follows the top-3
fixes from friend feedback, not the other way round — see the launch sequence below.

This number goes stale;
**the live one comes from asking Claude Code to run `node scripts/launch-check.mjs` and
report the output** — the owner does not clone the repo or run local commands (§9b).
That report also gives per-region coverage and the outstanding queues.

~~Superseded: "Downtown is the weakest region, so it leads the cherry-picking order."~~
Downtown now sits at 13/17. **Mueller (1/3) and The Domain (6/15) are the thin ones**, and
neither can be filled from the 92-keep queue — Mueller has 2 candidates left and The Domain
1. Growth there comes from chain siblings or a fresh sweep, not from re-ordering the queue
(`docs/wave2-queue.md`, `docs/mueller-circle-proposal.md`).

### Done

Repo scaffold, design tokens, self-hosted fonts, CI, `_headers`; data schema, loader and
validator; index list with filters, pagination and accordion cards; Leaflet map island;
gym detail pages, region pages, JSON-LD, sitemap; 11 scraper targets with the PR flow and
Sentry; FAQ and for-gym-owners; OG images; accessibility pass; favicon;
**Classes & studios tab**; **compare view**; **discovery pipeline**;
**event counting on D1**; **Founder Campaign codified**;
**Recovery tab** (gated); **pool field and filter chip** (gated); **chain field with
list-fold, sibling cross-links and per-location pins**; **three unpriced states**;
**tab-aware compare**; **`known_for` draft pipeline**; **discovery widened to recovery
types**; **branch enumeration for YMCA, Anytime, F45 and Planet Fitness**;
**card-note register split with a validator guard and the detail-page "Why this number?"
fine print**; **`showers` field, probe and gated chip**.

### The map and interaction contract (normative)

Requirements beyond the mockup — we differentiate on information, not decoration.
**The map FRAMES; the list FILTERS.** They answer different questions and must never
share a mechanism.

   - **Pins**: price bubbles per the mockup, background-tinted by price tier — tier 1
     green-tint, tier 2 neutral/white, tier 3 ink. Unpriced gyms get a hollow/dashed
     bubble reading "Call": visible, but visually secondary.
   - **A selection made from the list is brought into view.** Selecting a card pans
     the map smoothly to the gym's pin when it is not comfortably inside the frame —
     "comfortably" matters, because a bubble hard against the edge reads as absent.
     Zoom changes only when the gym is stacked under a merged bubble and needs
     splitting out.
     Clicking a pin does NOT pan: the user is already looking at it, and its
     list-side equivalent is the existing scroll-to-card.
   - **Pin ↔ gym matching is slug-keyed everywhere.** The list sorts cheapest-first
     while the map iterates data order, so any position-based lookup would light up
     the wrong gym. `scripts/check-map.mjs` asserts this with the two orderings
     deliberately different.
   - **Exactly one card is open at a time, and the open card IS the selection.**
     The cards are a named `<details>` group, so the browser enforces the
     accordion natively even with JS off; `index.astro` enforces the same rule
     for browsers that predate `name`, and `src/lib/selection.js` holds the
     selection rule itself where a test can execute it.
     Cards used to be independent `<details>`: opening a second one moved the
     selection while the first stayed open, and closing that second one then
     cleared a selection whose own card was still open. The map went white
     underneath an open card, which reads as "the selected bubble lost its
     orange" when in truth nothing was selected at all. That was **two states
     pretending to be one**, and the fix is to make them genuinely one rather
     than to keep them in sync. Side-by-side comparison is the detail pages' job.
     The rule must converge whichever order the two toggle events arrive in,
     because the spec does not pin that order down.
     The lesson generalises: **a rule that only exists inside an event handler
     cannot be asserted, and an assertion that only reads CSS and pure helpers
     will stay green while the real path is broken.** `scripts/check-map.mjs`
     now boots the actual island and inspects the classes `render()` really
     emits.
   - **Colour meanings on the map are exclusive and must stay that way.**
     **Ink = expensive** (tier 3). **Orange = selected**, and nothing else on the map
     uses orange as a fill. A selected merged bubble gets the identical treatment
     to a selected lone pin — orange fill, white text, ring, scale bump — never a partial
     version of it. Every pin state is a single-specificity class pair, so `.pin.active`
     must be declared **last**; `scripts/check-map.mjs` asserts that ordering, because
     both regressions here came from a later rule quietly winning.
   - **Display toggle — "$ prices" / "dots".** A quiet two-button control on the map.
     **Prices is and stays the default**: the price on the pin is the whole reason
     the map exists. **Dots** drops the numbers for small tier-tinted dots, because
     a price on every pin invites writing a gym off before reading a word about it,
     and location-first browsing deserves its own mode rather than a compromise
     between the two. Dots keep the tier tint and every other pin state — selected
     is still orange, filtered-out still dims, a merged dot is simply larger, and
     the price a dot no longer prints becomes its accessible name. The preference
     persists in `localStorage` and nowhere else; a browser that refuses storage
     just gets the default back, which is not a failure worth handling twice.
     The control is chrome, so it uses **neither orange nor ink** — both meanings
     are reserved for pins.
   - **Placement: nudge, do not merge. 41 gyms is not NYC.** Every pin shows its
     own price at every zoom — the price on the pin is the reason the map exists,
     and a merged bubble hides prices to solve a problem this dataset does not
     have. Crowding is resolved by **nudging bubbles apart** (spiderfy-lite):
     overlapping bubbles are pushed along the axis needing the least movement,
     which for wide short price bubbles is almost always vertical. Displacement
     is **capped**; past the cap a bubble is allowed to overlap rather than drift,
     because a pin that wanders to stay readable is lying about where the gym is,
     and on a map that is the same class of error as a wrong price. The marker
     stays at the true coordinates — only the icon's anchor moves.
     Pins merge **only when effectively co-located** — the same plaza, a handful
     of pixels apart. A merged bubble reads **cheapest price + how many more are
     underneath**: "$38 +1". It answers both questions a stack raises — what is
     the best price here, and how much am I not seeing.
     **Price-range labels ("$15–259") are gone**: they told you nothing you came
     for and read like one gym's pricing. A bare count is no better.
     Clicking a merged bubble **fans it open** into its members, each showing its
     own price; clicking a fanned member selects it and keeps the fan open (you
     are comparing two gyms at one address); clicking the map background puts it
     away. Zooming in splits the group on its own. A merged bubble containing the
     selection wears the full selected treatment, exactly as a lone pin does.
     Merging is asserted as a **proportion, not a count**: at least 80% of drawn
     pins must show their own price at every zoom. Currently 94% at zoom 11 —
     two genuinely co-located pairs, Lift ATX with Austin Bouldering Project and
     Kawi CrossFit with East Austin Athletic Club — and 100% at every other zoom.
     An earlier version capped merges at one, which was a fact about the day it
     was written rather than the rule, and it failed the moment the city got
     denser.
   - **A legend, bottom-right, above the attribution.** The map encodes three
     separate meanings in colour — price tier, "no published price", and
     "selected" — and an unlabelled colour code is a puzzle rather than
     information. Tiny and quiet: it explains the map, it is not part of it.
     Its swatches **reuse the real pin classes**, so a key entry cannot drift
     from the thing it describes; the legend overrides geometry only, never
     colour, and does so at higher specificity so `.pin.active` can stay declared
     last. Hidden below 420px, where there is no room for both the key and the
     pins it explains. Note that this puts `.pin` elements outside the marker
     pane, so anything counting pins must scope to `.leaflet-marker-pane`.
   - **Tab-aware** (per the §3 rule): on the Day passes tab pins show the day-pass price;
     gyms with no published pass fade to 25% and never merge.
   - **Tiles**: CartoDB Positron, or Voyager if Positron reads too grey against our
     palette. Free, no API key, keeps the CSP clean. Attribution rendered per their terms.
   - **The map FRAMES; the list FILTERS.** They answer different questions and
     must not share a mechanism.
     **Region chips are a camera.** Choosing a region pans and zooms the map to
     that region's bounds (the search circles in `regions.json`, padded) and
     changes **nothing** about which pins are drawn. Filtering a map by region
     hides the very thing a map is for — seeing what is nearby, including the
     gym just over the boundary. "All of Austin" returns to the default central
     frame, never a `fitBounds` over outliers. Camera moves honour
     `prefers-reduced-motion`.
     **Attribute filters hide.** Price tier, activity, no-contract, ClassPass
     and the search query remove non-matching pins outright.
     **Dimming is abolished.** There is no `.dim` and no `.nopass`: a price
     bubble at 18% opacity still looks like a price bubble, still invites a tap,
     and then swallows it. It was the only thing on this map that could look
     interactive and not be. **Every drawn pin is clickable, always.**
     **A tap is never swallowed.** Tapping a pin outside the active region
     selects that gym and brings its card back into the list, marked
     "Outside {region}" — the selection wins over the region filter, and the
     note explains the card's presence rather than letting the filter look
     broken.
   - **Mobile**: map behind a bottom toggle, per the mockup.
   - **Performance budget**: map JS lazy-loads below the fold or on toggle. The list must
     render before any map asset arrives.
   - **Default view frames CENTRAL Austin, never the full pin set.** Some gyms are far
     out — Life Time North sits at Lakeline / RR 620, ~10 miles north-west — and a
     `fitBounds` over everything would zoom out until central Austin, where almost every
     gym is, became unreadable. Outliers stay reachable by panning or zooming out; they
     do not get to set the frame.
### In flight

- **Discovery cherry-pick.** `docs/discovery-report.md` holds the raw 294 candidates.
  `docs/discovery-triage.md` splits them for review: **92 obvious keeps, 21 needing an
  owner judgement, 144 obvious excludes** — of which **118 are simply "site reads fine,
  publishes no price"**, which is the real shape of the long tail. Only 3 are bot walls.
  **114 distinct sourceable businesses remain unlisted.**
  The 21 are now **ruled on against the §6 scope precedents** in
  `docs/triage-verdicts.md`: **10 in, 9 out, 2 the rules genuinely do not decide**
  (Shuffle HQ; StretchLab). All 10 are Classes-model, so they change the Classes tab
  rather than the Memberships coverage number.
- **The Recovery category has inventory — the first sweep just never asked.**
  `docs/recovery-scan.md`. The original sweep requested `gym`, `fitness_center` and
  `yoga_studio` only, while `EXCLUDE_NAME` filtered out `wellness center|massage|spa\b`;
  sauna houses and plunge studios were therefore **never enumerated**, not excluded, which
  is why re-reading the 144 excludes found nothing. The funded second pass (2026-08-20)
  widened the types to `spa` and `wellness_center`, added six recovery text queries, and
  **narrowed `EXCLUDE_NAME` in the same change** — those two edits are one change, because
  widening the search while the filter still deletes the results is a no-op that looks
  like a finding. It returned **115 raw places, 34 core recovery businesses with a site,
  ~20 distinct brands**, comfortably past the gate of six. **Not yet probed for published
  prices** — enumeration says how many exist, the probe says how many we can source, and
  only the second number ships rows.
- **Waves 1 and 2 are harvested and reported** — `docs/harvest-findings-wave1.md` and
  `docs/harvest-findings-wave2.md`. Nine rows written between them. The residue is
  human-read work: **14 of Wave 2's 24 candidates need a booking widget opened**, and the
  scrapeable seam through the 92 keeps is close to exhausted.
- **The recovery category is filled**: 14 listings from a funded second Places pass, 10
  priced, gate cleared. `docs/recovery-scan.md`.
- **Chain branches enumerated** for YMCA, Anytime, F45 and Planet Fitness —
  `docs/chain-branch-enumeration.md`. 16 placeholder rows added; Anytime produced none,
  its three in-circle clubs already existing.
- **The 18 awaiting gyms are classified** in `docs/awaiting-classification.md` as
  sourceable-scrapeable / sourceable-human / needs-owner-contact / dead-end. Five are
  confirmable without owner contact — Studio Three, CorePower, both Gold's clubs and
  Planet Fitness — all by a **human read** rather than a scraper. That puts the realistic
  ceiling at **about 40 of 51 with no replies at all**; growth past that comes from the
  triage, not the awaiting list.
- **Outreach and transcription.** `docs/price-transcription.md` for walled sites;
  Anytime Fitness, CrossFit Austin and 10th Planet have forms submitted.
- **Gaps recorded in `docs/recheck-ledger.md`**: Flow Pilates publishes only an intro
  offer; OPTML publishes no class counts; FeV Iron Vault's site is down and may be closed;
  Kollective's seed URL is wrong.

### Open threads, with owners

Live at the time of writing. **Each line names who holds it**, because an open thread with
no owner is a thread nobody is working. Claude Code items are unblocked and only waiting on
a batch; Kerushan items cannot be moved by Claude Code at all.

| Thread | Owner | State |
|---|---|---|
| **Friend feedback → top-3 fixes** | Kerushan collects, Claude Code lands | The gate on the domain flip. Nothing else in the launch sequence moves first. |
| **14 pending human reads** | Kerushan | Booking-widget studios from Waves 1–2. Optional before the flip — they raise coverage, they do not block. |
| **Planet Fitness + Gold's annual fees** | Kerushan (outreach) | Planet Fitness and Gold's **Downtown, Burnet and South Central**. The PF row is HELD, not written, because the headline would understate without the standing annual figure; the two priced Gold's clubs ship as a FLOOR (`$35+`) until the figure arrives. One number each unblocks them. The "owner-contact list" marker that used to live in the card note was removed with the register fix — this row is now the only place it is tracked. |
| **Athletic Outcomes recheck** | Kerushan | **Dated: after 31 August 2026**, when the 30-spot founding promo expires. They are opening in MUELLER, the thinnest region, so this is a genuine gap-fill. Do not let it lapse. |
| **Waves 3–4** | Claude Code | Queued post-launch. Hyde Park and the Downtown pile, re-sorted by actual region (`docs/wave2-queue.md`). Mostly human-read work now — the scrapeable seam is close to worked out. |
| **F45 and Planet Fitness branch pricing** | Kerushan | 16 rows carry `awaiting` placeholders. F45 needs a read per club (widget); PF is a 403 bot wall to automation, so all six are browser work. |
| **`known_for` 2-review remainder** | Kerushan | Optional. Nine lines shipped from the 3+ convergence cut; the 2-review tier in `docs/known-for-drafts.md` is raw material, not a backlog. |
| **DMARC records** | Kerushan | Written out in `docs/email-auth.md`, awaiting a paste into the Cloudflare dashboard. Claude Code has no DNS credentials. SPF and DKIM are already correct — **do not add a second SPF record.** |
| **Overlapping-circles fix** | Deliberately deferred | The RULE is codified (§3, stored field wins) and medians are safe, so there is nothing user-facing to fix. `docs/circle-overlap-findings.md` is closed. Reopen only if regions gain a second consumer. |

### Launch sequence (order matters)

**A friends-and-family SOFT LAUNCH now sits before the domain flip.** The site goes in
front of a small group on the `.pages.dev` URL, the owner collects feedback, and the
**top three fixes land before the domain moves**. The order matters and is deliberate:
the flip is the irreversible, publicly-indexed step, and the cheapest time to learn the
site confuses someone is while nobody is watching. Steps 2–6 below are unchanged and all
follow the soft-launch phase.

0. **Soft launch (current phase).** Share the `.pages.dev` URL with friends and family.
   Owner collects feedback and picks the top three fixes; Claude Code lands them; only
   then does step 4 happen. Nothing about analytics, the D1 baseline or the domain moves
   during this phase — a soft launch that flips the domain is just a launch.
1. Claude Code runs `npm run verify` to green and reports it; owner clicks through every
   gym page once on the deployed site.
2. **Enable Cloudflare Web Analytics** (dashboard toggle — the CSP already allows it).
3. **Confirm the D1 binding on the serving deployment** (`GET /api/event` →
   `{"bound":true}`), then **`DELETE FROM events;`** to clear test writes and start the
   real baseline. **This stays at the FLIP, not at the soft launch** — friends-and-family
   traffic is real traffic and would otherwise be cleared out of the baseline it belongs
   in, or worse, left in it and mistaken for strangers.
4. **Flip the domain**: austingymprices.com live, atxgymprices.com 301, hello@ and
   reports@ routing verified end to end.
5. **Remove the `main` ruleset bypass** — protection is active but carries a
   `RepositoryRole` bypass with mode `always`, which is why direct pushes land. Removing
   it is what makes §8's "branch protection from day 1" fully true.
6. **Reddit post and the Founder Campaign together**, after the domain flip and after the
   gym pages are live on the real domain. §10 and Gate 4b. **Both drafts are pending in
   the planning chat** — neither is written in this repo, and per §9b the repo is the
   source of truth, so they do not exist until they land here.

**Definition of done for launch: there is no confirmed-price threshold.** We launch on
what we can definitively source. `scripts/launch-check.mjs` reports coverage and exits
non-zero only on a real defect — a gym claiming a price with no `verified_date` behind it.
What must be true: every shipped number is traceable to a source, zero console errors on
the deployed site, works without JS, Lighthouse ≥95.

**Consult-gated brands stay listed** in the "call for pricing" state permanently if need
be. People search those names, and "they don't publish it" is itself the answer a
price-transparency site owes them.

---

## 9b. Working protocol

How this project is run. It is here because a new thread inherits the rules, not the
habits.

- **The owner does not clone the repo and does not run local commands.** Every build,
  test, script and query is run by Claude Code and **reported back in the chat**. Where
  this document names a command, read it as "ask Claude Code to run this and report the
  output", never as an instruction to the owner. The owner's own hands-on surface is the
  **deployed site in a browser** and the **Cloudflare and GitHub dashboards**.
- **The owner reviews every findings report before anything is written to `/data`.**
  Harvests, sweeps and transcriptions produce a report; the owner cherry-picks; only then
  do rows land. Nothing about a gym's price enters the repo on an agent's own judgement.
- **One consolidated message per round-trip.** Batch the work, batch the report. Partial
  answers and progress narration cost more than they inform.
- **Every report states the ledger** — confirmed / total listed — so the project never has
  to guess where it stands. This includes reports that touch no data at all: a
  documentation or infrastructure round-trip still ends with the number, because the
  point is that it is always in view, not that it always changed.
- **Chat pastes are testimony; the repo doc is the source of truth.** Anything quoted into
  conversation is a claim ABOUT a file, not the file. **Any write that ships to the site is
  generated from the file on disk, never from what was pasted in chat** — including a paste
  the owner has already approved, and including one this assistant wrote itself. The rule
  exists because it was broken: a `known_for` review sheet was partly fabricated in a
  reply — a gym that was not in the cut, with invented claim counts and invented review
  quotes — and the owner gave editorial verdicts on evidence that did not exist. Nothing
  reached `/data`, but only because the writes had not happened yet.
  The operational consequence: before writing an approved line, **re-read the claim it
  rests on in the file**. If the file does not support it, the line is held and the owner
  is told which claim is missing — an approval cannot make an unsourced claim sourced.

- **Product questions go to the owner and are never decided unilaterally.** Scope, tone,
  what counts as a gym, what a rule should be: those are the owner's. Implementation
  detail is not.
- **Verification on the deployed URL is part of done**, and it is the owner's step —
  because it is the one check that needs a human with a real browser on a real device.
  Local green is necessary and not sufficient (§8). Claude Code can drive a headless
  browser against the deployed site and should, but that does not replace the owner
  looking at it: the iOS Safari toolbar covering a bottom-fixed button is exactly the
  class of defect no headless run reproduces.
- **A wave that has slipped runs clean and alone.** Wave 2 was deferred twice while
  batches around it grew, and the fix was to give it a whole turn with nothing in front of
  it. A harvest is not a task that fits in the gaps between other tasks: it needs the
  probe, the geocode, the scope judgements and a findings doc, and half-running it produces
  a report nobody can cherry-pick from. **When something has slipped twice, it stops
  sharing a batch.**
- **Interrupts are legitimate, and they jump the queue.** A deployed regression or a data
  discrepancy spotted mid-batch should be raised immediately rather than saved for the next
  round-trip — the scroll-to-top bug and the EvolvE $22/$129 mismatch were both caught this
  way, and both were live on the site while the batch that would have found them was still
  running. This is the one exception to "one consolidated message per round-trip": **a
  wrong number in front of a reader outranks batching.**
- **When a correct change turns an assertion red, suspect the ASSERTION first.** This has
  now happened roughly ten times, always the same shape: a check pinned the day's data
  rather than the rule. `tabs.length === 3` (a fourth tab was correct), "merges NOTHING at
  the default zoom" (the rule is 80%), "no +N labels" (which outlawed the format the spec
  requires), `expect('anderson', [one slug])` (three matches were correct), "every card
  visible after Clear filters" (chains collapse), `class="card"` matched as a whole
  attribute (cards gained a state modifier), the Gold's two-slug list (a third club
  opened). **Ask "is this asserting the invariant or the inventory?" before touching the
  code the check is complaining about.** An assertion must pin the rule.
- **A deployed check must poll past the deploy lag.** Cloudflare Pages trails CI by up to a
  minute or two, and a smoke run fired immediately after a green CI reads the PREVIOUS
  build. That is how a stale page once reported as a successful verification. Poll until
  the change is actually visible on the served page — a cache-busting query and a loop —
  and never report a deployed check that read the old build.
- **Measure before fixing.** Reproduce a reported bug and confirm the mechanism before
  changing code; report honestly when it does not reproduce, and say what was checked.
- **Nothing pushes red.** `npm run verify` green is a gate, not a suggestion. If a check
  fails and the check is wrong, **the fix lands in the same commit or before it — never
  after the push.** Writing a bad assertion and pushing past a failing one are two
  different mistakes, and the second is the one that puts a broken `main` in front of a
  deploy.
- **An assertion must pin the rule, not the day's data.** Several checks in this repo were
  written against a fact that later changed legitimately — "nothing merges at any zoom",
  "all cards visible after Clear filters" — and each had to be rewritten to assert the
  invariant instead. Prefer the invariant.

---

## 10. Phase 2 (not v1 — recorded so v1 does not foreclose it)

Nothing here gets built, or partially built, in v1. It is written down so that v1's
data model stays compatible with it.

**Promoted out of this section and shipped in v1:** the **compare view** (§4) and
**class-pack pricing for studios** (§1, §3). Both were originally out of scope; both were
pulled forward because the data made them necessary rather than because they were nice to
have. `price_history` remains the groundwork for the deals feed below.

- **Deals feed + price-drop email alerts + price history charts**, built on scrape diffs;
  potential promo-placement revenue layer once traffic exists.
- **Monetization plumbing is planted, not built.** `intro_offer_url` (null) and
  `listing_tier` ("standard") sit on every gym costing nothing, so the day a
  disclosed offer link or an enhanced listing exists the data model does not
  have to change underneath a live site. The invariant they inherit is the one
  stated on `/for-gym-owners`: **money never moves a price or a ranking.** A
  populated `intro_offer_url` renders as a clearly-labelled disclosed link and
  changes no ordering; `listing_tier` has no rendering effect at all today.
  Note the copy rule that goes with it — promise the **invariant**, not the
  **absence**. "We will never take a referral fee" is a promise about our
  business model that a future us might have to break; "no payment alters a
  listed price or a ranking" is a promise about the product, and it is the one
  that actually protects the reader.
**Deliberately DECLINED — recorded so it is not rediscovered as a good idea:**

- **Interrogative popups and qualification surveys.** The budget/timeline
  questionnaires that competitors interrupt visitors with (gympricing's model)
  are declined on two grounds that are both load-bearing here. They clutter a
  page whose entire value is answering one question fast, and they collect
  personal intent data — which is the asset such a survey exists to sell, and we
  have told visitors in the FAQ that we collect and sell nothing about them.
  A site that says "no personal information collected or sold" cannot also ask
  what your budget is. Feedback stays a `mailto:` and, later, a static
  `/feedback` page.

**Recorded for later:**

- **Founder Campaign (launch week).** A coordinated email to the solo-founder and
  independent gyms surfaced by the discovery sweep, sent **personally by the
  owner** during launch week, **after** their pages are live on the real domain.
  Nothing is built until the discovery harvest lands and those pages exist.

  The frame is a **value-grant, not a favour-ask**, and one rule makes that true
  rather than merely stated: **every sourceable gym is listed regardless.**
  Listing is never contingent on a reply, a tag, a link, or anything else. A
  directory that quietly lists you better for promoting it is a directory whose
  rankings are for sale, which is the thing §4 and `/for-gym-owners` promise we
  will never be.

  The email says three things, in this order: (1) you are listed on
  austingymprices.com, here is your page; (2) anything wrong, correct it by
  reply; (3) **separately and voluntarily** — we are launching on Instagram at
  @austingymprices, and if the listing is useful to you, a tag would mean a lot.
  The third point is an invitation **after the fact**. It is never a condition,
  never a trade, and never phrased as one.

  Targeting: independents first; big-box chains excluded — they have marketing
  departments and no founder to write to.

  When triggered, build: extend `scrapers/discover.py` to extract contact emails
  where they are findable, and generate `docs/founder-campaign.html` as outreach
  round two — one row per gym, detail-page URL, contact address, and **one
  honest shared template** personalised only by gym name and page link.
  **No AI-generated per-gym flattery**: a paragraph of machine-written warmth
  about a gym nobody visited is a lie told at scale, and it reads as one. The
  owner sends every message.

- **Gym-owner portal.** The "claim your listing" surface: an authenticated owner
  correcting their own prices, uploading photos, and managing the media feed below.
  `listing_tier` is its free/enhanced hook, planted empty. Inherits every **[phase-2]**
  rule in §8 the day it arrives — RLS default-deny, server-derived identity, rate limits
  on every write path.
- **LLM-assisted pricing-URL discovery.** The goal is bigger than a scraper
  enhancement: **remove manual URL-hunting and verification from the owner's hands
  wherever confidence is high.**

  The pipeline: pull each gym's **sitemap**, combine it with our accumulated
  **known-dead** and **known-good URL lists**, hand the candidate set to a **cheap Haiku
  call that classifies which URL is the pricing page**, and let **Firecrawl fetch only
  the winner**. One model call and one credit per gym, instead of a path-guessing
  heuristic and a human.

  This exists because the discovery sweep's most expensive lesson was that
  **"consult-gated" verdicts were mostly wrong-URL verdicts.** [solidcore] publishes its
  full price list at `/membership-perks?siteId=…`, which no path list would ever reach,
  and Barry's, CorePower and Studio Three were all written off from guessed or root URLs.
  A model reading a site's own sitemap finds what `/pricing`, `/rates`, `/join` cannot.

  **Three guardrails, from day one, not added later:**

  1. **Low-confidence classifications queue for human review. They never ship.** The
     model proposes a URL; it does not decide that a page is authoritative.
  2. **The pipeline is allowed to fail into "call for pricing" — never into a guess.**
     That is the constitution, not a preference. An unpriced gym is a gap; a wrong price
     is the failure this site exists to prevent, and an automated pipeline that guesses
     produces wrong prices at a rate no human ever could.
  3. **Auto-harvested rows carry a sourcing tag distinct from human-verified**, so
     **"verified" keeps its meaning** if a gym owner ever challenges a price. When
     someone asks "who checked this", the answer must not be ambiguous. Expect a
     `data_source` value alongside `scrape` / `manual` — the schema already carries the
     field, and §3's rule that `verified_date` is a public claim applies unchanged.

- **Barbell brand mark** — a minimal horizontal barbell (a bar with two plates)
  as an underline accent beneath the wordmark, and possibly a flanking treatment
  in the hero only. **Launch polish, not v1.** The header wordmark and the
  favicon "A" do not change: the favicon is sized so its counter survives at
  16px, and a barbell at that size is a grey smudge. Any mark that cannot hold
  up at 16px belongs beside the wordmark, never inside the icon.
- **Gym-owner media feed** — an Instagram-style scrollable strip of photos and short
  video on each gym detail page, uploaded by the gym owner. Ships **with the owner
  portal**, not before: it is owner-published content, so it needs an authenticated
  owner identity, moderation, and storage before a single pixel of it renders.
  Recorded now so v1 does not foreclose it — v1's `photo` field stays a single
  string and gains nothing speculative, and the detail page keeps the vertical
  room below the photo where a strip would go. Inherits every **[phase-2]** rule in
  §8, plus the obvious ones a media upload path adds: server-side MIME and size
  validation, re-encoding rather than trusting the uploaded bytes, EXIF stripping,
  and serving from a separate origin so a malicious upload cannot execute against
  ours. **Not built in v1, not partially built in v1.**

The `price_history` array in §3 is the v1 groundwork for the deals feed: it costs nothing now, and
without it from day one the charts would have no back-catalogue to draw. Everything else
this implies — accounts, email capture, a write path — remains firmly out of v1 per §1,
and inherits every **[phase-2]** security rule in §8 the day it arrives.
