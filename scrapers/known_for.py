#!/usr/bin/env python3
"""
known_for draft generator — PROPOSES ONLY. Nothing here writes to /data.

CLAUDE.md §5: `known_for` is the owner's editorial voice, never generated. This
script does not overturn that rule — it does the reading, and the owner does the
writing. What it produces is a review sheet of *sourced claims* plus mechanically
assembled candidate lines, for selection and editing. The field populates only
after the owner's pass.

Three design choices carry the guarantees:

1. **Templates, not prose.** Candidate lines are assembled from a fixed claim
   vocabulary by string templates. There is no free-form generation anywhere in
   this file, which is what makes "no adjective without a source" true by
   construction rather than by good intentions. Every word in a candidate line
   traces to either a matched claim or a fixed connective.

2. **Convergence, not mentions.** A claim needs MIN_REVIEWS distinct reviews
   before it counts. One reviewer noticing the parking is noise.

3. **Reviews may never touch price.** Anything a review says about cost,
   contracts or value is discarded and counted as suppressed. Our prices come
   from the gym's own page with a date on them — letting a stranger's sentence
   near that number would undermine the one thing the site is for.

Where nothing converges, a gym gets NOTHING. Absence over invention, exactly as
with pricing.

Usage:
    python3 scrapers/known_for.py --limit 6          # pilot, then read the cost line
    python3 scrapers/known_for.py                    # all gyms lacking known_for
    python3 scrapers/known_for.py --out docs/known-for-drafts.md
"""
import argparse
import json
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

GYM_DIR = Path("data/gyms")
CACHE = Path("scrapers/.cache/known_for.json")
PLACES_CACHE = Path("scrapers/.cache/places.json")
USER_AGENT = "austingymprices.com price checker; reports@austingymprices.com"

# Places API (New). `reviews` sits in the Enterprise + Atmosphere SKU, which is
# the expensive one — hence --limit and the cost line printed at the end.
DETAILS_FIELDS = "id,displayName,rating,userRatingCount,reviews,editorialSummary"
SEARCH_FIELDS = "places.id,places.displayName,places.formattedAddress"

# A claim needs this many DISTINCT reviews before it is a signal rather than a
# stray opinion. The API returns at most 5 reviews per place, so this is a
# meaningful bar: 2 of 5 independent mentions, not 2 of 500.
MIN_REVIEWS = 2

# ── The claim vocabulary ───────────────────────────────────────────────────
# Concrete, checkable features only. Each label is the exact wording that will
# appear in a candidate line, so a claim cannot smuggle in an adjective the
# evidence does not support.
CLAIMS = [
    ("24/7 access",              r"24/?7|24 hours|any time of (the )?(day|night)|open all night|key ?(tag|fob) access"),
    ("a serious-lifting crowd",  r"powerlift|strongman|bodybuild|serious lifter|strength athlete|competitor"),
    ("specialty equipment",      r"specialty (bar|equipment)|deadlift platform|competition (bench|bar)|reverse hyper|safety squat|glute[ -]?ham|hack squat|plate[- ]?loaded|pin[- ]?loaded"),
    ("a wide equipment range",   r"(lots|plenty|tons|variety|range) of (machines|equipment|weights)|well[- ]?equipped|every machine|all the equipment"),
    ("rarely feeling crowded",   r"never (packed|crowded|busy)|rarely (packed|crowded|busy)|not (packed|crowded)|never (a )?wait|no wait(ing)? for"),
    ("getting busy after work",  r"(packed|crowded|busy) (after|around|at|during) (work|peak|5|6)|peak hours are"),
    ("cleanliness",              r"\bclean\b|spotless|well[- ]?maintained|always tidy|immaculate"),
    ("attentive staff",          r"staff (is|are|were) (friendly|helpful|nice|welcoming)|friendly staff|helpful staff|welcoming staff|front desk"),
    ("hands-on coaching",        r"coach(es|ing)? (is|are) (great|attentive|knowledgeable)|great coach|knowledgeable (coach|trainer)|form (check|correction)|hands[- ]?on coaching|corrects? your form"),
    ("small class sizes",        r"small (class|group)|class sizes? (are |stay )?small|intimate class|limited to \d+ people|never more than \d+"),
    ("parking",                  r"\bparking\b|easy to park|park(ing)? (lot|garage)"),
    ("sauna and recovery",       r"\bsauna\b|steam room|cold plunge|ice bath|recovery room|infrared|red light"),
    ("showers and lockers",      r"shower|locker room"),
    ("childcare",                r"child ?care|kids club|day ?care|babysitt"),
    ("a pool",                   r"\bpool\b|lap swim|swimming"),
    ("a community feel",         r"communit(y|ies)|feels like (a )?family|everyone knows|welcoming (vibe|atmosphere)|no ego|not intimidating|judgement[- ]?free|judgment[- ]?free"),
    ("being beginner-friendly",  r"beginner[- ]?friendly|new to (lifting|the gym|crossfit)|no experience (needed|necessary)|scaled|modif(y|ication|ies)"),
    ("veteran or local ownership", r"veteran[- ]?owned|family[- ]?owned|local(ly)?[- ]?owned|independently owned"),
    ("a loud training floor",    r"loud (music|gym)|music is loud|metal|rock music|blasting"),
    ("floor space",              r"plenty of (space|room)|spacious|lots of space|never feels cramped"),
    ("towel service",            r"towel service|towels (are )?provided"),
    ("bouldering and route setting", r"boulder|route ?setting|auto[- ]?belay|lead climb|top rope"),
]

