#!/usr/bin/env python3
"""
Downtown wave — probe and report. PROPOSES ONLY; writes nothing to /data.

Order of operations is deliberate (CLAUDE.md §6): geocode FIRST, then probe.
The downtown search circle is 4,400 m centred on the centroid of our
downtown-assigned pins, which sits east of the actual downtown — so East 7th
Street and Springdale Road addresses fall into the "downtown" bucket. A bucket
is a search grouping, not a region, and this wave re-bins every candidate
against its real coordinates before anything is claimed about it.

Everything here obeys the standing rules: robots.txt checked first, the honest
project User-Agent, one request per URL, requests spaced.
"""

import json
import math
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from harvest import robots_allows  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
USER_AGENT = "austingymprices.com price checker; reports@austingymprices.com"
GEO_CACHE = Path(__file__).resolve().parent / ".cache" / "wave_downtown_geo.json"

MONEY = re.compile(r"\$\s?\d[\d,]*(?:\.\d{2})?")
PRICE_PATHS = ["", "/pricing", "/prices", "/membership", "/memberships", "/rates",
               "/join", "/plans", "/classes", "/schedule", "/book", "/services"]

# ZIP is the sharpest cheap signal for where an Austin address actually is, and
# it disagrees with the search circle often enough to be worth stating.
ZIP_AREA = {
    "78701": ("downtown", "Downtown core"),
    "78702": ("east-austin", "East Austin"),
    "78703": ("downtown", "Clarksville / West Austin"),
    "78704": ("south-soco", "South Austin / SoCo / Bouldin"),
    "78705": ("hyde-park", "West Campus / UT"),
    "78712": ("hyde-park", "UT campus"),
    "78721": ("east-austin", "East Austin"),
    "78722": ("east-austin", "Cherrywood"),
    "78723": ("mueller", "Mueller / Windsor Park"),
    "78731": ("the-domain", "Northwest Hills"),
    "78741": ("south-soco", "Riverside"),
    "78745": ("south-soco", "South Austin"),
    "78746": ("south-soco", "Westlake"),
    "78748": ("south-soco", "Far South Austin"),
    "78749": ("south-soco", "Southwest Austin"),
    "78751": ("hyde-park", "Hyde Park / North Loop"),
    "78752": ("hyde-park", "North Loop / Highland"),
    "78753": ("the-domain", "North Austin"),
    "78756": ("hyde-park", "Rosedale"),
    "78757": ("the-domain", "Crestview / Brentwood"),
    "78758": ("the-domain", "North Austin / Domain"),
    "78759": ("the-domain", "Arboretum / Domain"),
}


def regions():
    return json.loads((REPO / "data" / "regions.json").read_text())


def metres(lat1, lng1, lat2, lng2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def geocode(address, cache):
    """One Nominatim lookup, cached, at most one request per second."""
    if address in cache:
        return cache[address]
    q = urllib.parse.urlencode({"q": address, "format": "json", "limit": 1,
                                "countrycodes": "us"})
    req = urllib.request.Request(
        "https://nominatim.openstreetmap.org/search?" + q,
        headers={"User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            data = json.loads(r.read().decode("utf-8", "replace"))
    except Exception:
        data = []
    time.sleep(1.1)
    out = ({"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"])} if data else None)
    cache[address] = out
    return out


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT,
                                               "Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            if "html" not in r.headers.get("Content-Type", "").lower():
                return r.status, ""
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception:
        return -1, ""


def text_of(html):
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    t = t.replace("&amp;", "&").replace("&nbsp;", " ").replace("&#036;", "$")
    return re.sub(r"\s+", " ", t).strip()


def money_in_context(text):
    """Every figure WITH the sentence around it. A dollar sign is not a price."""
    out = []
    for m in MONEY.finditer(text):
        a, b = max(0, m.start() - 110), min(len(text), m.end() + 110)
        out.append((m.group(0), text[a:b].strip()))
        if len(out) >= 14:
            break
    return out


# Cloudflare-style wall: BOTH a real marker AND a refusing status (§6).
CF_MARKER = re.compile(r"cf-browser-verification|cf_chl|__cf_chl|Attention Required!\s*\|\s*Cloudflare", re.I)


def probe(url):
    base = url.rstrip("/")
    tried = []
    for path in PRICE_PATHS:
        u = base + path
        allowed, reason = robots_allows(u)
        if not allowed:
            tried.append((u, "robots-disallowed"))
            continue
        status, html = fetch(u)
        time.sleep(1.2)
        if status in (401, 403, 429, 503) and CF_MARKER.search(html or ""):
            return {"verdict": "BOT-WALL", "url": u, "figures": [], "tried": tried}
        if status != 200 or not html:
            tried.append((u, f"http {status}"))
            continue
        text = text_of(html)
        figs = money_in_context(text)
        if figs:
            return {"verdict": "PRICES-FOUND", "url": u, "figures": figs, "tried": tried}
        tried.append((u, "200, no figures"))
    return {"verdict": "NO-PUBLISHED-PRICE", "url": base, "figures": [], "tried": tried}


def main():
    rows = json.loads(Path(sys.argv[1]).read_text())
    regs = regions()
    dt = next(r for r in regs if r["id"] == "downtown")["search"]
    cache = json.loads(GEO_CACHE.read_text()) if GEO_CACHE.is_file() else {}

    out = []
    for i, r in enumerate(rows, 1):
        addr = r.get("address") or ""
        geo = geocode(addr, cache) if addr else None
        zipm = re.search(r"\b(78\d{3})\b", addr)
        zc = zipm.group(1) if zipm else None
        zregion, zname = ZIP_AREA.get(zc, (None, None))

        inside = []
        nearest, nearest_m = None, None
        if geo:
            for reg in regs:
                s = reg["search"]
                d = metres(geo["lat"], geo["lng"], s["lat"], s["lng"])
                if d <= s["radius_m"]:
                    inside.append(reg["id"])
                if nearest_m is None or d < nearest_m:
                    nearest, nearest_m = reg["id"], d
            dt_d = metres(geo["lat"], geo["lng"], dt["lat"], dt["lng"])
        else:
            dt_d = None

        pr = probe(r["url"]) if r.get("url") else {"verdict": "NO-SITE", "url": None,
                                                   "figures": [], "tried": []}
        rec = {**r, "geo": geo, "zip": zc, "zip_region": zregion, "zip_area": zname,
               "inside_circles": inside, "nearest_circle": nearest,
               "nearest_m": round(nearest_m) if nearest_m else None,
               "downtown_circle_m": round(dt_d) if dt_d else None,
               "probe": pr}
        out.append(rec)
        print(f"[{i:2d}/{len(rows)}] {r['name'][:42]:44s} {pr['verdict']:20s} "
              f"zip {zc or '?'} -> {zregion or '?'}", flush=True)
        GEO_CACHE.parent.mkdir(parents=True, exist_ok=True)
        GEO_CACHE.write_text(json.dumps(cache, indent=2, sort_keys=True))

    Path(sys.argv[2]).write_text(json.dumps(out, indent=2))
    print(f"\nwrote {sys.argv[2]}")


if __name__ == "__main__":
    main()
