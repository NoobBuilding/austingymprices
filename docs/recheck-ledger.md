# Recheck ledger

Gyms deliberately **not** listed, and the condition under which that should be
revisited. Recorded rather than deleted so nobody rediscovers them as finds.

| Business | Why excluded | Recheck when |
|---|---|---|
| **JETSET Pilates Austin Arboretum**<br><sub>10000 Research Blvd Ste 124 · the-domain</sub> | **Not open yet.** The pricing page states billing "will begin 30 days after the Grand Opening", and its $199 / $209 are Founders and Pre-Opening rates at "over 30% off" — promotional launch pricing, not standing rates. This is the EOS Fitness Parmer precedent in §1: a gym that has not opened ships no row and no "coming soon" placeholder. It also explains the price "variance" that first made Arboretum look like a per-studio difference. | After the Grand Opening, once standing rates replace Founders pricing. Then add as a third JETSET row. |
| **Forge Strength Austin**<br><sub>1107 S 8th St Ste F · south-soco</sub> | **Pure personal-training studio**, which §1 excludes. $999 and $1498 are 8-session PT packs (the second is the two-person rate); $129.99 buys one small-group session. No membership is published at all. Listing it would put a $124.88/session rate on the Classes tab beside F45 at $23/class. | If they ever publish a membership or open-gym rate. |
| ~~**Generator Athlete Lab**~~<br><sub>800 W Cesar Chavez St PP120 · downtown</sub> | **UN-EXCLUDED 2026-08-20 by rule 4 (§6).** It was set aside as a "recovery studio" when there was nowhere in the schema to put one. Recovery-only businesses are now in scope as `category: "recovery"`, and rule 3 narrowed the PT exclusion to businesses whose *sole* product is 1-on-1 training — which this is not: it publishes a day pass and $65/$75/$99 figures, plus sauna, infrared and red light. | **Back in the pipeline now.** Needs one read to settle `recovery` vs `classes` — it markets as an endurance-performance lab, so the question is whether recovery is the whole product or half of it. |
| **EOS Fitness Parmer** | Does not open until 2027 (§1). | 2027. |
| **FeV Iron Vault Gym**<br><sub>downtown · fevgym.com</sub> | **Excluded 2026-08-19, owner-approved.** Website entirely down; possibly closed. Never had a confirmed address or coordinates. Listing a gym we cannot reach, cannot price, and cannot confirm exists is the opposite of what the site is for. | **If the site comes back, it re-enters the pipeline** — recheck the domain periodically, and treat a live site as a normal discovery candidate rather than a restoration. |
| **Rumble Boxing South Austin**<br><sub>rumbleboxinggym.com</sub> | **Excluded 2026-08-19, owner-approved.** Two problems, either sufficient: the only figure published is an intro offer ("3 classes for $59"), and the studio the discovery probe actually found is **Southpark Meadows, outside all six region circles**. The listed row referred to a "South Austin" studio we could never locate, so it was carrying a region it had not earned. | If a Rumble studio opens inside a region circle **and** publishes a standing rate. Note robots.txt allows our own User-Agent but disallows several named AI crawlers including `CloudflareBrowserRenderingCrawler` (§6). |

## Harvested but not writable

| Business | What it publishes | Needs |
|---|---|---|
| **Mesa Rim Climbing Center**<br><sub>1205 Sheldon Cove Bldg 3 · north Austin</sub> | The page gives a **discounted** membership rate ($89/mo for military and similar), youth rates ($50/mo, ages 11–17), a $20 youth day pass and a $25 startup fee — but the **standard adult monthly rate is not in the fetched page**. | A human read, or a second look at a page section that may render client-side. Writing $89 as the headline would ship a discounted rate as a standing one. |
| **Shine Hot Pilates + Sculpt**<br><sub>117 Lavaca St · downtown</sub> | Only the **virtual** platform ($19.99/mo, $199.99/yr) and a $20 first class. The in-studio rate is not published. | Owner contact, or a human read of the booking flow. |

## Listed but still incomplete

| Gym | What is missing |
|---|---|
| **Flow Pilates ATX** | Publishes only its introductory offer ($34.99 for two classes, plus $30 off a first month). `/pricing` returns the same page — the standing membership rates are not on the site. Listed in the "call for pricing" state; needs owner contact or a later recheck. |
| **OPTML Performance** | Both tiers are published as "starting at" with no class count, so no per-class rate can be shown. |
| **The Old Guard Thai Boxing Club** | **Pin-drop received 2026-08-20** — `30.347204, -97.672021` is written and the row now draws a pin. The region question it raised is still open, and the pin sharpens it: those coordinates sit **6.2 km from the Mueller circle's centre, outside its 2,500 m radius**, and inside **hyde-park**'s (5.2 km of 9,300 m) — the only circle that contains them. The row still claims `mueller`, so selecting the Mueller chip pans the map to a frame this pin is not in. Region is a product call (§9b) and is the owner's; the Rumble precedent is the one to weigh — a row should not carry a region it has not earned. |
| **Rumble Boxing South Austin** | Proposed for exclusion — see `docs/awaiting-classification.md`. Only an intro offer is published, and the studio the discovery probe found (Southpark Meadows) is outside all six region circles. |

## Excluded 2026-08-20

