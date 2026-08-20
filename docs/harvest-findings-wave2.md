# Wave 2 harvest findings — East Austin, plus the Mueller and Domain gap-fills

24 candidates: the 21 that geocode to East Austin, plus Evolution Pilates and Renzo
Gracie (Mueller) and Inner Diva (The Domain) as targeted gap-fills. Scrapeable first.
**Nothing here has been written to `/data`** — this is for your cherry-pick.

| | count |
|---|---|
| Standing prices found, ready to write | 3 |
| Drop-in only, no membership published | 1 |
| Promo-only — no standing rate behind the offer | 2 |
| Out of scope — proposed exclusion | 1 |
| Probe hits that were not prices | 2 |
| Suspected duplicate listing | 1 pair |
| Needs a human read (JS booking widget) | 14 |

---

## Read this first: the region assignments in this wave are unreliable

**8 of the 21 "East Austin" candidates have South Austin (78704) addresses** — S Lamar,
S Congress, S 1st, Goodrich:

- Method Pilates — `1600 S 1st St #130, Austin, TX 78704, USA`
- ATX PILATES — `2300 S Lamar Blvd #105, Austin, TX 78704, USA`
- Easley Boxing and Fitness — `2401 Thornton Rd A1, Austin, TX 78704, USA`
- FS8 SoCo — `3601 S Congress Ave Bldg E, Austin, TX 78704, USA`
- Lion's Den Fitness — `3500 S Congress Ave, Austin, TX 78704, USA`
- Pure Pilates Austin — `1414 S Lamar Blvd c101, Austin, TX 78704, USA`
- SoLa CrossFit — `2119 Goodrich Ave, Austin, TX 78704, USA`
- Austin Fight Team — `700 E Live Oak St, Austin, TX 78704, USA`

East Austin's search circle is **10,500 m**, the largest of the six, and it reaches deep
into South Austin. The nearest-containing-circle rule then assigns these to East Austin
because that centre happens to be closer than South/SoCo's. **So this wave does not
actually fill East Austin the way its queue position implied** — roughly two fifths of
it is South Austin, already the best-covered region at 14/16.

This is the overlapping-circles issue you parked, showing up as a live distortion rather
than a curiosity. Characterization still parked; flagging it here because it changes how
to read the wave.

---

## Standing prices found

### Method Pilates — `east-austin` bucket, **78704 address**
`$255/mo` unlimited. Intro offer of `$55 for 3 classes` is a promo and must not set the
per-class figure. No class count published for the unlimited plan, so no per-class
figure derives from it. Source: `methodpilates.com`.

### Squatch Frontier Fitness — `east-austin`, 701 Tillery St
Two tiers on one card: **`$115/mo` Colosseum-only** ("classic gym setup") and
**`$225/mo` Frontier** (adds community workouts, rucks, monthly gatherings). The page
states **"No sign-up fees. Cancel anytime."** — a sourced zero on both fees and a
month-to-month term. It also mentions an indoor sauna, which would populate `sauna`.

### soFly Social — `east-austin`, Springdale Rd
Class packs only, no membership: `$35` single class, `$158` five, `$265` ten, `$420`
twenty. Cheapest attainable is **$21 a class** from the twenty-pack. Aerial/pole studio —
in scope as Classes under the Brass Ovaries precedent.

## Drop-in only

**CrossFit 2024** — `east-austin`, E Riverside. Publishes **only** drop-in rates: `$25`
per class or `$60` per week. No membership rate on the site. A day-pass row at minimum;
membership needs contact.

## Promo-only — no standing rate

- **Athletic Outcomes** — `$49` two-week start and `$99` first month on a "Mueller
  founding" offer capped at 30 spots and expiring **Aug 31**. No standing membership rate
  is published. **Worth noting separately: they are opening in MUELLER** — a genuine
  gap-fill candidate for the thinnest region, once they publish a standing rate.
- **Kore Kollective Modern Pilates** — every published figure is an intro offer: BOGO
  `$39`, two weeks unlimited `$99`, 5-class intro `$149`. Promo-only under §3.

## Proposed exclusion

**Austin Fight Team** — every product is one-to-one: Park Session `$85`, ten sessions
`$750`, in-home `$120`, ten in-home `$1,100`, each described as "1 on 1 class with
Champion trained coach". No group class, no membership. **Pure personal training, rule 3**
— the same shape as Barbells & BJJ, and caught the same way.

## Probe hits that were not prices

The dollar-sign precedent earned itself twice more:

- **Evolution Pilates & Flow** (Mueller gap-fill) — its `$10` and `$15` are **late
  cancellation fees**, not rates. No membership price is published.
- **Homebody Studios** — `$75`, `$85`, `$55` are **retail products**: ankle weights, a zip
  top, a ceramic mug, resistance bands. The probe found the shop page.

## Suspected duplicate

**Squatch Frontier Fitness and The Colosseum are almost certainly one business.** Both
sit at **701 Tillery St**, both probe to the identical `$115`/`$225` card, and the card
itself reads "Join Colosseum Only" as the cheaper tier of the Frontier membership. They
carry different domains (`squatchfitness.com`, `colosseumatx.com`), which is why the
sweep counted them twice. **Proposed: one row, Squatch Frontier Fitness, with Colosseum
as its $115 tier.** Your call — it is a listing-identity question, not a pricing one.

## Needs a human read — 14

| Business | Region as geocoded | Note |
|---|---|---|
| 10th Planet Austin | east-austin |  |
| AKT | east-austin | probe glimpsed $59 — unverified |
| ATX PILATES | east-austin |  |
| BASE | east-austin |  |
| BE Fit Modern Pilates | east-austin |  |
| Easley Boxing and Fitness | east-austin |  |
| FS8 SoCo | east-austin | probe glimpsed $39 — unverified |
| Grit ATX | east-austin |  |
| Lion's Den Fitness | east-austin |  |
| Pure Pilates Austin | east-austin |  |
| SoLa CrossFit | east-austin |  |
| Studio KINA | east-austin |  |
| Renzo Gracie Austin | mueller |  |
| Inner Diva Studios | the-domain | probe glimpsed $10 — unverified |

**Renzo Gracie (Mueller)** and **Inner Diva (The Domain)** are both in this pile, so
neither gap-fill landed a price this wave.

---

## What this wave actually delivers

If you take the three standing-price finds plus CrossFit 2024 as a day-pass row: **four
rows, of which three carry 78704 addresses or sit in East Austin proper — and none is in
Mueller or The Domain.** Both gap-fills need a browser.

The honest summary: **the 92-keep queue is now mostly human-read work.** 14 of 24 here
need a booking widget opened, and the scrapeable seam is close to worked out. Growth from
here is either browser time or the chain siblings.

