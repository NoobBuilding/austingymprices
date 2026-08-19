# Harvest queue — Downtown cherry-pick

Prepared so an approval can go straight to a harvest run. **Nothing has been
fetched for these beyond the free discovery probe, and nothing is in `/data`.**

The `pricing URL` column is the path the probe actually got prices from, not a
guess — that is the whole lesson of the solidcore miss.

| Gym | Region | access_model | Category | Pricing URL (probe-confirmed) | Prices already visible |
|---|---|---|---|---|---|
| **Fitcidence**<br><sub>2921 E 17th St Ste 100, 78702</sub> | east-austin | classes | gym-classes | `https://fitcidence.com` | $26 · $69 · $119 · $139 |
| **Flow Pilates ATX**<br><sub>908 E 5th St Ste 114, 78702</sub> | east-austin | classes | pilates | `https://www.flowpilatesatx.com` | $30 · $34 · $34.99 |
| **Forge Strength Austin**<br><sub>1107 S 8th St Ste F, 78704</sub> | south-soco | classes | crossfit-hiit | `http://www.forgestrengthaustin.com` | $129.99 · $999 · $1498 |
| **Generator Athlete Lab**<br><sub>800 W Cesar Chavez St PP120, 78701</sub> | downtown | classes | crossfit-hiit | `https://www.generatorathletelab.com` | $65 · $99 |
| **JETSET Pilates Downtown**<br><sub>1011 W 5th St #140, 78703</sub> | downtown | classes | pilates | `https://jetsetpilates.com/tx/downtown-austin/pricing` | $17 · $35 · $145 · $169 · $219 · $269 · $279 · $289 |
| **Nocturna**<br><sub>605 W 37th St Ste b, 78705</sub> | hyde-park | classes | gym-classes | `http://www.nocturnacoven.com/memberships` | $18 · $23 · $25 · $60 · $79 · $139 · $189 |
| **OPTML Performance**<br><sub>410 Pressler St, 78703</sub> | downtown | classes | boxing | `http://www.optmltraining.com` | $130 · $180 |

## Notes before you approve

- **All seven are `classes`, not `facility`.** They land on the new Classes &
  studios tab and will need `classes_per_period` or `class_packs` to produce a
  per-class figure. Where a studio publishes a monthly rate but no class count,
  it will correctly show no per-class figure rather than an inferred one.
- **JETSET is a three-location chain**, not one studio — the probe also found
  **South Austin** (5601 Brodie Ln #530, south-soco) and **Arboretum**
  (10000 Research Blvd Ste 124, the-domain), each with its own `/pricing` path.
  Arboretum shows different figures ($199/$209) from Downtown and South, so this
  is **not** a solidcore-style identical-pricing case — it needs three rows with
  three separate reads, per the 24 Hour precedent.
- **Forge Strength's $999 and $1498** are almost certainly prepaid multi-month
  or challenge packages rather than monthly rates. Flagging now so they are not
  mistaken for a monthly figure at write time.
- **Generator Athlete Lab's URL carries UTM parameters** in the Places record;
  the clean origin is what is listed above.
- Region assignments are the discovery pipeline's nearest-centre result. Two
  are outside the Downtown circle proper (Fitcidence and Flow Pilates in
  east-austin, Nocturna in hyde-park) — they surfaced in the Downtown-first
  section because of the report's ordering, not because they are downtown.
