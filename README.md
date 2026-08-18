# austingymprices.com

Gym price transparency for Austin, TX. Every gym's real membership cost —
monthly rate plus enrollment fee, annual fee and contract terms — shown side
by side, with the date each price was last checked.

**[CLAUDE.md](./CLAUDE.md) is the source of truth for every product decision.**
If this README and CLAUDE.md ever disagree, CLAUDE.md wins.

## Running it locally

```bash
npm install
npm run dev          # http://localhost:4321
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run lint` | ESLint, including the `no-console` and no-`innerHTML` rules |
| `npm run validate:data` | Check every `data/gyms/*.json` against the §3 schema |

## Layout

```
data/gyms/*.json     source of truth, one file per gym
data/regions.json    region ids, display names, map label positions
src/                 Astro site
public/fonts/        self-hosted woff2 — no runtime request to Google Fonts
public/_headers      Cloudflare Pages security headers (CSP et al.)
scrapers/            Python; harvest.py is the one-time seed pass
scripts/             build-time Node utilities
docs/                build brief, mockups, seed spreadsheet
```

## Rules that are not negotiable

- **No secrets in the client bundle, ever.** The Firecrawl key lives only in
  GitHub Actions secrets. `.env` is gitignored; `.env.example` documents the
  variables with placeholders.
- **Scraped content is untrusted input.** A gym's own webpage flows into our
  JSON, so gym names and notes render through Astro's escaping — never
  `innerHTML` or `set:html`. ESLint enforces this.
- **No invented numbers.** Every price on the site traces to the seed list or
  a scraper run. A gym without a confirmed price renders the
  "call for pricing" state — never a guess, never a placeholder.
