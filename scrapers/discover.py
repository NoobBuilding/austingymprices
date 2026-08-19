#!/usr/bin/env python3
"""
Gym discovery sweep (CLAUDE.md §9).

The seed list was a starter spec, not a census. This enumerates fitness
businesses inside our region bounds, diffs them against what we already list,
probes each new one for a *fetchable* price, and classifies what it finds.

It PROPOSES. Nothing here writes to /data — the output is a report the owner
cherry-picks from, exactly like harvest.py.

Usage
  python3 scrapers/discover.py --plan        # show the request plan + cost. No API calls, no key needed.
  python3 scrapers/discover.py --enumerate   # step (a): call Places, cache results
  python3 scrapers/discover.py --probe       # steps (c,d): free fetches against cached candidates
  python3 scrapers/discover.py --report      # step (e): write docs/discovery-report.md
  python3 scrapers/discover.py --all         # enumerate, probe, report

Cost note: Places is billed per request, so --plan prints the exact number
before a key is ever used. Probing is free — it is ordinary HTTP with our
honest User-Agent, robots.txt checked first, one request per URL.

Requires GOOGLE_PLACES_API_KEY only for --enumerate. Build/CI-time only,
never in the client bundle (§8).
"""

import argparse
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest import load_dotenv, robots_allows  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
GYM_DIR = REPO_ROOT / "data" / "gyms"
REGIONS = REPO_ROOT / "data" / "regions.json"
CACHE_DIR = Path(__file__).resolve().parent / ".cache"
PLACES_CACHE = CACHE_DIR / "places.json"
PROBE_CACHE = CACHE_DIR / "probe.json"
REPORT = REPO_ROOT / "docs" / "discovery-report.md"

USER_AGENT = "austingymprices.com price checker; reports@austingymprices.com"
NEARBY = "https://places.googleapis.com/v1/places:searchNearby"
TEXT = "https://places.googleapis.com/v1/places:searchText"
FIELDS = ("places.id,places.displayName,places.formattedAddress,places.location,"
          "places.websiteUri,places.primaryType,places.types,places.businessStatus")

# Places types that reliably mean "a place a person works out".
INCLUDED_TYPES = ["gym", "fitness_center", "yoga_studio"]

# Categories Places does not type well, so they are asked for by name instead.
TEXT_QUERIES = [
    "pilates studio", "climbing gym", "boxing gym", "brazilian jiu jitsu gym",
    "crossfit gym", "martial arts gym", "barre studio", "dance fitness studio",
]

# Out of scope for v1 (§1): personal-training-only studios and public rec
# centres. Flagged, never silently dropped — the report says what it set aside
# and why, so the owner can overrule it.
EXCLUDE_NAME = re.compile(
    r"personal training|physical therapy|chiropract|recreation center|rec center|"
    r"community center|physio|wellness center|massage|spa\b|nutrition|"
    r"school district|ymca of|country club",
    re.I,
)

# Pricing paths, in the order the harvest taught us they pay off.
PRICE_PATHS = [
    "/membership", "/memberships", "/pricing", "/prices", "/rates",
    "/join", "/plans", "/pricing-and-membership", "/membership-options",
]

# Booking widgets whose prices live behind JS — human-readable, not scrapeable.
WIDGETS = re.compile(
    r"mindbody|mariana ?tek|marianatek|glofox|wodify|pushpress|zenplanner|"
    r"clubready|abcfinancial|momence|walla|arketa", re.I)

CHALLENGE = re.compile(r"_cf_chl_opt|Just a moment|challenge-platform/h/|captcha", re.I)
MONEY = re.compile(r"\$\s?\d{1,4}(?:\.\d{2})?")


# ── helpers ────────────────────────────────────────────────────────────────
def regions():
    return json.loads(REGIONS.read_text())


def existing_gyms():
    out = []
    for f in sorted(GYM_DIR.glob("*.json")):
        out.append(json.loads(f.read_text()))
    return out


def norm(name):
    """Loose key for matching a Places result to a gym we already list."""
    n = re.sub(r"[^a-z0-9 ]", " ", (name or "").lower())
    n = re.sub(r"\b(austin|tx|texas|gym|fitness|studio|the|at|of|llc|inc)\b", " ", n)
    return re.sub(r"\s+", "", n)


