/**
 * Validates /data against the schema in CLAUDE.md §3. Runs in CI so a bad
 * gym file fails the build rather than shipping a wrong price.
 *
 * Checks the invariants that would put a wrong number on the site:
 *   - slug matches filename, no duplicates
 *   - region and category are in the locked enums
 *   - exactly one is_default plan on any gym that has plans
 *   - no plan carries a price without also carrying its fee fields
 *   - a gym with no plans must explain itself via pricing_note
 *   - price_history entries are well formed and append-only in shape
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const GYM_DIR = 'data/gyms';
const CATEGORIES = new Set([
  'gym-weights', 'gym-classes', 'luxury', 'crossfit-hiit', 'pilates',
  'yoga', 'boxing', 'bjj-mma', 'climbing', 'community',
]);
const BILLING_PERIODS = new Set(['monthly', '4-week', 'weekly']);
const RESTRICTED = new Set([
  'student', 'youth', 'young-adult', 'senior', 'military', 'household', 'scope',
]);
const PERIODS_PER_YEAR = { monthly: 12, '4-week': 13, weekly: 52 };

/** Mirrors src/lib/pricing.js. Duplicated so the validator stays dependency-free. */
const allIn = (plan, period) =>
  plan.monthly === null || plan.monthly === undefined
    ? null
    : (plan.monthly * PERIODS_PER_YEAR[period] +
        (plan.enroll_fee ?? 0) +
        (plan.annual_fee ?? 0)) / 12;
const HISTORY_FIELDS = new Set([
  'monthly', 'enroll_fee', 'annual_fee', 'commit_months', 'day_pass',
]);

const regions = new Set(
  JSON.parse(readFileSync('data/regions.json', 'utf8')).map((r) => r.id),
);

const errors = [];
const seen = new Set();
let priced = 0;
let unpriced = 0;

