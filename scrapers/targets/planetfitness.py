"""
Planet Fitness — per-club offers page.

Every tier on this page carries a dated promotional offer, and the standing
rate is never published. The parser therefore records promo pricing in the
`promo` block and leaves the standing fields null: a promo number is never
promoted to standing (CLAUDE.md §3).
"""
import re
from money import ParseError, as_number, parse_price

SLUG = "planet-fitness-e-riverside"
URL = "https://www.planetfitness.com/gyms/austin-e-riverside-tx/offers"
TIER = "weekly"

TIER_BLOCK = re.compile(
    r"^(PF BLACK CARD®|Classic ?PLUS|Classic)\s*$", re.I | re.M
)
PRICE = re.compile(r"\$([\d,]+(?:\.\d{2})?)\s*/mo", re.I)
STARTUP = re.compile(r"\$([\d,]+(?:\.\d{2})?)\s*Startup Fee", re.I)
ANNUAL = re.compile(r"annual (?:membership )?fee of \$([\d,]+(?:\.\d{2})?)", re.I)
EXPIRES = re.compile(r"Offer Expires\s*([A-Z][a-z]+ \d+[a-z]{0,2})", re.I)


def parse(md):
    matches = list(TIER_BLOCK.finditer(md))
    if not matches:
        raise ParseError("planetfitness: no membership tiers found")

    expires_raw = EXPIRES.search(md)
    expires_note = (" Offer expires %s." % expires_raw.group(1)) if expires_raw else ""

    plans = []
    for i, m in enumerate(matches):
        block = md[m.end(): matches[i + 1].start() if i + 1 < len(matches) else len(md)]
        price_m = PRICE.search(block)
        if not price_m:
            continue
        price = parse_price("$%s" % price_m.group(1), md, "%s rate" % m.group(1))
        startup_m = STARTUP.search(block)
        startup = parse_price("$%s" % startup_m.group(1), md, "startup fee") if startup_m else None
        annual_m = ANNUAL.search(block)
        annual = parse_price("$%s" % annual_m.group(1), md, "annual fee") if annual_m else None

        plans.append({
            "name": m.group(1).replace("®", "").strip().title(),
            # PROMO-ONLY: no standing rate is published anywhere on this page.
            "monthly": None,
            "enroll_fee": None,
            "annual_fee": None,
            "commit_months": 0,
            "restricted": None,
            "note": "PROMO-ONLY: the standing rate is not published. Every tier "
                    "on the page carries a dated offer, so the promotional "
                    "figures cannot be promoted to standing.%s" % expires_note,
            "is_default": len(plans) == 0,
            "promo": {
                "price": as_number(price),
                "enroll_fee": as_number(startup),
                "annual_fee": as_number(annual),
                "note": "Promotional rate.%s" % expires_note,
            },
        })

    if not plans:
        raise ParseError("planetfitness: tiers found but no prices parsed")
    return plans, None