def api_key():
    load_dotenv()
    key = (os.environ.get("GOOGLE_PLACES_API_KEY") or "").strip()
    if not key:
        sys.exit(
            "GOOGLE_PLACES_API_KEY is not set.\n"
            "Add it to .env (gitignored) for a local run, and to repo secrets for CI.\n"
            "Run --plan first to see how many requests it will make."
        )
    return key


def post(url, key, body):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": key,
                 "X-Goog-FieldMask": FIELDS, "User-Agent": USER_AGENT},
        method="POST")
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


# ── (a) enumerate ──────────────────────────────────────────────────────────
def request_plan():
    plan = []
    for r in regions():
        s = r["search"]
        plan.append((r["id"], "nearby", ",".join(INCLUDED_TYPES), s["radius_m"]))
        for q in TEXT_QUERIES:
            plan.append((r["id"], "text", q, s["radius_m"]))
    return plan


def enumerate_places():
    key = api_key()
    found = {}
    for r in regions():
        s = r["search"]
        circle = {"center": {"latitude": s["lat"], "longitude": s["lng"]},
                  "radius": float(s["radius_m"])}
        try:
            body = post(NEARBY, key, {
                "includedTypes": INCLUDED_TYPES, "maxResultCount": 20,
                "locationRestriction": {"circle": circle}})
            for p in body.get("places", []):
                found.setdefault(p["id"], dict(p, region=r["id"], via="nearby"))
            print("  %-12s nearby        %2d result(s)" % (r["id"], len(body.get("places", []))))
        except urllib.error.HTTPError as e:
            print("  %-12s nearby        HTTP %s" % (r["id"], e.code))
        time.sleep(1)

        for q in TEXT_QUERIES:
            try:
                body = post(TEXT, key, {
                    "textQuery": "%s in %s Austin TX" % (q, r["name"]),
                    "maxResultCount": 20,
                    "locationBias": {"circle": circle}})
                hits = body.get("places", [])
                for p in hits:
                    found.setdefault(p["id"], dict(p, region=r["id"], via=q))
                print("  %-12s %-22s %2d result(s)" % (r["id"], q, len(hits)))
            except urllib.error.HTTPError as e:
                print("  %-12s %-22s HTTP %s" % (r["id"], q, e.code))
            time.sleep(1)

    CACHE_DIR.mkdir(exist_ok=True)
    PLACES_CACHE.write_text(json.dumps(list(found.values()), indent=1))
    print("\n%d distinct place(s) cached -> %s" % (len(found), PLACES_CACHE))
    return list(found.values())


# ── (b) diff ───────────────────────────────────────────────────────────────
def metres(lat1, lng1, lat2, lng2):
    dy = (lat1 - lat2) * 111320.0
    dx = (lng1 - lng2) * 111320.0 * math.cos(math.radians(lat1))
    return math.hypot(dx, dy)


def nearest_region(place):
    """
    Re-assign a result to the region it is actually IN.

    `searchText` only accepts `locationBias`, which biases without restricting —
    the first sweep returned Crux Pflugerville, 26 km outside any circle, tagged
    to whichever region's query happened to surface it. Tagging by the querying
    region would have put gyms in neighbourhoods they are nowhere near, which on
    a site organised by neighbourhood is its own kind of wrong number.

    Returns (region_id, distance_m) or (None, distance) when it is outside every
    circle, in which case the caller drops it.
    """
    loc = place.get("location") or {}
    lat, lng = loc.get("latitude"), loc.get("longitude")
    if lat is None or lng is None:
        return None, None
    best, best_d = None, float("inf")
    for r in regions():
        s = r["search"]
        d = metres(lat, lng, s["lat"], s["lng"])
        if d <= s["radius_m"] and d < best_d:
            best, best_d = r["id"], d
    return best, (best_d if best else None)


