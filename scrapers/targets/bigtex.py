"""
Big Tex Gym — bigtexgym.com/membership

The seed sheet calls this one the model citizen and it is: every fee is
published, including the 75-day timing of the maintenance charge. The page is
plain markdown with prices on their own lines.
"""
import re
from money import ParseError, as_number, find_prices, parse_price

SLUG = "big-tex-gym"
URL = "https://www.bigtexgym.com/membership"
TIER = "monthly"

# Paid-in-full tiers: total price, then the gym's own per-month figure.
PREPAY = re.compile(
    r"(\d+)\s+Months?\s*\n+\s*\$([\d,]+)\s*\n+\s*\(\$(\d+)/mo\)", re.I
)


def parse(md):
    plans = []

    monthly = parse_price(_section(md, "Month to Month", 400), md, "month-to-month rate")
    annual_fee = _annual_fee(md)

    plans.append({
        "name": "Month-to-Month",
        "monthly": as_number(monthly),
        "enroll_fee": 0,
        "annual_fee": as_number(annual_fee),
        # The page advertises "No Contract" but also states a 2-month minimum.
        # We record the minimum; the badge rule in §3 stops it being sold as
        # no-contract.
        "commit_months": 2 if re.search(r"2-month minimum", md, re.I) else 0,
        "restricted": None,
        "note": "Plus tax. Auto-renewal with a 2-month minimum. The annual "
                "maintenance fee is charged 75 days after signup, then annually "
                "on that date.",
        "is_default": True,
    })

    for months, total, per_month in PREPAY.findall(md):
        plans.append({
            "name": "%s Months Paid in Full" % months,
            "monthly": int(per_month),
            "enroll_fee": 0,
            "annual_fee": 0,
            "commit_months": int(months),
            "restricted": None,
            "note": "$%s paid upfront ($%s/mo as published by the gym). "
                    "Paid-in-full plans carry no annual maintenance fee."
                    % (total, per_month),
            "is_default": False,
        })

    if not plans:
        raise ParseError("bigtex: no plans parsed")

    return plans, as_number(_day_pass(md))


def _section(md, heading, span):
    idx = md.find(heading)
    if idx < 0:
        raise ParseError("bigtex: heading %r not found" % heading)
    return md[idx:idx + span]


def _annual_fee(md):
    m = re.search(r"\$(\d+)\s*/?\s*year maintenance fee", md, re.I)
    if not m:
        raise ParseError("bigtex: annual maintenance fee not found")
    return parse_price("$%s" % m.group(1), md, "annual fee")


def _day_pass(md):
    block = md.find("Day Pass")
    if block < 0:
        return None
    prices = find_prices(md[block:block + 300])
    return prices[0] if prices else None