| Business | Why excluded | Recheck when |
|---|---|---|
| **Los Campeones Gym South**<br><sub>9811 Vikki Terrace</sub> | **Rumble precedent.** The only resolvable location geocodes to 30.2325, -97.9265 — out toward Dripping Springs, **outside all six region circles**. Confirmed independently by the owner's own Maps read. The row was carrying `south-soco`, a region it had not earned. | If Los Campeones opens or is found to operate a location inside a region circle. The North club (6406 N I-35) stays listed and is now pinned. |
| **Equinox Domain**<br><sub>the-domain</sub> | **The location does not exist.** A Places brand sweep returns exactly ONE Equinox in Austin — 1007 S Congress Ave — and the owner's independent check agrees. The row's own `pricing_note` said "Confirm this location is open before listing," and nobody ever did. It was a phantom: a brand name with a region attached and no club behind it. Earlier pin resolution "failed" on this row by returning the SoCo club, which was the correct answer to a question with no other answer. | If Equinox announces an Austin second location. `equinox-austin-soco` remains listed, consult-gated. |

## Wave 2 outcomes (2026-08-20)

| Business | Status | Recheck when |
|---|---|---|
| **Austin Fight Team**<br><sub>700 E Live Oak St</sub> | **EXCLUDED — pure personal training, rule 3.** Every product is one-to-one with a coach: Park Session $85, ten for $750, in-home $120, ten for $1,100. No group class, no membership. The Barbells & BJJ shape exactly. | If they publish a group class or membership rate. |
| **Athletic Outcomes**<br><sub>2301-A E Riverside Dr</sub> | **Promo-only.** The only figures published are a $49 two-week start and a $99 first month on a "Mueller founding" offer capped at 30 spots. No standing rate. | **After 31 August 2026**, when the founding promo expires. They are opening in MUELLER, which makes them a genuine gap-fill for the thinnest region the moment a standing rate appears. Dated condition — do not let this one lapse. |
| **Evolution Pilates & Flow**<br><sub>3823 Airport Blvd · Mueller</sub> | No membership price published. The $10 and $15 the probe found are **late cancellation fees**, not rates. | If a rate page appears. A Mueller gap-fill if so. |
| **Renzo Gracie Austin**<br><sub>4631 Airport Blvd · Mueller</sub> | Prices behind a booking widget. | Human read. A Mueller gap-fill if it lands. |
| **Inner Diva Studios**<br><sub>10401 Anderson Mill Rd · The Domain</sub> | Prices behind a booking widget. | Human read. A Domain gap-fill if it lands. |
| **The Colosseum** | **MERGED, not excluded.** Same address and same page as Squatch Frontier Fitness — both domains serve one site titled "Squatch Frontier Fitness". It is that gym's $115 indoor-gym tier, now a plan on the Squatch row. | n/a — resolved. |

## Source-URL locality defects, found and actioned 2026-08-21

| Row | Defect | What it needs |
|---|---|---|
| **Perspire Sauna Studio North Lamar**<br><sub>4601 N Lamar Blvd #501</sub> | **The row's price was read from the wrong studio.** Both `website` and `pricing_url` point at `perspiresaunastudio.com/locations/hutto` — **Hutto**, a town ~25 miles north-east and outside all six region circles. That page names itself "Hutto" three times and publishes **$159 and $199**, which are exactly the figures carried on this Austin row. The two candidate Austin North Lamar URLs (`/tx/austin-north-lamar`, `/locations/austin-north-lamar`) return HTTP 200 but contain no price and no location text — a soft 404, or JS-rendered. | **ACTIONED — owner's ruling, 2026-08-21: fall back to unpriced (`not_published`).** Plans, day pass and day-pass detail all came from the Hutto page and were withdrawn together; `website` and `pricing_url` now point at the brand root, because the real North Lamar page is JavaScript-rendered and served no price or location text. **Recheck: a human read of the real North Lamar page — if it prices, the row returns sourced.** On the owner's browser list. |

Found incidentally by the showers probe, which reported the source URL alongside each
match. It is the **"a checkout shell carries another club's data"** precedent in a new
form: the page looked like it was about the club whose URL fetched it, and it was not.

| **Restore Hyper Wellness South Lamar**<br><sub>1100 S Lamar Blvd Ste 2114</sub> | **Same defect, found by the new validator guard.** Both `website` and `pricing_url` pointed at `restore.com/locations/tx-round-rock-tx002` — **Round Rock**, a separate city ~20 miles north. That page identifies itself as "Round Rock, TX" and publishes **$190** and **$23.75 a credit**, exactly the figures the row carried. The plan note's "usable at any Restore location nationwide" is a claim about where a membership may be SPENT, not about what it costs to buy; Restore prices per studio, with a store code in every location URL. | **ACTIONED — the owner's Perspire ruling applied to an identical case: unpriced (`not_published`).** Reversible in one line — the withdrawn figures are $190/mo for eight therapy credits at $23.75 each. The real South Lamar page could not be reached: Restore's locations index is JavaScript-rendered and the obvious URL patterns return a clean 404. **Recheck: a human read of the real South Lamar page.** |

Both were caught by the same signal and are now caught automatically: `npm run validate:data`
fails the build where a source URL names a location the row's own address does not. Run
against the pre-fix data the guard flags **2 rows across 4 fields** — exactly these two —
with **no false positives** across the other 19 location-claiming URLs on the site.
