"""
Los Campeones — loscampeonesaustin.com/austin-gym-memberships

One page covers both Austin clubs plus Round Rock, which is outside our
coverage. The rate structure is identical across the Austin pair, so one parse
feeds both gym records.
"""
import re
from money import ParseError, as_number, parse_price

SLUGS = ["los-campeones-north", "los-campeones-south"]
SLUG = SLUGS[0]
URL = "https://www.loscampeonesaustin.com/austin-gym-memberships"
TIER = "monthly"

AUTOPAY = re.compile(r"Individual Monthly AutoPay\s*\\?\|\s*\$([\d,]+)", re.I)
PIF = re.compile(r"Paid[ -]?in[ -]?Full\s*[–-]?\s*(?:(\d+)-Months?|One Year|1 Year)"
                 r"\s*\\?\|\s*\$([\d,]+)", re.I)
DAY = re.compile(r"Individual Day (?:Blast )?Pass\s*\\?\|\s*\$([\d,]+)", re.I)


def parse(md):
    m = AUTOPAY.search(md)
    if not m:
        raise ParseError("lacampeones: monthly autopay rate not found")
    monthly = parse_price("$%s" % m.group(1), md, "monthly rate")

    plans = [{
        "name": "Individual Monthly AutoPay",
        "monthly": as_number(monthly),
        "enroll_fee": 0,
        "annual_fee": 0,
        "commit_months": 0,
        "restricted": None,
        "note": "No contract.",
        "is_default": True,
    }]

    seen = set()
    for months_raw, total in PIF.findall(md):
        months = int(months_raw) if months_raw else 12
        if months in seen:
            continue
        seen.add(months)
        total_value = parse_price("$%s" % total, md, "paid-in-full total")
        plans.append({
            "name": "Paid in Full %s" % ("1 Year" if months == 12 else "%d Months" % months),
            "monthly": as_number(round(total_value / months)),
            "enroll_fee": 0,
            "annual_fee": 0,
            "commit_months": months,
            "restricted": None,
            "note": "$%s paid upfront." % total,
            "is_default": False,
        })

    day = DAY.search(md)
    day_pass = as_number(parse_price("$%s" % day.group(1), md, "day pass")) if day else None
    return plans, day_pass