for (const file of readdirSync(GYM_DIR).filter((f) => f.endsWith('.json')).sort()) {
  const gym = JSON.parse(readFileSync(join(GYM_DIR, file), 'utf8'));
  const fail = (msg) => errors.push(`${file}: ${msg}`);

  if (`${gym.slug}.json` !== file) fail(`slug "${gym.slug}" does not match filename`);
  if (seen.has(gym.slug)) fail(`duplicate slug "${gym.slug}"`);
  seen.add(gym.slug);

  if (!gym.name) fail('missing name');
  if (!regions.has(gym.region)) fail(`unknown region "${gym.region}"`);
  if (!CATEGORIES.has(gym.category)) fail(`unknown category "${gym.category}"`);
  if (!BILLING_PERIODS.has(gym.billing_period)) {
    fail(`unknown billing_period "${gym.billing_period}"`);
  }
  if (!['scrape', 'manual'].includes(gym.data_source)) {
    fail(`data_source must be "scrape" or "manual", got "${gym.data_source}"`);
  }
  if (!Array.isArray(gym.price_history)) fail('price_history must be an array');
  if (typeof gym.stale !== 'boolean') fail('stale must be a boolean');
  // A stale flag with no verified_date has nothing to be stale relative to.
  if (gym.stale && !gym.verified_date) fail('is marked stale but has no verified_date');

  for (const entry of gym.price_history ?? []) {
    if (!entry.date || !entry.plan_name) fail('price_history entry missing date/plan_name');
    if (!HISTORY_FIELDS.has(entry.field)) {
      fail(`price_history has unknown field "${entry.field}"`);
    }
  }

  if (!Array.isArray(gym.day_pass_terms)) {
    fail('day_pass_terms must be an array (empty when there is no day pass)');
  } else {
    if (gym.day_pass_terms.some((t) => typeof t !== 'string' || !t.trim())) {
      fail('day_pass_terms must contain only non-empty strings');
    }
    // Terms describing a pass that does not exist would render under a blank price.
    if (gym.day_pass === null && gym.day_pass_terms.length > 0) {
      fail('has day_pass_terms but no day_pass price');
    }
    // The card answers one question. Anything longer belongs on the detail page.
    if (gym.day_pass_terms.length > 3) {
      fail(`has ${gym.day_pass_terms.length} day_pass_terms; the card allows at most 3`);
    }
  }

  if (gym.day_pass_qualifier !== null && typeof gym.day_pass_qualifier !== 'string') {
    fail('day_pass_qualifier must be a string or null');
  }
  if (gym.day_pass_alternative !== null && typeof gym.day_pass_alternative !== 'string') {
    fail('day_pass_alternative must be a string or null');
  }
  if (gym.day_pass === null && gym.day_pass_alternative !== null) {
    fail('has a day_pass_alternative but no day_pass price');
  }

  // A lat without a lng (or vice versa) would place a pin in the ocean.
  if ((gym.lat === null) !== (gym.lng === null)) fail('lat and lng must both be set or both null');

  const plans = gym.plans ?? [];
  if (plans.length === 0) {
    unpriced += 1;
    if (!gym.pricing_note) fail('has no plans and no pricing_note explaining why');
  } else {
    const defaults = plans.filter((p) => p.is_default);
    if (defaults.length !== 1) fail(`${defaults.length} default plans, expected exactly 1`);

    for (const plan of plans) {
      if (plan.restricted !== null && !RESTRICTED.has(plan.restricted)) {
        fail(`plan "${plan.name}" has restricted "${plan.restricted}", not in the enum`);
      }
    }

    // CLAUDE.md §3 default-plan rule: cheapest all-in among unrestricted plans
    // with commit_months <= 2. The default drives the card price and the map
    // pin, so a stale flag here would put a wrong headline on the site.
    const def = defaults[0];
    if (def) {
      const eligible = plans.filter(
        (p) =>
          p.monthly !== null && p.monthly !== undefined &&
          p.restricted === null &&
          (p.commit_months === null || p.commit_months === undefined || p.commit_months <= 2),
      );
      if (eligible.length > 0) {
        const cheapest = eligible.reduce((best, p) =>
          allIn(p, gym.billing_period) < allIn(best, gym.billing_period) ? p : best,
        );
        if (def.name !== cheapest.name) {
          fail(
            `default plan is "${def.name}" but the §3 rule selects "${cheapest.name}" ` +
              `($${Math.round(allIn(cheapest, gym.billing_period))} vs ` +
              `$${Math.round(allIn(def, gym.billing_period))} all-in)`,
          );
        }
        if (def.restricted !== null) {
          fail(`default plan "${def.name}" is restricted ("${def.restricted}")`);
        }
        if (def.commit_months !== null && (def.commit_months ?? 0) > 2) {
          fail(`default plan "${def.name}" has commit_months ${def.commit_months} (> 2)`);
        }
      }
    }

    for (const plan of plans) {
      if (!plan.name) fail('a plan is missing a name');
      // null is legal and meaningful: terms not published, no badge renders.
      if (plan.commit_months !== null && typeof plan.commit_months !== 'number') {
        fail(`plan "${plan.name}" commit_months must be a number or null`);
      }
      // A green "No contract" badge may only come from confirmed data.
      if ((plan.commit_months === 0 || plan.commit_months === 1) && !gym.verified_date) {
        fail(
          `plan "${plan.name}" claims commit_months ${plan.commit_months} (green ` +
            `"No contract" badge) but the gym has no verified_date to back it`,
        );
      }
      // A price with undefined fees would silently understate the all-in.
      if (plan.monthly !== null) {
        if (plan.enroll_fee === null || plan.enroll_fee === undefined) {
          fail(`plan "${plan.name}" has a monthly rate but no enroll_fee`);
        }
        if (plan.annual_fee === null || plan.annual_fee === undefined) {
          fail(`plan "${plan.name}" has a monthly rate but no annual_fee`);
        }
      } else if (!plan.promo && !plan.note) {
        fail(`plan "${plan.name}" has no price and no promo/note explaining why`);
      }
    }

    if (defaults[0]?.monthly !== null && defaults[0]?.monthly !== undefined) priced += 1;
    else unpriced += 1;
  }
}

console.log(`data/gyms: ${seen.size} files`);
console.log(`  confirmed standing price : ${priced}`);
console.log(`  call for pricing         : ${unpriced}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} validation error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nOK — all gym data valid.');
