/**
 * Pricing maths. The single place any derived money figure is computed.
 *
 * CLAUDE.md §3: derived values are computed at build time and NEVER stored in
 * the JSON. If a number appears on the site, it either came verbatim from a
 * gym's file or came out of this module.
 */

/** Billing periods per year. A 4-week gym bills 13 times, not 12. */
const PERIODS_PER_YEAR = { monthly: 12, '4-week': 13, weekly: 52 };

export function periodsPerYear(billingPeriod) {
  const n = PERIODS_PER_YEAR[billingPeriod];
  if (n === undefined) throw new Error(`Unknown billing_period: ${billingPeriod}`);
  return n;
}

/**
 * What the gym charges, expressed per calendar month. EAAC's $215 per 4 weeks
 * is $232.92/mo — 13 payments a year, not 12. Used for medians and tiers so
 * gyms on different billing cycles compare honestly.
 */
export function normalizedMonthly(plan, billingPeriod) {
  if (plan?.monthly === null || plan?.monthly === undefined) return null;
  return (plan.monthly * periodsPerYear(billingPeriod)) / 12;
}

/** monthly x periods + enrollment + annual, i.e. the true cost of year one. */
export function firstYearTotal(plan, billingPeriod) {
  if (plan?.monthly === null || plan?.monthly === undefined) return null;
  return (
    plan.monthly * periodsPerYear(billingPeriod) +
    (plan.enroll_fee ?? 0) +
    (plan.annual_fee ?? 0)
  );
}

/** First-year total spread across 12 months, rounded. The headline number. */
export function allInMonthly(plan, billingPeriod) {
  const total = firstYearTotal(plan, billingPeriod);
  return total === null ? null : Math.round(total / 12);
}

/** Price tier for the filter row. Computed on all-in, never on sticker. */
export function priceTier(allIn) {
  if (allIn === null || allIn === undefined) return null;
  if (allIn < 40) return 1;
  if (allIn <= 100) return 2;
  return 3;
}

/**
 * The default plan: cheapest ALL-IN among plans a solo walk-in adult can buy
 * without a long lock-in (CLAUDE.md §3). Returns null when nothing qualifies,
 * which is the "call for pricing" state.
 */
export function selectDefaultPlan(plans, billingPeriod) {
  const eligible = (plans ?? []).filter(
    (p) =>
      p.monthly !== null &&
      p.monthly !== undefined &&
      p.restricted === null &&
      (p.commit_months ?? 0) <= 2,
  );
  if (eligible.length === 0) return null;
  return eligible.reduce((best, p) =>
    allInMonthly(p, billingPeriod) < allInMonthly(best, billingPeriod) ? p : best,
  );
}

/** Median of a numeric list. Even-length lists average the middle pair. */
export function median(values) {
  const sorted = [...values].filter((v) => typeof v === 'number').sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

const PERIOD_NOUN = { monthly: 'mo', '4-week': '4-week', weekly: 'week' };

/**
 * Commitment badge (CLAUDE.md §3). Green "No contract" is reserved for plans
 * with no stated minimum term; 2-3 months gets a neutral badge stating the
 * exact truth. The badge must never overstate.
 *
 * commit_months counts BILLING PERIODS, not calendar months. On a 4-week gym
 * a value of 1 is a stated 4-week minimum, which the club advertises as a
 * commitment — so it earns a neutral "4-week minimum", not a green
 * "No contract".
 */
export function commitmentBadge(plan, billingPeriod = 'monthly') {
  const months = plan?.commit_months ?? 0;
  if (billingPeriod !== 'monthly' && months >= 1) {
    const noun = PERIOD_NOUN[billingPeriod] ?? billingPeriod;
    return {
      tone: 'neutral',
      label: months === 1 ? `${noun} minimum` : `${months}\u00d7${noun} minimum`,
    };
  }
  if (months <= 1) return { tone: 'green', label: 'No contract' };
  if (months <= 3) return { tone: 'neutral', label: `${months}-mo minimum` };
  return { tone: 'neutral', label: `${months}-mo commit` };
}

/** The "No contract" FILTER is looser than the badge: <= 2 months counts. */
export function isNoContract(plan) {
  return (plan?.commit_months ?? 0) <= 2;
}

/** Badge text for a restricted plan. Null for unrestricted plans. */
const RESTRICTED_LABELS = {
  student: 'Students only',
  youth: 'Youth only',
  'young-adult': 'Young adults only',
  senior: 'Seniors only',
  military: 'Military only',
  scope: 'Limited access',
};

export function restrictedLabel(plan) {
  return plan?.restricted ? (RESTRICTED_LABELS[plan.restricted] ?? 'Restricted') : null;
}
