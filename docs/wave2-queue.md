# Wave 2 — re-aimed by ACTUAL region

Re-sorted after Wave 1 showed the discovery bucket is a weak proxy for region. Every
remaining candidate has now been geocoded first. **Nothing here is written to `/data`.**

## The number that justifies the re-aim

**30 of 71 remaining candidates — 42% — sit in a different region than their bucket.**
In Wave 1 it was 6 of 21. Bucket-first sequencing was aiming at the wrong regions
roughly two times in five.

## Current coverage, thinnest first

| Region | Priced | Coverage | Candidates ACTUALLY here |
|---|---|---|---|
| Mueller | 1/3 | 33% | **2** |
| The Domain | 6/10 | 60% | **1** |
| Hyde Park | 13/18 | 72% | **15** |
| Downtown | 13/17 | 76% | **17** |
| East Austin | 9/11 | 82% | **21** |
| South / SoCo | 14/16 | 88% | **15** |

## The problem this exposes

**The two thinnest regions are nearly out of queue.** Mueller has **2** remaining
candidates and The Domain has **1** — Wave 1 consumed their buckets, and geocoding the
rest moved almost nothing into them. Meanwhile East Austin, at 82% coverage, holds the
largest remaining pile at 21.

So a thinnest-region-first queue **cannot actually fill the thinnest regions** from the
92 keeps. That inventory does not exist there. Filling Mueller and The Domain has to
come from somewhere else, and there are two candidates:

1. **The ~60 unlisted chain siblings** (`docs/chain-census.md`). Chains cluster where
   people are, and the Domain in particular is chain territory — F45, Orangetheory,
   Club Pilates and Pure Barre all have locations there we do not list.
2. **A discovery sweep aimed at those two circles specifically**, rather than a
   city-wide sweep re-triaged. Mueller's circle is only 2.5 km — the smallest by a
   wide margin — which is itself worth questioning: it may be under-enumerated because
   it is drawn too tightly, not because Mueller is empty.

**That second point is a product question and it is yours**: if the Mueller circle is
too small, the region is not thin, the map of it is.

## The queue, thinnest actual region first

### Mueller — 1/3 priced · 2 candidates

| Business | Source type | Bucket said |
|---|---|---|
| Evolution Pilates & Flow | SCRAPEABLE | ← downtown |
| Renzo Gracie Austin | HUMAN-READABLE | ← downtown |

### The Domain — 6/10 priced · 1 candidates

| Business | Source type | Bucket said |
|---|---|---|
| Inner Diva Studios | HUMAN-READABLE | ← downtown |

### Hyde Park — 13/18 priced · 15 candidates

| Business | Source type | Bucket said |
|---|---|---|
| CrossFit REP | SCRAPEABLE | (same) |
| Danzversity | SCRAPEABLE | (same) |
| Dell JCC | SCRAPEABLE | (same) |
| Hive and Honey ATX | SCRAPEABLE | (same) |
| Laché Movement Co. | SCRAPEABLE | (same) |
| Mesa Rim Climbing Center | SCRAPEABLE | ← downtown |
| Shed Pilates + Fitness | SCRAPEABLE | (same) |
| Sheine Pilates | SCRAPEABLE | (same) |
| CrossFit Renew | HUMAN-READABLE | (same) |
| CrossFit Strength Haven | HUMAN-READABLE | (same) |
| CrossFit Uncommon | HUMAN-READABLE | ← downtown |
| HIT Athletic | HUMAN-READABLE | (same) |
| MOD FITNESS | HUMAN-READABLE | (same) |
| Moontower Pilates | HUMAN-READABLE | (same) |
| Shape Method | HUMAN-READABLE | (same) |

### Downtown — 13/17 priced · 17 candidates

