/**
 * Data loader. Reads /data at build time, attaches derived fields, and hands
 * pages a ready-to-render shape.
 *
 * CLAUDE.md §3: derived values are computed here, never stored in the JSON.
 * Nothing in this module invents a number — a gym with no qualifying plan
 * comes back with `hasPrice: false` and the page renders the
 * "call for pricing" state.
 */
import {
  allInMonthly,
  commitmentBadge,
  firstYearTotal,
  isNoContract,
  median,
  normalizedMonthly,
  priceTier,
  restrictedLabel,
  selectDefaultPlan,
  classTier,
  fromPerClass,
  fromPerClassSource,
  unlimitedMonthly,
} from './pricing.js';

// import.meta.glob is resolved by Vite at build time — the JSON is baked into
// the output, so there is no filesystem read at runtime.
const gymModules = import.meta.glob('../../data/gyms/*.json', { eager: true });
const regionModule = import.meta.glob('../../data/regions.json', { eager: true });

const rawRegions = Object.values(regionModule)[0].default;
const rawGyms = Object.values(gymModules).map((m) => m.default);

/** Attach derived pricing to one plan. */
function decoratePlan(plan, billingPeriod) {
  return {
    ...plan,
    normalized_monthly: normalizedMonthly(plan, billingPeriod),
    all_in_monthly: allInMonthly(plan, billingPeriod),
    first_year_total: firstYearTotal(plan, billingPeriod),
    commitment_badge: commitmentBadge(plan, billingPeriod),
    restricted_label: restrictedLabel(plan),
    is_no_contract: isNoContract(plan),
  };
}

function decorateGym(gym) {
  const plans = (gym.plans ?? []).map((p) => decoratePlan(p, gym.billing_period));

  // Trust the rule, not the stored flag: recompute the default and let the
  // validator be the thing that shouts if the JSON disagrees.
  const defaultRaw = selectDefaultPlan(gym.plans, gym.billing_period);
  const defaultPlan = defaultRaw
    ? (plans.find((p) => p.name === defaultRaw.name) ?? null)
    : null;

  const hasPrice = defaultPlan !== null;
  const allIn = defaultPlan?.all_in_monthly ?? null;

  return {
    ...gym,
    plans,
    default_plan: defaultPlan,
    has_price: hasPrice,
    all_in_monthly: allIn,
    first_year_total: defaultPlan?.first_year_total ?? null,
    price_tier: priceTier(allIn),
    // Classes-tab economics. Null for facility gyms and for any studio whose
    // class counts are not published — which renders as no figure, not a guess.
    from_per_class: fromPerClass(gym),
    class_tier: classTier(fromPerClass(gym)),
    // The winning candidate behind that figure, so the Classes card can show
    // its working from the same source the headline was computed from.
    from_per_class_source: fromPerClassSource(gym),
    unlimited_monthly: unlimitedMonthly(gym),
    has_class_price: fromPerClass(gym) !== null,
    // A gym is "no contract" for filtering purposes on its headline plan.
    is_no_contract: defaultPlan ? defaultPlan.is_no_contract : null,
    // Promo flag for the card, if the headline plan carries one.
    promo: defaultPlan?.promo ?? null,
    url: `/gyms/${gym.slug}`,
  };
}

const gyms = rawGyms.map(decorateGym).sort((a, b) => a.name.localeCompare(b.name));

/** Region medians, computed across the DEFAULT plans of priced gyms only. */
const regionMedians = Object.fromEntries(
  rawRegions.map((r) => [
    r.id,
    median(
      gyms.filter((g) => g.region === r.id && g.has_price).map((g) => g.all_in_monthly),
    ),
  ]),
);

const regions = rawRegions.map((r) => {
  const inRegion = gyms.filter((g) => g.region === r.id);
  return {
    ...r,
    gym_count: inRegion.length,
    priced_count: inRegion.filter((g) => g.has_price).length,
    median_all_in: regionMedians[r.id],
  };
});

const cityMedian = median(gyms.filter((g) => g.has_price).map((g) => g.all_in_monthly));

export function getAllGyms() {
  return gyms;
}

export function getGym(slug) {
  return gyms.find((g) => g.slug === slug) ?? null;
}

export function getGymsByRegion(regionId) {
  return gyms.filter((g) => g.region === regionId);
}

export function getRegions() {
  return regions;
}

export function getRegion(regionId) {
  return regions.find((r) => r.id === regionId) ?? null;
}

export function getRegionMedian(regionId) {
  return regionMedians[regionId] ?? null;
}

export function getCityMedian() {
  return cityMedian;
}

/**
 * How a gym's headline price compares to its region median — powers the
 * "$8 below the Hyde Park median ($67)" line on detail pages. Returns null
 * when either figure is missing, and the page then renders nothing.
 */
export function compareToRegionMedian(gym) {
  const med = regionMedians[gym.region];
  if (med === null || med === undefined || !gym.has_price) return null;
  const delta = gym.all_in_monthly - med;
  return {
    median: med,
    delta: Math.abs(delta),
    direction: delta < 0 ? 'below' : delta > 0 ? 'above' : 'at',
  };
}
