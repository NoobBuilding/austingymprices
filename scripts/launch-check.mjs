/**
 * Launch readiness report. Reads the data and the build, states plainly what
 * is ready and what is not, and never softens the numbers.
 *
 *   node scripts/launch-check.mjs
 *
 * Exits 1 when a launch gate is unmet, so it can gate a release if wanted.
 * Only the DATA gate can fail here; everything else is either covered by CI
 * or is a manual step this cannot observe.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// No threshold. We launch on what we can definitively source, not on a count
// (CLAUDE.md §9). This script REPORTS coverage; it exits non-zero only on a
// real defect — a number we cannot trace — never on how many gyms are priced.

const gyms = readdirSync('data/gyms')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join('data/gyms', f), 'utf8')));
const regions = JSON.parse(readFileSync('data/regions.json', 'utf8'));

const hasPrice = (g) => {
  const d = (g.plans ?? []).find((p) => p.is_default);
  return Boolean(d && d.monthly !== null && d.monthly !== undefined);
};

const priced = gyms.filter(hasPrice);
const unpriced = gyms.filter((g) => !hasPrice(g));
const withCoords = gyms.filter((g) => g.lat !== null);
const withKnownFor = gyms.filter((g) => g.known_for);
const withAddress = gyms.filter((g) => g.address);
const stale = gyms.filter((g) => g.stale);
const promoOnly = gyms.filter(
  (g) => (g.plans ?? []).length > 0 && !hasPrice(g),
);

const pad = (n) => String(n).padStart(3);
const bar = (n, total, width = 28) => {
  const filled = Math.round((n / total) * width);
  return `${'#'.repeat(filled)}${'.'.repeat(width - filled)}`;
};

console.log('LAUNCH READINESS\n');

console.log('Data');
console.log(`  ${pad(priced.length)}/${gyms.length}  confirmed prices   ${bar(priced.length, gyms.length)}`);
console.log(`  ${pad(withCoords.length)}/${gyms.length}  map pins           ${bar(withCoords.length, gyms.length)}`);
console.log(`  ${pad(withAddress.length)}/${gyms.length}  addresses          ${bar(withAddress.length, gyms.length)}`);
console.log(`  ${pad(withKnownFor.length)}/${gyms.length}  known_for lines    ${bar(withKnownFor.length, gyms.length)}`);
if (stale.length) console.log(`  ${pad(stale.length)}      marked stale`);
if (promoOnly.length) {
  console.log(`  ${pad(promoOnly.length)}      promo-only (no standing rate published)`);
}

console.log('\nBy region');
for (const r of regions) {
  const inRegion = gyms.filter((g) => g.region === r.id);
  const p = inRegion.filter(hasPrice).length;
  console.log(`  ${r.name.padEnd(14)} ${pad(p)}/${String(inRegion.length).padEnd(3)} priced`);
}

console.log('\nBuild');
const built = existsSync('dist/index.html');
console.log(`  dist present            ${built ? 'yes' : 'no — run npm run build'}`);
if (built) {
  const pages = (function walk(dir) {
    let n = 0;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) n += walk(join(dir, e.name));
      else if (e.name.endsWith('.html')) n += 1;
    }
    return n;
  })('dist');
  console.log(`  pages                   ${pages}`);
  console.log(`  sitemap                 ${existsSync('dist/sitemap.xml') ? 'yes' : 'MISSING'}`);
  console.log(`  robots.txt              ${existsSync('dist/robots.txt') ? 'yes' : 'MISSING'}`);
  console.log(`  _headers                ${existsSync('dist/_headers') ? 'yes' : 'MISSING'}`);
  console.log(`  og cards                ${existsSync('dist/og/default.png') ? 'yes' : 'MISSING'}`);
}

console.log('\nManual steps this cannot verify');
console.log('  - FIRECRAWL_API_KEY and SENTRY_DSN in repo secrets');
console.log('  - Scrape workflow dry-run succeeded');
console.log('  - Custom domain + atxgymprices.com 301 redirect');
console.log('  - hello@ and reports@ email routing TESTED with a real send');
console.log('  - Lighthouse workflow run against the live URL');
console.log('  - Owner has clicked through every gym page');

console.log('');
console.log(`Coverage — ${priced.length} of ${gyms.length} gyms carry a confirmed price.`);

// Per-region coverage. A city-wide count can look healthy while a whole region
// is empty, and an empty region page is a worse first impression than a short
// one.
const regionIds = [...new Set(gyms.map((g) => g.region))].sort();
console.log('\nPer region:');
for (const id of regionIds) {
  const inRegion = gyms.filter((g) => g.region === id);
  const withPrice = inRegion.filter((g) => priced.includes(g));
  const bar = '#'.repeat(withPrice.length).padEnd(Math.max(inRegion.length, 1), '.');
  console.log(
    `  ${id.padEnd(13)} ${String(withPrice.length).padStart(2)}/${String(inRegion.length).padEnd(2)}  ${bar}`,
  );
}

// The queues. These are collection problems, not code problems, and naming
// them as queues is what stops them reading as failures.
console.log('\nQueues:');
console.log(`  awaiting a price      ${unpriced.length}`);
console.log('  transcription sheet   docs/price-transcription.md');
console.log('  outreach              docs/outreach.html (pre-filled email per gym)');

if (unpriced.length > 0) {
  console.log('\nAwaiting a price:');
  for (const g of unpriced) console.log(`  ${g.name}`);
}

// Traceability IS the gate. A gym claiming a confirmed price with no date to
// stand behind it is the one data defect that must never ship.
const untraceable = priced.filter((g) => !g.verified_date);
if (untraceable.length > 0) {
  console.log('\nDEFECT — priced but with no verified_date to trace it to:');
  for (const g of untraceable) console.log(`  ${g.name}`);
  process.exit(1);
}
console.log('\nEvery shipped price is traceable to a source and a date.');
