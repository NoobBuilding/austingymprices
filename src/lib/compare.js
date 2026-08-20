/**
 * Compare view: pure helpers, so the rules can be tested without a DOM.
 *
 * The ethic is the FAQ's (CLAUDE.md §4): **present the math, do not score it.**
 * Nothing here ranks, recommends, weights, or marks a winner. It arranges facts
 * side by side and stops. A "best value" badge would be our opinion wearing the
 * costume of a measurement.
 *
 * Tab-awareness follows the same rule as the cards (§3): the active tab defines
 * the question, and the table answers THAT question first. It reorders and
 * relabels rows — it never hides one, because a fact that stops being the
 * headline is still a fact the reader may want.
 */
import { perClassDerivation } from './pricing.js';

/** Hard cap. Four columns is what fits before a comparison stops comparing. */
export const MAX_COMPARE = 4;

/** Minimum that makes the pill meaningful — one gym is not a comparison. */
export const MIN_COMPARE = 2;

/**
 * Amenity vocabulary.
 *
 * The raw strings are the owner's editorial text and drift ("Sauna" vs
 * "Infrared sauna", "Group fitness" vs "Group fitness classes"), so a ✓/— grid
 * built on raw strings would show two gyms disagreeing when they offer the same
 * thing. Families are declared in one place and matched case-insensitively.
 *
 * Anything not in a family is not dropped — it still shows in the gym's own
 * amenity list on its detail page. It simply does not earn a comparison row.
 */
export const AMENITY_FAMILIES = [
  ['24/7 access', ['24/7']],
  ['Sauna', ['sauna']],
  ['Pool', ['pool']],
  ['Spa / whirlpool', ['spa', 'whirlpool']],
  ['Group classes', ['group fitness', 'fitness classes', 'hiit classes']],
  ['Yoga', ['yoga']],
  ['Boxing', ['boxing']],
  ['Bouldering', ['bouldering']],
  ['Café', ['café', 'cafe']],
  ['Basketball court', ['basketball']],
  ['Cold plunge', ['cold plunge']],
  ['Recovery room', ['recovery']],
  ['Massage', ['massage', 'hydromassage']],
  ['Towel service', ['towel']],
];

/** Does this gym list something in the family? */
export function listsAmenity(amenities, keywords) {
  return (amenities ?? []).some((a) =>
    keywords.some((k) => a.toLowerCase().includes(k)),
  );
}

/**
 * Amenity state for one gym and one family. Three values, not two.
 *
 * `unknown` exists because 28 of 41 gyms have **no amenity list recorded at
 * all**, and rendering those as a column of "—" would state 14 negative facts
 * we never checked. That is the same error as inventing a price, pointed at a
 * different field. A dash means "not listed by a gym that does list things";
 * a gym with nothing recorded says so once, in words.
 */
export function amenityState(gym, keywords) {
  if (!gym.amenities || gym.amenities.length === 0) return 'unknown';
  return listsAmenity(gym.amenities, keywords) ? 'yes' : 'no';
}

/** Does any gym in this set have an amenity list at all? */
export function anyAmenitiesRecorded(gyms) {
  return gyms.some((g) => (g.amenities ?? []).length > 0);
}

/**
 * Parse the `gyms` query parameter into a validated, de-duplicated,
 * order-preserving slug list, capped at MAX_COMPARE.
 *
 * The URL is the only state the compare view has, which means it is also the
 * only untrusted input it has. Unknown slugs are dropped rather than rendered,
 * so a hand-edited URL cannot put a gym on the page that does not exist.
 */
