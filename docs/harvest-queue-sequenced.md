# Harvest queue — the 92 keeps, sequenced by region thinness

Pulled forward from post-launch. **Nothing here has been written to `/data`** — each
wave produces a findings report and the owner cherry-picks (§9b).

## Why this order

Sequenced so the harvest fills the emptiest parts of the map rather than adding mass
to the parts that are already dense. Current coverage, worst first:

| Region | Priced | Coverage | Keeps in this bucket |
|---|---|---|---|
| The Domain | 2/4 | 50% | 13 |
| Mueller | 2/3 | 67% | 8 |
| Hyde Park | 7/10 | 70% | 16 |
| Downtown | 10/13 | 77% | 29 |
| East Austin | 8/10 | 80% | 11 |
| South / SoCo | 9/11 | 82% | 15 |

**Read the bucket column with the §6 caveat.** These are the discovery pipeline's
*nearest-search-circle* assignments, not regions — the downtown circle is 4.4 km and
its centre sits east of downtown, so East 7th and Springdale addresses land in it. Of
four gyms written from that bucket in an earlier batch, **two geocoded into**
**east-austin**. A row's real region is settled at geocoding time, which means
**sequencing by bucket is a proxy, not a guarantee**: harvesting the Domain bucket
raises Domain coverage on average, not by construction. Geocode early in each wave so
the wave can be re-aimed if the addresses land elsewhere.

Within each wave, **SCRAPEABLE first**: it costs Firecrawl credits rather than owner
time, and a scraper failure is recoverable in a way a wasted human read is not.

## Wave 1 — the two thinnest regions

**21 businesses — 10 scrapeable, 11 human-read.**

### Scrapeable — a scraper target each

| Business | Bucket | Sample prices seen |
|---|---|---|
| AMLI Branch Park | Mueller | $1 $2 $3 |
| ATX Tactics | Mueller | $100 $116 $129 $1400 $150 |
| Austin Gymnastics Club | The Domain | $10 $140 $170 $20 $75 |
| Grounded Performance ATX | The Domain | $ 10 $1 $180 |
| OTL Fitness | The Domain | $195 $20 $235 $275 $30 |
| Pronto Pilates Arboretum | The Domain | $25 $5 $50 $99 |
| Solomon | Mueller | $25 $30 $300 |
| Texas Barbell Club | Mueller | $549.00 $65.00 |
| Thinkery | Mueller | $125 $160 $195 $230 $265 |
| Ying Yoga Pilates - Austin | The Domain | $100 $1030 $108 $136 $138 |

### Human-read — booking widgets, owner or browser

| Business | Bucket | Sample prices seen |
|---|---|---|
| Austin Barbell Club (North) | The Domain | — |
| Brass Ovaries | Mueller | — |
| MACA Martial Arts | The Domain | — |
| North Austin Strong | The Domain | $10 |
| PURE Yoga Texas | The Domain | — |
| StretchLab Mueller | Mueller | $5 |
| UpReach CrossFit | The Domain | — |
| Vigor Pilates | The Domain | — |
| We Rock The Spectrum - North Austin | The Domain | — |
| Yoga East Austin | Mueller | $59 |
| Yoga Pod Austin | The Domain | $40 |

## Wave 2 — Hyde Park

**16 businesses — 10 scrapeable, 6 human-read.**

### Scrapeable — a scraper target each

| Business | Bucket | Sample prices seen |
|---|---|---|
| CrossFit REP | Hyde Park | $ 149 $ 189 $ 219 $ 25 |
| Danzversity | Hyde Park | $100 $150 $20 $360 $69 |
| Dell JCC | Hyde Park | $15 $18 $20 |
| Hive and Honey ATX | Hyde Park | $100 $150 $260 $375 $40 |
| Homebody Studios - Austin | Hyde Park | $35.00 $55.00 $75.00 $85.00 |
| Laché Movement Co. | Hyde Park | $100 $110 $115 $125 $135 |
| Moogie Pilates | Hyde Park | $255 $99 |
| Novi Pilates ATX | Hyde Park | $312 $400 $444 $47 $600 |
| Shed Pilates + Fitness | Hyde Park | $120 $125 $170 $190 $220 |
| Sheine Pilates | Hyde Park | $35 $60 |

### Human-read — booking widgets, owner or browser

| Business | Bucket | Sample prices seen |
|---|---|---|
| CrossFit Renew | Hyde Park | — |
| CrossFit Strength Haven | Hyde Park | — |
| HIT Athletic | Hyde Park | $160 |
| MOD FITNESS | Hyde Park | $59 |
| Moontower Pilates | Hyde Park | — |
| Shape Method | Hyde Park | — |

## Wave 3 — Downtown (largest bucket, already strongest)

**29 businesses — 11 scrapeable, 18 human-read.**

### Scrapeable — a scraper target each

| Business | Bucket | Sample prices seen |
|---|---|---|
| Austin Fight Team | Downtown | $1 $120 $750 $85 |
| CrossFit 2024 | Downtown | $25 $60 |
| Evolution Pilates & Flow | Downtown | $10 $15 $20 $25 |
| Forge Strength Austin | Downtown | $129.99 $1498 $999 |
| Generator Athlete Lab | Downtown | $65 $99 |
| Gracie Humaitá Austin | Downtown | $10 $30 |
| Mesa Rim Climbing Center | Downtown | $10 $20 $25 $50 $6 |
| Mōtiv Fitness | Downtown | $10 $15 $3 |
| Shine Hot Pilates + Sculpt Downtown Austin | Downtown | $19.99 $199.99 $20 |
| VITA Well Pilates Studio | Downtown | $15 $5 |
| soFly Social | Downtown | $100 $15 $150 $158 $16 |

