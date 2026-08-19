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

const THRESHOLD = 33;

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

const short = THRESHOLD - priced.length;
console.log('');
if (short > 0) {
  console.log(
    `NOT READY — ${priced.length} of ${gyms.length} priced, ${short} short of the ` +
      `${THRESHOLD} the definition of done requires.`,
  );
  console.log('\nUnpriced gyms:');
  for (const g of unpriced) console.log(`  ${g.name}`);
  console.log(
    '\nThis is a collection problem, not a code problem. docs/outreach.html has ' +
      'a pre-filled email per gym.',
  );
  process.exit(1);
}
console.log(`READY on data — ${priced.length} of ${gyms.length} priced, threshold ${THRESHOLD}.`);
console.log('Work the manual list above, then connect the domain.');
