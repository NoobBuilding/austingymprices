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
      // null commit means terms unpublished, not a long lock-in. The PRICE is
      // still confirmed, so the plan stays eligible; only the badge is withheld.
      (p.commit_months === null || p.commit_months === undefined || p.commit_months <= 2),
  );
  if (eligible.length > 0) {
    return eligible.reduce((best, p) =>
      allInMonthly(p, billingPeriod) < allInMonthly(best, billingPeriod) ? p : best,
    );
  }

  // Nothing at two months or less. Rather than fall through to "call for
  // pricing" for a gym whose prices we have read and recorded, take the
  // cheapest all-in plan at the SHORTEST available commitment — the shortest
  // first, even if a longer lock-in is cheaper. The commitment badge then
  // renders on the headline: **the price answers "what does it cost", the
  // badge answers "what's the catch"**, and suppressing the first because of
  // the second helps nobody.
  const priced = (plans ?? []).filter(
    (p) =>
      p.monthly !== null &&
      p.monthly !== undefined &&
      (p.restricted === null || p.restricted === undefined),
  );
  if (priced.length === 0) return null;
  const shortest = Math.min(
    ...priced.map((p) => (p.commit_months === null || p.commit_months === undefined
      ? Number.POSITIVE_INFINITY
      : p.commit_months)),
  );
  const atShortest = priced.filter(
    (p) => (p.commit_months ?? Number.POSITIVE_INFINITY) === shortest,
  );
  return atShortest.reduce((best, p) =>
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
  // null means the gym does not publish its terms. Render NOTHING — inferring
  // "no contract" from silence is the same error as inventing a price.
  if (plan?.commit_months === null || plan?.commit_months === undefined) return null;
  const months = plan.commit_months;
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

/**
 * The "No contract" FILTER is looser than the badge: <= 2 months counts,
 * because a two-month floor is not what people mean by a contract. Unknown
 * terms are NOT claimed as no-contract.
 */
export function isNoContract(plan) {
  const months = plan?.commit_months;
  if (months === null || months === undefined) return false;
  return months <= 2;
}

/** Badge text for a restricted plan. Null for unrestricted plans. */
const RESTRICTED_LABELS = {
  student: 'Students only',
  youth: 'Youth only',
  'young-adult': 'Young adults only',
  senior: 'Seniors only',
  military: 'Military only',
  household: '2+ person plan',
  scope: 'Limited access',
};

/** Plan names that already announce they are multi-person. */
const SELF_EVIDENT_HOUSEHOLD = /household|person|crew|couple|family|^(one|two|three|\d+)\s/i;

export function restrictedLabel(plan) {
  if (!plan?.restricted) return null;
  // Don't double-label: "Two Adult Household" needs no "2+ person plan" badge.
  if (plan.restricted === 'household' && SELF_EVIDENT_HOUSEHOLD.test(plan.name ?? '')) {
    return null;
  }
  return RESTRICTED_LABELS[plan.restricted] ?? 'Restricted';
}

// ── Classes-tab economics (CLAUDE.md §9) ────────────────────────────────────
// A facility and a studio are not comparable per month: "$130/mo for 4 classes"
// beside "$23/mo unlimited access" misleads in both directions. On the Classes
// tab the comparable unit is the PER-CLASS price.

/** Per-class price of a plan, or null where the class count is not finite. */
export function perClassOfPlan(plan, billingPeriod) {
  const n = plan?.classes_per_period;
  if (typeof n !== 'number' || n <= 0) return null;
  const monthly = normalizedMonthly(plan, billingPeriod);
  return monthly === null ? null : monthly / n;
}

/** Per-class price of a pack. Packs have no commitment, so they always count. */
export function perClassOfPack(pack) {
  if (!pack || typeof pack.price !== 'number' || typeof pack.classes !== 'number') return null;
  return pack.classes > 0 ? pack.price / pack.classes : null;
}

/**
 * The best per-class rate a walk-in can actually get today.
 *
 * "Attainable" carries the same spirit as the default-plan rule: a rate you can
 * only reach by signing a twelve-month lock-in is not the price of a class, it
 * is the price of a year. Packs always count — they commit you to nothing —
 * and so do plans with a commitment of two months or less. Restricted plans are
 * excluded for the same reason they are excluded from the headline: a solo
 * adult cannot simply buy them.
 *
 * Returns null when nothing qualifies, which renders as no figure at all rather
 * than a guess.
 */
export function fromPerClass(gym) {
  const candidates = [];
  for (const plan of gym.plans ?? []) {
    if (plan.restricted !== null && plan.restricted !== undefined) continue;
    const commit = plan.commit_months;
    const lowCommit = commit === null || commit === undefined || commit <= 2;
    if (!lowCommit) continue;
    const v = perClassOfPlan(plan, gym.billing_period);
    if (v !== null) candidates.push(v);
  }
  for (const pack of gym.class_packs ?? []) {
    // A promo pack is a promo price. Letting "3 classes for $79 this month"
    // set the per-class figure would promote a promo to standing, which is the
    // one thing §3 forbids outright — and it would quietly become a wrong
    // number the day the offer ends.
    if (pack.promo) continue;
    const v = perClassOfPack(pack);
    if (v !== null) candidates.push(v);
  }
  return candidates.length === 0 ? null : Math.round(Math.min(...candidates) * 100) / 100;
}

/**
 * WHERE the `from $X/class` figure came from — the winning candidate itself,
 * not just its value.
 *
 * The Classes card has to show its working ("$27.90 = $279 10-pack ÷ 10"), and
 * a receipt that recomputed the minimum separately from `fromPerClass` would be
 * free to disagree with the headline above it. So both read this one function:
 * the number and its explanation cannot drift apart.
 *
 * Returns null wherever `fromPerClass` returns null.
 */
export function fromPerClassSource(gym) {
  let best = null;
  const consider = (value, source) => {
    if (value === null) return;
    if (best === null || value < best.value) best = { value, ...source };
  };

  for (const plan of gym.plans ?? []) {
    if (plan.restricted !== null && plan.restricted !== undefined) continue;
    const commit = plan.commit_months;
    if (!(commit === null || commit === undefined || commit <= 2)) continue;
    consider(perClassOfPlan(plan, gym.billing_period), {
      kind: 'plan',
      name: plan.name,
      price: normalizedMonthly(plan, gym.billing_period),
      classes: plan.classes_per_period,
      note: plan.note ?? null,
    });
  }
  for (const pack of gym.class_packs ?? []) {
    if (pack.promo) continue;
    consider(perClassOfPack(pack), {
      kind: 'pack',
      name: pack.name,
      price: pack.price,
      classes: pack.classes,
      expires_days: pack.expires_days ?? null,
      note: pack.note ?? null,
    });
  }
  if (best === null) return null;
  // Round exactly as fromPerClass does, so the headline and the receipt agree
  // to the cent rather than to within a rounding error.
  return { ...best, value: Math.round(best.value * 100) / 100 };
}

/**
 * The per-class receipt in words: how the headline figure was reached.
 *
 * ONE function, used by the index card's expanded state and by the compare
 * table's derivation row, because two copies of this sentence would eventually
 * disagree about the same gym — and a receipt that contradicts the number above
 * it is worse than no receipt.
 *
 * Returns null wherever there is no figure to explain.
 */
export function perClassDerivation(source, money) {
  if (!source) return null;
  // A single class needs no arithmetic. "$35 ÷ 1 classes" shows working that
  // does not exist and reads as a broken template.
  if (source.classes === 1) {
    return `the published price of one ${String(source.name ?? 'class').toLowerCase()}`;
  }
  const unit = source.kind === 'plan' ? 'classes a month' : 'classes';
  const base = `${money(source.price)} ${source.name} ÷ ${source.classes} ${unit}`;
  // The expiry rides WITH the price, not in a footnote. "From $28/class" is
  // only true if you use all fifty, and a deadline you have to scroll for is a
  // catch we would be helping to hide. Same instinct as all-in pricing: state
  // the condition next to the number it conditions.
  const days = source.expires_days;
  if (!days) return base;
  const window =
    days % 365 === 0 ? `${days / 365} year${days === 365 ? '' : 's'}`
      : days % 30 === 0 ? `${days / 30} months`
        : `${days} days`;
  return `${base}, used within ${window}`;
}

/**
 * Price tier for the Classes tab. Bands are fitted to what Austin studios
 * actually charge — the observed cluster is $18-33 a class — rather than to a
 * round number that would drop nearly everything into tier 1.
 */
export function classTier(perClass) {
  if (perClass === null || perClass === undefined) return null;
  if (perClass < 22) return 1;
  if (perClass <= 32) return 2;
  return 3;
}

/** Cheapest unlimited-class plan a walk-in can buy, for the secondary line. */
export function unlimitedMonthly(gym) {
  const eligible = (gym.plans ?? []).filter(
    (p) =>
      (p.restricted === null || p.restricted === undefined) &&
      (p.commit_months === null || p.commit_months === undefined || p.commit_months <= 2) &&
      /unlimited/i.test(p.name ?? '') &&
      typeof p.monthly === 'number',
  );
  if (eligible.length === 0) return null;
  return Math.round(Math.min(...eligible.map((p) => normalizedMonthly(p, gym.billing_period))));
}