def diff_against_seed(places):
    have_names = {norm(g["name"]) for g in existing_gyms()}
    have_sites = set()
    for g in existing_gyms():
        if g.get("website"):
            have_sites.add(urllib.parse.urlparse(g["website"]).netloc.replace("www.", ""))

    fresh, known, skipped = [], [], []
    for p in places:
        name = (p.get("displayName") or {}).get("text", "")
        region, _d = nearest_region(p)
        if region is None:
            skipped.append((name, "outside every region circle"))
            continue
        p["region"] = region  # where it IS, not which query found it
        if p.get("businessStatus") and p["businessStatus"] != "OPERATIONAL":
            skipped.append((name, "businessStatus=%s" % p["businessStatus"]))
            continue
        if EXCLUDE_NAME.search(name):
            skipped.append((name, "out of v1 scope"))
            continue
        site = urllib.parse.urlparse(p.get("websiteUri") or "").netloc.replace("www.", "")
        if norm(name) in have_names or (site and site in have_sites):
            known.append(name)
            continue
        fresh.append(p)
    return fresh, known, skipped


# ── (c,d) probe + classify ─────────────────────────────────────────────────
def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read().decode("utf-8", "replace")
        except Exception:
            return e.code, ""
    except Exception:
        return -1, ""


def visible_prices(html):
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t.replace("&#036;", "$"))
    hits = MONEY.findall(re.sub(r"\s+", " ", t))
    # A lone "$0" or a single stray figure is not a price list.
    real = [h for h in hits if not re.fullmatch(r"\$\s?0(\.00)?", h)]
    return sorted(set(real))


def probe(place):
    """Classify one candidate. Free: ordinary HTTP, robots checked, spaced."""
    site = place.get("websiteUri")
    name = (place.get("displayName") or {}).get("text", "")
    if not site:
        return {"class": "NO-SITE", "url": None, "prices": [], "note": "no website in Places"}

    base = site.rstrip("/")
    tried = []
    for path in [""] + PRICE_PATHS:
        url = base + path
        allowed, reason = robots_allows(url)
        if not allowed:
            tried.append((url, "robots"))
            continue
        code, html = fetch(url)
        time.sleep(1.5)
        if CHALLENGE.search(html or ""):
            return {"class": "GATED", "url": url, "prices": [],
                    "note": "bot challenge (HTTP %s)" % code}
        if code != 200 or not html:
            tried.append((url, "HTTP %s" % code))
            continue
        prices = visible_prices(html)
        widget = WIDGETS.search(html)
        if len(prices) >= 2:
            return {"class": "SCRAPEABLE", "url": url, "prices": prices[:8],
                    "note": "prices in fetchable HTML"}
        if widget:
            return {"class": "HUMAN-READABLE", "url": url, "prices": prices[:8],
                    "note": "%s widget — prices behind JS" % widget.group(0)}
        tried.append((url, "no prices"))
    return {"class": "GATED", "url": base, "prices": [],
            "note": "no pricing path found (%s tried)" % len(tried)}


def region_for(place):
    return place.get("region", "?")


def category_guess(place):
    types = " ".join(place.get("types", []) + [place.get("primaryType", "")]).lower()
    via = (place.get("via") or "").lower()
    for pat, cat in [("yoga", "yoga"), ("pilates", "pilates"), ("climb", "climbing"),
                     ("box", "boxing"), ("jiu|martial", "bjj-mma"),
                     ("crossfit", "crossfit-hiit"), ("dance|barre", "gym-classes")]:
        if re.search(pat, types) or re.search(pat, via):
            return cat
    return "gym-weights"


