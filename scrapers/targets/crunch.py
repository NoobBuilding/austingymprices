"""
Crunch — crunch.com/locations/{slug}

The page that produced the decimal trap. Tier headlines render as "# $3699/mo\\*"
because an escaped footnote marker eats the decimal point; money.parse_price
repairs that only against the plain-text list further down the page, which
writes the same figures properly.
"""
import re
from money import ParseError, as_number, parse_price

SLUG = "crunch-south-austin"
URL = "https://www.crunch.com/locations/south-austin"
TIER = "weekly"

# The corroborating list: "- Peak Results: $36.99 monthly"
FLEX = re.compile(
    r"-\s*(Peak Results|Peak|Base):\s*\$([\d.]+)\s*monthly"
    r"(?:\s*and\s*\$([\d.]+)\s*monthly with annual commitment)?",
    re.I,
)
ENROLL = re.compile(r"Enrollment fee[\s\S]{0,160}?\$([\d,.]+)", re.I)
ANNUAL = re.compile(r"Prorated annual fee[\s\S]{0,160}?\$([\d,.]+)", re.I)
PROMO = re.compile(r"JOIN FOR (\d+)¢", re.I)


def parse(md):
    rows = FLEX.findall(md)
    if not rows:
        raise ParseError("crunch: the flexible-membership list was not found")

    enroll_m = ENROLL.search(md)
    annual_m = ANNUAL.search(md)
    enroll = parse_price("$%s" % enroll_m.group(1), md, "enrollment fee") if enroll_m else None
    annual = parse_price("$%s" % annual_m.group(1), md, "annual fee") if annual_m else None
    if enroll is None or annual is None:
        raise ParseError("crunch: enrollment or annual fee not found")

    promo = PROMO.search(md)
    promo_block = (
        {"enroll_fee": 0.01, "note": "Join for %s¢ — enrollment fee reduced." % promo.group(1)}
        if promo else None
    )

    plans = []
    for name, monthly_raw, commit_raw in rows:
        monthly = parse_price("$%s" % monthly_raw, md, "%s rate" % name)
        base = {
            "name": name if name.lower() != "base" else "Base (month-to-month)",
            "monthly": as_number(monthly),
            "enroll_fee": as_number(enroll),
            "annual_fee": as_number(annual),
            "commit_months": 0,
            "restricted": None,
            "note": "Excludes tax and recurring processing fees.",
            "is_default": False,
        }
        if promo_block:
            base["promo"] = dict(promo_block)
        plans.append(base)

        # Base also has an annual-commitment rate on the same line.
        if commit_raw:
            committed = parse_price("$%s" % commit_raw, md, "base committed rate")
            commit_plan = {
                "name": "Base (12-month commitment)",
                "monthly": as_number(committed),
                "enroll_fee": as_number(enroll),
                "annual_fee": as_number(annual),
                "commit_months": 12,
                "restricted": None,
                "note": "Single-club access. Excludes tax and processing fees.",
                "is_default": False,
            }
            if promo_block:
                commit_plan["promo"] = dict(promo_block)
            plans.append(commit_plan)

    # §3 default rule: cheapest all-in among unrestricted, commit <= 2.
    eligible = [p for p in plans if p["commit_months"] <= 2]
    target = min(eligible or plans, key=lambda p: p["monthly"])
    target["is_default"] = True
    return plans, None
