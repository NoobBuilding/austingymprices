# Harvest findings — 2026-08-19

Human-supplied pricing URLs, harvested once each. **Nothing in this file has been
written to `/data`.** It is the review sheet; figures enter the site only after
the owner confirms them.

Method: robots.txt checked first, then a plain fetch with our honest User-Agent
(free, no credits). Firecrawl used only where a plain fetch could not reach the
content — 3 credits spent in total. Requests spaced.

Legend: **READY** = a clean figure a human can confirm · **CARE** = figure found
but the page is a parsing hazard · **BLOCKED** = bot challenge, stopped ·
**NO PRICE** = page loads, publishes no price.

---

## READY — clean figures

| Gym | Plan | Price | Fees | Commitment | Notes |
|---|---|---|---|---|---|
| **Lift ATX** | Membership | **$50/mo** + tax | **$25 one-time sign-up** | No contracts | Weekday pass $10+tax, weekend $20+tax. Discounts for military/first responders/students/educators. Cleanest page in the batch. |
| **Travis County Strength** | Regular Unlimited | **$260/mo** | — | not stated | Intro Month (unlimited) $79. First class $20. "Drop-in, weekly, 4- and 8-class/month plans also available" — not itemised on this page. |
| **Atomic Athlete** | Monthly | **$225/mo** | — | not stated | Includes 24/7 open gym, sauna, coworking, Sunday yoga. Premium **$250/mo** adds nutrition ("$50/mo value"). Drop-in **$25**. ⚠ price was HTML-escaped as `&#036; 225` — the free-pass scan missed it; decoded cleanly. |
| **YMCA Greater Austin** | Adult | **$75/mo** | Join fee **$49** (currently $0, promo) | not stated | Student $25 · Young Adult (19–26) $49 · Two Adult $105 · One Adult Household $95 · Two Adult Household $114. Promo "$0 join fee ($49 savings)" — standing join fee is $49, promo flagged not blended. |
| **Black Swan Yoga** | Single Month | **$128/mo** | — | No commitment, no refunds | Annual auto-draft **$975/yr** ("select cities" — confirm Austin qualifies). Donation drop-in **$15 suggested**. BSY.tv $100/yr is online-only, not the studio. |
| **Korrect Fitness** | Core, month-to-month | **$199/mo** | **$50 every Apr 1 + Oct 1** (=$100/yr) | **2-month minimum** | Core 12-month $149/mo · Core paid-in-full $109/mo. Essential $299 / $249 / $209. Optimized from $499. 2-week trial $99. ⚠ see CARE note below. |
| **Grassiron** | Weightlifting/Powerlifting, 1 class/wk | **$119/mo** | — | not stated | 2/wk $229 · 3/wk $319 · 10-pack $285 · single class $35. Personal training 30-min: 1/wk $239, 2/wk $439, 3/wk $629, single $65. 60-min from $299, 3/wk $799, single $80. **No open-gym membership is published** — the cheapest recurring option is a class membership, which is an owner call for the default plan. |
| **F45 Downtown** | Unlimited M2M autopay | **$245/mo** | — | month-to-month | Owner-captured, not scraped. Packs: 5 classes $135 · 10 classes $250 (2-mo expiry) · 20 classes $460 (3-mo expiry). Week pass $90 · drop-in $35 · Hyrox drop-in $20 · 7-day local trial $20. Source: "F45 booking widget, captured 2026-08-19". |

## CARE — found, but the page is a parsing hazard

