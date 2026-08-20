# Circle overlap — findings only

Characterization of the issue parked after Wave 2. **No fixes here, nothing changed.**
The question was: how many pins sit inside more than one circle, what rule breaks the
tie today, and is any of it user-visible.

## How much overlap there is

| Pins inside… | Count |
|---|---|
| 1 circle | 20 |
| 2 circles | 30 |
| 3 circles | 20 |
| 4 circles | 5 |

**55 of 75 pins (73%) fall inside more than one circle.**
Five sit inside four. Only 20 pins are unambiguously in exactly one region.

The heaviest overlaps are between the three largest circles:

| Pair | Pins in both |
|---|---|
| east-austin + hyde-park | 34 |
| downtown + east-austin | 30 |
| downtown + hyde-park | 25 |
| hyde-park + the-domain | 9 |
| east-austin + south-soco | 7 |
| downtown + mueller | 5 |

That is a direct consequence of the radii: East Austin 10,500 m, Hyde Park 9,300 m,
The Domain 7,300 m and South/SoCo 6,900 m against Downtown's 4,400 m and Mueller's
2,500 m. The four large circles blanket the city and each other.

## What breaks the tie today — and the answer is that nothing does

**There is no single rule, because two different rules are in play and they are never
reconciled:**

1. **A listed gym's region is a STORED FIELD** (`region` in its JSON). It was set from
   the seed sheet or by hand, and geometry never revisits it.
2. **A discovery candidate's region is the NEAREST CONTAINING CIRCLE**, computed at
   triage time.

So the circles do not assign regions to listed gyms at all — they assign regions to
*candidates*, and once a candidate becomes a row the stored value freezes. The two
disagree for **12 of 75 pins**:

| Gym | Assigned | Nearest containing circle |
|---|---|---|
| `equinox-austin-soco` | downtown | **east-austin** (3068 m) |
| `kollective` | south-soco | **east-austin** (3034 m) |
| `big-tex-gym` | hyde-park | **the-domain** (5175 m) |
| `fitcidence` | east-austin | **downtown** (1391 m) |
| `nocturna` | hyde-park | **downtown** (3198 m) |
| `24-hour-fitness-hancock` | hyde-park | **mueller** (1476 m) |
| `hyde-park-gym` | hyde-park | **downtown** (3578 m) |
| `travis-county-strength` | east-austin | **hyde-park** (1059 m) |
| `lift-atx` | downtown | **east-austin** (2209 m) |
| `flow-pilates-atx` | east-austin | **downtown** (1571 m) |
| `atomic-athlete` | south-soco | **east-austin** (5660 m) |
| `black-swan-yoga-downtown` | downtown | **east-austin** (1742 m) |

Two of those are worth reading twice. **`hyde-park-gym` is assigned Hyde Park but its
nearest containing circle is Downtown** — the gym Hyde Park is named after would be
moved out of Hyde Park by a geometric rule. And **`24-hour-fitness-hancock` is nearest
to MUELLER**, 1,476 m away, despite Hancock Center being a Hyde Park landmark.

**This is the strongest argument against 'just apply the geometry'.** The stored values
are frequently better than the circles, because they encode what a neighbourhood IS
rather than which arbitrary disc a point falls in.

## Is it user-visible?

Yes, in three places, and one of them materially.

**1. Region medians — materially visible.** Detail pages state "$8 below the Hyde Park
median ($67)". Medians are computed from the STORED region. Recomputing them under the
nearest-circle rule moves them:

| Region | Median as shipped | Under nearest-circle | Delta |
|---|---|---|---|
| downtown | $119 | $129 | +10 |
| east-austin | $119 | $117 | -2 |
| south-soco | $109 | $100 | -9 |
| hyde-park | $97 | $119 | +22 |
| mueller | $189 | $189 | +0 |
| the-domain | $104 | $99 | -5 |

**Hyde Park's median would move $22** — from $97 to $119. Every Hyde Park detail page
states its gym's position against that number, so the sentence a reader sees would
change for roughly a dozen gyms. This is the one that would be noticed.

**2. Region pages.** `/regions/{id}` lists by stored region, so a mis-assigned gym is
listed under the wrong heading and absent from the right one. Visible, but quiet.

**3. The breadcrumb and card meta.** Both fall back to the region display name where
`sub_locality` is null. Visible, cosmetic.

**Not affected: the map.** Region chips are a CAMERA, not a filter (§9) — choosing a
region pans and hides nothing. So an overlapping or mis-assigned pin is never removed
from the map, and no gym becomes unreachable. The design decision that region chips must
not filter is, in hindsight, what has kept this from being a user-facing bug.

## The shape of it, in one line

**The circles are a discovery instrument being read as a geographic taxonomy.** They
were drawn to enumerate businesses, they overlap heavily by design, and nothing ever
promoted them into a definition of region. The stored field is the definition — it is
just undocumented, unvalidated, and occasionally wrong.

No fixes proposed here, as instructed. The options, if you want them later, range from
recording the rule as-is and validating stored regions against a sanity check, to
separating the two concepts outright — search circles for discovery, polygons or a
stored-with-provenance field for region.

