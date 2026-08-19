# Harvest findings — round 2 (discovery cherry-pick)

Nine pages read 2026-08-19, free fetches with our honest User-Agent, robots
checked, spaced. **Nothing written to `/data`** — three decisions below are the
owner's, not mine.

## READY to write

| Gym | Plans | Per-class (attainable) | Notes |
|---|---|---|---|
| **Fitcidence** <sub>east-austin · classes</sub> | 8-class monthly **$119** · Unlimited monthly **$139** | **$14.88** (from the 8-class monthly) → **tier 1** | Class packs "never expire". First-timer 2-for-1 $26 and 2-week unlimited $69 are **intro offers → promo**, excluded from the per-class figure. Commitment not stated. |
| **OPTML Performance** <sub>downtown · boxing</sub> | Muay Thai & kickboxing, adults, **from $180/mo** · Youngstars ages 4–15 **from $130/mo** | none — no class count published | Youth tier is `restricted: "youth"`. Both are "starting at", so the tier detail needs confirming. |
| **JETSET Pilates Downtown** <sub>downtown · pilates</sub> | 4 classes **$99** · 8 classes **$169** · 12 classes **$219** · Unlimited **$269** — **all 3-month minimum** | **$27.90** (10-class pack $279) | Packs: single $35, 5 for $145, 10 for $279. Intro offers ($17 single, $35 BOGO, $49 week) are first-timer promos → excluded. |
| **JETSET Pilates South Austin** <sub>south-soco · pilates</sub> | identical to Downtown | **$27.90** | Prices match Downtown exactly. |
| **Nocturna** <sub>hyde-park · classes</sub> | Luminary **$189** (6-mo, ≤12 classes) · Enchanter **$139** (6-mo, ≤6) · Initiate **$79** (3-mo, ≤3) | none attainable — see decision 2 | Extra classes $18 / $23 / $25 by tier. Initiate is new-members-only and renews at Enchanter. 3-for-$60 is a new-client special → promo. |

## DECISION 1 — two of these look out of v1 scope

§1 excludes pure personal-training studios. Two of the seven are exactly that,
and neither publishes a membership:

- **Forge Strength Austin** — you were right to ask. **$999 and $1498 are
  8-session personal-training packs**, not monthly rates ($1498 is the
  two-person version). $129.99 is one small-group session. There is no
  membership on the page at all. Writing it would put a **$124.88/session** PT
  rate on the Classes tab beside F45 at $23/class.
- **Generator Athlete Lab** — describes itself as "Premier Recovery, Massage,
  and Personal Training". The only figures are a **$65 assessment** and
  **2 recovery passes for $99**. No membership, no classes.

**Recommendation: exclude both**, and record them in the discovery report as
out-of-scope rather than deleting them, so they are not rediscovered.

## DECISION 2 — a real tension in the default-plan rule

**Nocturna publishes every price it has, and would still render "call for
pricing."** Its cheapest plan carries a 3-month commitment and the rest carry
6, so no plan satisfies `commit_months ≤ 2` and `selectDefaultPlan` returns
null. JETSET is the same on the membership side (every monthly is a 3-month
minimum) and is only rescued because its packs carry no commitment.

The rule is doing what §3 says. But the outcome — showing "call for pricing"
for a gym whose prices we have read and recorded — is the opposite of what this
site exists for, and it will recur across the studio inventory the sweep found.

Three ways out, owner's call:

1. **Raise the default-plan ceiling to `commit_months ≤ 3`.** Simple, but it
   quietly relabels a 3-month lock-in as an ordinary option.
2. **Let a commitment plan take the headline when nothing else qualifies**, with
   its commitment badge shown — the badge already tells the truth, and a stated
   "$139/mo · 6-mo minimum" beats a blank.
3. **Leave it.** Honest, and costs us a whole category of gym.

My preference is **2**: the headline exists to answer "what does it cost", the
badge exists to answer "what's the catch", and suppressing the first because of
the second helps nobody. It is a §3 change, so it is yours to make.

## DECISION 3 — JETSET Arboretum is not open yet

I recommended three JETSET rows. **It should be two.** The Arboretum page says
outright: *"your regular membership billing will begin 30 days after the Grand
Opening."* Its $199 and $209 are **Founders and Pre-Opening** rates —
"Save Over 30%" — not standing prices, and its studio does not exist yet.

That is the EOS Fitness Parmer precedent in §1 exactly: a gym that has not
opened is out of v1, with no "coming soon" placeholder. **Excluding it** — and
it explains the price difference that made it look like a per-studio variation.

## Also noted

- **Flow Pilates ATX** publishes only its intro offer on the page we read
  ($34.99 for 2 classes, plus "$30 off your first month"). Both are promos; the
  standing membership rates sit behind a "View Memberships" link that was not in
  this fetch. **One more read needed** before it can be written.