| Gym | What was found | Why it needs eyes |
|---|---|---|
| **Korrect Fitness** | Every price is preceded by a stray `$179` — e.g. `$179 $199 per month`, `$179 $149 per month`, `$179 $109 per month`, and also `$179 starting at $209`, `$179 $299`. | `$179` appears before prices belonging to *different* tiers, so it is almost certainly a UI artefact (a strikethrough/compare-at or a template default), not a real price. This is the same class of defect as Crunch's `$3699` and Crux's `**$32** **0**`. **Do not ship $179 as any plan's price without confirming on the live page.** The tier figures themselves look internally consistent. |
| **Orangetheory** | `12 Month $149/mo (save $40/mo)` · `6 Month $169/mo (save $40/mo)` · `Month to Month $179/mo` · `Elite $119/mo` · a `$69/mo` tier · promo scaffolding `$129 1ST MO / $179 /MO AFTER`. | Figures are duplicated and interleaved in the markup (`$ 179.00 $ /mo.` repeated dozens of times), and tier names are not reliably adjacent to their numbers. Also: this is the **brand** page — Orangetheory states elsewhere that studios are individually owned and "prices do vary". Treat as unconfirmed for any specific Austin studio. |
| **Life Time South Lamar** | JSON payload: `startingPrice: 339`, `joinFee: 300`. | **More than we had** — it exposes a $300 join fee alongside the "starting at" rate. Two cautions: the surrounding key is `alt-base-club-template`, so the value may be a template default rather than this club's; and **South Lamar may be a different club from our existing `life-time-south`** (ours sits at 30.2153, −97.8394, near Sunset Valley/Brodie). Possible new row — see ledger. |

## BLOCKED — stopped, per the Gold's precedent

| Target | What happened |
|---|---|
| **Planet Fitness E. Riverside** `/offers` | **HTTP 403**, Cloudflare managed challenge (`Just a moment…`, 7× `_cf_chl_opt`). Stopped. The URL *does* confirm the slug guess `austin-e-riverside-tx` was right. |
| **Gold's Gym Downtown** `/join/` | Page **loads fine on a plain fetch** (HTTP 200, 262 KB) — the earlier "refuses automated access" verdict was wrong for this path. But it is a **checkout shell**: plan prices are not in the HTML (only `$0.00` cart placeholders and `PLAN EDIT Passport Gold Plus`), and the flow contains **"Please verify that you are not a robot."** Stopped there. |
| **[solidcore]** (3 studios) | Cloudflare managed challenge on every path including `/robots.txt`. Not attempted. |

## NO PRICE — page loads, publishes nothing

| Target | Finding |
|---|---|
| **24 Hour Fitness** `/salez24/membership` | **Soft 404** — HTTP 200 but the page title is `404 | 24 Hour Fitness`. The URL is dead, so no param/flow variation will help. A correct URL is needed. |
| **Barry's Austin** `/studio/austin` | Real studio page (Firecrawl, 14 k chars). Contains only a link labelled *"explore our packs and memberships"* — **no figures anywhere on the page**. |
| **Studio Three** `/buy/?_mt=…` | Real "Buy" page (Firecrawl, 3.5 k chars) but it is a booking-widget shell; prices load behind further interaction. No figures. |
| **CorePower** `/content/buy` | In-studio membership is **"Starting at only $99"** behind a **SELECT STUDIO** gate — no Austin figure. At Home membership $19.99/mo promo (standing **$49/mo**, code ATHOME19) is online-only, not the studio. Class packs $18 single / $75 per 5 are livestream. Freeze $15/mo. |
| **Rumble Southpark Meadows** | Only an intro offer: **3 classes for $59**. No membership rate published. Also: Southpark Meadows is far south — **outside our 7 regions** on current boundaries. |

---

## Counting toward the ≥33 launch threshold

Confirmed standing prices today: **14** of 43 gyms.

If every **READY** row is approved, that is **+8** (Lift ATX, Travis County,
Atomic, YMCA, Black Swan, Korrect, Grassiron, F45) → **22**.
Adding both **CARE** rows that could resolve to a real figure (Orangetheory,
Life Time South Lamar) → **24** at best.

**That leaves us ~9 short of 33.** The gap is not a harvest failure — it is
structural: the remaining unpriced gyms are boutiques and franchises that
genuinely do not publish a monthly rate, plus three sites behind bot
challenges. Closing it needs outreach replies or owner transcription, not more
scraping.
