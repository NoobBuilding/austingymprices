# Downtown wave — probe and report

**Nothing here is written to `/data`.** Every figure is a PROPOSAL carrying the sentence
around it, for the owner to cherry-pick. A dollar sign is not a price, and this wave
proves that again below.

Run against the **29 downtown-BUCKETED keeps** in `docs/discovery-triage.md`.
Geocoded first, then probed — bucket-drift is the entire reason that order matters.
Robots.txt checked before every fetch, honest User-Agent, one request per URL, spaced.

---

## 1. The headline: the downtown bucket is mostly not downtown

Of the 29 bucketed keeps, **11 were already settled** (4 listed, 7 in the recheck
ledger), leaving **18 open**. Of those 18:

> **4 are actually in Downtown. 14 drifted. That is 78%.**

| Where they really are | Candidates | |
|---|---|---|
| **South / SoCo** | 8 | drifted |
| **East Austin** | 4 | drifted |
| **Downtown** | 4 | — |
| **The Domain** | 2 | drifted |

The circle did exactly what `docs/circle-overlap-findings.md` predicted. Its 4,400 m
radius is centred on the centroid of our own downtown-assigned pins, which sits east and
south of the real downtown — so South Lamar, Bouldin and East 6th addresses fall in. Two
candidates bucketed "downtown" are at **78753 and 78758**, which is north Austin, eight
miles away.

Wave 2 measured bucket drift at 42% city-wide. **Downtown's is 78%** — the worst of any
bucket, which is what the owner suspected and why this queue was re-binned as it ran.

**The operational consequence: this wave adds almost nothing to Downtown coverage.**
Downtown sits at 12/17. Only four of these candidates could ever move it, and of those
four, three publish no price at all.

---

## 2. What is actually worth writing

Five candidates carry a real, standing, adult-buyable figure. **None of them is in
Downtown.**

| Candidate | Real region | Figure worth having | Why it counts |
|---|---|---|---|
| **SoLa CrossFit** | South / SoCo | **$255/mo unlimited**, $215/mo 12x, $180 8-class punch, $100 4-class punch, **$30 drop-in** | The richest read of the wave — a full rate card, standing, no promo framing |
| **sharpbody Pilates** | East Austin | **$350 1-month unlimited, no commitment**, $42 drop-in, $125 5-pack | Standing monthly plus a pack; the $55 "2 classes" is new-client only |
| **CrossFit Uncommon** | The Domain | **$225/mo unlimited CrossFit** | Standing. PT tiers ($400–$1,200, $400–$2,500) are add-ons and are ignored per the PT rule |
| **ATX PILATES** | South / SoCo | **$148/mo Foundation 4** (about 1×/week) | A standing membership tier; $99 and $42 are intro offers and must not lead |
| **Gracie Humaitá Austin** | South / SoCo | **$30 adult drop-in** | Passes the Old Guard test — an adult can actually buy. No membership rate published; the $10 is gi rental, not a price |

---

## 3. What the probe found that is NOT a price

The precedent has now stopped **eight more fake prices in one wave**, and it decided
whether four businesses were listable at all.

| Candidate | The figure | What it actually is |
|---|---|---|
| **Mōtiv Fitness** | $3 / $10 / $15 | Cycling-shoe rental, a **late-cancellation penalty**, and a **no-show penalty**. Not one standing price on the page. The triage sampled exactly these three and called it SCRAPEABLE |
| **VITA Well Pilates** | $5 / $15 | **Cancellation fee** and **no-show fee**. Both of its sampled figures |
| **BE Fit Modern Pilates** | $25 | **Late-cancellation/no-show fee** for unlimited members |
| **AKT** | $59 | An intro offer **for AKT Brier Creek, Raleigh, North Carolina** — another club's promo on a shared brand site. The Venice trap, on a page reached from an Austin listing |
| **STRONG Pilates** | $39 | A **7-day intro offer**. The standing rate is not published on the club page |

**AKT is the one to note.** The page fetched from an Austin candidate's URL served a
North Carolina club's promotion, and a numbers-only reading would have written $59
against an Austin row. That is the same failure as Gold's `/join/` rendering Venice, and
the same as the two source-URL defects fixed yesterday — a page looking like it is about
the club whose URL reached it, and not being.

---

## 4. Every open candidate

Ordered scrapeable-first, as run. **(a)** is region truth, **(b)** is chain membership.

