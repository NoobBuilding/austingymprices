"""
LA Fitness — per-club MembershipSignUpRate pages.

Note the id= token in these URLs is encrypted and may rotate. If this target
starts failing, suspect the token before anything else.

This club is the reason the site exists: the $29.99 plan costs more all-in than
the $31.99 plan, because of a $99 initiation fee.
"""
import re
from money import ParseError, as_number, parse_price

CLUBS = {
    "la-fitness-anderson-lane":
        "https://lafitness.com/Pages/MembershipSignUpRate.aspx?id=0rKCfAR8YfSVA2GVWHmQVQ%3d%3d",
    "la-fitness-s-lamar":
        "https://lafitness.com/Pages/MembershipSignUpRate.aspx?id=ZsgkxVy%2fljny5dznUn5EIw%3d%3d",
}
SLUGS = list(CLUBS)
SLUG = SLUGS[0]
URL = CLUBS[SLUG]
TIER = "weekly"

BLOCK = re.compile(
    r"^(BASIC|CLASSIC|SIGNATURE)\s*\n+(.+?)\s*\n+##\s*\*\*\$([\d,.]+)\*\*\s*per month"
    r"[\s\S]{0,300}?####\s*\*\*\$([\d,.]+) Initiation Fee\*\*"
    r"[\s\S]{0,120}?####\s*\$([\d,.]+) Annual Fee",
    re.I | re.M,
)


def parse(md):
    blocks = BLOCK.findall(md)
    if not blocks:
        raise ParseError("lafitness: no membership blocks found")

    plans = []
    for tier, access, monthly_raw, init_raw, annual_raw in blocks:
        monthly = parse_price("$%s" % monthly_raw, md, "%s rate" % tier)
        initiation = parse_price("$%s" % init_raw, md, "%s initiation" % tier)
        annual = parse_price("$%s" % annual_raw, md, "%s annual fee" % tier)
        access_clean = " ".join(access.split())
        name = "%s (%s)" % (tier.title(), access_clean)
        if any(p["name"] == name for p in plans):
            name = "%s (%s, no initiation)" % (tier.title(), access_clean)
        plans.append({
            "name": name,
            "monthly": as_number(monthly),
            "enroll_fee": as_number(initiation),
            "annual_fee": as_number(annual),
            "commit_months": 0,
            "restricted": None,
            "note": "No initial term; auto-renews. The annual fee is billed 14 days "
                    "after enrollment and every year thereafter. Last month's dues "
                    "are collected upfront alongside the first month. Excludes tax.",
            "is_default": False,
        })

    # Cheapest ALL-IN, not cheapest sticker — the whole point of this club.
    def all_in(p):
        return (p["monthly"] * 12 + p["enroll_fee"] + p["annual_fee"]) / 12

    min(plans, key=all_in)["is_default"] = True
    return plans, None
