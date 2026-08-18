#!/usr/bin/env python3
"""
One-time seed harvest for austingymprices.com.

This is NOT the nightly pipeline. It is a single manual pass that fetches each
scraper target's pricing page once and dumps the raw markdown to disk so a human
can read it and verify prices by hand. Per CLAUDE.md §3, extraction of prices is
a human-verified step — this script deliberately does not parse, does not write
to /data, and does not touch the seed xlsx.

Usage
  python3 scrapers/harvest.py --list          # show the resolved plan, no API calls, no credits
  python3 scrapers/harvest.py                 # harvest every target
  python3 scrapers/harvest.py bigtex crux     # harvest only named targets

Requires FIRECRAWL_API_KEY in the environment or in a local .env (gitignored).
Stdlib only — no pip install needed.

Compliance (CLAUDE.md §6): robots.txt is checked before each fetch, the honest
project User-Agent is sent, one request per target per run, public pricing pages
only. Nothing behind an auth wall or paywall is requested.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import urllib.robotparser
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

class ScrapeError(Exception):
    """One target failed. The run continues with the next target."""


REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_XLSX = REPO_ROOT / "docs" / "austin-gym-seed-list.xlsx"
OUT_DIR = Path(__file__).resolve().parent / "harvest_output"

USER_AGENT = "austingymprices.com price checker; reports@austingymprices.com"
FIRECRAWL_ENDPOINTS = (
    "https://api.firecrawl.dev/v2/scrape",
    "https://api.firecrawl.dev/v1/scrape",
)
REQUEST_TIMEOUT = 300       # Firecrawl renders JS; Gold's is very slow
POLITE_DELAY_SECONDS = 3    # between targets

# ---------------------------------------------------------------------------
# URL resolution.
#
# The "Pricing URL pattern" column in the Scraper Targets sheet is a pattern,
# not always a fetchable URL — six rows contain a {slug} placeholder or a prose
# description like "goldsgym.com club pages". Those are resolved here, and every
# resolution is labelled so the owner can correct it before credits are spent:
#
#   confidence="sheet"  the sheet gave a literal path; only the scheme was added
#   confidence="guess"  the pattern was ambiguous and this URL is my best guess
#
# Nothing here is a price. Guessed URLs that return the wrong page cost one
# credit and get corrected — they never become data.
# ---------------------------------------------------------------------------
URL_OVERRIDES = {
    "planetfitness": (
        "https://www.planetfitness.com/gyms/austin-e-riverside-tx/offers",
        "guess",
        "Sheet gives planetfitness.com/gyms/{club-slug}/offers. Seed row 11 is "
        "'Planet Fitness E. Riverside'; club slug guessed from PF's usual "
        "{neighborhood}-{state} form. Verify the slug on planetfitness.com.",
    ),
    "crunch": (
        "https://www.crunch.com/locations/south-austin",
        "guess",
        "Sheet gives crunch.com/locations/{slug}. Seed row 21 is 'Crunch South "
        "Austin'; slug guessed. Verify on crunch.com/locations.",
    ),
    "goldsgym": (
        "https://www.goldsgym.com/locations/tx/austin-downtown/",
        "pattern-matched",
        "Sheet says only 'goldsgym.com club pages'. The first guess "
        "(goldsgym.com/austin-downtown/) timed out twice. The owner-verified "
        "Burnet URL shows the real shape is /locations/tx/{club}/, so the "
        "Downtown URL is realigned to match. Still needs eyeballing.",
    ),
    "lifetime": (
        "https://www.lifetime.life/locations/tx/austin-south/memberships.html",
        "pattern-matched",
        "Sheet's lifetime.life/locations/tx/{slug}.html was wrong — the first "
        "guess returned a hard 404. The owner-verified Downtown/North URLs show "
        "the real shape is /locations/tx/austin-{area}/memberships.html, so "
        "South is realigned to match. Covers seed row 20 ($259).",
    ),
    "24hour": (
        "https://www.24hourfitness.com/gyms/austin-tx/",
        "sheet",
        "",
    ),
    "ymca": (
        "https://www.austinymca.org/join",
        "sheet",
        "",
    ),
    "lacampeones": (
        "https://www.loscampeonesaustin.com/austin-gym-memberships",
        "sheet",
        "",
    ),
    "bigtex": (
        "https://www.bigtexgym.com/membership",
        "sheet",
        "",
    ),
    "castlehill": (
        "https://www.castlehillfitness.com/memberships",
        "sheet",
        "",
    ),
    "hydepark": (
        "https://www.hydeparkgym.com/membership-info",
        "sheet",
        "",
    ),
    "eaac": (
        "https://www.eastaustinathleticclub.com/prices-1",
        "sheet",
        "",
    ),
    "crux": (
        "https://www.cruxclimbingcenter.com/south-austin/rates",
        "sheet",
        "",
    ),
    "abp": (
        "https://austinboulderingproject.com/membership/",
        "guess",
        "Sheet gives the bare domain. Membership path guessed; verify on site.",
    ),
    "lafitness": (
        "",
        "unresolved",
        "Sheet says only 'lafitness.com club pages' and notes a zip-gated pricing "
        "widget. LA Fitness club pages are keyed by a numeric clubid — inventing "
        "one risks silently harvesting a DIFFERENT club's prices, so this target "
        "is left blank and skipped. Needs a hand-found Domain-area club URL.",
    ),
}


# ---------------------------------------------------------------------------
# Sister locations.
#
# Four seed rows are covered by a scraper whose sheet row names only ONE club:
# Gold's covers Downtown + Burnet, Life Time covers South + Downtown + North.
# These extra club URLs are not in the sheet at all — they were hand-verified by
# the owner, which is why they carry confidence="owner" rather than a guess.
# ---------------------------------------------------------------------------
EXTRA_TARGETS = [
    {
        "slug": "lifetime-downtown",
        "covers": "Life Time Downtown (seed row 3)",
        "pattern": "(not in sheet)",
        "complexity": "Low",
        "notes": "Sister location of the `lifetime` scraper target.",
        "url": "https://www.lifetime.life/locations/tx/austin-downtown/memberships.html",
        "confidence": "owner",
        "caveat": "",
    },
    {
        "slug": "lifetime-north",
        "covers": "Life Time North / Domain area (seed row 33)",
        "pattern": "(not in sheet)",
        "complexity": "Low",
        "notes": "Sister location of the `lifetime` scraper target.",
        "url": "https://www.lifetime.life/locations/tx/austin-north/memberships.html",
        "confidence": "owner",
        "caveat": "",
    },
    {
        "slug": "lafitness-anderson",
        "covers": "LA Fitness Anderson Lane (replaces seed row 35)",
        "pattern": "(not in sheet)",
        "complexity": "Medium",
        "notes": "2020 W Anderson Ln, 78757. No Domain-area club exists; this is nearest.",
        "url": "https://www.lafitness.com/Pages/clubhome.aspx?clubid=1035",
        "confidence": "verified",
        "caveat": "clubid 1035 recovered from lafitness.com's own club-page URL "
                  "(title: 'LA Fitness | AUSTIN Gym | 2020 W ANDERSON LANE'). Not guessed.",
    },
    {
        "slug": "lafitness-slamar",
        "covers": "LA Fitness S. Lamar (NEW seed row)",
        "pattern": "(not in sheet)",
        "complexity": "Medium",
        "notes": "4001 S Lamar Blvd, 78704. Fits south-soco.",
        "url": "https://www.lafitness.com/Pages/clubhome.aspx?clubid=1036",
        "confidence": "verified",
        "caveat": "clubid 1036 recovered from lafitness.com's own club-page URL "
                  "(title: 'LA Fitness | AUSTIN Gym | 4001 S LAMAR BLVD'). Not guessed.",
    },
    # Booking/signup funnels for the boutique studios. Marketing pages never
    # show rates; the join flow sometimes does. Every URL below is a GUESS at
    # the funnel path — a 404 is a useful result, not a failure.
    {"slug": "funnel-orangetheory", "covers": "Orangetheory Austin (seed row 30)",
     "pattern": "(not in sheet)", "complexity": "Medium", "notes": "join flow",
     "url": "https://www.orangetheory.com/en-us/memberships/",
     "confidence": "guess", "caveat": "Funnel path guessed."},
    {"slug": "funnel-f45", "covers": "F45 Downtown (seed row 7)",
     "pattern": "(not in sheet)", "complexity": "Medium", "notes": "join flow",
     "url": "https://f45training.com/studio/downtown-austin/",
     "confidence": "guess", "caveat": "Studio slug guessed."},
    {"slug": "funnel-clubpilates", "covers": "Club Pilates (seed row 39)",
     "pattern": "(not in sheet)", "complexity": "Medium", "notes": "join flow",
     "url": "https://www.clubpilates.com/location/williamcannon",
     "confidence": "verified", "caveat": "Real studio page found via the site's "
     "own location search. William Cannon (4220 W William Cannon Dr) is the "
     "south-soco-fitting studio; Club Pilates has ~8 Austin studios."},
    {"slug": "funnel-solidcore", "covers": "[solidcore] Austin (seed row 8)",
     "pattern": "(not in sheet)", "complexity": "Medium", "notes": "join flow",
     "url": "https://solidcore.co/tx/austin/downtown/",
     "confidence": "verified", "caveat": "Real studio page. 204 Colorado St, "
     "78701 — matches the downtown seed row and the geocoded pin."},
    {"slug": "funnel-corepower", "covers": "CorePower Yoga Austin (seed row 38)",
     "pattern": "(not in sheet)", "complexity": "Medium", "notes": "join flow",
     "url": "https://www.corepoweryoga.com/memberships-pricing",
     "confidence": "guess", "caveat": "Funnel path guessed."},
    {"slug": "funnel-barrys", "covers": "Barry's Austin (seed row 5)",
     "pattern": "(not in sheet)", "complexity": "Medium", "notes": "join flow",
     "url": "https://www.barrys.com/pricing/",
     "confidence": "guess", "caveat": "Funnel path guessed."},
    {"slug": "funnel-studiothree", "covers": "Studio Three (seed row 6)",
     "pattern": "(not in sheet)", "complexity": "Medium", "notes": "join flow",
     "url": "https://www.studiothree.com/pricing",
     "confidence": "guess", "caveat": "Funnel path guessed."},
    {
        "slug": "lafitness-anderson-rates",
        "covers": "LA Fitness Anderson Lane — per-club signup rates",
        "pattern": "(not in sheet)",
        "complexity": "Medium",
        "notes": "Owner-verified per-club rate page. NOTE: the id= token is encrypted "
                 "and may rotate. If this target starts failing, suspect the token "
                 "before anything else.",
        "url": "https://lafitness.com/Pages/MembershipSignUpRate.aspx?id=0rKCfAR8YfSVA2GVWHmQVQ%3d%3d",
        "confidence": "owner",
        "caveat": "",
    },
    {
        "slug": "lafitness-slamar-rates",
        "covers": "LA Fitness S. Lamar — per-club signup rates",
        "pattern": "(not in sheet)",
        "complexity": "Medium",
        "notes": "Owner-verified per-club rate page. Same rotating-token caveat as "
                 "lafitness-anderson-rates.",
        "url": "https://lafitness.com/Pages/MembershipSignUpRate.aspx?id=ZsgkxVy%2fljny5dznUn5EIw%3d%3d",
        "confidence": "owner",
        "caveat": "",
    },
    {
        "slug": "goldsgym-burnet-join",
        "covers": "Gold's Gym Burnet — join flow (where prices actually live)",
        "pattern": "(not in sheet)",
        "complexity": "Medium",
        "notes": "The club page carries address + amenities but no rates. Requires "
                 "--stealth; goldsgym.com blocks ordinary Firecrawl fetches.",
        "url": "https://www.goldsgym.com/locations/tx/austin-burnet/join/",
        "confidence": "derived",
        "caveat": "Join-flow URL taken verbatim from the [Join Now] link on the "
                  "owner-verified Burnet club page. Not guessed.",
    },
    {
        "slug": "goldsgym-burnet",
        "covers": "Gold's Gym North / Burnet (seed row 29)",
        "pattern": "(not in sheet)",
        "complexity": "Medium",
        "notes": "Sister location of the `goldsgym` scraper target.",
        "url": "https://www.goldsgym.com/locations/tx/austin-burnet/",
        "confidence": "owner",
        "caveat": "",
    },
]

# ---------------------------------------------------------------------------
# Seed sheet reading (stdlib xlsx parse — an xlsx is a zip of XML)
# ---------------------------------------------------------------------------
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


def _col_index(cell_ref):
    letters = re.match(r"([A-Z]+)", cell_ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_sheet(xlsx_path, sheet_name):
    """Return a list of row-lists for one sheet. No third-party deps."""
    with zipfile.ZipFile(xlsx_path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))

        workbook = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rel_targets = {rel.get("Id"): rel.get("Target") for rel in rels}

        target = None
        for sheet in workbook.find("m:sheets", NS):
            if sheet.get("name") == sheet_name:
                target = rel_targets[sheet.get("{%s}id" % NS["r"])]
                break
        if target is None:
            raise SystemExit("Sheet %r not found in %s" % (sheet_name, xlsx_path))

        # Rel targets may be relative ("worksheets/sheet2.xml") or absolute
        # ("/xl/worksheets/sheet2.xml" — which is what openpyxl writes when it
        # re-saves the workbook). Normalise both to a zip entry name.
        target = target.lstrip("/")
        path = target if target.startswith("xl/") else "xl/" + target
        sheet_xml = ET.fromstring(z.read(path))

    rows = []
    for row in sheet_xml.iter("{%s}row" % NS["m"]):
        cells, width = {}, 0
        for c in row.findall("m:c", NS):
            idx = _col_index(c.get("r"))
            width = max(width, idx)
            inline = c.find("m:is", NS)
            value_el = c.find("m:v", NS)
            if inline is not None:
                value = "".join(t.text or "" for t in inline.iter("{%s}t" % NS["m"]))
            elif value_el is None:
                value = ""
            elif c.get("t") == "s":
                value = shared[int(value_el.text)]
            else:
                value = value_el.text or ""
            cells[idx] = value.strip()
        rows.append([cells.get(i, "") for i in range(width + 1)])
    return rows


def load_targets():
    """Build the harvest plan from the Scraper Targets sheet + URL_OVERRIDES."""
    rows = read_sheet(SEED_XLSX, "Scraper Targets")
    header, body = rows[0], rows[1:]
    cols = {name: i for i, name in enumerate(header)}

    targets = []
    for row in body:
        def cell(name):
            i = cols.get(name)
            return row[i] if i is not None and i < len(row) else ""

        slug = cell("Scraper")
        if not slug:
            continue
        url, confidence, caveat = URL_OVERRIDES.get(
            slug, ("", "unresolved", "No URL resolution recorded for this target.")
        )
        targets.append({
            "slug": slug,
            "covers": cell("Covers (gyms in seed)"),
            "pattern": cell("Pricing URL pattern"),
            "complexity": cell("Complexity"),
            "notes": cell("Notes"),
            "url": url,
            "confidence": confidence,
            "caveat": caveat,
        })
    targets.extend(EXTRA_TARGETS)
    return targets


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
def load_dotenv():
    """Minimal .env reader. Does not overwrite variables already set."""
    env_path = REPO_ROOT / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def get_api_key():
    load_dotenv()
    key = os.environ.get("FIRECRAWL_API_KEY", "").strip()
    if not key or key.startswith("fc-xxxx"):
        raise SystemExit(
            "FIRECRAWL_API_KEY is not set (or is still the .env.example placeholder).\n"
            "Copy .env.example to .env and paste the real key there. .env is gitignored.\n"
            "Run `python3 scrapers/harvest.py --list` to preview the plan without a key."
        )
    return key


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------
def robots_allows(url):
    """Check robots.txt for our User-Agent. Returns (allowed, reason)."""
    match = re.match(r"(https?://[^/]+)", url)
    if not match:
        return False, "unparseable URL"
    robots_url = match.group(1) + "/robots.txt"
    parser = urllib.robotparser.RobotFileParser()
    try:
        request = urllib.request.Request(robots_url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=20) as response:
            parser.parse(response.read().decode("utf-8", "replace").splitlines())
    except Exception as exc:                      # noqa: BLE001 - any failure = unknown
        # No robots.txt, or unreachable. Absent robots.txt means no restrictions.
        return True, "robots.txt unavailable (%s) — treating as unrestricted" % type(exc).__name__
    allowed = parser.can_fetch(USER_AGENT, url)
    return allowed, "robots.txt %s" % ("allows" if allowed else "DISALLOWS")


def firecrawl_scrape(url, api_key, stealth=False):
    """POST to Firecrawl, newest API version first. Returns markdown text.

    stealth=True routes through Firecrawl's stealth proxy for targets that
    block ordinary fetches. It bills at 5 credits instead of 1, so it is
    opt-in per run (--stealth) and never the default.
    """
    body_fields = {
        "url": url,
        "formats": ["markdown"],
        "onlyMainContent": True,
        "headers": {"User-Agent": USER_AGENT},
    }
    if stealth:
        body_fields["proxy"] = "stealth"
    payload = json.dumps(body_fields).encode("utf-8")

    last_error = None
    for endpoint in FIRECRAWL_ENDPOINTS:
        request = urllib.request.Request(
            endpoint,
            data=payload,
            headers={
                "Authorization": "Bearer %s" % api_key,
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
                body = json.loads(response.read().decode("utf-8", "replace"))
        except urllib.error.HTTPError as exc:
            # 404/410 means this API version is gone — try the next one.
            # Everything else is a real error; report the status, never the body,
            # and never the key (CLAUDE.md §8: no secrets, no full bodies in logs).
            if exc.code in (404, 410):
                last_error = "HTTP %s from %s" % (exc.code, endpoint)
                continue
            raise ScrapeError("Firecrawl returned HTTP %s" % exc.code)
        except OSError as exc:
            # Covers socket.timeout and urllib URLError — both OSError subclasses.
            # A slow or unresponsive target must not abort the whole run.
            raise ScrapeError("network error (%s: %s)" % (type(exc).__name__, exc))
        except json.JSONDecodeError:
            raise ScrapeError("Firecrawl returned a non-JSON response")

        data = body.get("data") or {}
        markdown = data.get("markdown") or ""
        if not markdown:
            raise ScrapeError("Firecrawl returned no markdown (page may be empty or blocked)")
        return markdown, data.get("metadata") or {}

    raise ScrapeError("every Firecrawl endpoint failed (%s)" % last_error)


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
def write_output(target, url, markdown, metadata):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / ("%s.md" % target["slug"])
    header = [
        "<!--",
        "  RAW HARVEST — not data. Read by a human, then discarded.",
        "  target:     %s" % target["slug"],
        "  covers:     %s" % target["covers"],
        "  url:        %s" % url,
        "  resolution: %s" % target["confidence"],
        "  http_title: %s" % (metadata.get("title") or "(none)"),
        "  status:     %s" % (metadata.get("statusCode") or "(unknown)"),
        "-->",
        "",
    ]
    path.write_text("\n".join(header) + markdown, encoding="utf-8")
    return path


def print_plan(targets):
    print("Harvest plan — %d targets\n" % len(targets))
    print("%-14s %-10s %-8s %s" % ("TARGET", "COMPLEX", "RESOLVED", "URL"))
    print("-" * 100)
    for t in targets:
        print("%-14s %-10s %-8s %s" % (t["slug"], t["complexity"], t["confidence"], t["url"] or "(none)"))
    print()
    guesses = [t for t in targets if t["confidence"] != "sheet"]
    if guesses:
        print("%d URL(s) were NOT literal in the sheet and needed resolving — check these first:\n" % len(guesses))
        for t in guesses:
            print("  %s\n      %s\n" % (t["slug"], t["caveat"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("targets", nargs="*", help="target slugs to harvest (default: all)")
    parser.add_argument("--list", action="store_true",
                        help="print the resolved plan and exit — no API calls, no credits spent")
    parser.add_argument("--force", action="store_true",
                        help="refetch targets that already have output (spends credits again)")
    parser.add_argument("--stealth", action="store_true",
                        help="route through Firecrawl's stealth proxy for blocking sites "
                             "(5 credits per fetch instead of 1)")
    args = parser.parse_args()

    targets = load_targets()
    if args.targets:
        wanted = set(args.targets)
        unknown = wanted - {t["slug"] for t in targets}
        if unknown:
            raise SystemExit("Unknown target(s): %s" % ", ".join(sorted(unknown)))
        targets = [t for t in targets if t["slug"] in wanted]

    if args.list:
        print_plan(targets)
        return 0

    api_key = get_api_key()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    succeeded, skipped, failed = [], [], []
    for i, target in enumerate(targets):
        slug, url = target["slug"], target["url"]
        print("[%d/%d] %s" % (i + 1, len(targets), slug))

        if not url:
            print("        SKIP — no URL resolved")
            skipped.append((slug, "no URL"))
            continue

        allowed, reason = robots_allows(url)
        if not allowed:
            print("        SKIP — %s" % reason)
            skipped.append((slug, reason))
            continue

        existing = OUT_DIR / ("%s.md" % slug)
        if existing.is_file() and not args.force:
            print("        SKIP — already harvested (%s); --force to refetch"
                  % existing.relative_to(REPO_ROOT))
            skipped.append((slug, "already harvested"))
            continue

        print("        %s" % url)
        try:
            markdown, metadata = firecrawl_scrape(url, api_key, stealth=args.stealth)
        except ScrapeError as exc:
            print("        FAIL — %s" % exc)
            failed.append((slug, str(exc)))
        else:
            path = write_output(target, url, markdown, metadata)
            print("        OK — %d chars -> %s" % (len(markdown), path.relative_to(REPO_ROOT)))
            succeeded.append(slug)

        if i < len(targets) - 1:
            time.sleep(POLITE_DELAY_SECONDS)

    print("\n%d ok, %d skipped, %d failed" % (len(succeeded), len(skipped), len(failed)))
    for slug, reason in skipped + failed:
        print("  %-14s %s" % (slug, reason))
    print("\nRaw markdown is in %s (gitignored)." % OUT_DIR.relative_to(REPO_ROOT))
    print("Next step is HUMAN: read each file, extract prices, compare to the seed list.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
