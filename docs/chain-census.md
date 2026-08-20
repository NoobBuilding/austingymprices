# Chain-sibling census — sizing the chain harvest

How many Austin locations each already-listed brand actually has, inside our six region
circles versus outside. Counted from the Places brand locator, 2026-08-20.
**Nothing here has been written to `/data`.**

## The number

**93 locations inside the circles** across 22 listed brands, plus 20 outside.
We currently list **33 rows** for those brands — so roughly **60 sibling locations sit
inside our own map, unlisted.**

That is a larger pool than the 92-keep discovery queue, and a cheaper one per row: a
chain publishes one pricing page, so one read often settles several locations. Where it
does not — Gold's prices Downtown and Burnet differently, and the owner's own reads
found two different rate cards — the chain still has to be harvested club by club, and
**assuming otherwise is the Venice trap by another route.**

| Brand | Inside circles | Outside | Total |
|---|---|---|---|
| F45 Training | **11** | 5 | 16 |
| Orangetheory Fitness | **10** | 3 | 13 |
| Gold's Gym | **8** | 4 | 12 |
| Club Pilates | **8** | 3 | 11 |
| YMCA | **8** | 0 | 8 |
| Planet Fitness | **7** | 0 | 7 |
| Life Time | **5** | 0 | 5 |
| Pure Barre | **4** | 0 | 4 |
| Black Swan Yoga | **4** | 0 | 4 |
| [solidcore] | **3** | 0 | 3 |
| JETSET Pilates | **3** | 0 | 3 |
| CorePower Yoga | **3** | 0 | 3 |
| Anytime Fitness | **3** | 3 | 6 |
| StretchLab | **3** | 0 | 3 |
| LA Fitness | **2** | 1 | 3 |
| 24 Hour Fitness | **2** | 0 | 2 |
| Crunch Fitness | **2** | 0 | 2 |
| Crux Climbing | **2** | 0 | 2 |
| Bouldering Project | **2** | 0 | 2 |
| Equinox | **1** | 0 | 1 |
| Barry's | **1** | 0 | 1 |
| Los Campeones Gym | **1** | 1 | 2 |

## Caveats, stated rather than buried

- Places text search caps at 20 results per query, so the biggest brands may be
  undercounted rather than over.
- Matching is by brand name against the returned title, which will catch the occasional
  unrelated business and miss a location trading under a variant name.
- "Inside the circles" is a geometric test against `regions.json`, not a region
  assignment — §6's bucket-versus-region rule applies here too.
- These counts are **locations, not listable rows**. A location with no published price
  is still a "call for pricing" row, which is worth having, but it does not move the
  ledger.

## The schema half is already done

`chain` now exists on every gym and links sibling rows; detail pages carry an
"Also in Austin" line, and the index folds a chain to one row while **every location
keeps its own pin**. So the harvest has somewhere to land: a new sibling row joins its
chain automatically, with no code change and no roll-up page (§10).

