/**
 * Compare view assertions.
 *
 * Two things must hold, and both are ethics rather than mechanics:
 *   1. The page NEVER scores, ranks or recommends. It presents the maths.
 *   2. Absence of data renders absence of claim — a blank, never a zero, and
 *      never a "—" that asserts a negative we did not check.
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('dist/compare/index.html', 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

console.log('check-compare: the compare view\n');

console.log('URL is the only state');
const {
  MAX_COMPARE, MIN_COMPARE, parseCompareParam, compareHref, amenityState,
} = await import('../src/lib/compare.js');
const known = ['a', 'b', 'c', 'd', 'e', 'f'];
check(MAX_COMPARE === 4, 'hard cap is 4', String(MAX_COMPARE));
check(MIN_COMPARE === 2, 'the pill needs 2', String(MIN_COMPARE));
check(
  parseCompareParam('a,b,c,d,e,f', known).length === MAX_COMPARE,
  'more than four in the URL is truncated, not rendered',
);
check(
  JSON.stringify(parseCompareParam('b,a,c', known)) === JSON.stringify(['b', 'a', 'c']),
  'order in the URL is preserved',
);
check(
  JSON.stringify(parseCompareParam('a,a,b', known)) === JSON.stringify(['a', 'b']),
  'duplicates collapse',
);
check(
  JSON.stringify(parseCompareParam('a,../../etc/passwd,<script>,b', known)) ===
    JSON.stringify(['a', 'b']),
  'unknown slugs are dropped — the URL is untrusted input',
);
check(parseCompareParam('', known).length === 0, 'an empty param selects nothing');
check(parseCompareParam(null, known).length === 0, 'a missing param selects nothing');
check(
  compareHref(['a', 'b']) === '/compare?gyms=a,b',
  'the share URL is the slugs and nothing else',
  compareHref(['a', 'b']),
);
check(
  compareHref(['a', 'b', 'c', 'd', 'e']) === '/compare?gyms=a,b,c,d',
  'the href respects the cap too',
  compareHref(['a', 'b', 'c', 'd', 'e']),
);

console.log('\nNo scoring, no recommendation (CLAUDE.md §4)');
const text = doc.body.textContent.toLowerCase().replace(/\s+/g, ' ');
// Affirmative claims only. The page is ALLOWED to say "nothing here is ranked
// or recommended" — that sentence is the policy, not a violation of it, and a
// naive substring ban would forbid stating the ethic out loud.
for (const claim of [
  'best value', 'best gym', 'top pick', 'our pick', 'we recommend', 'recommended for',
  'winner', 'highest rated', 'best overall', '#1', 'cheapest option', 'you should pick',
]) {
  check(!text.includes(claim), `the page never claims "${claim}"`);
}
check(
  /nothing here is ranked or recommended|not ranked/.test(text),
  'and it says so explicitly, so the omission reads as a policy not an oversight',
);
const css = readFileSync('dist/compare/index.html', 'utf8');
check(
  !/class="[^"]*\b(winner|best|recommended)\b/.test(css),
  'no column is marked as a winner in the markup',
);
check(
  doc.querySelectorAll('.cmp thead th.gymhead').length > 1,
  'gyms are columns',
  `${doc.querySelectorAll('.cmp thead th.gymhead').length}`,
);

console.log('\nHonesty: absence of data renders absence of claim');
// src/lib/gyms.js uses import.meta.glob, which only exists inside Vite — so
// read the source data the same way scripts/validate-data.mjs does.
const { readdirSync } = await import('node:fs');
const { join } = await import('node:path');
const gyms = readdirSync('data/gyms')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join('data/gyms', f), 'utf8')));
// "has a confirmed price" is whatever the built page decided — read it back
// from the markup rather than reimplementing the default-plan rule here.
const pricedSlugs = new Set(
  [...doc.querySelectorAll('tr[data-row="all_in"] td[data-slug]')]
    .filter((td) => !/call for pricing/i.test(td.textContent))
    .map((td) => td.dataset.slug),
);
for (const g of gyms) g.has_price = pricedSlugs.has(g.slug);
const unpriced = gyms.find((g) => !g.has_price);
check(Boolean(unpriced), 'there is an unpriced gym to check', unpriced?.slug);
const unpricedCell = doc.querySelector(
  `tr[data-row="all_in"] td[data-slug="${unpriced.slug}"]`,
);
check(
  /call for pricing/i.test(unpricedCell?.textContent ?? ''),
  'an unpriced gym reads "Call for pricing", not a blank that looks like zero',
  unpricedCell?.textContent?.trim(),
);
check(
  !/\$0|\bN\/A\b|\b0\b/.test(unpricedCell?.textContent ?? ''),
  'and never renders a zero or an N/A',
);

// The amenity tri-state. 28 of 41 gyms have no amenity list at all, and a "—"
// for those would assert 14 negative facts nobody checked.
const noAmenities = gyms.find((g) => (g.amenities ?? []).length === 0);
const withAmenities = gyms.find((g) => (g.amenities ?? []).length > 0);
check(Boolean(noAmenities && withAmenities), 'both amenity cases exist in the data');
check(
  amenityState(noAmenities, ['sauna']) === 'unknown',
  'a gym with NO amenity list is "unknown", never "no"',
);
check(
  amenityState({ amenities: ['Pool', 'Café'] }, ['sauna']) === 'no',
  'a gym that lists amenities but not this one is "no"',
);
check(
  amenityState({ amenities: ['Infrared sauna'] }, ['sauna']) === 'yes',
  'family matching survives the owner\'s wording ("Infrared sauna" is a sauna)',
);
const unknownCell = doc.querySelector(
  `tr.amenity td[data-slug="${noAmenities.slug}"][data-state="unknown"]`,
);
check(Boolean(unknownCell), 'unknown amenity cells are marked in the DOM');
check(
  (unknownCell?.textContent ?? '').trim() === '',
  'an unknown amenity renders BLANK — never a dash, which would claim absence',
  JSON.stringify(unknownCell?.textContent),
);
check(
  /means we have no amenity list/i.test(doc.body.textContent),
  'the page explains in words what a blank means',
);

console.log('\nHeading and column treatment');
check(
  doc.getElementById('compare-title')?.textContent.trim() === 'Compare gyms',
  'the heading is "Compare gyms" — gym names belong in the column headers',
  doc.getElementById('compare-title')?.textContent.trim(),
);
check(
  !/\bvs\b/i.test(doc.getElementById('compare-title')?.textContent ?? ''),
  'no "X vs Y vs Z" headline — a comparison is not a billing',
);
check(Boolean(doc.getElementById('compare-selected')), 'an "{N} selected" line exists');
check(doc.getElementById('compare-selected')?.hasAttribute('hidden'),
  'and stays hidden until a selection exists');
check(Boolean(doc.getElementById('compare-range')), 'the neutral range line exists');
check(
  doc.getElementById('compare-range')?.hasAttribute('hidden'),
  'and is hidden until there is a spread to state',
);
// Astro emits page styles to a hashed stylesheet, so read what actually ships
// rather than the HTML — an assertion against the wrong file passes forever.
const { readdirSync: readdir } = await import('node:fs');
const { join: joinPath } = await import('node:path');
const compareCss = readdir('dist/_astro')
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(joinPath('dist/_astro', f), 'utf8'))
  .join('\n');
// Astro scopes selectors with [data-astro-cid-*] and the minifier rewrites
// :nth-child(even) to (2n), so match on the declarations rather than on the
// selector text exactly as authored.
// A selector can appear in several blocks (`.rowhead` alone, and again inside
// the alternating-tint rule), so ask whether ANY block pairs the selector with
// the declaration rather than trusting the first match.
const cssBlocks = (needle) =>
  compareCss.split('}').filter((block) => block.includes(needle));
const declaredOn = (needle, decl) => cssBlocks(needle).some((b) => decl.test(b));

check(
  declaredOn('.gymhead', /border-left:\s*1px solid/),
  'columns are boxed with a vertical rule',
);
check(
  declaredOn('.gymhead[', /position:sticky/),
  'the gym-name header is sticky, so you never lose whose column you are reading',
);
check(
  declaredOn('.rowhead[', /position:sticky/),
  'the attribute label stays put on horizontal scroll',
);
// The tint must be on the ROW. A per-column tint would read as marking a
// column better, which is exactly what this page refuses to do.
const tint = [...cssBlocks('nth-child(2n)'), ...cssBlocks('nth-child(even)')].join('}');
check(Boolean(tint), 'attribute rows alternate tint');
check(
  /tbody[^{]*tr[^{]*nth-child\(2n\)|tbody[^{]*tr[^{]*nth-child\(even\)/.test(tint),
  'the alternating tint is per ROW, so it can never read as anointing a column',
);

console.log('\nSEO: compare URLs stay out of the index');
check(
  /noindex/.test(doc.querySelector('meta[name="robots"]')?.content ?? ''),
  'the compare page is noindex',
  doc.querySelector('meta[name="robots"]')?.content,
);
check(
  !readFileSync('dist/sitemap.xml', 'utf8').includes('/compare'),
  'compare is not in the sitemap',
);
check(
  !readFileSync('dist/index.html', 'utf8').includes('<meta name="robots"'),
  'the index is NOT accidentally noindexed by the shared layout',
);

console.log('\nWorks without JavaScript');
check(
  doc.querySelectorAll('.cmp tbody tr').length > 5,
  'the table is server-rendered, not an empty shell for JS to fill',
  `${doc.querySelectorAll('.cmp tbody tr').length} rows`,
);
check(
  doc.querySelectorAll('.cmp thead th.gymhead').length === gyms.length,
  'every gym is server-rendered, so the no-JS state is the full table',
  `${doc.querySelectorAll('.cmp thead th.gymhead').length} of ${gyms.length}`,
);
check(
  Boolean(doc.getElementById('compare-fallback')),
  'the no-JS state explains itself rather than looking broken',
);
check(
  doc.querySelectorAll('.tablewrap').length === 1,
  'the wide table scrolls in its own box, so the page never scrolls sideways',
);
check(
  [...doc.querySelectorAll('.cmp th[scope="row"]')].length > 5,
  'row headers are real <th scope="row">',
);

console.log('\nThe picker on the index');
const indexDoc = new JSDOM(readFileSync('dist/index.html', 'utf8')).window.document;
const pill = indexDoc.getElementById('cmp-pill');
check(Boolean(pill), 'the compare pill exists');
check(pill?.hasAttribute('hidden'), 'the pill starts hidden — 0 picks is not a comparison');
check(pill?.tagName === 'A', 'the pill is a real link, so it can be opened in a tab and shared');
const picks = indexDoc.querySelectorAll('.cmp-pick');
check(picks.length === gyms.length, 'every card has a compare control', `${picks.length}`);
// The hidden attribute lives on the ROW now, not the label: the control moved
// out of the price's corner and into flow at the card's bottom-right.
check(
  [...indexDoc.querySelectorAll('.cmp-row')].length === gyms.length,
  'each compare control sits in its own flow row',
  `${indexDoc.querySelectorAll('.cmp-row').length}`,
);
check(
  [...indexDoc.querySelectorAll('.cmp-row')].every((r) => r.hasAttribute('hidden')),
  'compare controls are hidden until JS boots — never a dead control without JS',
);
check(
  [...picks].every((p) => !p.style.position && !/position:\s*absolute/.test(p.getAttribute('style') ?? '')),
  'the control is not absolutely positioned over the card',
);
check(
  [...indexDoc.querySelectorAll('.cmp-pick')].every((p) => !p.closest('summary')),
  'the checkbox is NOT inside <summary>, where it would fight the accordion for the click',
);

console.log(
  failures.length === 0 ? '\nOK — compare view behaves.' : `\n${failures.length} check(s) FAILED.`,
);
process.exit(failures.length === 0 ? 0 : 1);
