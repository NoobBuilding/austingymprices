"""
Crux Climbing Center — cruxclimbingcenter.com/south-austin/rates

The other decimal-trap page: the 3-month paid-in-full total renders as
"**$32** **0**" because bold markers split $320 across two runs.
"""
import re
from money import ParseError, as_number, normalize_markdown, parse_price

SLUG = "crux-climbing-center-south"
URL = "https://www.cruxclimbingcenter.com/south-austin/rates"
TIER = "monthly"

# Anchored on the PRICE HEADING, not the first "$x/mo" after the title. The
# prose between them mentions a "$5/mo freeze fee", and a non-greedy match
# happily returned $5 as the membership rate — a $95 gym listed at $5. Prices
# on this page always live in a `#### **$N/mo**` heading.
DRAFTING = re.compile(
    r"Monthly Drafting Membership[\s\S]{0,700}?####\s*\*\*\$([\d,.]+)\s*/mo\*\*", re.I
)
INITIATION = re.compile(r"\$([\d,]+)\s*initiation fee", re.I)
PIF = re.compile(
    r"####\s*\*\*(1 Month|3-Month|1 Year) Paid[- ]?[iI]n[- ]?Full(?: Membership)?\*\*"
    r"[\s\S]{0,400}?####\s*(\*\*\$[\d,]+\*\*(?:\s*\*\*\d+\*\*)?)",
    re.I,
)
CREW = re.compile(r"\*\*\$([\d,]+)/mo \(\$([\d,]+)/each\)\*\*", re.I)
DAY = re.compile(r"####\s*\*\*\$([\d,]+)\*\*", re.I)

MONTHS = {"1 month": 1, "3-month": 3, "1 year": 12}


def parse(md):
    drafting_m = DRAFTING.search(md)
    if not drafting_m:
        raise ParseError("crux: monthly drafting rate not found")
    monthly = parse_price("$%s" % drafting_m.group(1), md, "monthly drafting rate")

    init_m = INITIATION.search(md)
    initiation = parse_price("$%s" % init_m.group(1), md, "initiation fee") if init_m else 0

    plans = [{
        "name": "Monthly Drafting",
        "monthly": as_number(monthly),
        "enroll_fee": as_number(initiation),
        "annual_fee": 0,
        "commit_months": 0,
        "restricted": None,
        "note": "Access to all locations, unlimited yoga and fitness classes, two "
                "guest passes a month. No cancellation fee. Can be frozen for $5/mo.",
        "is_default": True,
    }]

    for label, raw_total in PIF.findall(md):
        months = MONTHS[label.lower()]
        # raw_total may be the split-bold form; parse_price rejoins it.
        # A year paid in full is legitimately ~$950, well past the per-period
        # ceiling, so this call carries its own.
        total = parse_price(raw_total, md, "%s paid-in-full total" % label, maximum=5000)
        plans.append({
            "name": "%s Paid in Full" % ("1 Year" if months == 12 else label.replace("-", " ")),
            "monthly": as_number(round(total / months)),
            "enroll_fee": 0,
            "annual_fee": 0,
            "commit_months": months,
            "restricted": None,
            "note": "$%s paid upfront, non-refundable." % as_number(total),
            "is_default": False,
        })

    crew = CREW.search(normalize_markdown(md))
    if crew:
        each = parse_price("$%s" % crew.group(2), md, "crew per-person rate")
        plans.append({
            "name": "2 Person Crew (Monthly Drafting)",
            "monthly": as_number(each),
            "enroll_fee": as_number(initiation),
            "annual_fee": 0,
            "commit_months": 0,
            # Two people required — not buyable by a solo adult.
            "restricted": "household",
            "note": "$%s/mo total for two people, plus initiation." % crew.group(1),
            "is_default": False,
        })

    day = DAY.search(md[md.find("Day Pass"):]) if "Day Pass" in md else None
    day_pass = as_number(parse_price(day.group(0), md, "day pass")) if day else None
    return plans, day_pass
