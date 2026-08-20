# The 18 awaiting gyms — classified

Every listed gym without a confirmed price, and what it will actually take to get one.

**sourceable-scrapeable** — the site publishes a price a scraper can fetch ·
**sourceable-human** — published but needs a human read (widget, interaction, bot wall) ·
**needs-owner-contact** — nothing published; goes on the outreach list ·
**dead-end** — closed, moved or out of scope; proposed for exclusion.

| Gym | Region | Class | Why, and what it needs |
|---|---|---|---|
| **Studio Three** | downtown | **sourceable-human** | `/buy` is a real page but a booking-widget shell; prices load behind further interaction. Firecrawl returned 3.5k chars and no figures. One human read of the widget. |
| **CorePower Yoga Austin** | downtown | **sourceable-human** | In-studio membership is "Starting at only $99" behind a **SELECT STUDIO** gate. The $19.99/$49 At Home tier is online-only, not the studio. Select the Austin studio and read. |
| **Gold's Gym Downtown** | downtown | **sourceable-human** | `/join/` loads fine on a plain fetch (HTTP 200, 262 KB) — the old "refuses automated access" verdict was wrong for this path. But it is a checkout shell with `$0.00` cart placeholders and a "verify that you are not a robot" step. Human walks the flow. |
| **Gold's Gym Austin (Burnet)** | hyde-park | **sourceable-human** | Same brand and same flow as Downtown. Rates may differ by club — read both. |
| **Planet Fitness E. Riverside** | east-austin | **sourceable-human** | `/offers` returns HTTP 403 behind a Cloudflare managed challenge. We do not fight bot walls (§6). PF publishes standard tiers publicly; a human read settles it. |
| **Flow Pilates ATX** | east-austin | **needs-owner-contact** | Publishes only the intro offer ($34.99 for two classes, $30 off a first month). `/pricing` returns the same page; the "View Memberships" link goes nowhere new. Standing rates are not on the site. |
| **Barry's Austin** | downtown | **needs-owner-contact** | The studio page is real (Firecrawl, 14k chars) and contains **no figures at all** — only a link labelled "explore our packs and memberships". |
| **Orangetheory Austin** | mueller | **needs-owner-contact** | The brand page publishes tier *structure* (Premier / Elite / Basic) but **no prices**, and states studios are individually owned and "prices do vary". The only figure is a $35 recommended casual-visit rate that explicitly is not the studio's. Per-studio contact. |
| **Equinox Austin (SoCo)** | downtown | **needs-owner-contact** | Confirmed genuinely visit-gated by the owner. Stays listed as call-for-pricing permanently if need be — people search the name, and "they don't publish it" is the answer we owe them. |
| **Equinox Domain** | the-domain | **needs-owner-contact** | As above. |
| **24 Hour Fitness Hancock Center** | hyde-park | **needs-owner-contact** | The published membership URL is a **soft 404** — HTTP 200 with the page title `404 | 24 Hour Fitness`. Club rates sit behind a point-of-sale redirect. No URL fixes a dead URL. |
| **24 Hour Fitness Austin Sport (Research Blvd)** | the-domain | **needs-owner-contact** | As above. |
| **Anytime Fitness North Loop** | hyde-park | **needs-owner-contact** | Multi-step enquiry form; no published rate. Outreach pending. Note the brand has **8 Austin locations** — one representative row unless rates differ. |
| **CrossFit Austin** | south-soco | **needs-owner-contact** | Multi-step form, no published rate. Outreach pending. |
| **10th Planet Jiu Jitsu Austin** | east-austin | **needs-owner-contact** | Nothing published. Outreach form already submitted by the owner. |
| **Kollective** | south-soco | **needs-owner-contact** | The seed URL is wrong and the correct site has not been found. Consult-gated in any case. Needs the real site before anything else. |
| ~~Rumble Boxing South Austin~~ | south-soco | **EXCLUDED 2026-08-19** | The only figure published is an intro offer, "3 classes for $59". More decisively, the studio the discovery probe found is **Southpark Meadows**, which is **outside all six region circles**. If the listed row refers to a South Austin studio we cannot locate, it should not be carrying a region. |
| ~~FeV Iron Vault Gym~~ | downtown | **EXCLUDED 2026-08-19** | Website entirely down. Possibly closed. Needs a does-it-still-exist check; if closed, exclude with the reason recorded. |

## Merges with discovery finds

- **Austin Bouldering Project** ↔ discovery's **"Bouldering Project – Springdale"** are the
  **same gym** (979 Springdale Rd). The harvest re-confirmed our existing figures exactly —
  $95 adult, $85 young adult, $55 youth, $55 activation — so no change was needed. Its
  sibling **Westgate** (4477 S Lamar) is a genuinely new location and is now listed; one
  membership covers both sites.
- **Flow Pilates ATX** appears in discovery as both itself and, through a mispaired name in
  an early read, alongside "Haus of B. Pilates". They are different businesses on different
  domains; only Flow Pilates is listed.

## Launch-gate read

Of the 49 listed, **35 now carry a confirmed price**. Of the 18 awaiting, **5 are
realistically confirmable without owner contact** — Studio Three, CorePower, both Gold's
clubs and Planet Fitness — all by a human read rather than a scraper.

**That puts the realistic ceiling at about 40 of 49 without a single reply**, with the
remaining 9 split between genuinely consult-gated brands (Equinox ×2, Orangetheory,
Kollective, Barry's), enquiry-form brands (Anytime, CrossFit Austin, 10th Planet), and
two proposed exclusions. The discovery triage is where the number grows past that.
