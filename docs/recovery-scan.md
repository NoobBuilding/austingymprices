# Recovery re-scan — can the fourth tab make launch?

Rule 4 (CLAUDE.md §6) put recovery-only businesses in scope. The 144 obvious-excludes
were classified before the category existed, so they were re-read for anything that
belongs in it. **Nothing here has been written to `/data`.**

## The answer — REVISED 2026-08-20 after the funded second pass

**Superseded:** *"One sourceable candidate exists; the Recovery tab cannot make launch."*
That was true of the **old sweep**, and the diagnosis below was right about why. It was
never a fact about Austin.

The second Places pass ran with recovery types and the narrowed name filter. It found
**115 raw places** inside the six region circles, of which **34 are core recovery
businesses with a website** — roughly **18 distinct brands** once the chain locations,
the sauna *retailers* and the short-term rentals advertising a backyard sauna are
stripped out.

**The Recovery tab can make launch.** Inventory is not the constraint; sourcing is.
The next step is the ordinary probe-and-triage pass over these 34 to see which publish
a price — that number, not this one, decides how many rows actually ship.

## Why the re-scan came back nearly empty

It is not that recovery businesses were excluded. **They were never enumerated.**

`scrapers/discover.py` asks Google Places for three types:

```python
INCLUDED_TYPES = ["gym", "fitness_center", "yoga_studio"]
```

plus eight text queries — pilates, climbing, boxing, BJJ, CrossFit, martial arts, barre,
dance fitness. **Not one of them reaches a sauna house, a cold-plunge studio or a
contrast-therapy suite**, which Places types as `spa`, `wellness_center` or `massage`.

The raw Places cache confirms it. Across **359 distinct businesses** enumerated:

| primaryType | count |
|---|---|
| gym | 142 |
| sports_school | 85 |
| fitness_center | 25 |
| health | 20 |
| yoga_studio | 17 |
| **wellness_center** | **3** |
| **spa** | **0** |

And the name filter that runs *before* classification actively removes the rest:

```python
EXCLUDE_NAME = re.compile(r"... |wellness center|massage|spa\b| ...")
```

It dropped exactly three businesses — Northwest Recreation Center, Northwest YMCA,
and the Jiujitsu Parlor's physical-therapy page. **None was a recovery business**, because
none had been enumerated to begin with.

So the 144 excludes contain no hidden recovery inventory. The category is empty for a
**structural** reason, not an editorial one.

## What the sweep did surface

| Business | Type | Status |
|---|---|---|
| **Generator Athlete Lab** | `wellness_center` | **The one genuine candidate.** Publishes a day pass and $65 / $75 / $99 figures; sauna, infrared and red light on site. Rule 4 reverses its §1 exclusion. Category — `recovery` or `classes` — needs one read. |
| StretchLab Mueller | `wellness_center` | Assisted 1-on-1 stretching. Undecided between rules 3 and 4, and not facility-model. See `triage-verdicts.md`. |
| YTX Yoga, Strength, Pilates, & Recovery | `yoga_studio` | Recovery amenities, but it teaches classes — a Classes listing with `sauna` / `cold_plunge` set, not a Recovery one. |
| Joao Crus Brazilian Jiu-Jitsu | `wellness_center` | Mis-typed by Places. A BJJ school. |

## What would actually fill the tab

A **second discovery pass aimed at the category**, which is a small change to
`discover.py` rather than new machinery:

1. Add recovery types to the Places call — `spa`, `wellness_center`, and the text queries
   Places types badly: "sauna studio", "cold plunge", "contrast therapy", "recovery studio",
   "bathhouse", "infrared sauna".
2. **Narrow `EXCLUDE_NAME` at the same time.** As written it would delete the category on
   the way in: `wellness center`, `massage` and `spa\b` are exactly the words these
   businesses use. The PT and rec-centre exclusions it also carries are still wanted, so
   this needs surgery, not deletion — and rule 3 has already narrowed the PT half of it.
3. Re-probe and triage as usual.

Austin plausibly supports six, and the sweep has simply never looked. **This is a product
decision and a credit spend, so it is proposed, not done.** Until then the category
accumulates invisibly and the tab does not render — which is exactly what the gate is for.

## What the funded second pass found (2026-08-20)

**115 recovery-shaped places · 34 core businesses with a website · 30 after removing sauna retailers · 20 distinct brands.**