# ── (e) report ─────────────────────────────────────────────────────────────
def write_report(fresh, known, skipped, probes):
    order = {"SCRAPEABLE": 0, "HUMAN-READABLE": 1, "GATED": 2, "NO-SITE": 3}
    # Downtown first: it is the weakest region (1 of 12 priced) and the most
    # visible one, so it is where the first cherry-picking pass should land.
    region_order = {"downtown": 0}
    rows = sorted(
        zip(fresh, probes),
        key=lambda x: (region_order.get(x[0].get("region"), 1),
                       order[x[1]["class"]],
                       (x[0].get("displayName") or {}).get("text", "")),
    )
    counts = {}
    for _, pr in rows:
        counts[pr["class"]] = counts.get(pr["class"], 0) + 1

    L = []
    L.append("# Gym discovery sweep\n")
    L.append("Enumerated from Google Places inside our region bounds, diffed against the\n"
             "gyms we already list, then probed for a fetchable price.\n")
    L.append("**This is a proposal. Nothing here has been written to `/data`.**\n")
    L.append("Classification: **SCRAPEABLE** = prices in fetchable HTML, a scraper target ·\n"
             "**HUMAN-READABLE** = prices exist but sit behind a booking widget, so they go on\n"
             "the transcription list · **GATED** = bot wall or no pricing path found ·\n"
             "**NO-SITE** = no website on record.\n")
    L.append("| | count |\n|---|---|")
    for k in ["SCRAPEABLE", "HUMAN-READABLE", "GATED", "NO-SITE"]:
        L.append("| %s | %d |" % (k, counts.get(k, 0)))
    L.append("| already listed | %d |" % len(known))
    L.append("| set aside (out of v1 scope) | %d |\n" % len(skipped))

    L.append("## Candidates\n")
    L.append("| Name | Region | Category | Website | Class | Sample prices | Note |")
    L.append("|---|---|---|---|---|---|---|")
    for p, pr in rows:
        name = (p.get("displayName") or {}).get("text", "")
        addr = p.get("formattedAddress", "")
        site = p.get("websiteUri") or ""
        L.append("| **%s**<br><sub>%s</sub> | %s | %s | %s | **%s** | %s | %s |" % (
            name, addr, region_for(p), category_guess(p),
            "[link](%s)" % site if site else "—",
            pr["class"], " ".join(pr["prices"]) or "—", pr["note"]))

    if skipped:
        L.append("\n## Set aside\n")
        L.append("Recorded rather than dropped, so the call can be overruled.\n")
        L.append("| Name | Why |\n|---|---|")
        for n, why in sorted(skipped):
            L.append("| %s | %s |" % (n, why))

    REPORT.write_text("\n".join(L) + "\n")
    print("report -> %s (%d candidate(s))" % (REPORT, len(rows)))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plan", action="store_true", help="show the request plan; no API calls")
    ap.add_argument("--enumerate", action="store_true", help="step (a): call Places")
    ap.add_argument("--probe", action="store_true", help="steps (c,d): free probes")
    ap.add_argument("--report", action="store_true", help="step (e): write the report")
    ap.add_argument("--all", action="store_true", help="enumerate, probe and report")
    args = ap.parse_args()

    if args.plan or not any([args.enumerate, args.probe, args.report, args.all]):
        plan = request_plan()
        print("Places request plan — %d request(s), billed per request.\n" % len(plan))
        for region, kind, what, radius in plan:
            print("  %-12s %-7s %-26s r=%dm" % (region, kind, what, radius))
        print("\nNo key is used by --plan. Probing after enumeration is free "
              "(ordinary HTTP, robots checked, ~1.5s apart).")
        return 0

    places = []
    if args.enumerate or args.all:
        print("Enumerating via Google Places...")
        places = enumerate_places()
    elif PLACES_CACHE.exists():
        places = json.loads(PLACES_CACHE.read_text())
    else:
        sys.exit("No cached places. Run --enumerate first.")

    fresh, known, skipped = diff_against_seed(places)
    print("\n%d new, %d already listed, %d set aside" % (len(fresh), len(known), len(skipped)))

    probes = []
    if args.probe or args.all:
        print("\nProbing %d candidate site(s) — free, robots checked, spaced.\n" % len(fresh))
        for i, p in enumerate(fresh, 1):
            name = (p.get("displayName") or {}).get("text", "")
            pr = probe(p)
            probes.append(pr)
            print("  %3d/%-3d %-38s %-15s %s" % (i, len(fresh), name[:38], pr["class"],
                                                 " ".join(pr["prices"][:4])))
        CACHE_DIR.mkdir(exist_ok=True)
        PROBE_CACHE.write_text(json.dumps(probes, indent=1))
    elif PROBE_CACHE.exists():
        probes = json.loads(PROBE_CACHE.read_text())

    if (args.report or args.all) and probes:
        write_report(fresh, known, skipped, probes)
    return 0


if __name__ == "__main__":
    sys.exit(main())
