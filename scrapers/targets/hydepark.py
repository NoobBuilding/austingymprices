"""
Hyde Park Gym — hydeparkgym.com/membership-info

A simple rate card. Every figure excludes sales tax, which the page states
once at the top and which we carry into the notes.
"""
import re
from money import ParseError, as_number, parse_price

SLUG = "hyde-park-gym"
URL = "https://www.hydeparkgym.com/membership-info"
TIER = "monthly"

MONTHLY = re.compile(r"Monthly Auto-Draft\s*\$?([\d,]+)", re.I)
PREPAY = re.compile(r"\*?\*?(\d+)\s*(Year|Months?)\s*[–-]\s*\$([\d,]+)", re.I)
# The page itself reads "1 Vist" — the gym's typo, not ours. `Visi?t` matches
# both that and the correct spelling, so the parser survives them fixing it.
VISIT = re.compile(r"1\s*Visi?t\s*[–-]\s*\$([\d,]+)", re.I)


def parse(md):
    m = MONTHLY.search(md)
    if not m:
        raise ParseError("hydepark: monthly auto-draft rate not found")
    monthly = parse_price("$%s" % m.group(1), md, "monthly rate")

    plans = [{
        "name": "Monthly Auto-Draft",
        "monthly": as_number(monthly),
        "enroll_fee": 0,
        "annual_fee": 0,
        "commit_months": 0,
        "restricted": None,
        "note": "Plus sales tax. No time commitment and no initiation fee.",
        "is_default": True,
    }]

    for count, unit, total in PREPAY.findall(md):
        months = 12 if unit.lower().startswith("year") else int(count)
        total_value = parse_price("$%s" % total, md, "prepay total")
        plans.append({
            "name": "1 Year" if months == 12 else "%d Months" % months,
            "monthly": as_number(round(total_value / months)),
            "enroll_fee": 0,
            "annual_fee": 0,
            "commit_months": months,
            "restricted": None,
            "note": "$%s paid upfront. Plus sales tax." % total,
            "is_default": False,
        })

    visit = VISIT.search(md)
    day_pass = as_number(parse_price("$%s" % visit.group(1), md, "day pass")) if visit else None
    return plans, day_pass
