# Chain-branch enumeration — F45, Anytime Fitness, Planet Fitness

Deliverable for the friends-and-family listed-count phase. **16 branch placeholder rows
created**, unpriced, under chain keys.

## The premise did not hold: the brand locators are WORSE than Places

The brief was that the locator is the census and Places is not, on the evidence that
Places capped Anytime at 3 against a known 11+. I walked all three locators properly and
the opposite turned out to be true here:

| Brand | Own locator | Places, multi-circle |
|---|---|---|
| F45 | `/find-a-studio` exposes **3** Austin slugs; `/studios/texas/austin` is a 404 | **18** found, 11 in-circle, with addresses |
| Anytime Fitness | sitemap.xml lists **5** Austin club URLs — each club page is JS-rendered with **no address in the HTML** | **9** found, 3 in-circle, with addresses |
| Planet Fitness | **HTTP 403, Cloudflare challenge** on both the locator and club pages — a bot wall, so I stopped (§6) | **10** found, 7 in-circle, with addresses |

The earlier undercount was not Places failing; it was **one query against a 20-result
cap**. Running one text search per region circle — the technique that found 115 recovery
businesses — beats the cap without going near a wall. Anytime went 3 → 9 that way.

So the honest correction: **Places with dispersed queries is the census here.** The
locators are either walled, JS-rendered, or thinner than the API.

## What was found, and what is new

### F45 Training — 11 in-circle

| Address | Region | Status |
|---|---|---|
| 500 E 4th St | downtown | already listed (`f45-downtown`) |
| 1604 E Riverside Dr | east-austin | **new row** |
| 2153 S Lamar Blvd | east-austin | **new row** |
| 3601 S Congress Ave Bldg E | east-austin | **new row** |
| 3301 Steck Ave #104 | hyde-park | **new row** |
| 6203 N Capital of Texas Hwy | hyde-park | **new row** |
| 3201 Bee Caves Rd #134 | south-soco | **new row** |
| 9911 Brodie Ln #300 | south-soco | **new row** |
| 1701 W Parmer Ln Ste 107 | the-domain | **new row** |
| 3220 Amy Donovan Plaza Ste 124 | the-domain | **new row** |
| 7318 McNeil Dr #106 | the-domain | **new row** |

### Anytime Fitness — 3 in-circle

| Address | Region | Status |
|---|---|---|
| 2525 W Anderson Ln. | hyde-park | already listed |
| 7300 Fm 2222 #208 | hyde-park | already listed |
| 8516 Anderson Mill Rd | the-domain | already listed |

### Planet Fitness — 7 in-circle

| Address | Region | Status |
|---|---|---|
| 1819 S Pleasant Valley Rd | east-austin | already listed (`planet-fitness-e-riverside`) |
| 1100 W Anderson Ln. | hyde-park | **new row** |
| 1807 W Slaughter Ln | south-soco | **new row** |
| 6425 I-35 Ste 200 | south-soco | **new row** |
| 6800 West Gate Blvd Ste 106 | south-soco | **new row** |
| 12611 N Mopac Expy Ste 3 | the-domain | **new row** |
| 13729 N Hwy 183 Unit 1200 | the-domain | **new row** |

**Anytime Fitness produced no new rows** — all three in-circle clubs were already
created in the earlier restructure. Its 11+ figure counts the whole metro; only three
fall inside our circles.

## Sourceability per brand

**F45 — needs a human read per club.** Studios quote through a booking widget rather than
publishing a rate, and rates are set per studio. Our own Hilton Downtown row has carried
no price for exactly this reason. Ten clubs, ten reads.

**Planet Fitness — bot-walled, and the E. Riverside read does NOT transfer.** The brief
suggested branches would reuse that read modulo verification. They cannot, for two
reasons: the read is itself **held** pending a standing annual fee (the $0 is a promo
expiring 30 August), and PF club rates vary by location — the $10 Classic is national but
the startup fee and Black Card pricing are not uniform. Reusing it would propagate one
club's promo across six. Each needs its own read, and the brand is a 403 wall to
automation, so all six are owner-browser work.

**Anytime Fitness — enquiry-form only.** No club publishes a rate; unchanged.

## Effect on the ledger

Listed rows go **79 → 95**; priced stays **57**. Coverage as a ratio falls from 72% to
60%, which is the arithmetic working correctly rather than anything getting worse — the
rows are real Austin gyms we can honestly say exist and cannot yet price. Worth stating
plainly since the friends-and-family phase is judged on listed count and the launch gate
is judged on coverage, and these two now pull in opposite directions.

