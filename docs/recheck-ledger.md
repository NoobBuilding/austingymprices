# Recheck ledger

Gyms deliberately **not** listed, and the condition under which that should be
revisited. Recorded rather than deleted so nobody rediscovers them as finds.

| Business | Why excluded | Recheck when |
|---|---|---|
| **JETSET Pilates Austin Arboretum**<br><sub>10000 Research Blvd Ste 124 · the-domain</sub> | **Not open yet.** The pricing page states billing "will begin 30 days after the Grand Opening", and its $199 / $209 are Founders and Pre-Opening rates at "over 30% off" — promotional launch pricing, not standing rates. This is the EOS Fitness Parmer precedent in §1: a gym that has not opened ships no row and no "coming soon" placeholder. It also explains the price "variance" that first made Arboretum look like a per-studio difference. | After the Grand Opening, once standing rates replace Founders pricing. Then add as a third JETSET row. |
| **Forge Strength Austin**<br><sub>1107 S 8th St Ste F · south-soco</sub> | **Pure personal-training studio**, which §1 excludes. $999 and $1498 are 8-session PT packs (the second is the two-person rate); $129.99 buys one small-group session. No membership is published at all. Listing it would put a $124.88/session rate on the Classes tab beside F45 at $23/class. | If they ever publish a membership or open-gym rate. |
| **Generator Athlete Lab**<br><sub>800 W Cesar Chavez St PP120 · downtown</sub> | **Recovery, massage and personal training**, by its own description — §1 excludes pure PT. The only published figures are a $65 assessment and two recovery passes for $99. No membership, no classes. | If they publish a membership. |
| **EOS Fitness Parmer** | Does not open until 2027 (§1). | 2027. |
| **FeV Iron Vault Gym** | Website entirely down; possibly closed. | Needs a does-it-still-exist check before launch. |

## Harvested but not writable

| Business | What it publishes | Needs |
|---|---|---|
| **Mesa Rim Climbing Center**<br><sub>1205 Sheldon Cove Bldg 3 · north Austin</sub> | The page gives a **discounted** membership rate ($89/mo for military and similar), youth rates ($50/mo, ages 11–17), a $20 youth day pass and a $25 startup fee — but the **standard adult monthly rate is not in the fetched page**. | A human read, or a second look at a page section that may render client-side. Writing $89 as the headline would ship a discounted rate as a standing one. |
| **Shine Hot Pilates + Sculpt**<br><sub>117 Lavaca St · downtown</sub> | Only the **virtual** platform ($19.99/mo, $199.99/yr) and a $20 first class. The in-studio rate is not published. | Owner contact, or a human read of the booking flow. |

## Listed but still incomplete

| Gym | What is missing |
|---|---|
| **Flow Pilates ATX** | Publishes only its introductory offer ($34.99 for two classes, plus $30 off a first month). `/pricing` returns the same page — the standing membership rates are not on the site. Listed in the "call for pricing" state; needs owner contact or a later recheck. |
| **OPTML Performance** | Both tiers are published as "starting at" with no class count, so no per-class rate can be shown. |
| **The Old Guard Thai Boxing Club** | Nominatim returned **no result** for 1702 Aldridge Dr, so `lat`/`lng` stay null and no pin is drawn (§9 step 4a). Needs an owner pin-drop. Its region is assigned by judgement, not by coordinates, and should be checked at the same time. |
| **Rumble Boxing South Austin** | Proposed for exclusion — see `docs/awaiting-classification.md`. Only an intro offer is published, and the studio the discovery probe found (Southpark Meadows) is outside all six region circles. |
