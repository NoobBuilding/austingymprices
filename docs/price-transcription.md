# Human price transcription sheet

For gyms whose pricing pages we cannot read automatically — bot challenges
([solidcore], Planet Fitness, Gold's join flow), interaction-gated widgets
(Studio Three, Barry's, CorePower), or figures captured by screenshot (F45).

**A transcribed price carries exactly the same provenance burden as a scraped
one.** The site's whole claim is that every number is traceable, so each row
needs a source URL and the date it was read. A row missing either does not get
written — same rule that stops a scraper writing an unverified number.

## How to use

Fill one block per **plan**, not per gym — a gym with three tiers gets three
blocks. Copy the template, paste it filled into chat, and I will convert it to
`/data/gyms/*.json` and show you the diff before anything is committed.

Leave a field **blank** if the page does not state it. Do not guess, and do not
write `0` for "not mentioned" — blank means "not published", `0` means "the page
says zero". That distinction is the difference between an honest gap and an
invented fact.

## Template

```
gym:            <slug or gym name, e.g. solidcore-downtown>
plan:           <exact plan name as written on the page, e.g. "4 classes/month">
price:          <number only, e.g. 179>
period:         <monthly | 4-week | weekly>
enroll_fee:     <one-time joining/initiation fee, number only>
annual_fee:     <recurring non-monthly fee, number only>
commitment:     <months, e.g. 0 for none, 12 for a year; blank if not stated>
restricted:     <blank | student | youth | young-adult | senior | military | household | scope>
promo:          <blank, or e.g. "$0 join fee through Aug 30">
day_pass:       <number only, blank if none>
note:           <anything a member would be surprised by — fee timing, freeze
                 charges, what the plan excludes>
source_url:     <the exact page you read it on>
date_read:      <YYYY-MM-DD>
```

## Filled example

```
gym:            korrect-fitness
plan:           Core Membership — Month to Month
price:          199
period:         monthly
enroll_fee:
annual_fee:     100
commitment:     2
restricted:
promo:
day_pass:
note:           $50 Facility Enhancement Investment charged each Apr 1 and Oct 1.
                Month-to-month requires a 2-month minimum.
source_url:     https://www.korrectfitness.com/memberships
date_read:      2026-08-19
```

## Notes on specific fields

- **price** is the advertised rate, not the all-in figure. The site computes
  all-in itself; giving it a pre-blended number would double-count the fees.
- **annual_fee** is the yearly total of any recurring non-monthly charge. Korrect
  bills $50 twice a year, so `annual_fee: 100` with the timing in `note`.
- **period** matters: if the gym bills every 4 weeks that is 13 payments a year,
  not 12, and the site must not silently convert it.
- **promo** never replaces `price`. The standing rate drives every calculation;
  the promo renders as a flag. If a page *only* ever shows a promo price, leave
  `price` blank and say so in `note` — better an unpriced gym than a promo
  number promoted to standing.
- **date_read** becomes the gym's `verified_date` and is what the site displays
  as "Prices checked {date}". It is a claim we make in public, so it must be the
  day you actually read the page.
