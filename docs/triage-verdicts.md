# Triage verdicts — the 21 judgment items

The five scope rules of 2026-08-20 (CLAUDE.md §6, "Scope precedents") applied to
category (b) of `docs/discovery-triage.md`. **Nothing here has been written to `/data`.**

Evidence is an honest HTTP read of each site — our own User-Agent, robots respected,
one request per path, 1.5s apart. Where a site renders its content behind JavaScript the
read is thin, and that is marked rather than glossed over.

| | count |
|---|---|
| decided IN | 10 |
| decided OUT | 9 |
| rules genuinely do not decide | 2 |

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
| Austin Ecstatic Dance Center | OUT | Ecstatic dance is a free-form social movement gathering — it sells neither instruction nor a workout, and rule 1 excludes social/art-form. **The closest call in this set**: read "sweat" broadly and it flips. Flagging rather than hiding it. |

## Martial arts — rule 2 (in as Classes where adult class or drop-in pricing exists)

| Business | Verdict | What decided it |
|---|---|---|
| Analog Jiu Jitsu | **IN — Classes** | Adult programme, day pass, drop-in and walk-in all published; $20/$25 visible. |
| East Austin Jiujitsu Parlor | **IN — Classes** | Adults, day pass at $20, memberships $110–$200. Also publishes a **steam room** — feeds `steam_room: true` when the row is written. |
| Fighting Fit Kickboxing & Jiu Jitsu | **IN — Classes** | Adult, men's and women's classes; day pass and drop-in; $39 entry figure. |
| Black Widow MMA | **IN — Classes** | Adult programme, drop-in and walk-in, $15 single visit. |
| Austin Women's Boxing Club | **IN — Classes** | Adult, drop-in, first class free, $30/$35. See the open question below on women-only. |
| AMP BJJ Northwest Hills | **IN — Classes** | Adult programme alongside kids'; $39–$198 tiers. Adult offering present, so rule 5 is satisfied too. |
| Shield Brazilian Jiu-Jitsu | **IN — Classes** | Day pass published at $20, membership $150. Clears rule 2 on the drop-in limb. |
| TITLE Boxing Club Austin North | **IN — Classes** | National adult fitness-boxing franchise. Prices sit behind a ClubReady widget, so it joins the human-read list — but its scope is not in doubt. |
| Barbells & BJJ | **IN — pending one read** | Rule 2 decides the test; the evidence does not yet answer it. The honest fetch found $150/$349 but **no adult or drop-in signal**. One confirming read settles it; until then it does not get written. |

## Recovery — rule 4

| Business | Verdict | What decided it |
|---|---|---|
| YTX Yoga, Strength, Pilates, & Recovery | **IN — Classes** | **Not recovery-only.** It teaches yoga, strength and pilates; the cold plunge, sauna, infrared and red light are amenities on top. The original triage note — "Recovery/wellness — not a place you train" — was simply wrong. Its four recovery modalities populate `sauna` / `cold_plunge` when the row is written. |

---

## The rules genuinely do not decide these two

1. **Shuffle HQ Dance and Fitness Studio.** Shuffle is an art-form with a technique to
   learn, and the studio sells it as fitness — its own name claims both halves of rule 1's
   test. The site rendered 2.4k characters and offered "technique" and "drop-in" and
   nothing that breaks the tie. **Your call.**
2. **StretchLab Mueller.** Surfaced by the recovery re-scan rather than the 21. Assisted
   1-on-1 stretching: rule 3 says pure 1-on-1 with no self-directed offering is out,
   rule 4 says recovery is in, and it is genuinely both. It also fails item 2's own test
   for the category — it is **not facility-model**, being appointment-based, so it would
   not price like the sauna houses the Recovery tab is being built for. **Your call.**

---

## Consequences the rules force elsewhere

- **Generator Athlete Lab is back in scope.** Rule 4 reverses its §1 exclusion outright —
  it was set aside as a "recovery studio" when there was nowhere to put one. It publishes
  a day pass, $65/$75/$99 figures, and sauna / infrared / red light. Whether it is
  `recovery` or `classes` needs one read: it markets as an endurance-performance lab, and
  the category turns on whether recovery is the whole product or half of it.
- **Ballet Austin splits from its own Butler Center.** `Ballet Austin's Butler Center for
  Dance & Fitness` is a **separate candidate** in the sweep, publishing adult drop-in
  fitness classes at $3–$5. Rule 1 sends the ballet company out and the dance-fitness arm
  in. It sits in pile (a), not the 21, so it is flagged rather than ruled on here.
- **The East Austin Jiujitsu Parlor's PT arm stops mattering.** "Physical Therapy — East
  Austin Jiujitsu Parlor" sits in the sweep's set-aside pile as out of v1 scope. Rule 3
  resolves it: PT offered alongside is ignored, and the parlor lists on its BJJ economics.
- **Austin Women's Boxing Club raises a schema question, not a scope one.** A solo adult
  woman can buy it; a man cannot. The `restricted` enum has no value for that, and
  `"scope"` means partial *access*, not eligibility. It is in scope either way — but the
  badge needs a ruling before the row is written.

## If every IN verdict is written

10 businesses join the pipeline: 1 dance-fitness, 8 martial-arts (one pending a read),
1 multi-discipline studio. All are **Classes**-model, so they land on the Classes tab and
are judged per class. None of them moves the Memberships coverage number.
