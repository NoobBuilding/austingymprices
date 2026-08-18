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
    "planetfitness",
    "lifetime",
    "lacampeones",
    "bigtex",
    "hydepark",
    "eaac",
]


def load(name):
    return import_module("targets.%s" % name)


def all_targets():
    return [load(n) for n in LOW_COMPLEXITY]
