# Recovery re-scan — can the fourth tab make launch?

Rule 4 (CLAUDE.md §6) put recovery-only businesses in scope. The 144 obvious-excludes
were classified before the category existed, so they were re-read for anything that
belongs in it. **Nothing here has been written to `/data`.**

## The answer

**One** sourceable recovery candidate exists in the current data. **Two** if StretchLab
Mueller is ruled in. The tab needs **six**.

**The Recovery tab cannot make launch from the existing sweep**, and no amount of
re-reading the 144 changes that — because of *why* they are missing.

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
