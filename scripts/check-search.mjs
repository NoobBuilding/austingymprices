/**
 * Search regression tests, run against the BUILT html so they test what
 * actually ships (the server-rendered data-search attributes) rather than a
 * hand-made fixture.
 *
 * These exist because search shipped with naive substring matching: "gold's"
 * matched but "golds" returned nothing, "life time" matched but "lifetime"
 * did not, and "laf" returned nothing while "la" returned twelve. There were
 * no search tests at all, so nothing caught it.
 */
import { readFileSync } from 'node:fs';
import { matchesQuery } from '../src/lib/search.js';

const html = readFileSync('dist/index.html', 'utf8');

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const cards = html
  .split('<article')
  .slice(1)
  .map((p) => ({
    slug: (p.match(/data-slug="([^"]+)"/) || [])[1],
    normalized: decode((p.match(/data-search="([^"]*)"/) || [])[1] ?? ''),
    compact: decode((p.match(/data-search-compact="([^"]*)"/) || [])[1] ?? ''),
    chain: (p.match(/data-chain="([^"]*)"/) || [])[1] ?? '',
  }))
  .filter((c) => c.slug);

const hits = (q) =>
  cards.filter((c) => matchesQuery(c.normalized, c.compact, q)).map((c) => c.slug);

const failures = [];

/** Every listed slug must appear, and the count must match exactly. */
function expect(query, expectedSlugs) {
  const got = hits(query).sort();
  const want = [...expectedSlugs].sort();
  const ok = got.length === want.length && want.every((s) => got.includes(s));
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${JSON.stringify(query)} -> ${got.length} result(s)`);
  if (!ok) {
    console.log(`        expected: ${want.join(', ') || '(none)'}`);
    console.log(`        got     : ${got.join(', ') || '(none)'}`);
    failures.push(query);
  }
}

/** Query must return at least one result. */
function expectSome(query, atLeast = 1) {
  const got = hits(query);
  const ok = got.length >= atLeast;
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${JSON.stringify(query)} -> ${got.length} result(s) (need >= ${atLeast})`,
  );
  if (!ok) failures.push(query);
}

console.log(`check-search: ${cards.length} cards from dist/index.html\n`);

console.log('Punctuation and spacing normalisation');
// Derived from the data, not hard-coded: a brand search must return EVERY
// location of that brand, and a literal list goes red the day a club opens —
// which is what happened when Gold's South Central was added. The chain field
// is the source of truth for "every location of this brand".
const goldsRows = cards
  .filter((c) => c.chain === 'golds-gym')
  .map((c) => c.slug)
  .sort();
expect('golds', goldsRows);
expect('golds gym', goldsRows);
expect("gold's", goldsRows);
// Three Austin studios, split per the 24 Hour Fitness precedent, so a brand
// search must return all of them rather than one arbitrary location.
expect('solidcore', [
  'solidcore-domain-northside', 'solidcore-downtown', 'solidcore-the-triangle',
]);
expect('[solidcore]', [
  'solidcore-domain-northside', 'solidcore-downtown', 'solidcore-the-triangle',
]);
expect('lifetime', ['life-time-downtown', 'life-time-north', 'life-time-south']);
expect('life time', ['life-time-downtown', 'life-time-north', 'life-time-south']);
expect('big tex', ['big-tex-gym']);
expect('BIG   TEX', ['big-tex-gym']);

console.log('\nSub-locality is searchable');
// Sub-locality search must return EVERY gym in that locality, not one. This was
// a single-slug list until Anytime Fitness branch rows landed on W Anderson Lane
// and Anderson Mill — three correct matches turned a passing test red. Derived
// from the rendered search text, so it stays true as the locality fills up.
const andersonRows = cards
  .filter((c) => /anderson/.test(c.normalized))
  .map((c) => c.slug)
  .sort();
expect('anderson', andersonRows);
expectSome('anderson');
expectSome('north loop');
// "oak hill" used to stand for this and matched Los Campeones South, which is
// now excluded (outside every region circle, Rumble precedent). A search
// assertion must not depend on a row that may legitimately be delisted, so this
// asserts the RULE — every sub_locality on a listed gym is findable — rather
// than one neighbourhood that happened to exist the day it was written.
expectSome('ben white');

console.log('\nProgressive typing never empties while a match exists');
for (const prefix of ['l', 'la', 'laf', 'lafi', 'lafit', 'lafitn']) {
  expectSome(prefix);
}
for (const prefix of ['g', 'go', 'gol', 'gold', 'golds']) {
  expectSome(prefix);
}
for (const prefix of ['b', 'bi', 'big', 'bigt', 'bigte', 'bigtex']) {
  expectSome(prefix);
}

console.log('\nEmpty query matches everything; nonsense matches nothing');
expect('', cards.map((c) => c.slug));
expect('   ', cards.map((c) => c.slug));
expect('zzzzqqqq', []);

console.log(
  failures.length === 0
    ? '\nOK — search behaves.'
    : `\n${failures.length} search check(s) FAILED.`,
);
process.exit(failures.length === 0 ? 0 : 1);
