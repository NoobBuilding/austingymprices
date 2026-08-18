"""
East Austin Athletic Club — eastaustinathleticclub.com/prices-1

Billed every 4 WEEKS, not monthly: 13 payments a year. The parser records what
the club actually bills; normalisation to a monthly equivalent happens at build
time so the receipt can show both (CLAUDE.md §3).
"""
import re
from money import ParseError, as_number, parse_price

SLUG = "east-austin-athletic-club"
URL = "https://www.eastaustinathleticclub.com/prices-1"
TIER = "monthly"

FOUR_WEEK = re.compile(r"###\s*(.+?)\s*\n+\s*\$([\d,.]+)\s*/\s*4\s*Week", re.I)
WEEKLY = re.compile(r"###\s*(.+?)\s*\n+\s*\$([\d,.]+)\s*/\s*Week\b", re.I)
DAY = re.compile(r"###\s*Day Pass[\s\S]{0,200}?\$([\d,]+)", re.I)

# Plans that are not a full membership. "scope" keeps them out of the
# default-plan rule while still rendering in the plan table (§3).
LIMITED = ("strike", "2x/week", "2x /week")


def _is_limited(name):
    """Substring match: the page writes "Strike Club Membership", not "Strike Club"."""
    lowered = name.lower()
    return any(token in lowered for token in LIMITED)


def parse(md):
    plans = []
    for name, amount in FOUR_WEEK.findall(md):
        value = parse_price("$%s" % amount, md, "%s rate" % name)
        clean = name.strip()
        plans.append({
            "name": clean,
            "monthly": as_number(value),
            "enroll_fee": 0,
            "annual_fee": 0,
            # One billing PERIOD minimum; the club advertises a 4-week
            # commitment for new memberships.
            "commit_months": 1,
            "restricted": "scope" if _is_limited(clean) else None,
            "note": "Billed $%s every 4 weeks — 13 billing periods a year, not "
                    "12. 4-week minimum commitment for all new memberships."
                    % amount,
            "is_default": False,
        })

    for name, amount in WEEKLY.findall(md):
        clean = name.strip()
        if any(p["name"] == clean for p in plans):
            continue
        weekly = parse_price("$%s" % amount, md, "%s weekly rate" % name)
        plans.append({
            "name": clean,
            "monthly": as_number(round(weekly * 4)),
            "enroll_fee": 0,
            "annual_fee": 0,
            "commit_months": 1,
            "restricted": "scope" if _is_limited(clean) else None,
            "note": "Billed $%s a week (about $%s per 4 weeks)."
                    % (amount, as_number(round(weekly * 4))),
            "is_default": False,
        })

    if not plans:
        raise ParseError("eaac: no plans parsed")

    # Cheapest unrestricted plan is the headline; the loader re-derives this
    # from the §3 rule anyway, and the validator fails if they disagree.
    eligible = [p for p in plans if p["restricted"] is None]
    if eligible:
        min(eligible, key=lambda p: p["monthly"])["is_default"] = True
    else:
        plans[0]["is_default"] = True

    day = DAY.search(md)
    day_pass = as_number(parse_price("$%s" % day.group(1), md, "day pass")) if day else None
    return plans, day_pass