| Business | Source type | Bucket said |
|---|---|---|
| Activate HER FiT | SCRAPEABLE | ← east-austin |
| Forge Strength Austin | SCRAPEABLE | (same) |
| Generator Athlete Lab | SCRAPEABLE | (same) |
| Moogie Pilates | SCRAPEABLE | ← hyde-park |
| Mōtiv Fitness | SCRAPEABLE | (same) |
| Novi Pilates ATX | SCRAPEABLE | ← hyde-park |
| Persona Pilates | SCRAPEABLE | ← south-soco |
| Shine Hot Pilates + Sculpt Downtown Austin | SCRAPEABLE | (same) |
| ALIGN Pilates Studios West | HUMAN-READABLE | (same) |
| B Pilates | HUMAN-READABLE | ← south-soco |
| Dane's Body Shop - Manor Road | HUMAN-READABLE | ← east-austin |
| Haus of B. Pilates | HUMAN-READABLE | (same) |
| Olga Roberts Studio - Body Intelligence Pilate | HUMAN-READABLE | (same) |
| Ritual Moves Pilates (Austin) | HUMAN-READABLE | (same) |
| STRONG Pilates | HUMAN-READABLE | (same) |
| Urban Lagree - East Austin | HUMAN-READABLE | (same) |
| sharpbody Pilates | HUMAN-READABLE | (same) |

### East Austin — 9/11 priced · 21 candidates

| Business | Source type | Bucket said |
|---|---|---|
| Athletic Outcomes | SCRAPEABLE | (same) |
| Austin Fight Team | SCRAPEABLE | ← downtown |
| CrossFit 2024 | SCRAPEABLE | ← downtown |
| Homebody Studios - Austin | SCRAPEABLE | ← hyde-park |
| Kore Kollective Modern Pilates | SCRAPEABLE | (same) |
| Method Pilates | SCRAPEABLE | ← south-soco |
| Squatch Frontier Fitness | SCRAPEABLE | (same) |
| The Colosseum | SCRAPEABLE | (same) |
| soFly Social | SCRAPEABLE | ← downtown |
| 10th Planet Austin | HUMAN-READABLE | ← downtown |
| AKT | HUMAN-READABLE | ← downtown |
| ATX PILATES | HUMAN-READABLE | ← downtown |
| BASE | HUMAN-READABLE | (same) |
| BE Fit Modern Pilates | HUMAN-READABLE | ← downtown |
| Easley Boxing and Fitness | HUMAN-READABLE | ← downtown |
| FS8 SoCo | HUMAN-READABLE | ← south-soco |
| Grit ATX | HUMAN-READABLE | (same) |
| Lion's Den Fitness | HUMAN-READABLE | ← south-soco |
| Pure Pilates Austin | HUMAN-READABLE | ← downtown |
| SoLa CrossFit | HUMAN-READABLE | ← downtown |
| Studio KINA | HUMAN-READABLE | (same) |

### South / SoCo — 14/16 priced · 15 candidates

| Business | Source type | Bucket said |
|---|---|---|
| Gracie Humaitá Austin | SCRAPEABLE | ← downtown |
| Muvmet Studio | SCRAPEABLE | (same) |
| New Era Martial Arts | SCRAPEABLE | (same) |
| Rhythm House ATX | SCRAPEABLE | (same) |
| ToddPilates Fitness | SCRAPEABLE | (same) |
| VITA Well Pilates Studio | SCRAPEABLE | ← downtown |
| Aer Pilates | HUMAN-READABLE | ← east-austin |
| BFT South Congress | HUMAN-READABLE | (same) |
| CrossFit Jääkarhu | HUMAN-READABLE | ← east-austin |
| El Studio Pilates | HUMAN-READABLE | (same) |
| FOGO CrossFit | HUMAN-READABLE | (same) |
| Forma Fitness | HUMAN-READABLE | (same) |
| Gracie Barra South Austin | HUMAN-READABLE | ← downtown |
| Integral Pilates ATX | HUMAN-READABLE | (same) |
| Neighborhood Pilates | HUMAN-READABLE | (same) |

