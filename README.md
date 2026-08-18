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
| `npm run check:csp` | Scan `dist/` for anything the CSP would refuse |
| `npm run verify` | The full local gate: lint → data → build → CSP |
| `npm run smoke <url>` | Assert security headers and asset reachability on a **deployed** URL |

> **`public/_headers` only applies on Cloudflare Pages.** `astro dev` and
> `astro preview` do not serve it, so the CSP is absent locally and present in
> production. Anything the CSP refuses — an inlined script or style, an
> `onclick=` — passes locally and fails silently once deployed. Nothing
> involving client-side JS is done until it has been exercised on the deployed
> `.pages.dev` URL with the browser console open.

## Deploying (Cloudflare Pages)

The site deploys to Cloudflare Pages. Connecting the repo is a one-time
dashboard step — Pages' Git integration requires the Cloudflare↔GitHub OAuth
handshake and cannot be created from the API.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**
2. Authorise GitHub, pick **NoobBuilding/austingymprices**
3. Build settings:

   | Setting | Value |
   |---|---|
   | Framework preset | Astro |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | *(leave blank)* |
   | Node version | 22 (read from `.nvmrc`) |

4. Save and deploy. Every push to `main` then builds to the project's
   `*.pages.dev` URL, and every PR gets a preview deployment.

No environment variables are needed for the site build — it has no secrets
(that is the point of §8). The custom domain stays disconnected until
build-order step 9.

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
