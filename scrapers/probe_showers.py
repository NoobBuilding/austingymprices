#!/usr/bin/env python3
"""
Targeted probe for the `showers` tri-state (CLAUDE.md §3).

It PROPOSES; it never writes. Same discipline as every other probe here:

  - ordinary HTTP, the honest project User-Agent, robots.txt checked first,
    one request per URL, requests spaced
  - a match is reported WITH THE SENTENCE AROUND IT, because "a dollar sign is
    not a price" generalises exactly: the word "shower" in "shower of medals",
    in a class name, or in a blog post is not a published amenity
  - a NEGATIVE is only ever proposed where the page positively says so; silence
    stays `null`, because silence is not a no

Output is a findings table for the owner to cherry-pick from.
"""

import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from harvest import robots_allows  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
GYM_DIR = REPO_ROOT / "data" / "gyms"
USER_AGENT = "austingymprices.com price checker; reports@austingymprices.com"

# Pages a facility actually publishes its amenity list on.
PATHS = ["", "/amenities", "/facilities", "/membership", "/memberships",
         "/about", "/faq", "/pricing", "/locations", "/the-space", "/studio"]

SHOWER = re.compile(r"\bshowers?\b", re.I)
# Positive-negative: the page says there are none.
NEGATIVE = re.compile(
    r"\bno\s+(?:showers?|locker\s+rooms?\s+or\s+showers?)\b|\bshowers?\s+(?:are\s+)?(?:not\s+available|unavailable)\b",
    re.I,
)
# A shower word that is plainly not an amenity claim.
NOISE = re.compile(r"shower\s*(?:curtain|head|gel|cap)|baby\s*shower|bridal\s*shower|shower\s*of\b", re.I)


def text_of(html):
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    t = (t.replace("&amp;", "&").replace("&nbsp;", " ")
          .replace("&#039;", "'").replace("&quot;", '"'))
    return re.sub(r"\s+", " ", t).strip()


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            ctype = r.headers.get("Content-Type", "")
            if "html" not in ctype.lower():
                return r.status, ""
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception:
        return -1, ""


def snippets(text, pattern, width=140):
    out = []
    for m in pattern.finditer(text):
        a, b = max(0, m.start() - width), min(len(text), m.end() + width)
        out.append(text[a:b].strip())
        if len(out) >= 4:
            break
    return out


def probe(gym):
    site = gym.get("website") or gym.get("pricing_url")
    if not site:
        return {"verdict": "NO-SITE", "evidence": [], "url": None}
    base = site.rstrip("/")
    seen = set()
    for path in PATHS:
        url = base + path
        if url in seen:
            continue
        seen.add(url)
        allowed, reason = robots_allows(url)
        if not allowed:
            continue
        status, html = fetch(url)
        time.sleep(1.2)
        if status != 200 or not html:
            continue
        text = text_of(html)
        if not SHOWER.search(text):
            continue
        neg = snippets(text, NEGATIVE)
        if neg:
            return {"verdict": "NEGATIVE", "evidence": neg, "url": url}
        hits = [s for s in snippets(text, SHOWER) if not NOISE.search(s)]
        if hits:
            return {"verdict": "MENTION", "evidence": hits, "url": url}
    return {"verdict": "SILENT", "evidence": [], "url": base}


def main():
    only = set(sys.argv[1:])
    gyms = []
    for f in sorted(GYM_DIR.glob("*.json")):
        g = json.loads(f.read_text())
        if only and g["slug"] not in only:
            continue
        if g.get("showers") is not None:
            continue
        gyms.append(g)

    print("Probing %d gym(s) for published shower amenities." % len(gyms))
    print("Ordinary HTTP, honest User-Agent, robots.txt checked, ~1.2s apart.\n")

    rows = []
    for i, g in enumerate(gyms, 1):
        r = probe(g)
        rows.append((g, r))
        print("[%3d/%d] %-40s %s" % (i, len(gyms), g["slug"], r["verdict"]), flush=True)

    out = REPO_ROOT / "docs" / "showers-probe.md"
    lines = ["# Showers probe — findings", "",
             "Proposals only. Nothing here is written to `/data` without the owner's",
             "cherry-pick. A MENTION is a candidate, not a confirmation: read the",
             "quoted sentence, because a shower word is not a published amenity.", ""]
    for verdict in ("MENTION", "NEGATIVE", "SILENT", "NO-SITE"):
        group = [(g, r) for g, r in rows if r["verdict"] == verdict]
        if not group:
            continue
        lines.append("## %s (%d)" % (verdict, len(group)))
        lines.append("")
        for g, r in group:
            lines.append("### %s — %s" % (g["name"], g["slug"]))
            if r["url"]:
                lines.append("Source: %s" % r["url"])
            for e in r["evidence"]:
                lines.append("")
                lines.append("> …%s…" % e)
            lines.append("")
    out.write_text("\n".join(lines) + "\n")
    print("\nWrote %s" % out.relative_to(REPO_ROOT))
    for v in ("MENTION", "NEGATIVE", "SILENT", "NO-SITE"):
        print("  %-9s %d" % (v, sum(1 for _, r in rows if r["verdict"] == v)))


if __name__ == "__main__":
    main()
