#!/usr/bin/env python3
"""
Shared scraper machinery: fetching, diffing, guardrails and writing.

The contract every target obeys (CLAUDE.md §6):

  - fetch the gym's public pricing page via Firecrawl, honouring robots.txt
    and identifying honestly
  - parse it into plans
  - refuse to write anything that looks wrong: a parse returning zero plans,
    or a price moving more than 25%, fails the run loudly
  - append to price_history rather than silently overwriting
  - stamp verified_date on success
  - never push to main; the workflow opens a PR a human merges
"""

import json
import os
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from harvest import ScrapeError, firecrawl_scrape, get_api_key, robots_allows  # noqa: E402
from money import ParseError  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
GYM_DIR = REPO_ROOT / "data" / "gyms"

# A price move larger than this is far more likely to be a parser fault than a
# real change, so it stops the run for a human to look at (CLAUDE.md §6).
MAX_CHANGE_RATIO = 0.25

# Fields whose changes are recorded in price_history.
TRACKED_FIELDS = ("monthly", "enroll_fee", "annual_fee", "commit_months")

# A gym whose scrape has failed for longer than this is marked stale.
STALE_AFTER_DAYS = 14


class GuardrailError(Exception):
    """A parse succeeded but the result is not safe to write."""


# ── Sentry ──────────────────────────────────────────────────────────────────
def init_sentry():
    """
    Wire up Sentry if a DSN is configured. Absence is not an error — the
    scrapers run fine without it, they are just quieter.
    """
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if not dsn or dsn.startswith("https://xxxx"):
        return None
    try:
        import sentry_sdk
    except ImportError:
        return None
    sentry_sdk.init(
        dsn=dsn,
        traces_sample_rate=0.0,
        # Never ship scraped page bodies to a third party, and never risk
        # sending anything that could carry a key (CLAUDE.md §8).
        max_request_body_size="never",
        send_default_pii=False,
    )
    return sentry_sdk


def report(sentry, exc, target):
    if sentry is None:
        return
    with sentry.push_scope() as scope:
        scope.set_tag("scraper.target", target)
        sentry.capture_exception(exc)


# ── Gym files ───────────────────────────────────────────────────────────────
def load_gym(slug):
    path = GYM_DIR / ("%s.json" % slug)
    return path, json.loads(path.read_text(encoding="utf-8"))