# Anything a review says about money is discarded outright. Prices on this site
# come from the gym's own page carrying a date; a stranger's sentence must never
# get near one. Tracked so the report can say how often it fired.
PRICE_TALK = re.compile(
    r"\$\s?\d|\bpric(e|es|ing)\b|\bcheap\b|\bexpensive\b|affordab|worth the money|"
    r"\bcontract\b|sign[- ]?up fee|initiation|\bcancel|\bmembership fee|good value|"
    r"\brate\b|\bcosts?\b|\bbilling\b|\bfee\b",
    re.I,
)


def fetch(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": USER_AGENT, "Accept": "text/html"})
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


def places_post(path, body, mask, key):
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/" + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def places_get(path, mask, key):
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/" + path,
        headers={"X-Goog-Api-Key": key, "X-Goog-FieldMask": mask},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def cached_place_id(gym, places_cache):
    """Free place-id lookup from the discovery sweep's cache before paying for
    a text search. The sweep enumerated 359 businesses including ones we list."""
    want = re.sub(r"[^a-z0-9]", "", gym["name"].lower())
    for place in places_cache:
        name = (place.get("displayName") or {})
        text = name.get("text") if isinstance(name, dict) else name
        if not text:
            continue
        if re.sub(r"[^a-z0-9]", "", text.lower()) == want:
            return place.get("id")
    return None


def load_places_cache():
    if not PLACES_CACHE.exists():
        return []
    out, seen = [], set()

    def walk(o):
        if isinstance(o, dict):
            if "displayName" in o and o.get("id") and o["id"] not in seen:
                seen.add(o["id"])
                out.append(o)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(json.load(open(PLACES_CACHE)))
    return out


def site_copy(gym):
    """The gym's own words. Separate register from reviews, and separately
    attributable — 'the gym describes itself as' is a different claim from
    'reviewers mention'."""
    site = gym.get("website")
    if not site:
        return ""
    text = ""
    for path in ["", "/about", "/about-us"]:
        url = site.rstrip("/") + path
        ok, _ = robots_allows(url)
        if not ok:
            continue
        code, html = fetch(url)
        time.sleep(1.0)
        if code != 200 or not html:
            continue
        t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S)
        t = re.sub(r"<[^>]+>", " ", t)
        text += " " + re.sub(r"\s+", " ", t)
        if len(text) > 120000:
            break
    return text.lower()


def match_claims(reviews, site_text):
    """Count DISTINCT reviews per claim, and record a short evidence fragment.

    Returns (claims, suppressed) where claims maps label -> {n, quotes, site}.
    """
    claims = {}
    suppressed = 0
    for label, pattern in CLAIMS:
        rx = re.compile(pattern, re.I)
        hits = []
        for rv in reviews:
            body = ((rv.get("text") or {}).get("text") or "")
            if not body:
                continue
            m = rx.search(body)
            if not m:
                continue
            # Centre the evidence ON the match. Quoting from the start of the
            # sentence and truncating to a fixed width could cut the matched
            # term off entirely — which produced a "cleanliness" claim
            # evidenced by a sentence about coffee. Evidence that does not
            # contain the thing it evidences is worse than no evidence: it
            # reads as verified and cannot be checked.
            lo = max(0, m.start() - 45)
            hi = min(len(body), m.end() + 65)
            frag = re.sub(r"\s+", " ", body[lo:hi]).strip()
            frag = ("…" if lo > 0 else "") + frag + ("…" if hi < len(body) else "")
            if PRICE_TALK.search(frag):
                # A sentence that also talks about money is dropped whole rather
                # than trimmed — a half-quoted price sentence is worse than none.
                suppressed += 1
                continue
            hits.append(frag)
        on_site = bool(rx.search(site_text)) if site_text else False
        if hits or on_site:
            claims[label] = {"n": len(hits), "quotes": hits[:3], "site": on_site}
    return claims, suppressed


