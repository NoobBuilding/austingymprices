"""
YMCA of Greater Austin — austinymca.org/join

Publishes a plain rate list. The age-restricted and multi-person tiers are
marked so the §3 default rule picks the standard adult rate rather than the
cheapest line on the page.
"""
import re
from money import ParseError, as_number, parse_price

SLUG = "ymca-greater-austin"
URL = "https://www.austinymca.org/join"
TIER = "monthly"

RATE = re.compile(r"-\s*([A-Za-z][A-Za-z –\-()0-9]*?)\s*[—\-]+\s*\$([\d,]+)\s*/\s*month", re.I)
JOIN_FEE = re.compile(r"\$0 join fee \(\$([\d,]+) savings\)", re.I)

RESTRICTED = {
    "student": "student",
    "young adult": "young-adult",
    "senior": "senior",
    "one adult household": "household",
    "two adult": "household",
    "two adult household": "household",
}


def _restriction(name):
    lowered = name.lower().strip()
    for key, value in RESTRICTED.items():
        if lowered.startswith(key):
            return value
    return None


def parse(md):
    rows = RATE.findall(md)
    if not rows:
        raise ParseError("ymca: no membership rates found")

    fee_m = JOIN_FEE.search(md)
    join_fee = parse_price("$%s" % fee_m.group(1), md, "join fee") if fee_m else None

    plans = []
    for name, amount in rows:
        clean = " ".join(name.split())
        monthly = parse_price("$%s" % amount, md, "%s rate" % clean)
        plan = {
            "name": clean,
            "monthly": as_number(monthly),
            "enroll_fee": as_number(join_fee) if join_fee is not None else 0,
            "annual_fee": 0,
            "commit_months": 0,
            "restricted": _restriction(clean),
            "note": "A 30-day notice is required to cancel.",
            "is_default": False,
        }
        if fee_m:
            plan["promo"] = {
                "enroll_fee": 0,
                "note": "$0 join fee — a $%s saving. Limited-time offer." % fee_m.group(1),
            }
        plans.append(plan)

    eligible = [p for p in plans if p["restricted"] is None]
    if not eligible:
        raise ParseError("ymca: every parsed tier is restricted; no standard adult rate")
    min(eligible, key=lambda p: p["monthly"])["is_default"] = True
    return plans, None