Retailers stripped out — Austin Custom Saunas, Crockpot Saunas, Endurance Cold Plunge Co and
Jacoby Plunges *sell* saunas and plunges; they are not places you buy access to one.
Short-term rentals advertising a backyard sauna were dropped by business type.

| Business | Places type | Site |
|---|---|---|
| Cold Plunge Austin | `wellness_center` | http://www.coldplungeaustintexas.com/ |
| Contrast Collective | `sauna` | https://www.contrast-collective.com/ |
| Cryo 512 | `wellness_center` | https://www.cryo512.com/ |
| EvolvE Cryo + Wellness | `spa` | https://evolveatx.com/ |
| Mantle Thermal Haus | `sauna` | https://www.mantlethermal.com/ |
| Melt Well Sauna & Plunge Studio | `sauna` | https://www.melt-well.com/austin |
| Perspire Sauna Studio | `spa` | https://www.perspiresaunastudio.com/tx/the-triangle/ |
| Perspire Sauna Studio | `sauna` | https://www.perspiresaunastudio.com/locations/hutto |
| Perspire Sauna Studio - Austin SW | `spa` | https://www.perspiresaunastudio.com/tx/austin-southwest/ |
| Perspire Sauna Studio - Kyle | `sauna` | https://www.perspiresaunastudio.com/tx/kyle/ |
| Restore Hyper Wellness | `spa` | https://www.restore.com/locations/tx-austin-south-lamar-tx02 |
| Restore Hyper Wellness | `spa` | https://www.restore.com/locations/tx-austin-mueller-tx010?ut |
| Restore Hyper Wellness | `spa` | https://www.restore.com/locations/tx-austin-arbor-trails-tx0 |
| Restore Hyper Wellness | `corporate_office` | https://www.restore.com/ |
| Restore Hyper Wellness | `spa` | https://www.restore.com/locations/tx-austin-gateway-tx006?ut |
| Restore Hyper Wellness | `spa` | https://www.restore.com/locations/tx-west-lake-hills-tx091?u |
| Restore Hyper Wellness | `spa` | http://www.restore.com/locations/tx-austin-four-points-tx108 |
| S W E A T L A N D | `sauna` | http://thesweatland.com/ |
| Sauna House North Loop | `sauna` | https://www.saunahouse.com/pages/austin-north-loop |
| Subzero plunge | `spa` | https://subzeroplunge.com/ |
| SweatHouz Belterra Contrast Therapy Studio | `sauna` | https://sweathouz.com/belterra-book-now/?utm_source=google&u |
| SweatHouz The Grove Contrast Therapy Studio | `sauna` | https://sweathouz.com/the-grove-book-now/?utm_source=google& |
| Sweatcity Health and Recovery | `sauna` | https://www.sweatcityatx.com/ |
| The Ocean Lab | Contrast Therapy | `wellness_center` | http://oceanlabatx.com/ |
| The Recovery Lab and Cryo | `wellness_center` | http://therecoverylabandcryo.com/ |
| True REST Float Spa • Austin North | `spa` | https://truerest.com/locations/austin-north/?utm_source=goog |
| True REST Float Spa • Austin South | `spa` | https://truerest.com/locations/austin-south/?utm_source=goog |
| beem® Light Sauna Austin West 6th | `spa` | https://beemlightsauna.com/location/Austin-W-6th/ |
| beem® Light Sauna Westlake | `spa` | https://beemlightsauna.com/westlake |
| Öli Saunas | `sauna` | https://www.olisaunas.com/ |

**Distinct brands:** Beem® Light Sauna Austin West 6Th, Beem® Light Sauna Westlake, Cold Plunge Austin, Contrast Collective, Cryo 512, Evolve Cryo + Wellness, Mantle Thermal Haus, Melt Well Sauna & Plunge Studio, Perspire Sauna Studio, Restore Hyper Wellness, S W E A T L A N D, Sauna House North Loop, Subzero Plunge, Sweatcity Health And Recovery, Sweathouz Belterra Contrast Therapy Studio, Sweathouz The Grove Contrast Therapy Studio, The Ocean Lab, The Recovery Lab And Cryo, True Rest Float Spa, Öli Saunas.

Several are chains with multiple Austin locations (Restore Hyper Wellness, Perspire,
True REST, beem, SweatHouz) — the §3 question of one row per club versus one
representative row applies here exactly as it does to Anytime Fitness.

**Not yet probed for a published price.** Enumeration answers *how many exist*;
the probe answers *how many we can source*, and only the second number ships rows.