def save_gym(path, gym):
    path.write_text(json.dumps(gym, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def plan(name, monthly, enroll_fee=0, annual_fee=0, commit_months=0,
         restricted=None, note=None, is_default=False, promo=None):
    built = {
        "name": name,
        "monthly": monthly,
        "enroll_fee": enroll_fee,
        "annual_fee": annual_fee,
        "commit_months": commit_months,
        "restricted": restricted,
        "note": note,
        "is_default": is_default,
    }
    if promo:
        built["promo"] = promo
    return built


# ── Guardrails ──────────────────────────────────────────────────────────────
def check_guardrails(slug, existing_plans, new_plans):
    """
    Refuse to write a result that looks like a parser fault rather than a real
    price change. Raises GuardrailError; the caller reports and skips the gym.
    """
    if not new_plans:
        raise GuardrailError(
            "%s: parse returned zero plans. The page layout has probably "
            "changed. Not writing." % slug
        )

    old_by_name = {p["name"]: p for p in existing_plans}
    for new in new_plans:
        old = old_by_name.get(new["name"])
        if not old:
            continue
        old_price, new_price = old.get("monthly"), new.get("monthly")
        if not old_price or new_price is None:
            continue
        ratio = abs(new_price - old_price) / old_price
        if ratio > MAX_CHANGE_RATIO:
            raise GuardrailError(
                "%s: plan %r moved from $%s to $%s (%.0f%%), past the %.0f%% "
                "guardrail. That is more likely a parser fault than a real "
                "change. Not writing."
                % (slug, new["name"], old_price, new_price, ratio * 100,
                   MAX_CHANGE_RATIO * 100)
            )
    return True


# ── History ─────────────────────────────────────────────────────────────────
def diff_history(existing_plans, new_plans, today, existing_day_pass, new_day_pass):
    """
    Build append-only price_history entries for everything that changed.
    History is additive: the plan object still carries the current value
    (CLAUDE.md §3).
    """
    entries = []
    old_by_name = {p["name"]: p for p in existing_plans}

    for new in new_plans:
        old = old_by_name.get(new["name"])
        if not old:
            continue
        for field in TRACKED_FIELDS:
            before, after = old.get(field), new.get(field)
            if before != after:
                entries.append({
                    "date": today,
                    "plan_name": new["name"],
                    "field": field,
                    "old": before,
                    "new": after,
                })

    if existing_day_pass != new_day_pass and new_day_pass is not None:
        entries.append({
            "date": today,
            "plan_name": "Day Pass",
            "field": "day_pass",
            "old": existing_day_pass,
            "new": new_day_pass,
        })
    return entries


def apply_result(gym, new_plans, new_day_pass, today):
    """Merge a parse into a gym record. Returns the list of history entries."""
    history = diff_history(
        gym.get("plans", []), new_plans, today, gym.get("day_pass"), new_day_pass
    )
    gym["plans"] = new_plans
    if new_day_pass is not None:
        gym["day_pass"] = new_day_pass
    gym["verified_date"] = today
    gym["stale"] = False
    gym.setdefault("price_history", []).extend(history)
    return history


# ── ClassPass ───────────────────────────────────────────────────────────────
# Opportunistic only: we are already holding the pricing page, so we read it for
# a ClassPass mention rather than fetching anything extra. Never costs a credit.
_CLASSPASS = re.compile(r"class\s*pass", re.I)
# Explicit denials, which are the only thing that may write a confirmed False.
_CLASSPASS_NEGATED = re.compile(
    r"(?:no(?:t)?|don'?t|do not|doesn'?t|does not|we no longer|cannot|can'?t|"
    r"stopped)\W{0,30}(?:accept|take|honor|honour|partner|work)\w*\W{0,20}"
    r"class\s*pass"
    r"|class\s*pass\W{0,30}(?:is\s+)?(?:no longer|not)\s+(?:accept|available|"
    r"honou?red|offered)",
    re.I,
)


def detect_classpass(markdown):
    """
    Read a ClassPass status off a page we already fetched.

    Returns True (mentioned), False (explicitly denied) or **None** (no mention).

    None is not "no". A pricing page that never says the word proves nothing
    about whether the gym is on ClassPass, and inferring a negative from silence
    is the same class of error as inferring "no contract" from unpublished terms
    (CLAUDE.md §3). Only a positive mention or an explicit denial writes a value;
    silence leaves whatever the owner's outreach has established.
    """
    if not markdown:
        return None
    if _CLASSPASS_NEGATED.search(markdown):
        return False
    if _CLASSPASS.search(markdown):
        return True
    return None


def apply_classpass(gym, detected):
    """
    Merge a detection into a gym record. Returns True if the value changed.

    A None detection never overwrites: it means "this page did not say", not
    "this gym does not". A confirmed value from the owner's outreach therefore
    survives every scrape that simply fails to mention it.
    """
    if detected is None:
        return False
    if gym.get("accepts_classpass") == detected:
        return False
    gym["accepts_classpass"] = detected
    return True


def mark_stale(gym, today):
    """
    Flag a gym whose scrape has been failing for too long, so the UI can say
    "Prices last confirmed {date}" in the warning style (CLAUDE.md §6).
    """
    verified = gym.get("verified_date")
    if not verified:
        return False
    days = (date.fromisoformat(today) - date.fromisoformat(verified)).days
    if days > STALE_AFTER_DAYS and not gym.get("stale"):
        gym["stale"] = True
        return True
    return False


# ── Fetching ────────────────────────────────────────────────────────────────
def fetch(url, api_key):
    """Fetch a pricing page, refusing anything robots.txt disallows (§6)."""
    allowed, reason = robots_allows(url)
    if not allowed:
        raise ScrapeError("robots.txt disallows %s (%s)" % (url, reason))
    markdown, _meta = firecrawl_scrape(url, api_key)
    return markdown


def today_iso():
    return datetime.now(timezone.utc).date().isoformat()


__all__ = [
    "GuardrailError", "ParseError", "ScrapeError",
    "apply_result", "check_guardrails", "diff_history", "fetch",
    "get_api_key", "init_sentry", "load_gym", "mark_stale", "plan",
    "report", "save_gym", "today_iso",
]