| Candidate | (a) Actually in | (b) Chain | Probe | Standing price? |
|---|---|---|---|---|
| Gracie Humaitá Austin | **South / SoCo** _(drifted)_ | `gracie-humaita` — **new key**, affiliation network | PRICES-FOUND | drop-in only, $30 |
| Mōtiv Fitness | **South / SoCo** _(drifted)_ | independent | PRICES-FOUND | **no** — fees only |
| VITA Well Pilates Studio | **South / SoCo** _(drifted)_ | independent | PRICES-FOUND | **no** — fees only |
| AKT | **East Austin** _(drifted)_ | `akt` — **new key**, national franchise | PRICES-FOUND | **no** — another club's promo |
| ALIGN Pilates Studios West | Downtown (Clarksville) | independent | NO-PUBLISHED-PRICE | no |
| ATX PILATES | **South / SoCo** _(drifted)_ | independent | PRICES-FOUND | **yes — $148/mo** |
| BE Fit Modern Pilates | **South / SoCo** _(drifted)_ | `be-fit-modern-pilates` — **new key**, `/tx/south-lamar` path implies siblings | PRICES-FOUND | **no** — fee only |
| CrossFit Uncommon | **The Domain** _(drifted)_ | independent | PRICES-FOUND | **yes — $225/mo** |
| Easley Boxing and Fitness | **South / SoCo** _(drifted)_ | independent | NO-PUBLISHED-PRICE | no |
| Gracie Barra South Austin | **South / SoCo** _(drifted)_ | `gracie-barra` — **new key**, international franchise | NO-PUBLISHED-PRICE | no |
| Haus of B. Pilates | Downtown (Clarksville) | independent | NO-PUBLISHED-PRICE | no |
| Olga Roberts Studio | **Downtown core** (78701) | independent | NO-PUBLISHED-PRICE | no — walla widget |
| Pure Pilates Austin | **The Domain** _(drifted)_ | independent | NO-PUBLISHED-PRICE | no |
| Ritual Moves Pilates | **East Austin** _(drifted)_ | independent | NO-PUBLISHED-PRICE | no |
| STRONG Pilates | Downtown (Clarksville) | `strong-pilates` — **new key**, international franchise | PRICES-FOUND | **no** — intro only |
| SoLa CrossFit | **South / SoCo** _(drifted)_ | independent | PRICES-FOUND | **yes — $255/mo** |
| Urban Lagree - East Austin | **East Austin** _(drifted)_ | independent | NO-PUBLISHED-PRICE | no |
| sharpbody Pilates | **East Austin** _(drifted)_ | independent | PRICES-FOUND | **yes — $350/mo** |

### Chain keys this wave would add

Downtown is chain-dense and the census should absorb these. **Five new brand keys** are
implied, none of which exists today: `gracie-barra`, `gracie-humaita`, `akt`,
`strong-pilates`, `be-fit-modern-pilates`. Whether each is genuinely one chain or a
loose affiliation is a product call and is the owner's — Gracie Barra is a formal
franchise, Gracie Humaitá is a lineage affiliation, and those are not the same thing
even though both would fold rows in the list.

### Two triage flags resolved

`CrossFit Uncommon` and `SoLa CrossFit` were both carried with "⚠︎ possibly already
listed as *CrossFit Austin*". **Both are distinct businesses** — CrossFit Austin is at
8708 S Congress, Uncommon at 208 W Powell Ln and SoLa at 2119 Goodrich Ave. No address
collides with any listed row.

---

## 5. Already settled — not re-probed

For completeness, so the 29 reconciles.

**Listed (4):** CrossFit 2024 · Generator Athlete Lab · soFly Social · 10th Planet
Jiu Jitsu Austin (bucketed as "10th Planet Austin").

**In `docs/recheck-ledger.md` (7):** Austin Fight Team _(excluded — pure PT)_ ·
Forge Strength _(excluded — pure PT)_ · Evolution Pilates & Flow · Inner Diva Studios ·
Mesa Rim Climbing Center · Renzo Gracie Austin · Shine Hot Pilates + Sculpt.
The last five are **pending human reads, not exclusions** — Mesa Rim and Shine Hot in
particular are one browser read from being listable.

---

## 6. The Downtown unpriced tail — what unblocks each

Downtown stands at **12 of 17 priced**. Here is the whole tail, by what actually
unblocks it. **The answer to the F45/PF question is that there are none here** —
see the note below the table.

| Row | State | What unblocks it | Exact URL to open |
|---|---|---|---|
| **Gold's Gym Downtown** | not-published | **Browser read.** Automated checks time out and the join flow 500s. The club page below is confirmed live and self-identifies as 115 E. 6th St | <https://www.goldsgym.com/austin-downtown/> |
| **Equinox Austin (SoCo)** | not-published | **Genuinely not published** — consult-gated by policy, and stays listed in the call-for-pricing state permanently if need be. Only owner contact changes it | <https://www.equinox.com/clubs/texas/austin> |
| **Barry's Austin** | not-published | **Genuinely not published** — class-pack model, no membership rate anywhere. Studio page is JS-rendered | <https://www.barrys.com/studios/austin/> |
| **Generator Athlete Lab** | awaiting | **Browser read.** Day passes and packs are published ($75, five for $325, ten for $550); the monthly membership rate is not | <https://www.generatorathletelab.com/recovery> |
| **Restore Hyper Wellness South Lamar** | not-published | **Browser read.** Withdrawn yesterday — its figures came from the Round Rock club. The locations index is JS-rendered and obvious URL patterns 404, so the real club page has to be found by hand | <https://www.restore.com/locations> |

