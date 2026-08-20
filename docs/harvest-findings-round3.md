# Harvest findings — the five sourceable-human reads (2026-08-20)

The five gyms `docs/awaiting-classification.md` classified as confirmable without owner
contact. **Nothing here has been written to `/data`** — per §9b these are findings for you
to cherry-pick.

**1 of 5 harvested.** The other four need a real browser, which was not available this
round: the Claude-in-Chrome extension is not connected, so the "human read" half of the
plan could not run. Two of the four are bot walls we do not fight in any case.

| Gym | Outcome |
|---|---|
| CorePower Yoga Austin | **HARVESTED** — full price list below |
| Studio Three | Not harvested — Mariana Tek widget, prices behind JS |
| Gold's Gym Downtown | Not harvested — checkout shell + robot check |
| Gold's Gym Austin (Burnet) | Not harvested — same |
| Planet Fitness E. Riverside | **STOPPED** — bot wall, per §6 |

---

## CorePower Yoga Austin — harvested

`source_url`: `https://www.corepoweryoga.com/yoga-studios/tx/austin/mueller`
`date_read`: **2026-08-20**

**The SELECT STUDIO gate was a wrong-URL problem, not a gate.** The studio's own page
publishes the full list with no interaction at all. Our row's address (Aldrich Street,
78723) is the Mueller studio, so this is the right page for this row — worth stating
because CorePower prices per studio and the brand page shows none.

### Membership

| Plan | Rate | Notes |
|---|---|---|
| All Access Membership | **$189 / mo** | Unlimited Studio + Live + On Demand |
| New Member Intro Month | **$99 first month**, then $189/mo | **Promo — standing rate is $189.** Site's words: "Starting at only $99 … $189 / mo after your first month" |
| 20% off for eligible groups | — | Verification-gated (students/military and similar). `restricted` — never the headline |

### Class packs — all usable at any CorePower studio

| Pack | Price | Expires | $/class |
|---|---|---|---|
| 1 class | $35 | 30 days | $35.00 |
| 5 classes | $169 | 6 months | $33.80 |
| 10 classes | $279 | 1 year | $27.90 |
| 20 classes | $530 | 1 year | $26.50 |
| 30 classes | $765 | 18 months | $25.50 |
| 50 classes | **$1,225** | 18 months | **$24.50** ← cheapest attainable |

`from_per_class` would compute to **$24.50**, from the 50-pack. No promo pack is present,
so nothing is excluded on that ground.

### Fee fine print — read carefully, because this is the interesting part

The page carries **no enrollment fee and no annual fee**, but it does disclose:

> "…subject to the CorePower Yoga Terms of Use which include an Arbitration Agreement…"
> "…taxes, discounts, and **CorePower surcharges**."
> "Membership purchases are **nonrefundable** except where required by law."

**"CorePower surcharges" is a disclosed fee with no published amount.** That is a real
finding for a price-transparency site and it belongs in the plan `note` — but it is not a
number, so it cannot enter all-in math.

**One decision needed before this row can be written.** `enroll_fee` and `annual_fee`:
the page does not state them, which by §3 means `null` — but the validator requires both
to be non-null on any plan carrying a `monthly`, precisely so a price can never silently
understate its all-in. So this row forces a choice:

- write `0` — asserts CorePower charges neither, which the page does not say; or
- write `null` — honest, and the validator rejects it today.

I have not guessed. My read is that the rule is right and the schema is right, and what
is missing is a third state for "the page lists a rate and mentions no joining fee" —
but that is a product call, so it is yours. **It blocks only this row's `enroll_fee` /
`annual_fee`; every other figure above is confirmed.**

`access_model` would be `classes` (you buy instructed sessions), `category: "yoga"`.
Note the $189 unlimited plan publishes no class count, so it contributes no per-class
figure — the packs do all the work, exactly as §3 intends.

---

## Studio Three — not harvested

Root, `/buy`, `/austin` and `/locations/austin` all return HTTP 200 and render:

> "Please enable JavaScript to view the Web Integrations by Mariana Tek."

Prices are inside the Mariana Tek booking widget. **This is not a bot wall** — the site
serves us willingly — it is simply client-rendered. `/pricing` and `/memberships` are 404.
Stays `sourceable-human`: one browser read of the widget settles it.

## Gold's Gym Downtown and Austin (Burnet) — not harvested

`/join/` resolves to `/locations/tx/austin-downtown/join/` and `/locations/tx/austin-burnet/join/`.
Both return HTTP 200 at ~260 KB and both are checkout shells: every figure is `$0.00`, and
the flow ends at **"Please verify that you are not a robot."** That is a robot check, so
per §6 the automated read stops there rather than walking the flow.

**New finding, and a trap worth recording:** the shell renders with
**Gold's Gym Venice, 360 Hampton Dr, Venice, CA** preselected, on *both* Austin URLs, with
a `Passport Gold Plus` plan. Anything read off that page before walking the location
selector is another club's data — the same class of misattribution as pairing probe
results by index. Recorded as a precedent in §6.

## Planet Fitness E. Riverside — stopped

`https://www.planetfitness.com/gyms/austin-e-riverside-tx` returns **HTTP 403 behind a
Cloudflare managed challenge**. Bot wall. Stopped on the target, did not try the other two
paths, did not look for a way around it. Unchanged from the previous verdict.

---

## Where this leaves the ceiling

`awaiting-classification.md` put the realistic no-reply ceiling at "about 40 of 51".
CorePower is one of those five. If you accept it, **36 of 51**; the remaining four still
need a browser, and two of them will still be walls when one is available.
