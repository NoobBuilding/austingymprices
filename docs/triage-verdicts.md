# Triage verdicts — the 21 judgment items

The five scope rules of 2026-08-20 (CLAUDE.md §6, "Scope precedents") applied to
category (b) of `docs/discovery-triage.md`. **Nothing here has been written to `/data`.**

Evidence is an honest HTTP read of each site — our own User-Agent, robots respected,
one request per path, 1.5s apart. Where a site renders its content behind JavaScript the
read is thin, and that is marked rather than glossed over.

| | count |
|---|---|
| decided IN | 11 |
| decided OUT | 9 |
| parked pending the recovery pass | 1 |

---

## Dance — rule 1 (technique/social out, dance-fitness in)

**The test: selling technique, or selling sweat.**

| Business | Verdict | What decided it |
|---|---|---|
| Jazzercise (Austin Rec Center) | **IN — Classes** | Dance-fitness, the canonical cardio-dance brand; the site's own words are "dance fitness". This is the case rule 1 exists to admit. |
| Ballet Austin | OUT | Ballet, auditions, choreography, private lessons. Named in the rule. |
| Esquina Tango | OUT | Tango. Named in the rule. |
| Dance With Me Austin | OUT | Ballroom chain — bachata, foxtrot, salsa, tango, waltz, technique, performance team. Carries some Zumba marketing, but the product sold is ballroom technique. |
| Austin Uptown Dance | OUT | Ballroom, private lessons, wedding dance. |
| Go Dance Studio | OUT | Ballroom, private lessons. |
| Dance Austin Studio | OUT | Adult drop-in classes, but in dance styles taught as technique (ballet among them), not as a workout. Drop-in pricing is not the test; what is being sold is. |
| Evenground Dance Studio | OUT | Auditions and choreography — performance training. |
| BB Dance Collective | OUT | Adult and teen ballet. **Thin evidence** — the site rendered 881 characters to an honest fetch; verdict rests on "ballet" plus the studio's own framing. |
| Shuffle HQ Dance and Fitness Studio | **IN — Classes** | **Owner ruling 2026-08-20.** They sell it as a workout and price it as fitness classes. The sweat test is about **what the customer buys**, not whether a technique exists to be taught — which resolves the tie the evidence could not. |
| Austin Ecstatic Dance Center | OUT | Ecstatic dance is a free-form social movement gathering — it sells neither instruction nor a workout, and rule 1 excludes social/art-form. **The closest call in this set**: read "sweat" broadly and it flips. Flagging rather than hiding it. |

## Martial arts — rule 2 (in as Classes where adult class or drop-in pricing exists)

| Business | Verdict | What decided it |
|---|---|---|
| Analog Jiu Jitsu | **IN — Classes** | Adult programme, day pass, drop-in and walk-in all published; $20/$25 visible. |
| East Austin Jiujitsu Parlor | **IN — Classes** | Adults, day pass at $20, memberships $110–$200. Also publishes a **steam room** — feeds `steam_room: true` when the row is written. |
| Fighting Fit Kickboxing & Jiu Jitsu | **IN — Classes** | Adult, men's and women's classes; day pass and drop-in; $39 entry figure. |
| Black Widow MMA | **IN — Classes** | Adult programme, drop-in and walk-in, $15 single visit. |
| Austin Women's Boxing Club | **IN — Classes** | Adult, drop-in, first class free, $30/$35. Carries `eligibility: "women_only"` (see below). |
| AMP BJJ Northwest Hills | **IN — Classes** | Adult programme alongside kids'; $39–$198 tiers. Adult offering present, so rule 5 is satisfied too. |
| Shield Brazilian Jiu-Jitsu | **IN — Classes** | Day pass published at $20, membership $150. Clears rule 2 on the drop-in limb. |
| TITLE Boxing Club Austin North | **IN — Classes** | National adult fitness-boxing franchise. Prices sit behind a ClubReady widget, so it joins the human-read list — but its scope is not in doubt. |
| Barbells & BJJ | **IN — pending one read** | Rule 2 decides the test; the evidence does not yet answer it. The honest fetch found $150/$349 but **no adult or drop-in signal**. One confirming read settles it; until then it does not get written. |

## Recovery — rule 4

| Business | Verdict | What decided it |
|---|---|---|
| YTX Yoga, Strength, Pilates, & Recovery | **IN — Classes** | **Not recovery-only.** It teaches yoga, strength and pilates; the cold plunge, sauna, infrared and red light are amenities on top. The original triage note — "Recovery/wellness — not a place you train" — was simply wrong. Its four recovery modalities populate `sauna` / `cold_plunge` when the row is written. |

---

## Ruled and parked

- **Shuffle HQ — ruled IN as Classes** (owner, 2026-08-20). The sweat test asks what the
  customer buys, not whether a technique exists. Moved into the dance table above.
- **StretchLab Mueller — parked**, pending the recovery pass, which is likely to settle
  the category logic it sits inside. One row does not change launch.

---

## Consequences the rules force elsewhere

- **Generator Athlete Lab — back in scope, and the read is done.** Rule 4 reverses its §1
  exclusion. The read settles the category: its product is the **Recovery Lab** — a
  Day Pass at **$75 + tax**, a 5-pack at **$325** and a 10-pack at **$550**, each session
  "a private full-spectrum infrared sauna" of 1–1.5 hours, plus monthly memberships and a
  $65 assessment. Massage and personal training are add-ons and are **ignored under rule 3**.
  **Verdict: `category: "recovery"`, `access_model: "facility"`** — you buy access to a
  room, priced per visit, with day-pass economics. Not written; awaiting your pass.
- **Ballet Austin splits from its own Butler Center — now its own entity** (owner ruling,
  2026-08-20). `Ballet Austin's Butler Center for Dance & Fitness` publishes adult drop-in
  fitness at $3–$5 and enters the judgment pile in its own right; the parent ballet
  company stays excluded. Two businesses at one address, ruled separately.
- **The East Austin Jiujitsu Parlor's PT arm stops mattering.** "Physical Therapy — East
  Austin Jiujitsu Parlor" sits in the sweep's set-aside pile as out of v1 scope. Rule 3
  resolves it: PT offered alongside is ignored, and the parlor lists on its BJJ economics.
- **Austin Women's Boxing Club — resolved by a new field** (owner ruling, 2026-08-20).
  `eligibility` now exists alongside `restricted`, because who may join and what a plan
  buys are different questions: overloading `restricted` would have made the plan table
  claim the product was limited when it is the membership base that is. The club proceeds
  under `eligibility: "women_only"`.

## If every IN verdict is written

11 businesses join the pipeline: 2 dance-fitness (Jazzercise, Shuffle HQ), 8 martial-arts
(one pending a read), 1 multi-discipline studio. All are **Classes**-model, so they land
on the Classes tab and are judged per class. **None moves the Memberships coverage
number** — which is worth saying plainly, because the ledger is a Memberships figure and
eleven new rows would not shift it by one.
