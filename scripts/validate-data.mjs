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
  'yoga', 'boxing', 'bjj-mma', 'climbing', 'community', 'recovery',
]);
// Sauna / steam room / cold plunge. Tri-state for the same reason
// accepts_classpass is: `true` is confirmed from the gym's own materials,
// `false` is a confirmed no, `null` is unconfirmed. Silence is not a no, and
// neither a photo nor a review is a source.
// `pool` joins the same tri-state family. It is the amenity that most often
// decides a membership outright — a swimmer with no pool has no reason to read
// the rest of the page — which is why it earns a field and a filter chip while
// "has a squat rack" does not.
const RECOVERY_AMENITIES = ['sauna', 'steam_room', 'cold_plunge', 'pool'];
// WHO may join, which is a different question from `restricted` (what a plan
// buys you). Austin Women's Boxing Club is open to any adult woman on every
// plan it sells — that is not a "limited access" plan, it is a limited
// membership base, and overloading `restricted` would have made the plan table
// claim something false about the product.
const ELIGIBILITY = new Set(['women_only', 'men_only', 'students', 'seniors', 'members_only']);
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
  // ClassPass: a tri-state. `null` means we have not confirmed either way and
  // renders nothing; `false` is a confirmed no. Only `true` ever shows text, so
  // the field obeys the same rule as the badges — confirmed data only.
  if (![true, false, null].includes(gym.accepts_classpass ?? null)) {
    fail(`accepts_classpass must be true, false or null, got ${JSON.stringify(gym.accepts_classpass)}`);
  }
  if (!('accepts_classpass' in gym)) fail('accepts_classpass is missing (use null when unconfirmed)');

  // Recovery amenities. Required PRESENT on every gym so a new file cannot
  // silently omit them; null is the norm until someone sources the answer.
  for (const key of RECOVERY_AMENITIES) {
    if (!(key in gym)) fail(`${key} is missing (use null when unconfirmed)`);
    else if (![true, false, null].includes(gym[key])) {
      fail(`${key} must be true, false or null, got ${JSON.stringify(gym[key])}`);
    }
  }

  // Chain key. A slug-shaped brand id shared by sibling locations, or null for
  // an independent. It links rows; it does not create a page (roll-ups are §10).
  if (!('chain' in gym)) fail('chain is missing (use null for an independent gym)');
  else if (gym.chain !== null && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(gym.chain)) {
    fail(`chain "${gym.chain}" must be a kebab-case key or null`);
  }

  if (!('eligibility' in gym)) fail('eligibility is missing (use null when open to any adult)');
  else if (gym.eligibility !== null && !ELIGIBILITY.has(gym.eligibility)) {
    fail(`eligibility "${gym.eligibility}" is not in the enum`);
  }

  // A recovery business sells access to a room, not instructed sessions — the
  // Recovery tab is judged per month on the same all-in figure as Memberships.
  // A "classes" recovery row would be measured in a unit it does not sell.
  if (gym.category === 'recovery' && gym.access_model !== 'facility') {
    fail('category "recovery" must have access_model "facility"');
  }

  // Monetization plumbing, planted empty (CLAUDE.md §10). Required PRESENT so a
  // new gym file cannot silently omit them, but null/standard is the norm.
  for (const p of gym.plans ?? []) {
    // Contingent fees are visible but never enter all-in math: all-in is what
    // you WILL pay, a cancellation fee is what you MIGHT.
    if ('cancellation_fee' in p && p.cancellation_fee !== null) {
      if (typeof p.cancellation_fee !== 'number' || p.cancellation_fee < 0) {
        fail(`plan "${p.name}" has a non-numeric cancellation_fee`);
      }
      if (!p.commit_months) {
        fail(`plan "${p.name}" has a cancellation_fee but no commit_months to cancel before`);
      }
    }
    if ('classes_per_period' in p && p.classes_per_period !== null) {
      if (typeof p.classes_per_period !== 'number' || p.classes_per_period <= 0) {
        fail(`plan "${p.name}" has an invalid classes_per_period`);
      }
    }
  }

  if (!Array.isArray(gym.class_packs)) fail('class_packs must be an array (empty is fine)');
  for (const k of gym.class_packs ?? []) {
    if (typeof k.price !== 'number' || k.price <= 0) fail(`class pack "${k.name}" has no price`);
    if (typeof k.classes !== 'number' || k.classes <= 0) fail(`class pack "${k.name}" has no class count`);
    if ('promo' in k && typeof k.promo !== 'boolean') fail(`class pack "${k.name}" has a non-boolean promo flag`);
  }
  // A gym selling class packs is selling classes. If those two ever disagree
  // the tabs are lying about what you are buying.
  if ((gym.class_packs ?? []).length > 0 && gym.access_model !== 'classes') {
    fail('has class_packs but access_model is not "classes"');
  }

  // Which tab a gym belongs on. "facility" = you buy door access; "classes" =
  // you buy instructed sessions. The distinction drives the comparable unit:
  // $/mo for a facility, $/class for a studio, and mixing them breaks the sort
  // in both directions.
  if (!['facility', 'classes'].includes(gym.access_model)) {
    fail(`access_model must be "facility" or "classes", got ${JSON.stringify(gym.access_model)}`);
  }

  if (!('intro_offer_url' in gym)) fail('intro_offer_url is missing (use null)');
  if (gym.intro_offer_url !== null && gym.intro_offer_url !== undefined) {
    if (typeof gym.intro_offer_url !== 'string' || !gym.intro_offer_url.startsWith('https://')) {
      fail(`intro_offer_url must be https when set, got ${JSON.stringify(gym.intro_offer_url)}`);
    }
  }
  if (!('listing_tier' in gym)) fail('listing_tier is missing (use "standard")');
  if (gym.listing_tier !== undefined && typeof gym.listing_tier !== 'string') {
    fail('listing_tier must be a string');
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
      // A per-session figure quoted in a note must RECONCILE with the plan
      // math sitting beside it. EvolvE's card said "six sessions a month, $22 a
      // session" against a $129 plan — 6 x 22 = 132, and the real figure is
      // $21.50. Their page rounds up; ours repeated the rounding as if it were
      // the arithmetic.
      //
      // This is the OTL unit bug's sibling. The per-class receipt works because
      // it is FORCED to show its division: a derivation that must display
      // cannot quietly disagree with itself. A note is free prose, so the same
      // discipline has to be imposed from outside.
      //
      // Where classes_per_period exists the figure is checkable, and one of the
      // quoted figures must equal monthly / classes_per_period. A second figure
      // may sit beside it — the gym's own rounded gloss is worth reporting —
      // but only if the real one is there too. Where no count is published the
      // figure cannot be checked at all, so it must be ATTRIBUTED rather than
      // asserted: said, states, quotes, advertises, claims, rounds.
      const PER_SESSION = /\$\s?(\d+(?:\.\d{1,2})?)\s*(?:\||\/|\s)?\s*(?:a|per)?\s*\|?\s*(?:session|class)\b/gi;
      const ATTRIBUTED = /\b(states?|stated|quotes?|advertis\w*|claims?|says?|round\w*|assumes?)\b/i;
      for (const plan of plans) {
        const note = plan.note ?? '';
        const quoted = [...note.matchAll(PER_SESSION)].map((m) => Number(m[1]));
        if (quoted.length === 0) continue;
        const cpp = plan.classes_per_period;
        if (typeof cpp === 'number' && cpp > 0 && typeof plan.monthly === 'number') {
          const derived = plan.monthly / cpp;
          const ok = quoted.some((q) => Math.abs(q - derived) < 0.005);
          if (!ok) {
            fail(
              `plan "${plan.name}" note quotes ${quoted.map((q) => `$${q}`).join(', ')} per session ` +
                `but $${plan.monthly} / ${cpp} = $${derived.toFixed(2)} — the note must show the ` +
                `figure the plan math actually produces`,
            );
          }
        } else if (!ATTRIBUTED.test(note)) {
          fail(
            `plan "${plan.name}" note quotes a per-session figure with no classes_per_period to ` +
              `check it against, and does not attribute it to the gym — record the session count ` +
              `or say whose figure it is`,
          );
        }
      }

      // Fees carry the §3 distinction, and it is a real one: `0` means the page
      // says the fee is zero, `null` means the page does not say. A SOURCED
      // ZERO is always legal.
      //
      // `null` is legal too — but never on the plan that sets the headline.
      // all_in folds a missing fee in as 0, so an unstated fee on the DEFAULT
      // plan would quietly publish a number lower than the truth, which is the
      // single failure this site exists to prevent. On a non-default plan the
      // figure appears in the breakdown, where the plan's own note carries the
      // gap — so the gym can still be listed honestly while a fee is unknown,
      // instead of being blocked or, worse, given an invented zero.
      if (plan.monthly !== null) {
        for (const fee of ['enroll_fee', 'annual_fee']) {
          const v = plan[fee];
          if (v === undefined) fail(`plan "${plan.name}" is missing ${fee} (use null when unstated)`);
          // A null fee on a facility default is legal ONLY because the site now
          // renders that figure as a FLOOR ("$35+/mo all-in") and names the gap
          // on the card. Without that rendering it would be a silent
          // understatement, which is why this check existed at all. The note is
          // the load-bearing part: it is what turns "we don't know" from a
          // hidden assumption into published information.
          else if (v === null && plan.is_default && gym.access_model === 'facility' && !plan.note) {
            // Only bites where all-in IS the published headline. A facility gym
            // is sold per month, so an unstated fee folded in as 0 publishes a
            // number lower than the truth. A studio is sold per CLASS, and the
            // per-class figure never touches enrollment or annual fees — its
            // all-in appears in the breakdown, where the plan's note carries
            // the gap. Blocking both would have meant refusing to list studios
            // whose prices we had read, to protect a headline they do not show.
            fail(
              `plan "${plan.name}" is the default plan of a facility gym with ${fee}: null and ` +
                `NO note. The headline renders as a floor ("$35+"), and the note is what tells ` +
                `the reader which fee is missing — without it the "+" is unexplained.`,
            );
          } else if (v !== null && (typeof v !== 'number' || v < 0)) {
            fail(`plan "${plan.name}" has an invalid ${fee}`);
          } else if (v === null && !plan.note) {
            fail(`plan "${plan.name}" has ${fee}: null but no note recording that the gym does not publish it`);
          }
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
