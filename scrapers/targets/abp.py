"""
Austin Bouldering Project — austinboulderingproject.com/membership/

Each tier shows two figures: a promotional rate and the standing rate. The
owner confirmed the higher figure is standing and the lower is the current
promo, so the standing price drives the maths and the promo renders as a flag
(CLAUDE.md §3).
"""
import re
from money import ParseError, as_number, parse_price

SLUG = "austin-bouldering-project"
URL = "https://austinboulderingproject.com/membership/"
TIER = "monthly"

# The page uses DOUBLE backslashes as line continuations:
#   **Adult**\\
#   (Age 21 & Up) \\
#   ...
#   $69 \\
#   $95 \\
# so the separators must swallow runs of backslashes and whitespace together.
SEP = r"[\\\s]*"
TIER_BLOCK = re.compile(
    r"\*\*(Adult|Young Adult|Youth)\*\*" + SEP + r"\((Age[^)]*)\)"
    r"[\s\S]{0,400}?\$(\d+)" + SEP + r"\$(\d+)",
    re.I,
)
ACTIVATION = re.compile(r"~~\+\$(\d+) activation fee~~", re.I)
DAY_BLOCK = re.compile(
    r"\*\*(Adult|Young Adult|Youth)\*\*" + SEP + r"\((Age[^)]*)\)"
    r"[\s\S]{0,300}?Access from open-close[\s\S]{0,300}?\$(\d+)",
    re.I,
)

RESTRICTED = {"young adult": "young-adult", "youth": "youth"}


def parse(md):
    blocks = TIER_BLOCK.findall(md)
    if not blocks:
        raise ParseError("abp: no membership tiers found")

    act_m = ACTIVATION.search(md)
    activation = parse_price("$%s" % act_m.group(1), md, "activation fee") if act_m else 0

    plans = []
    seen = set()
    for name, ages, promo_raw, standing_raw in blocks:
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        promo = parse_price("$%s" % promo_raw, md, "%s promo rate" % name)
        standing = parse_price("$%s" % standing_raw, md, "%s standing rate" % name)
        if standing <= promo:
            raise ParseError(
                "abp: %s standing rate $%s is not above the promo rate $%s — the page "
                "layout has changed and the two figures may have swapped."
                % (name, standing, promo)
            )
        plans.append({
            "name": "%s (%s)" % (name, ages.replace("Age ", "").strip()),
            "monthly": as_number(standing),
            "enroll_fee": as_number(activation),
            "annual_fee": 0,
            "commit_months": 0,
            "restricted": RESTRICTED.get(key),
            "note": "Month-to-month with easy cancellation.",
            "is_default": False,
            "promo": {
                "price": as_number(promo),
                "enroll_fee": 0,
                "note": "Current promotional rate, $%s standing. Activation fee "
                        "currently waived." % as_number(standing),
            },
        })

    eligible = [p for p in plans if p["restricted"] is None]
    if not eligible:
        raise ParseError("abp: no unrestricted adult tier found")
    min(eligible, key=lambda p: p["monthly"])["is_default"] = True

    day_pass = None
    for name, _ages, amount in DAY_BLOCK.findall(md):
        if name.lower() == "adult":
            day_pass = as_number(parse_price("$%s" % amount, md, "adult day pass"))
            break
    return plans, day_pass