def candidates(claims):
    """Assemble 2-3 candidate lines from matched claims only.

    Every candidate is a template plus claim labels. Review-derived claims wear
    a review-attributed register; site-derived ones say the gym said it. Nothing
    is asserted as our own verified fact, because we did not verify it — we
    verified the price, which is a different thing and the only thing we claim.
    """
    converged = sorted(
        [(lbl, d) for lbl, d in claims.items() if d["n"] >= MIN_REVIEWS],
        key=lambda kv: -kv[1]["n"],
    )
    site_only = [lbl for lbl, d in claims.items() if d["n"] < MIN_REVIEWS and d["site"]]

    out = []
    labels = [lbl for lbl, _ in converged]

    if len(labels) >= 2:
        out.append(f"Reviewers consistently mention {labels[0]} and {labels[1]}.")
    if len(labels) >= 3:
        out.append(
            f"Regulars point to {labels[0]}, {labels[1]} and {labels[2]}."
        )
    if len(labels) == 1:
        out.append(f"Reviewers consistently mention {labels[0]}.")
    if len(labels) >= 2:
        out.append(f"{labels[0].capitalize()} comes up repeatedly in reviews, alongside {labels[1]}.")
    if site_only and labels:
        out.append(
            f"Reviewers consistently mention {labels[0]}; the gym itself highlights {site_only[0]}."
        )
    return out[:3]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="cap gyms processed (pilot first)")
    ap.add_argument("--out", default="docs/known-for-drafts.md")
    ap.add_argument("--all", action="store_true", help="include gyms that already have known_for")
    args = ap.parse_args()

    load_dotenv()
    key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not key:
        sys.exit("GOOGLE_PLACES_API_KEY not set")

    CACHE.parent.mkdir(parents=True, exist_ok=True)
    cache = json.load(open(CACHE)) if CACHE.exists() else {}
    places_cache = load_places_cache()

    gyms = [json.load(open(f)) for f in sorted(GYM_DIR.glob("*.json"))]
    todo = [g for g in gyms if args.all or not g.get("known_for")]
    if args.limit:
        todo = todo[: args.limit]

    search_calls = details_calls = 0
    rows = []

    for gym in todo:
        slug = gym["slug"]
        entry = cache.get(slug)
        if entry is None:
            pid = cached_place_id(gym, places_cache)
            if not pid:
                q = f"{gym['name']} {gym.get('address') or 'Austin TX'}"
                st, res = places_post("places:searchText", {"textQuery": q}, SEARCH_FIELDS, key)
                search_calls += 1
                time.sleep(0.4)
                pid = (res.get("places") or [{}])[0].get("id") if st == 200 else None
            if not pid:
                cache[slug] = {"place_id": None, "reviews": [], "error": "no place match"}
                entry = cache[slug]
            else:
                st, det = places_get(f"places/{pid}", DETAILS_FIELDS, key)
                details_calls += 1
                time.sleep(0.4)
                if st != 200:
                    cache[slug] = {"place_id": pid, "reviews": [], "error": json.dumps(det)[:200]}
                else:
                    cache[slug] = {
                        "place_id": pid,
                        "rating": det.get("rating"),
                        "count": det.get("userRatingCount"),
                        "editorial": (det.get("editorialSummary") or {}).get("text"),
                        "reviews": det.get("reviews", []),
                    }
                entry = cache[slug]
            json.dump(cache, open(CACHE, "w"))

        site = site_copy(gym) if entry.get("reviews") else ""
        claims, suppressed = match_claims(entry.get("reviews", []), site)
        rows.append({
            "gym": gym, "entry": entry, "claims": claims,
            "suppressed": suppressed, "candidates": candidates(claims),
        })
        print(f"· {gym['name'][:38]:40s} reviews={len(entry.get('reviews', [])):d} "
              f"claims={sum(1 for d in claims.values() if d['n'] >= MIN_REVIEWS)} "
              f"suppressed={suppressed}", flush=True)

    write_report(rows, args.out, search_calls, details_calls)
    print(f"\nAPI calls this run — searchText: {search_calls}, placeDetails: {details_calls}")
    print(f"wrote {args.out}")