export function parseCompareParam(raw, knownSlugs) {
  const known = knownSlugs instanceof Set ? knownSlugs : new Set(knownSlugs);
  const seen = new Set();
  const out = [];
  for (const part of String(raw ?? '').split(',')) {
    const slug = part.trim();
    if (!slug || seen.has(slug) || !known.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

/**
 * The tabs a comparison can be reached from. The compare view inherits the
 * question the tab was asking — a comparison opened from Classes that leads
 * with a monthly rate is answering a question the reader did not ask.
 */
export const COMPARE_TABS = ['membership', 'classes', 'daypass', 'recovery'];

/** Unknown or absent tab falls back to the membership shape, which is the
 *  no-JS default the table is server-rendered in. */
export function parseCompareTab(raw) {
  return COMPARE_TABS.includes(String(raw ?? '')) ? String(raw) : 'membership';
}

/**
 * The shareable URL for a selection.
 *
 * The tab rides in the URL because the URL is the compare view's ONLY state
 * (§4): a comparison that loses its question on reload or when pasted to a
 * friend is not shareable, it just looks shareable. Membership is the default
 * shape, so it is left off rather than written out.
 */
export function compareHref(slugs, tab = 'membership') {
  const gyms = slugs.slice(0, MAX_COMPARE).join(',');
  const t = parseCompareTab(tab);
  return `/compare?gyms=${gyms}${t === 'membership' ? '' : `&tab=${t}`}`;
}

/**
 * Row order per originating tab. Order and LABEL only — every row is
 * server-rendered for every tab, so this rearranges facts rather than
 * choosing which ones the reader is allowed to see. The membership rows
 * always follow as context; they are demoted, never dropped.
 */
const LEAD_ROWS = {
  membership: [],
  recovery: [],
  classes: ['per_class', 'per_class_from', 'day_pass'],
  daypass: ['day_pass'],
};

export function compareRowOrder(rows, tab) {
  const lead = LEAD_ROWS[parseCompareTab(tab)] ?? [];
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const ordered = lead.map((k) => byKey.get(k)).filter(Boolean);
  const seen = new Set(ordered.map((r) => r.key));
  // Rows that only make sense as a lead are dropped from the tail rather than
  // repeated: the per-class derivation under "Advertised rate" is noise.
  for (const r of rows) {
    if (seen.has(r.key)) continue;
    if (r.leadOnly && !seen.has(r.key) && !lead.includes(r.key)) continue;
    ordered.push(r);
  }
  return ordered;
}

/** The row label for a given tab — a row can be called different things
 *  depending on the question being asked of it. */
export function rowLabel(row, tab) {
  return row.labels?.[parseCompareTab(tab)] ?? row.label;
}

/**
 * Rows of the comparison table, in order. Each row knows how to pull its own
 * value from a decorated gym, and whether it is a headline.
 *
 * `null` renders as nothing — never 0, never "N/A", never an inferred value
 * (CLAUDE.md §3). A gym with no confirmed price carries `has_price: false` and
 * its whole price column reads "Call for pricing" instead of a grid of blanks.
 */
export function priceRows(money) {
  const plan = (g) => g.default_plan;
  const nullish = (v) => v === null || v === undefined;
  return [
    { key: 'all_in', label: 'All-in monthly', headline: true,
      value: (g) => (g.all_in_monthly === null ? null : `${money(g.all_in_monthly)}/mo`) },
    { key: 'sticker', label: 'Advertised rate',
      value: (g) => (nullish(plan(g)?.monthly) ? null : `${money(plan(g).monthly)}/mo`) },
    { key: 'enroll', label: 'Enrollment fee',
      value: (g) => (nullish(plan(g)?.enroll_fee) ? null : money(plan(g).enroll_fee)) },
    { key: 'annual', label: 'Annual fee',
      value: (g) => (nullish(plan(g)?.annual_fee) ? null : money(plan(g).annual_fee)) },
    { key: 'commitment', label: 'Commitment',
      value: (g) => plan(g)?.commitment_badge?.text ?? null },
    { key: 'first_year', label: 'First-year total', headline: true,
      value: (g) => (g.first_year_total === null ? null : money(g.first_year_total)) },
    // Same number, different question. At a studio the "day pass" IS the
    // single-class drop-in rate, and calling it a day pass beside a per-class
    // headline invites the reader to compare it against a gym's all-day access.
    { key: 'day_pass', label: 'Day pass',
      labels: { classes: 'Single class (drop-in)' },
      value: (g) =>
        nullish(g.day_pass)
          ? null
          : `${money(g.day_pass)}${g.day_pass_qualifier ? ` ${g.day_pass_qualifier}` : ''}` },
    // Only where it is not the default, because "monthly" on every row is noise
    // and the whole point of the field is the 13-payments-a-year surprise.
    { key: 'billing', label: 'Billed',
      value: (g) =>
        g.billing_period && g.billing_period !== 'monthly'
          ? `every ${g.billing_period.replace('-', ' ')}`
          : null },
    { key: 'verified', label: 'Prices checked',
      value: (g) => g.verified_date ?? null },
    // The Classes lead, declared LAST on purpose. Source order is the order the
    // static HTML ships in, and that has to be the membership shape: with JS
    // off the table is the whole list, and leading every gym with a per-class
    // figure most of them do not have would answer a question nobody asked.
    // compareRowOrder() lifts these to the top when the tab calls for it.
    { key: 'per_class', label: 'From, per class', headline: true, leadOnly: true,
      value: (g) => (nullish(g.from_per_class) ? null : `${money(g.from_per_class)}/class`) },
    { key: 'per_class_from', label: 'How that rate is reached', leadOnly: true,
      value: (g) => perClassDerivation(g.from_per_class_source, money) },
  ];
}
