"""
Scraper targets. One module per target; each exposes:

    SLUG          the gym slug in /data/gyms (or SLUGS for multi-gym targets)
    URL           the public pricing page
    TIER          "weekly" | "monthly" — the cadence tier from CLAUDE.md §6
    parse(md)     markdown -> (plans, day_pass)

Parsers raise ParseError rather than returning a doubtful number. The runner
turns that into a loud failure and writes nothing.
"""

from importlib import import_module

# The 6 "Low complexity" targets, per CLAUDE.md §9 step 6.
LOW_COMPLEXITY = [
    "planetfitness", "lifetime", "lacampeones", "bigtex", "hydepark", "eaac",
]

# The "Medium" targets that turned out to be scrapable, per §9 step 7.
# Three of the eight are not, and no amount of parser work changes that:
#   goldsgym    every fetch times out, ordinary and stealth; the join flow
#               returns HTTP 500. The site refuses automated access.
#   castlehill  rates are not in the page source at all; the membership
#               content renders client-side.
#   24hour      the public club listing carries no rates; prices sit behind a
#               point-of-sale redirect.
# All three are data_source "manual" and stay on the outreach list.
MEDIUM_COMPLEXITY = ["crunch", "ymca", "crux", "abp", "lafitness"]

UNSCRAPABLE = {
    "goldsgym": "site blocks automated fetches (timeout ordinary and stealth; join flow 500)",
    "castlehill": "rates render client-side; not present in the page source",
    "24hour": "no rates on the public listing; behind a point-of-sale redirect",
}

ALL_TARGETS = LOW_COMPLEXITY + MEDIUM_COMPLEXITY


def load(name):
    return import_module("targets.%s" % name)


def all_targets():
    return [load(n) for n in ALL_TARGETS]
