#!/usr/bin/env python3
"""
Price parsing, built defensively against the ways markdown mangles money.

The one-time harvest turned up two real corruptions, either of which would
have put a catastrophically wrong number on the site if parsed naively:

  Crunch   "# $3699/mo\\*"        the real price is $36.99 — an escaped
           "# $999/mo\\*"         footnote marker swallowed the decimal point
  Crux     "#### **$32** **0**"   the real price is $320 — bold markers split
                                  one number across two runs

The rules here are deliberately conservative. A repair is only accepted when
something else in the document corroborates it. Anything implausible that
cannot be corroborated raises ParseError, which fails the run loudly rather
than writing a guess. A missing price is recoverable; a wrong one is the
failure this whole site exists to prevent.
"""

import re
from decimal import Decimal, InvalidOperation

# What a gym could plausibly charge per billing period, in dollars. Outside
# this range the parse is either corrupted or the page is one we do not
# understand — both of which should stop the run.
# Zero is a legitimate FEE ($0 enrollment, $0 annual) even though it would be
# an odd monthly rate, so the floor is 0 and corruption detection leans on the
# ceiling — the failure mode we actually saw was 3699 for 36.99.
MIN_PLAUSIBLE = Decimal("0")
MAX_PLAUSIBLE = Decimal("900")

MONEY = re.compile(r"\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)")

# `**$32** **0**` or `**$32**0` — one number the renderer broke in two.
SPLIT_BOLD = re.compile(
    r"\*\*(\$?\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?)\*\*\s*\*\*([0-9]+)\*\*"
)


class ParseError(Exception):
    """The page could not be parsed into a price we trust."""


def normalize_markdown(text):
    """
    Undo renderer artefacts that split or hide numbers.

    Rejoining adjacent bold runs is not a guess: it is the correct reading of
    the markup. Corruptions we cannot read structurally — an eaten decimal
    point leaves no trace — are left for the corroboration step.
    """
    # Escaped footnote markers sit directly against prices ("$36.99\\*").
    # Park them behind a readable sentinel so they cannot be mistaken for
    # bold markers by the rejoin below, then restore them.
    text = text.replace("\\*", "@@FOOTNOTE@@")
    text = SPLIT_BOLD.sub(
        lambda m: "%s%s" % (m.group(1).replace(" ", ""), m.group(2)), text
    )
    return text.replace("@@FOOTNOTE@@", "*")


def to_decimal(raw):
    try:
        return Decimal(raw.replace(",", "").strip())
    except InvalidOperation:
        raise ParseError("not a number: %r" % raw)


def plausible(value, maximum=None):
    """
    A per-BILLING-PERIOD rate lives under MAX_PLAUSIBLE. Paid-in-full totals
    legitimately run far higher ($950 for a year at Crux, $2,449 at EAAC), so
    those callers pass their own ceiling. The corruption we defend against
    inflates a figure by ~100x, so a context-appropriate ceiling still catches
    it: a mangled $9.50 total would read as $950, but a mangled $950 reads as
    $95,000.
    """
    return MIN_PLAUSIBLE <= value <= (maximum if maximum is not None else MAX_PLAUSIBLE)


def repair_eaten_decimal(value, document, maximum=None):
    """
    A price like 3699 is almost certainly 36.99 with the point eaten. Accept
    the repair ONLY if the repaired figure appears verbatim elsewhere in the
    document — the page has to agree with us. Returns None otherwise.
    """
    if value != value.to_integral_value():
        return None
    digits = str(int(value))
    if len(digits) < 3:
        return None

    candidate = Decimal("%s.%s" % (digits[:-2], digits[-2:]))
    if not plausible(candidate, maximum):
        return None

    corroboration = re.compile(r"\$\s*%s(?![0-9])" % re.escape(str(candidate)))
    return candidate if corroboration.search(document) else None


def parse_price(raw_fragment, document, label="price", maximum=None):
    """
    Pull one price out of a fragment, using the whole document for
    corroboration. Raises ParseError rather than returning something doubtful.
    """
    fragment = normalize_markdown(raw_fragment)
    match = MONEY.search(fragment)
    if not match:
        raise ParseError("no price found for %s in %r" % (label, raw_fragment[:80]))

    value = to_decimal(match.group(1))
    if plausible(value, maximum):
        return value

    repaired = repair_eaten_decimal(value, normalize_markdown(document), maximum)
    if repaired is not None:
        return repaired

    raise ParseError(
        "implausible %s: $%s parsed from %r. This is what a footnote marker "
        "eating a decimal point looks like, and nothing on the page "
        "corroborates a repair, so the run fails rather than writing a guess."
        % (label, value, raw_fragment[:80])
    )


def find_prices(text):
    """Every plausible price in a block, in order. Corrupt values are skipped."""
    out = []
    for match in MONEY.finditer(normalize_markdown(text)):
        try:
            value = to_decimal(match.group(1))
        except ParseError:
            continue
        if plausible(value):
            out.append(value)
    return out


def as_number(value):
    """
    Decimal -> int when whole, else float, so the emitted JSON stays tidy.
    Plain ints and floats pass straight through: callers routinely hand this
    the result of round(), which is already an int.
    """
    if value is None:
        return None
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value