### Human-read — booking widgets, owner or browser

| Business | Bucket | Sample prices seen |
|---|---|---|
| 10th Planet Austin | Downtown | — |
| AKT | Downtown | $59 |
| ALIGN Pilates Studios West | Downtown | — |
| ATX PILATES | Downtown | — |
| BE Fit Modern Pilates | Downtown | — |
| CrossFit Uncommon | Downtown | — |
| Easley Boxing and Fitness | Downtown | — |
| Gracie Barra South Austin | Downtown | — |
| Haus of B. Pilates | Downtown | — |
| Inner Diva Studios | Downtown | $10 |
| Olga Roberts Studio - Body Intelligence Pilate | Downtown | — |
| Pure Pilates Austin | Downtown | — |
| Renzo Gracie Austin | Downtown | — |
| Ritual Moves Pilates (Austin) | Downtown | — |
| STRONG Pilates | Downtown | $39 |
| SoLa CrossFit | Downtown | — |
| Urban Lagree - East Austin | Downtown | — |
| sharpbody Pilates | Downtown | — |

## Wave 4 — East Austin and South / SoCo

**26 businesses — 11 scrapeable, 15 human-read.**

### Scrapeable — a scraper target each

| Business | Bucket | Sample prices seen |
|---|---|---|
| Activate HER FiT | East Austin | $1200 $140 $195 $330 $360 |
| Athletic Outcomes | East Austin | $49 $99 |
| Kore Kollective Modern Pilates | East Austin | $149 $39 $99 |
| Method Pilates | South / SoCo | $255 $55 |
| Muvmet Studio | South / SoCo | $100 $139 $169 $185 $199 |
| New Era Martial Arts | South / SoCo | $100 $40 $70 |
| Persona Pilates | South / SoCo | $10 $179 |
| Rhythm House ATX | South / SoCo | $1 $125 $15 $169 $170 |
| Squatch Frontier Fitness | East Austin | $115 $225 |
| The Colosseum | East Austin | $115 $225 |
| ToddPilates Fitness | South / SoCo | $164 $169 $19 $319 $329 |

### Human-read — booking widgets, owner or browser

| Business | Bucket | Sample prices seen |
|---|---|---|
| Aer Pilates | East Austin | $99 |
| B Pilates | South / SoCo | — |
| BASE | East Austin | — |
| BFT South Congress | South / SoCo | $33 |
| CrossFit Jääkarhu | East Austin | — |
| Dane's Body Shop - Manor Road | East Austin | — |
| El Studio Pilates | South / SoCo | — |
| FOGO CrossFit | South / SoCo | — |
| FS8 SoCo | South / SoCo | $39 |
| Forma Fitness | South / SoCo | — |
| Grit ATX | East Austin | — |
| Integral Pilates ATX | South / SoCo | $5 |
| Lion's Den Fitness | South / SoCo | — |
| Neighborhood Pilates | South / SoCo | — |
| Studio KINA | East Austin | — |

## What this does not include

- The **21 judgement items**, now ruled on separately in `docs/triage-verdicts.md`.
- The **~60 unlisted chain siblings** inside our circles — see `docs/chain-census.md`.
  Those are a different harvest: one brand's pricing page usually settles several rows.
- The **34 recovery candidates** from the funded second pass, which need their own
  probe-and-triage pass first (`docs/recovery-scan.md`).

## Chain-branch rows folded into the wave priorities (2026-08-20)

The YMCA and Anytime Fitness placeholder rows were brand names, not locations — neither
could carry a pin or an honest price. They are now **eight branch rows** under `chain`:

| Branch | Region | Wave | Sourcing status |
|---|---|---|---|
| Townlake YMCA | downtown | 3 | **Priced.** Association-wide rate card |
| East Communities YMCA | east-austin | 4 | **Priced.** Association-wide rate card |
| North Austin YMCA | hyde-park | 2 | **Priced.** Association-wide rate card |
| Northwest YMCA of Austin | the-domain | **1** | **Priced.** Association-wide rate card |
| Southwest Family YMCA | south-soco | 4 | **Priced.** Association-wide rate card |
| Anytime Fitness W Anderson Lane | hyde-park | 2 | Enquiry form — needs owner contact |
| Anytime Fitness FM 2222 | hyde-park | 2 | Enquiry form — needs owner contact |
| Anytime Fitness Anderson Mill | the-domain | **1** | Enquiry form — needs owner contact |

**The YMCA rate is association-wide, not per branch** — `austinymca.org/join` publishes one
card and a membership admits you to every branch, so the same figures apply to all five
with the provenance stated on each plan. That is the opposite of the Gold's case, where
three clubs carry three different rate cards, and the difference is sourced in both
directions rather than assumed in either.

**Anytime Fitness is a floor, not a census.** Places text search returns three in-circle
clubs against a brand claim of eleven-plus in Austin; the cap is the search, not the city.
Expect more branch rows once the brand locator is walked properly.