def write_report(rows, out, search_calls, details_calls):
    have = [r for r in rows if r["candidates"]]
    none = [r for r in rows if not r["candidates"]]
    L = []
    A = L.append
    A("# `known_for` drafts — for owner selection\n")
    A("**Nothing here has been written to `/data`.** `known_for` is the owner's editorial")
    A("voice (CLAUDE.md §5); this sheet does the reading, you do the writing. Edit freely —")
    A("the candidates are assembled mechanically and are meant as raw material, not prose.\n")
    A("## How to read it\n")
    A(f"- A claim counts only when **{MIN_REVIEWS} or more distinct reviews** mention it.")
    A("  One reviewer noticing the parking is noise; convergence is signal.")
    A("- **The Places API returns at most 5 reviews per gym.** So convergence here means")
    A("  \"2 of 5 shown\", not \"2 of 500 held\" — a real signal, but a thin base. Treat a")
    A("  1-review claim as unproven rather than as weak evidence: it is listed only so you")
    A("  can see what was there.")
    A("- Candidate lines carry a **review-attributed register** — \"reviewers consistently")
    A("  mention\", never our own assertion. We verified the price, not the vibe.")
    A("- **Anything a review said about money was discarded**, whole sentence at a time.")
    A("  Prices come from the gym's own dated page and nothing else goes near them.")
    A("- Gyms where nothing converged appear at the bottom **with no candidates at all**.\n")
    A(f"**{len(have)} gyms have candidates; {len(none)} produced nothing.**\n")
    A("---\n")
    for r in sorted(have, key=lambda r: r["gym"]["name"]):
        g, e = r["gym"], r["entry"]
        A(f"### {g['name']}\n")
        rating = f"{e.get('rating')}★ of {e.get('count')} ratings" if e.get("rating") else "no rating data"
        A(f"`{g['slug']}` · {rating} · {len(e.get('reviews', []))} reviews read"
          + (f" · {r['suppressed']} price-talk fragment(s) discarded" if r["suppressed"] else ""))
        if e.get("editorial"):
            A(f"\nGoogle's own summary: *{e['editorial']}*")
        A("\n**Candidates**\n")
        for i, c in enumerate(r["candidates"], 1):
            A(f"{i}. {c}")
        A("\n**The claims behind them**\n")
        A("| Claim | Reviews | On their own site | Evidence |")
        A("|---|---|---|---|")
        for lbl, d in sorted(r["claims"].items(), key=lambda kv: -kv[1]["n"]):
            mark = "**yes**" if d["site"] else "—"
            ev = d["quotes"][0] if d["quotes"] else ""
            ev = ev.replace("|", "\\|")
            flag = "" if d["n"] >= MIN_REVIEWS else " _(below threshold)_"
            A(f"| {lbl}{flag} | {d['n']} | {mark} | {ev} |")
        A("")
    if none:
        A("---\n")
        A("## Nothing distinguishing emerged\n")
        A("No filler was invented for these. Where a gym's reviews say nothing concrete and")
        A("repeated, the honest output is silence — the same rule as an unpriced gym.\n")
        for r in sorted(none, key=lambda r: r["gym"]["name"]):
            e = r["entry"]
            why = e.get("error") or (f"{len(e.get('reviews', []))} reviews, no claim reached {MIN_REVIEWS}")
            A(f"- **{r['gym']['name']}** — {why}")
        A("")
    A("---\n")
    A(f"_API calls: {search_calls} text search, {details_calls} place details "
      f"(Enterprise + Atmosphere SKU — the tier that carries `reviews`)._")
    A("_Review text is cached in `scrapers/.cache/` which is gitignored. Google's Places_")
    A("_terms limit caching of Places content, so the short fragments quoted above are_")
    A("_working evidence for your edit pass, not a store — this doc is disposable once_")
    A("_the field is populated._")
    Path(out).write_text("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
