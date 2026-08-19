# Launch checklist

Step 9 of the build order. Everything except the domain connection is done and
verifiable from here; the domain click-through is the owner's, and is gated on
the data threshold below.

Run `node scripts/launch-check.mjs` for the machine-checkable parts.

---

## Gate 1 — data (the actual blocker)

**There is no confirmed-price threshold.** We launch on what we can
definitively source. The old "≥33 of 41" bar assumed the seed list was the
census; it is not, and a fixed number would either block a launch that is ready
or invite padding the data to clear it. What cannot move is traceability: every
number we print must have a source.

- [ ] **Read the coverage report**, do not chase a number:
      `node scripts/launch-check.mjs` prints confirmed count, per-region
      coverage, and the transcription/outreach queues. It fails only on a real
      defect, never on a count.
- [ ] Consult-gated brands (Equinox, Kollective, Orangetheory, Barry's…)
      **stay listed** in the "call for pricing" state. People search those
      names, and "they don't publish it" is itself the answer we owe them.
      They are not blockers.
- [ ] Every shipped number traceable to a source — a gym's own page, or a
      collection call. No estimates, no national averages.
- [ ] `known_for` written for the gyms that have one. Null renders nothing, so
      partial coverage ships fine.
- [ ] Coordinates for as many gyms as have confirmed addresses. A gym without
      coordinates simply gets no pin; it is not an error.
- [ ] Owner has clicked through every gym page once (§9).

## Gate 2 — automated checks

All of these run in CI on every push. Green is required, not advisory.

- [ ] `npm run verify` passes locally: lint → data → build → CSP → search →
      tabs → map → a11y.
- [ ] `python3 scrapers/tests/test_parsers.py` passes (parsers + fixture
      hygiene).
- [ ] Lighthouse ≥95 on all four categories. Run the **Lighthouse** workflow
      manually against the live URL; it also runs weekly.
- [ ] `node scripts/smoke-deploy.mjs <url>` passes against the deployed site.

## Gate 3 — secrets and automation

- [x] `FIRECRAWL_API_KEY` in repo secrets (Settings → Secrets and variables →
      Actions). Without it the scrape workflow fails at the fetch step.
- [x] `SENTRY_DSN` in repo secrets. Optional — the scrapers degrade to
      quiet-but-working without it — but §8 wants it.
- [x] Scrape workflow dry-run succeeds: Actions → Scrape prices → Run workflow
      → `dry_run: true`. Weekly dry-run green, cron armed.
- [ ] First real scrape opens a PR, and the diff looks right. No bot can merge
      it; that is deliberate.
- [ ] **Remove the ruleset bypass on `main` — AT LAUNCH, not before.**
      `main protection` is active (deletion, non-fast-forward, PR, and the
      `Lint, validate, build` + `Scraper audit` checks) but carries a
      `RepositoryRole` bypass with mode `always`, which is why direct pushes
      still land. That bypass is deliberate while the site is being built in
      batches and is the reason §8's "branch protection from day 1" is only
      half true today. At launch, drop the bypass so the required checks
      actually gate `main`:
      `gh api -X PUT repos/NoobBuilding/austingymprices/rulesets/<id> -f bypass_actors='[]'`
      (or Settings → Rules → main protection → remove the bypass actor).
      Verify by attempting a direct push and watching it be refused.

## Gate 3b — event counting (start BEFORE launch)

The outbound-click dataset cannot be reconstructed retroactively, so it has to
be counting before the first visitor arrives, not after the first gym asks what
we did for them.

- [ ] **Create the D1 database and bind it.** Cloudflare dashboard → Workers &
      Pages → D1 → create `austingymprices`, then bind it to the Pages project
      as **`DB`** (Settings → Functions → D1 database bindings). Free tier is
      ample: 100k writes/day against a site that will not see thousands.
- [ ] **Apply the schema:**
      `npx wrangler d1 execute austingymprices --remote --file=migrations/0001_events.sql`
- [ ] **Verify a click lands.** Open a gym page on the deployed site, click
      "Visit gym website", then:
      `npx wrangler d1 execute austingymprices --remote --command "SELECT * FROM events"`
      Until the binding exists the endpoint answers 204 and counts nothing —
      by design, so a missing binding can never break a visitor's click-through.
- [ ] **Enable Cloudflare Web Analytics** for pageviews (dashboard toggle;
      Pages injects the script). **This requires a CSP change** —
      `script-src` must gain `https://static.cloudflareinsights.com` and
      `connect-src` `https://cloudflareinsights.com`, or the beacon is refused
      silently in production. Do not enable it without editing `public/_headers`
      in the same change, and re-run `npm run smoke` afterwards.
- [x] **Rate-limit `/api/event`** — done in the function itself (60/min per IP)
      rather than as a WAF rule, so it lives in the repo, deploys with the code,
      and cannot be silently absent on a fresh environment. Add a WAF rule on
      top if traffic ever warrants it.
- [ ] **Turn Cloudflare Web Analytics ON** (dashboard → Web Analytics → enable
      for this Pages project). The CSP already allows
      `static.cloudflareinsights.com` and `cloudflareinsights.com`, so the
      beacon will not be refused — but confirm with `npm run smoke` and a live
      console check afterwards.

## Gate 4 — the domain (owner, manual, last)

Deliberately last: connecting the domain is what makes the site findable, and
it should happen after the data threshold is met, not before.

- [ ] Cloudflare Pages → the project → Custom domains → add
      **austingymprices.com** and **www.austingymprices.com**.
- [ ] Add **atxgymprices.com** and configure a **301 redirect** to
      austingymprices.com via a Cloudflare Redirect Rule (§2). A redirect rule,
      not a second Pages project.
- [ ] DNS propagated; `https://austingymprices.com` serves the site.
- [ ] `curl -I https://atxgymprices.com` returns **301** to the primary domain.
- [ ] Cloudflare Email Routing: `hello@` and `reports@` forward to the owner's
      inbox (§2). **Test both by sending a real email** — every correction path
      on the site is a mailto to `reports@`, so if that bounces the site has no
      feedback channel at all.
- [ ] Re-run `node scripts/smoke-deploy.mjs https://austingymprices.com` once
      the domain is live, to confirm the security headers followed it.
- [ ] Re-run the Lighthouse workflow against the real domain.

## Gate 4b — Founder Campaign (launch week, after the domain flip)

Fires **after** gym pages are live on the real domain, alongside the Reddit
post — not before. See CLAUDE.md §10 for the full framing.

- [ ] **@austingymprices Instagram handle secured** (owner).
- [ ] **hello@ routing verified end-to-end** — send a message to it from an
      outside address and confirm it lands. The campaign invites replies to it.
- [ ] Contact emails extracted for the independent gyms in the discovery set.
- [ ] `docs/founder-campaign.html` generated: one row per gym, page URL,
      contact, one shared template personalised only by gym name and link.
- [ ] Owner sends every message personally. No bulk send, no automation.

**Ethics guardrail, non-negotiable:** the Instagram tag ask is an invitation
**after the fact**, never a condition of listing. Every sourceable gym is listed
regardless of whether it replies, tags, links, or ignores us entirely. If a
version of this email would read differently to a gym that said no, it is the
wrong email.

## Gate 5 — post-launch, first week

- [ ] Watch for the first scraper PR and merge or reject it deliberately.
- [ ] Check Sentry for scraper errors after the first scheduled run.
- [ ] Re-check the Planet Fitness promo state after its offer expires — the
      gym currently ships with no standing rate at all, by design.
- [ ] Anything reported via `reports@` gets checked against the gym's own page
      and fixed.

---

## Known, accepted, not blocking

These are deliberate positions, recorded so nobody rediscovers them as bugs.

- **Three targets cannot be scraped.** Gold's Gym refuses automated access
  entirely (timeouts ordinary and stealth; join flow 500), Castle Hill renders
  rates client-side, and 24 Hour Fitness hides them behind a point-of-sale
  redirect. All three are `manual` and stay on the outreach list.
- **OG cards do not use Barlow Condensed.** librsvg resolves fonts through
  fontconfig and cannot read our woff2 files. Colours, wordmark and message are
  correct; only the face differs, and only in link previews.
- **Two urllib3 advisories are ignored** with a written reason and a removal
  condition in `scrapers/pip-audit-ignore.txt`. The named fix has not been
  published.
- **The map default view frames central Austin**, not every pin. Life Time
  North at Lakeline is reachable by panning and does not get to set the frame.
- **`.pin.active` must stay declared last** in the map CSS. Two separate bugs
  came from a later rule quietly winning at equal specificity;
  `scripts/check-map.mjs` asserts the ordering.
