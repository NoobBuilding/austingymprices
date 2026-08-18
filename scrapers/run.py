#!/usr/bin/env python3
"""
Nightly scraper runner.

    python3 scrapers/run.py --tier weekly      # chains with promo churn
    python3 scrapers/run.py --tier monthly     # stable locals
    python3 scrapers/run.py bigtex hydepark    # named targets
    python3 scrapers/run.py --dry-run          # parse and diff, write nothing

Writes updated JSON into /data/gyms. It NEVER commits or pushes: the workflow
opens a pull request that a human merges (CLAUDE.md §6, §8).

Exit codes
  0  every target either updated cleanly or was unchanged
  1  at least one target failed — a guardrail tripped, a parse broke, or a
     fetch failed. The workflow surfaces this as a failed check.
"""

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import targets as target_registry  # noqa: E402
from lib import (  # noqa: E402
    GuardrailError, ParseError, ScrapeError, apply_result, check_guardrails,
    fetch, get_api_key, init_sentry, load_gym, mark_stale, report, save_gym,
    today_iso,
)

POLITE_DELAY_SECONDS = 5


def slugs_for(module):
    return getattr(module, "SLUGS", [getattr(module, "SLUG")])


def urls_for(module):
    """Multi-club targets map slug -> url; single-club targets have one URL."""
    clubs = getattr(module, "CLUBS", None)
    if clubs:
        return clubs
    return {getattr(module, "SLUG"): getattr(module, "URL")}


def run_target(name, api_key, dry_run, sentry, today):
    module = target_registry.load(name)
    ok = True

    for slug, url in urls_for(module).items():
        label = "%s/%s" % (name, slug)
        try:
            markdown = fetch(url, api_key)
            plans, day_pass = module.parse(markdown)
        except (ScrapeError, ParseError) as exc:
            print("  FAIL %-34s %s" % (label, exc))
            report(sentry, exc, name)
            path, gym = load_gym(slug)
            if mark_stale(gym, today) and not dry_run:
                save_gym(path, gym)
                print("       marked stale — last confirmed %s" % gym.get("verified_date"))
            ok = False
            continue

        path, gym = load_gym(slug)
        try:
            check_guardrails(slug, gym.get("plans", []), plans)
        except GuardrailError as exc:
            print("  BLOCK %-33s %s" % (label, exc))
            report(sentry, exc, name)
            ok = False
            continue

        before = json.dumps(gym.get("plans", []), sort_keys=True)
        history = apply_result(gym, plans, day_pass, today)
        after = json.dumps(gym["plans"], sort_keys=True)

        if before == after and not history:
            print("  --   %-34s unchanged" % label)
            if not dry_run:
                save_gym(path, gym)  # still stamps verified_date
            continue

        print("  OK   %-34s %d plan(s), %d history entr%s"
              % (label, len(plans), len(history), "y" if len(history) == 1 else "ies"))
        for entry in history:
            print("       %s %s: %s -> %s"
                  % (entry["plan_name"], entry["field"], entry["old"], entry["new"]))
        if not dry_run:
            save_gym(path, gym)

    return ok


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("targets", nargs="*", help="target names (default: all Low-complexity)")
    parser.add_argument("--tier", choices=["weekly", "monthly"],
                        help="run only targets on this cadence tier")
    parser.add_argument("--dry-run", action="store_true",
                        help="parse and diff but write nothing")
    args = parser.parse_args()

    names = args.targets or target_registry.LOW_COMPLEXITY
    if args.tier:
        names = [n for n in names if getattr(target_registry.load(n), "TIER", "monthly") == args.tier]

    if not names:
        print("No targets match. Nothing to do.")
        return 0

    sentry = init_sentry()
    api_key = get_api_key()
    today = today_iso()

    print("Running %d target(s)%s on %s\n"
          % (len(names), " (dry run)" if args.dry_run else "", today))

    failures = []
    for i, name in enumerate(names):
        if not run_target(name, api_key, args.dry_run, sentry, today):
            failures.append(name)
        if i < len(names) - 1:
            time.sleep(POLITE_DELAY_SECONDS)

    print("\n%d target(s) run, %d failed" % (len(names), len(failures)))
    if failures:
        print("failed: %s" % ", ".join(failures))
        print("\nNothing was written for the failures. A guardrail trip or a parse "
              "error means the page changed shape — look before forcing anything.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