### Held on a single figure

| Row | Region | Held on |
|---|---|---|
| **Studio Three** | **Downtown** | Enrollment **and** annual fee both unpublished, so the headline renders as a floor (`$X+`). One read of the buy page settles it | <https://studiothree.com/buy> |
| Gold's Gym Burnet | Hyde Park | Annual fee only — renders `$35+` today | <https://www.goldsgym.com/austin-burnet/> |
| Gold's Gym South Central | South / SoCo | Annual fee only — renders `$35+` today | <https://www.goldsgym.com/austin-south-central/> |

### The F45 / Planet Fitness answer

**No F45 or Planet Fitness club is in the Downtown unpriced tail.** The only Downtown
F45 — Hilton Downtown — is already priced, and Planet Fitness has no Downtown club at
all. Every remaining F45/PF browser read belongs to another region. They are listed here
anyway, with verified URLs, because they are the bulk of the citywide browser queue.

**F45 — 9 clubs, slugs verified against F45's own studio directory.** Six pages carry
their Austin street address in the HTML; three render it client-side but their page
titles match the club.

| Club | Region | URL | Confirmed by |
|---|---|---|---|
| Brodie Lane | South / SoCo | <https://f45training.com/brodielane> | 9911 Brodie Ln #300, Austin TX 78748 |
| South Lamar | East Austin | <https://f45training.com/southlamar> | 2153 S Lamar Blvd, Austin TX 78704 |
| South Shore Austin | East Austin | <https://f45training.com/southshoreaustin> | 1604 E Riverside Dr, Austin TX 78741 |
| North Shoal Creek | Hyde Park | <https://f45training.com/northshoalcreek> | 3301 Steck Ave, Austin TX 78757 |
| Jollyville | The Domain | <https://f45training.com/jollyville> | 7318 McNeil Dr, Austin TX 78729 |
| Hilton Downtown _(already priced)_ | Downtown | <https://f45training.com/hiltondowntownaustin> | 500 E 4th St, Austin TX 78701 |
| Domain Austin | The Domain | <https://f45training.com/domainaustin> | title only — address is JS-rendered |
| Soco Lab | East Austin | <https://f45training.com/socolab> | title only — address is JS-rendered |
| Westlake | South / SoCo | <https://f45training.com/westlake> | title only — **and F45 has several "Westlake" studios worldwide, so confirm the address on open** |

**Two F45 rows could not be resolved, and that is itself a finding.**
**Bull Creek** and **Kings Village** appear nowhere in F45's studio directory.
`f45training.com/bullcreek` is a hard 404; `bullcreekaustin` and `kingsvillage` return
HTTP 200 but render an empty shell with no club name — a soft 404, and a soft 404 is a
404. Both may be closed. Worth a browser confirm before they keep sitting as `awaiting`
placeholders; if closed they belong in the recheck ledger, not the list.

**Planet Fitness — 7 clubs, and they stay a bot wall.** PF returns 403 behind a
Cloudflare challenge on both its locator and its club pages, so §6 says stop, and these
URLs were **not fetched or verified**. Only E. Riverside's is known-good, from its own
stored record; the rest are addresses for you to search from PF's locator in a real
browser, where the wall does not apply.

| Club | Region | Address to search | URL |
|---|---|---|---|
| E. Riverside | East Austin | 2025 E Riverside Dr | <https://www.planetfitness.com/gyms/austin-e-riverside-tx> _(known-good)_ |
| 1100 W Anderson Ln | Hyde Park | 1100 W Anderson Ln | search from <https://www.planetfitness.com/gyms> |
| 12611 N Mopac Expy Ste 3 | The Domain | 12611 N Mopac Expy Ste 3 | search from locator |
| 13729 N Hwy 183 Unit 1200 | The Domain | 13729 N Hwy 183 Unit 1200 | search from locator |
| 1807 W Slaughter Ln | South / SoCo | 1807 W Slaughter Ln | search from locator |
| 6425 I-35 Ste 200 | South / SoCo | 6425 I-35 Ste 200 | search from locator |
| 6800 West Gate Blvd Ste 106 | South / SoCo | 6800 West Gate Blvd Ste 106 | search from locator |

Note the standing rule that applies the moment a PF figure arrives: **one club's promo
never propagates.** E. Riverside's read is itself a promotional state and is held pending
a standing annual fee; it cannot seed any of the other six.

---

## 7. What this wave says about the queue

The scrapeable seam through the 92 keeps is now **worked out for this bucket**. Of 18
open candidates, 10 published nothing readable and 5 published only fees or another
club's promo. **Three genuinely new rate cards** came out of it — SoLa CrossFit,
sharpbody and CrossFit Uncommon — plus ATX Pilates' entry tier and one adult drop-in.

None of them helps Downtown, and that is the finding, not a disappointment: Downtown's
remaining gap is **five named rows**, four of which are one browser read each and one of
which (Equinox) is a policy, not a gap.
