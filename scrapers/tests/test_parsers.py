#!/usr/bin/env python3
"""
Parser tests, run against the REAL harvested pages in tests/fixtures.

Fixtures are the actual markdown Firecrawl returned, not hand-written samples,
so a parser cannot pass here and fail in production on formatting it never saw.

The decimal-trap cases are the point of the money tests: both corruptions below
were found in the live harvest and either would have shipped a wildly wrong
price.

    python3 scrapers/tests/test_parsers.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from money import ParseError, find_prices, normalize_markdown, parse_price  # noqa: E402
import targets  # noqa: E402

# Committed fixtures, not the gitignored scratch directory: a regression test
# that only runs on the machine that happens to have scratch output is not a
# test. See fixtures/README.md.
FIXTURES = Path(__file__).resolve().parent / "fixtures"

FAILURES = []
CHECKS = 0


def check(ok, label, detail=""):
    global CHECKS
    CHECKS += 1
    print("  %s  %s%s" % ("PASS" if ok else "FAIL", label, (" — %s" % detail) if detail else ""))
    if not ok:
        FAILURES.append(label)


def fixture(name):
    path = FIXTURES / ("%s.md" % name)
    if not path.is_file():
        return None
    return path.read_text(encoding="utf-8")


# ── The decimal trap ────────────────────────────────────────────────────────
def test_money():
    print("\nDecimal trap — the exact corruptions found in the live harvest")

    crunch = fixture("crunch")
    if crunch:
        check(float(parse_price(r"# $3699/mo\*", crunch)) == 36.99,
              "Crunch '$3699/mo' repairs to $36.99 (footnote ate the decimal)")
        check(float(parse_price(r"# $2699/mo\*", crunch)) == 26.99,
              "Crunch '$2699/mo' repairs to $26.99")
        check(float(parse_price(r"# $999/mo\*", crunch)) == 9.99,
              "Crunch '$999/mo' repairs to $9.99")
    else:
        check(False, "crunch fixture present")

    crux = fixture("crux")
    if crux:
        check(parse_price("#### **$32** **0**", crux) == 320,
              "Crux '**$32** **0**' rejoins to $320 (bold split one number)")
        check(float(parse_price("#### **$94.99/mo**", crux)) == 94.99,
              "Crux '$94.99/mo' parses untouched")
    else:
        check(False, "crux fixture present")

    print("\nRepairs are only accepted when the page corroborates them")
    try:
        parse_price("$9999", "no corroboration anywhere in this document")
        check(False, "uncorroborated implausible price raises ParseError")
    except ParseError:
        check(True, "uncorroborated implausible price raises ParseError")

    try:
        parse_price("$3699", "the page mentions $12.34 and nothing else")
        check(False, "a repair with the wrong corroboration is rejected")
    except ParseError:
        check(True, "a repair with the wrong corroboration is rejected")

    check(float(parse_price("$55", "irrelevant document")) == 55,
          "a plainly plausible price needs no corroboration")

    print("\nNormalisation")
    check(normalize_markdown("**$32** **0**").strip() == "$320",
          "split bold runs rejoin")
    check(r"$36.99*" in normalize_markdown(r"$36.99\*"),
          "escaped footnote markers survive normalisation")
    check([float(p) for p in find_prices("costs $15 or $259 a month")] == [15, 259],
          "find_prices returns every plausible figure in order")
    check(find_prices("a $99999 typo") == [],
          "find_prices drops implausible figures rather than guessing")


# ── Target parsers, against real pages ──────────────────────────────────────
EXPECTED = {
    "bigtex": {
        "fixture": "bigtex",
        "default": ("Month-to-Month", 55),
        "annual_fee": 45,
        "commit": 2,
        "day_pass": 10,
        "min_plans": 4,
    },
    "hydepark": {
        "fixture": "hydepark",
        "default": ("Monthly Auto-Draft", 79),
        "annual_fee": 0,
        "commit": 0,
        "day_pass": 15,
        "min_plans": 3,
    },
    "lacampeones": {
        "fixture": "lacampeones",
        "default": ("Individual Monthly AutoPay", 89),
        "annual_fee": 0,
        "commit": 0,
        "day_pass": 19,
        "min_plans": 3,
    },
    "lifetime": {
        "fixture": "lifetime",
        "default": ("Membership", 259),
        "annual_fee": 0,
        "commit": None,
        "day_pass": None,
        "min_plans": 1,
    },
    "eaac": {
        "fixture": "eaac",
        "default": ("Unlimited", 215),
        "annual_fee": 0,
        "commit": 1,
        "day_pass": 45,
        "min_plans": 3,
    },
    # ── Medium-complexity targets ──────────────────────────────────────────
    "crunch": {
        "fixture": "crunch",
        "default": ("Base (month-to-month)", 15.99),
        "annual_fee": 10,
        "commit": 0,
        "day_pass": None,
        "min_plans": 4,
    },
    "ymca": {
        "fixture": "ymca",
        "default": ("Adult", 75),
        "annual_fee": 0,
        "commit": 0,
        "day_pass": None,
        "min_plans": 6,
    },
    "crux": {
        "fixture": "crux",
        "default": ("Monthly Drafting", 94.99),
        "annual_fee": 0,
        "commit": 0,
        "day_pass": 26,
        "min_plans": 4,
    },
    "abp": {
        "fixture": "abp",
        "default": ("Adult (21 & Up)", 95),
        "annual_fee": 0,
        "commit": 0,
        "day_pass": 25,
        "min_plans": 3,
    },
    "lafitness": {
        "fixture": "lafitness-anderson-rates",
        "default": ("Basic (Club of Enrollment)", 31.99),
        "annual_fee": 69,
        "commit": 0,
        "day_pass": None,
        "min_plans": 3,
    },
}


def test_targets():
    for name, want in EXPECTED.items():
        print("\n%s" % name)
        md = fixture(want["fixture"])
        if md is None:
            check(False, "%s fixture present" % name)
            continue

        module = targets.load(name)
        try:
            plans, day_pass = module.parse(md)
        except ParseError as exc:
            check(False, "%s parses its real page" % name, str(exc))
            continue

        check(len(plans) >= want["min_plans"], "parses at least %d plans" % want["min_plans"],
              "%d plans" % len(plans))

        defaults = [p for p in plans if p["is_default"]]
        check(len(defaults) == 1, "exactly one default plan", "%d" % len(defaults))

        if defaults:
            d = defaults[0]
            check(d["name"] == want["default"][0], "default plan is %r" % want["default"][0], d["name"])
            check(d["monthly"] == want["default"][1],
                  "default rate is $%s" % want["default"][1], str(d["monthly"]))
            check(d["annual_fee"] == want["annual_fee"],
                  "annual fee is %s" % want["annual_fee"], str(d["annual_fee"]))
            check(d["commit_months"] == want["commit"],
                  "commit_months is %s" % want["commit"], str(d["commit_months"]))

        check(day_pass == want["day_pass"], "day pass is %s" % want["day_pass"], str(day_pass))

        for p in plans:
            check("restricted" in p and "note" in p, "plan %r has the full shape" % p["name"])
            break


def test_planetfitness():
    print("\nplanetfitness — promo-only, standing rate never published")
    md = fixture("planetfitness")
    if md is None:
        check(False, "planetfitness fixture present")
        return

    plans, day_pass = targets.load("planetfitness").parse(md)
    check(len(plans) >= 2, "parses the tiers", "%d plans" % len(plans))
    check(all(p["monthly"] is None for p in plans),
          "NO plan carries a standing monthly rate")
    check(all(p.get("promo") for p in plans), "every plan carries its promo block")
    check(any(p["promo"]["price"] == 10 for p in plans),
          "Classic promo rate $10 captured")
    check(any(p["promo"]["price"] == 29.99 for p in plans),
          "Black Card promo rate $29.99 captured")
    check(sum(1 for p in plans if p["is_default"]) == 1, "exactly one default plan")
    check(day_pass is None, "no day pass claimed")


SECRET_PATTERNS = [
    (r"\b(?:sk|pk)\.[A-Za-z0-9._-]{20,}", "Mapbox token"),
    (r"\bAIza[0-9A-Za-z_-]{30,}", "Google API key"),
    (r"\bfc-[A-Za-z0-9]{20,}", "Firecrawl key"),
    (r"\bgh[pousr]_[A-Za-z0-9]{20,}", "GitHub token"),
    (r"\bAKIA[0-9A-Z]{16}\b", "AWS access key"),
    (r"-----BEGIN [A-Z ]*PRIVATE KEY", "private key"),
]


def test_fixture_hygiene():
    """
    Fixtures are other people's web pages, and web pages embed credentials.
    The YMCA's page carried a live Mapbox token, which went into a fixture and
    was caught only by GitHub push protection at the moment of pushing to a
    PUBLIC repo. Committing someone else's working key is not our secret to
    leak. This keeps that from depending on a server-side backstop.
    """
    import re as _re
    print("\nFixture hygiene — no third-party credentials")
    findings = []
    for path in sorted(FIXTURES.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        for pattern, label in SECRET_PATTERNS:
            if _re.search(pattern, text):
                findings.append("%s: %s" % (path.name, label))
    check(not findings, "no fixture contains a credential", "; ".join(findings))
    check(
        any("REDACTED" in p.read_text(encoding="utf-8") for p in FIXTURES.glob("*.md")),
        "redaction markers are present, so redaction is visible rather than silent",
    )


def test_near_misses():
    """
    Cases where a plausible-looking regex returned a plausible-looking WRONG
    number. These are the dangerous ones: nothing about $5 or $29.99 looks
    corrupt, so only a test pinned to the real page catches them.
    """
    print("\nNear misses — plausible but wrong")

    crux = fixture("crux")
    plans, _ = targets.load("crux").parse(crux)
    drafting = next(p for p in plans if p["name"] == "Monthly Drafting")
    check(drafting["monthly"] == 94.99,
          "Crux monthly drafting is $94.99, not the $5/mo FREEZE FEE in the prose above it",
          str(drafting["monthly"]))

    la = fixture("lafitness-anderson-rates")
    plans, _ = targets.load("lafitness").parse(la)
    default = next(p for p in plans if p["is_default"])
    cheapest_sticker = min(plans, key=lambda p: p["monthly"])
    check(default["monthly"] == 31.99,
          "LA Fitness default is the $31.99 plan (cheapest ALL-IN)", str(default["monthly"]))
    check(cheapest_sticker["monthly"] == 29.99,
          "...even though $29.99 is the cheapest sticker", str(cheapest_sticker["monthly"]))
    check(default is not cheapest_sticker,
          "the all-in inversion is preserved: cheapest sticker != cheapest all-in")

    abp_md = fixture("abp")
    plans, _ = targets.load("abp").parse(abp_md)
    adult = next(p for p in plans if p["is_default"])
    check(adult["monthly"] == 95 and adult["promo"]["price"] == 69,
          "ABP standing rate is $95 with $69 as the promo, never the other way round",
          "standing=%s promo=%s" % (adult["monthly"], adult["promo"]["price"]))

    ymca_md = fixture("ymca")
    plans, _ = targets.load("ymca").parse(ymca_md)
    default = next(p for p in plans if p["is_default"])
    check(default["name"] == "Adult",
          "YMCA default is the adult rate, not the cheaper age-restricted Student tier",
          default["name"])


def main():
    print("Parser tests — fixtures are the real harvested pages")
    test_money()
    test_targets()
    test_planetfitness()
    test_near_misses()
    test_fixture_hygiene()
    print("\n%d checks, %d failed" % (CHECKS, len(FAILURES)))
    if FAILURES:
        for f in FAILURES:
            print("  FAILED: %s" % f)
        return 1
    print("OK — parsers behave.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
