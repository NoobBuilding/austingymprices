#!/usr/bin/env python3
"""
Task 4a — geocode gym addresses with Nominatim (OpenStreetMap).

Zero key, zero cost, same rationale as choosing Leaflet/OSM for the map.

Usage
  python3 scrapers/geocode.py --list     # show coverage, no network calls
  python3 scrapers/geocode.py            # geocode every gym with an address
  python3 scrapers/geocode.py --write    # ...and write lat/lng into the JSON
  python3 scrapers/geocode.py big-tex-gym --write

Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/)
is observed strictly: **at most one request per second**, an honest User-Agent
identifying the project with a contact address, and results cached on disk so a
re-run costs nothing.

A wrong pin is the map equivalent of a wrong price, so a result is only
accepted when it clears every confidence check below. Anything else is
reported for a manual pin-drop and lat/lng stay null — an undrawn pin is
strictly better than a pin in the wrong place.
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GYM_DIR = REPO_ROOT / "data" / "gyms"
CACHE_PATH = Path(__file__).resolve().parent / ".cache" / "nominatim.json"

USER_AGENT = "austingymprices.com price checker; reports@austingymprices.com"
ENDPOINT = "https://nominatim.openstreetmap.org/search"
RATE_LIMIT_SECONDS = 1.1          # policy is 1/sec; leave headroom
REQUEST_TIMEOUT = 30

# Austin, TX. Anything outside this is a geocoder mismatch, not a gym.
BBOX = {"lat_min": 30.05, "lat_max": 30.62, "lng_min": -98.05, "lng_max": -97.50}

# Brands with more than one Austin location, or national franchises where a
# name search can plausibly return the WRONG studio. These ALWAYS come back for
# human verification regardless of the confidence score, because a
# plausible-but-wrong pin is the map version of a plausible-but-wrong price.
MULTI_LOCATION = {
    "orangetheory-austin", "club-pilates-austin", "f45-downtown",
    "solidcore-austin", "corepower-yoga-austin", "barrys-austin",
    "studio-three-austin", "anytime-fitness-north-loop",
    "rumble-boxing-south-austin", "equinox-austin-soco", "equinox-domain",
    "black-swan-yoga-downtown", "ymca-greater-austin",
    "planet-fitness-e-riverside", "24-hour-fitness-hancock",
    "24-hour-fitness-research-blvd", "la-fitness-anderson-lane",
    "la-fitness-s-lamar", "life-time-downtown", "life-time-north",
    "life-time-south", "golds-gym-downtown", "golds-gym-burnet",
    "crunch-south-austin", "crux-climbing-center-south",
    "austin-bouldering-project", "los-campeones-north", "los-campeones-south",
    "10th-planet-jiu-jitsu-austin", "crossfit-austin",
}

# Result granularity we will accept. A match that resolves only to a road,
# suburb or city is not precise enough to drop a pin on.
TOO_COARSE = {
    "road", "residential", "suburb", "city", "town", "state", "county",
    "postcode", "neighbourhood", "quarter", "administrative",
}


def load_cache():
    if CACHE_PATH.is_file():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, indent=2, sort_keys=True), encoding="utf-8")


def house_number(address):
    m = re.match(r"\s*(\d+)", address or "")
    return m.group(1) if m else None


def address_variants(address):
    """
    Progressively simplified forms to try, most specific first.

    Nominatim fails on some perfectly real address forms — a suite number it
    has never seen, or "N I-35 Frontage Rd" where OSM names the way
    differently. Dropping the suite does not move the building, so it is a
    safe simplification. We never degrade past the house number: without it
    the result would be a road centroid, which the confidence check rejects
    anyway.
    """
    variants = [address]

    # "6406 N I-35 Frontage Rd, Suite 2450, Austin, TX 78752" -> drop the suite
    no_suite = re.sub(r",?\s*(?:Suite|Ste|Unit|#)\s*[A-Za-z0-9-]+", "", address, flags=re.I)
    if no_suite != address:
        variants.append(no_suite)

    # Interstate frontage roads: OSM usually knows the highway, not "Frontage Rd".
    no_frontage = re.sub(r"\s*Frontage\s+(?:Rd|Road)\b", "", variants[-1], flags=re.I)
    if no_frontage != variants[-1]:
        variants.append(no_frontage)

    # Fall back to house number + street + zip, dropping directional prefixes
    # that OSM sometimes spells out or omits.
    return variants


def query(address, cache):
    """One Nominatim lookup, cached. Returns the raw result list."""
    if address in cache:
        return cache[address], True

    params = urllib.parse.urlencode({
        "q": address,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 5,
        "countrycodes": "us",
    })
    request = urllib.request.Request(
        "%s?%s" % (ENDPOINT, params),
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            results = json.loads(response.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as exc:
        raise SystemExit("Nominatim returned HTTP %s — stopping rather than hammering it"
                         % exc.code)
    except OSError as exc:
        raise SystemExit("Network error reaching Nominatim: %s" % exc)

    cache[address] = results
    save_cache(cache)
    return results, False


def assess(address, results):
    """
    Decide whether a result is safe to pin. Returns (lat, lng, confidence, reason).
    confidence is "high" or "low"; low means a human drops the pin.
    """
    if not results:
        return None, None, "low", "no result from Nominatim"

    top = results[0]
    lat, lng = float(top["lat"]), float(top["lon"])

    if not (BBOX["lat_min"] <= lat <= BBOX["lat_max"]
            and BBOX["lng_min"] <= lng <= BBOX["lng_max"]):
        return None, None, "low", "result at %.4f,%.4f is outside Austin" % (lat, lng)

    addr_type = (top.get("addresstype") or top.get("type") or "").lower()
    if addr_type in TOO_COARSE:
        return None, None, "low", "matched only to a %s, too coarse for a pin" % addr_type

    wanted = house_number(address)
    got = (top.get("address") or {}).get("house_number")
    if wanted and got != wanted:
        return None, None, "low", ("house number mismatch: asked %s, got %s"
                                   % (wanted, got or "none"))

    # Two distinct candidates far apart means the query was ambiguous.
    if len(results) > 1:
        second = results[1]
        far = (abs(float(second["lat"]) - lat) > 0.01
               or abs(float(second["lon"]) - lng) > 0.01)
        if far and wanted and (second.get("address") or {}).get("house_number") == wanted:
            return None, None, "low", "ambiguous: two matches with the same house number"

    return lat, lng, "high", "%s at %s" % (addr_type, top.get("display_name", "")[:70])


def osm_link(lat, lng):
    return "https://www.openstreetmap.org/?mlat=%.6f&mlon=%.6f#map=18/%.6f/%.6f" % (
        lat, lng, lat, lng)


def assess_by_name(gym, results):
    """
    Confidence for a NAME search, which is looser than an address search:
    there is no house number to check, so we require the matched place to
    actually look like the gym we asked for.
    """
    if not results:
        return None, None, "low", "no result for the name", None

    top = results[0]
    lat, lng = float(top["lat"]), float(top["lon"])
    if not (BBOX["lat_min"] <= lat <= BBOX["lat_max"]
            and BBOX["lng_min"] <= lng <= BBOX["lng_max"]):
        return None, None, "low", "result outside Austin", None

    addr_type = (top.get("addresstype") or top.get("type") or "").lower()
    if addr_type in TOO_COARSE:
        return None, None, "low", "matched only to a %s" % addr_type, None

    display = (top.get("display_name") or "").lower()
    # The matched place must share a distinctive word with the gym's name.
    stop = {"the", "gym", "austin", "fitness", "club", "center", "centre",
            "studio", "yoga", "pilates", "of", "and", "at", "tx", "texas"}
    words = [w for w in re.findall(r"[a-z0-9']+", gym["name"].lower())
             if w not in stop and len(w) > 2]
    matched = [w for w in words if w in display]
    if words and not matched:
        return None, None, "low", ("name not echoed in the match (%s)"
                                   % (top.get("display_name") or "")[:50]), None

    addr = top.get("address") or {}
    parts = [addr.get("house_number"), addr.get("road"), addr.get("city"),
             addr.get("state"), addr.get("postcode")]
    found_address = ", ".join([p for p in parts if p]) or None
    return lat, lng, "high", "%s — %s" % (addr_type, (top.get("display_name") or "")[:60]), found_address


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("slugs", nargs="*", help="gym slugs to geocode (default: all)")
    parser.add_argument("--list", action="store_true",
                        help="show address/coordinate coverage; no network calls")
    parser.add_argument("--write", action="store_true",
                        help="write high-confidence lat/lng into the gym JSON")
    args = parser.parse_args()

    gyms = []
    for path in sorted(GYM_DIR.glob("*.json")):
        gym = json.loads(path.read_text(encoding="utf-8"))
        if args.slugs and gym["slug"] not in args.slugs:
            continue
        gyms.append((path, gym))

    if args.list:
        with_addr = [g for _, g in gyms if g.get("address")]
        with_coords = [g for _, g in gyms if g.get("lat") is not None]
        print("gyms            : %d" % len(gyms))
        print("with an address : %d" % len(with_addr))
        print("with coordinates: %d" % len(with_coords))
        print("\nNeed an address (owner to supply):")
        for _, g in gyms:
            if not g.get("address"):
                print("  %-30s %s" % (g["slug"], g["region"]))
        return 0

    cache = load_cache()
    rows = []
    pending = [(p, g) for p, g in gyms if g.get("lat") is None]

    print("Geocoding %d gym(s) via Nominatim at 1 request/sec.\n" % len(pending))

    for i, (path, gym) in enumerate(pending):
        if not gym.get("address"):
            # No address on file: search by name. Nominatim geocodes POI names
            # directly, which is how we avoid handing the owner a 29-gym
            # collection task.
            name_query = "%s, Austin, TX" % gym["name"]
            results, was_cached = query(name_query, cache)
            lat, lng, confidence, reason, found = assess_by_name(gym, results)
            if not was_cached and i < len(pending) - 1:
                time.sleep(RATE_LIMIT_SECONDS)
            needs_check = confidence == "low" or gym["slug"] in MULTI_LOCATION
            rows.append({
                "slug": gym["slug"], "name": gym["name"], "source": "name-search",
                "address": found or "(none found)", "lat": lat, "lng": lng,
                "confidence": confidence, "reason": reason,
                "needs_check": needs_check, "path": path, "gym": gym,
            })
            print("[%s] %-30s %-4s %s" % ("cache" if was_cached else "fetch",
                  gym["slug"], "OK" if confidence == "high" else "FLAG", reason))
            if args.write and confidence == "high":
                gym["lat"], gym["lng"] = round(lat, 6), round(lng, 6)
                if found and not gym.get("address"):
                    gym["address"] = found
                path.write_text(json.dumps(gym, indent=2, ensure_ascii=False) + "\n",
                                encoding="utf-8")
            continue

        address = gym["address"]
        lat = lng = None
        confidence, reason, cached = "low", "no result from Nominatim", True
        used = address
        for variant in address_variants(address):
            results, was_cached = query(variant, cache)
            cached = cached and was_cached
            lat, lng, confidence, reason = assess(variant, results)
            if confidence == "high":
                used = variant
                break
            if not was_cached:
                time.sleep(RATE_LIMIT_SECONDS)
        if confidence == "high" and used != address:
            reason += "  [simplified query: %s]" % used

        tag = "cache" if cached else "fetch"
        needs_check = confidence == "low" or gym["slug"] in MULTI_LOCATION
        rows.append({
            "slug": gym["slug"], "name": gym["name"], "source": "address",
            "address": address, "lat": lat, "lng": lng,
            "confidence": confidence, "reason": reason,
            "needs_check": needs_check, "path": path, "gym": gym,
        })
        print("[%s] %-30s %-4s %s" % (tag, gym["slug"],
              "OK" if confidence == "high" else "FLAG", reason[:70]))
        if args.write and confidence == "high":
            gym["lat"], gym["lng"] = round(lat, 6), round(lng, 6)
            path.write_text(json.dumps(gym, indent=2, ensure_ascii=False) + "\n",
                            encoding="utf-8")

        if not cached and i < len(pending) - 1:
            time.sleep(RATE_LIMIT_SECONDS)

    write_report(rows, args.write)
    return 0


def write_report(rows, wrote):
    """Screenshot-ready verification table with clickable OSM links."""
    out = REPO_ROOT / "docs" / "geocoding-report.md"
    high = [r for r in rows if r["confidence"] == "high"]
    low = [r for r in rows if r["confidence"] == "low"]
    check = [r for r in rows if r["needs_check"] and r["confidence"] == "high"]

    lines = [
        "# Geocoding verification — Task 4a",
        "",
        "Generated by `scrapers/geocode.py`. Coordinates come from Nominatim",
        "(OpenStreetMap), queried at 1 request/second with the project User-Agent.",
        "",
        "**Click every OSM link and confirm the pin lands on the right building.**",
        "Rows marked ⚠️ need checking either because confidence was low or because the",
        "brand has multiple Austin locations, where a name search can return the wrong",
        "studio. A plausible-but-wrong pin is the map version of a plausible-but-wrong price.",
        "",
        "| | Gym | Source | Address found | Lat / Lng | Confidence | Check on OSM |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in sorted(rows, key=lambda r: (r["confidence"] != "low", not r["needs_check"], r["slug"])):
        mark = "⚠️" if r["needs_check"] else "✓"
        coords = "%.5f, %.5f" % (r["lat"], r["lng"]) if r["lat"] is not None else "—"
        link = "[view](%s)" % osm_link(r["lat"], r["lng"]) if r["lat"] is not None else "—"
        conf = r["confidence"] + (" · multi-location" if r["slug"] in MULTI_LOCATION else "")
        lines.append("| %s | %s | %s | %s | %s | %s | %s |"
                     % (mark, r["name"], r["source"], r["address"], coords, conf, link))

    lines += [
        "",
        "## Summary",
        "",
        "- **%d** geocoded with high confidence%s" % (len(high), " and written to /data" if wrote else " (dry run)"),
        "- **%d** need your eyes (⚠️): %d low-confidence, %d multi-location brands"
        % (len(low) + len(check), len(low), len(check)),
        "- **%d** could not be geocoded at all — genuine gap list" % len(low),
        "",
    ]
    if low:
        lines += ["### Genuine gap list — nothing found", ""]
        for r in low:
            lines.append("- **%s** — %s" % (r["name"], r["reason"]))
        lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")
    print("\n%d high confidence, %d low, %d need verification" % (len(high), len(low), len(check)))
    print("Report: %s" % out.relative_to(REPO_ROOT))


if __name__ == "__main__":
    sys.exit(main())
