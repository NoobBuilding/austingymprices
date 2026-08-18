"""
Life Time — one club page per location.

The page publishes a single "Starting at $X/month" entry rate and states no
commitment terms at all. commit_months stays null so no badge is asserted from
silence (CLAUDE.md §3).
"""
import re
from money import ParseError, as_number, parse_price

CLUBS = {
    "life-time-south": "https://www.lifetime.life/locations/tx/austin-south/memberships.html",
    "life-time-downtown": "https://www.lifetime.life/locations/tx/austin-downtown/memberships.html",
    "life-time-north": "https://www.lifetime.life/locations/tx/austin-north/memberships.html",
}
SLUGS = list(CLUBS)
SLUG = SLUGS[0]
URL = CLUBS[SLUG]
TIER = "weekly"

STARTING_AT = re.compile(r"Starting at\s*\n+\s*\$([\d,]+)\s*/\s*month", re.I)


def parse(md):
    m = STARTING_AT.search(md)
    if not m:
        raise ParseError("lifetime: 'Starting at $X/month' not found")
    monthly = parse_price("$%s" % m.group(1), md, "starting rate")

    return [{
        "name": "Membership",
        "monthly": as_number(monthly),
        "enroll_fee": 0,
        "annual_fee": 0,
        # Life Time publishes no commitment terms. null renders no badge.
        "commit_months": None,
        "restricted": None,
        "note": "Published as a \"starting at\" rate — the entry tier. Life Time "
                "states dues, fees and charges may vary by location and change. "
                "No enrollment or annual fee is stated on the site; recorded as "
                "none but unconfirmed. Commitment terms are not published.",
        "is_default": True,
    }], None
