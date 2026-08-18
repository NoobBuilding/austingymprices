#!/usr/bin/env python3
"""
Task 4a helper — pull street addresses from each gym's own website.

Nominatim name searches resolve most Austin gyms, but ~20 return nothing or
something too coarse to pin. For those, the authoritative source is the gym's
own site footer or contact page, which is also where CLAUDE.md §6 says
addresses should come from.

One Firecrawl request per gym, site root first (footers carry the address far
more often than not). Extracted addresses are written to a JSON side-file for
review; nothing touches /data until a human has read the table.
"""
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest import ScrapeError, firecrawl_scrape, get_api_key  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "harvest_output" / "_addresses.json"

STREET = re.compile(
    r"\b\d{3,6} [A-Za-z0-9.'#-]+(?: [A-Za-z0-9.'#-]+){0,6} "
    r"(?:Blvd|Boulevard|Ave|Avenue|St|Street|Rd|Road|Ln|Lane|Dr|Drive|Way|Pkwy|"
    r"Parkway|Terrace|Cir|Circle|Ct|Court|Hwy|Highway|Expy|Expressway|Loop|Trail|Trl)\b\.?",
    re.I,
)


def extract(markdown):
    """Return plausible Austin street addresses, most likely first."""
    text = re.sub(r"https?://[^\s)]+", " ", markdown)
    found, seen = [], set()
    for line in text.splitlines():
        if len(line) > 400:
            continue
        for m in STREET.finditer(line):
            s = " ".join(m.group(0).split())
            key = s.lower()
            if key in seen:
                continue
            seen.add(key)
            # Prefer lines that also mention Austin or a 787xx zip.
            score = 0
            if re.search(r"austin", line, re.I):
                score += 2
            if re.search(r"\b787\d{2}\b", line):
                score += 2
            found.append((score, s, line.strip()[:120]))
    found.sort(key=lambda t: -t[0])
    return found[:3]


def main():
    slugs = sys.argv[1:]
    if not slugs:
        raise SystemExit("usage: fetch_addresses.py <slug> [<slug> ...]")

    api_key = get_api_key()
    results = json.loads(OUT.read_text()) if OUT.is_file() else {}

    for i, slug in enumerate(slugs):
        path = REPO_ROOT / "data" / "gyms" / ("%s.json" % slug)
        gym = json.loads(path.read_text(encoding="utf-8"))
        url = gym.get("pricing_url") or gym.get("website")
        if not url:
            print("%-30s SKIP no url" % slug)
            continue
        if slug in results:
            print("%-30s cached" % slug)
            continue

        print("[%d/%d] %-28s %s" % (i + 1, len(slugs), slug, url))
        try:
            markdown, meta = firecrawl_scrape(url, api_key)
        except ScrapeError as exc:
            print("        FAIL %s" % exc)
            results[slug] = {"url": url, "error": str(exc), "candidates": []}
        else:
            cands = extract(markdown)
            results[slug] = {
                "url": url,
                "candidates": [{"score": s, "address": a, "context": c} for s, a, c in cands],
            }
            for s, a, c in cands:
                print("        [%d] %s" % (s, a))
            if not cands:
                print("        (no address found in page)")
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
        # Firecrawl's free tier rate-limits bursts (HTTP 429). Space requests out.
        if i < len(slugs) - 1:
            time.sleep(12)

    print("\nWrote %s" % OUT.relative_to(REPO_ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
