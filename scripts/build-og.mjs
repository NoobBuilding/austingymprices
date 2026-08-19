/**
 * Generates OpenGraph cards into public/og at build time.
 *
 * Rasterised with sharp, which Astro already depends on — no new dependency
 * for this. The cards are drawn as SVG and rendered to 1200x630 PNG.
 *
 * FONT CAVEAT, deliberately accepted: librsvg resolves fonts through
 * fontconfig, which cannot use our self-hosted woff2 files. These cards
 * therefore use a generic condensed/sans stack rather than Barlow Condensed.
 * The brand colours, the wordmark treatment and the all-in message are all
 * correct; only the exact face differs, and only in link previews. Getting
 * Barlow into these would mean shipping a TTF and wiring fontconfig in CI,
 * which is a lot of machinery for a social thumbnail.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = 'public/og';
const W = 1200;
const H = 630;

const C = {
  bg: '#FFFFFF',
  ink: '#211D19',
  inkSoft: '#6B635B',
  orange: '#BF5700',
  orangeTint: '#FBF1E9',
  line: '#ECE7E1',
  green: '#1E7A46',
};

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const CONDENSED = "'Arial Narrow', 'Helvetica Neue Condensed', Impact, Helvetica, Arial, sans-serif";

// NOTE: uppercase BEFORE escaping. Uppercasing afterwards turns &apos; into
// &APOS;, which is not a defined XML entity, and librsvg refuses the whole
// document — Gold's Gym and [solidcore] both hit this.
const up = (s) => String(s ?? '').toUpperCase();

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Break a long name onto at most two lines without splitting words. */
function wrap(text, perLine) {
  const words = String(text).split(/\s+/);
  const lines = [''];
  for (const word of words) {
    const candidate = lines.at(-1) ? `${lines.at(-1)} ${word}` : word;
    if (candidate.length <= perLine || !lines.at(-1)) lines[lines.length - 1] = candidate;
    else lines.push(word);
  }
  return lines.slice(0, 2);
}

function wordmark(x, y, size) {
  return `
    <text x="${x}" y="${y}" font-family="${CONDENSED}" font-size="${size}" font-weight="700"
          letter-spacing="${size * 0.05}">
      <tspan fill="${C.orange}">AUSTIN</tspan><tspan fill="${C.ink}">GYMPRICES</tspan>
    </text>`;
}

function card({ eyebrow, title, price, unit, footer, accent = C.orange }) {
  const lines = wrap(title, 22);
  const titleSize = lines.length > 1 ? 76 : 92;
  const titleY = lines.length > 1 ? 268 : 300;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="0" y="0" width="${W}" height="14" fill="${accent}"/>
  <rect x="0" y="${H - 96}" width="${W}" height="96" fill="${C.orangeTint}"/>
  ${wordmark(72, 108, 40)}

  <text x="72" y="176" font-family="${SANS}" font-size="26" font-weight="600"
        letter-spacing="2" fill="${C.inkSoft}">${esc(up(eyebrow))}</text>

  ${lines
    .map(
      (line, i) =>
        `<text x="72" y="${titleY + i * (titleSize + 8)}" font-family="${CONDENSED}" font-size="${titleSize}"
               font-weight="700" fill="${C.ink}">${esc(up(line))}</text>`,
    )
    .join('\n  ')}

  ${
    price
      ? `<text x="72" y="470" font-family="${CONDENSED}" font-size="128" font-weight="700"
              fill="${accent}">${esc(price)}</text>
         <text x="${72 + String(price).length * 62}" y="470" font-family="${SANS}" font-size="30"
              font-weight="600" fill="${C.inkSoft}">${esc(unit)}</text>`
      : `<text x="72" y="452" font-family="${SANS}" font-size="40" font-weight="600"
              fill="${C.inkSoft}">${esc(unit)}</text>`
  }

  <text x="72" y="${H - 38}" font-family="${SANS}" font-size="24" fill="${C.inkSoft}">${esc(footer)}</text>
</svg>`;
}

const gyms = readdirSync('data/gyms')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join('data/gyms', f), 'utf8')));
const regions = JSON.parse(readFileSync('data/regions.json', 'utf8'));

const PERIODS = { monthly: 12, '4-week': 13, weekly: 52 };
const allIn = (gym) => {
  const plan = (gym.plans ?? []).find((p) => p.is_default);
  if (!plan || plan.monthly === null || plan.monthly === undefined) return null;
  const n = PERIODS[gym.billing_period] ?? 12;
  return Math.round((plan.monthly * n + (plan.enroll_fee ?? 0) + (plan.annual_fee ?? 0)) / 12);
};

const regionName = (id) => regions.find((r) => r.id === id)?.name ?? 'Austin';

mkdirSync(OUT, { recursive: true });
const jobs = [];

// Site card.
jobs.push([
  'default',
  card({
    eyebrow: 'Austin, Texas',
    title: 'Every Austin gym. The real price.',
    price: null,
    unit: 'Monthly rates with enrollment and annual fees included',
    footer: `${gyms.length} gyms · prices from each gym's own website`,
  }),
]);

// One per gym.
for (const gym of gyms) {
  const price = allIn(gym);
  jobs.push([
    `gym-${gym.slug}`,
    card({
      eyebrow: gym.sub_locality ?? regionName(gym.region),
      title: gym.name,
      price: price === null ? null : `$${price}`,
      unit: price === null ? 'Pricing not published — call the gym' : '/mo all-in',
      footer: gym.verified_date
        ? `Prices checked ${gym.verified_date}`
        : 'Price not yet confirmed',
    }),
  ]);
}

// One per region.
for (const region of regions) {
  const inRegion = gyms.filter((g) => g.region === region.id);
  const prices = inRegion.map(allIn).filter((p) => p !== null).sort((a, b) => a - b);
  const median = prices.length
    ? prices.length % 2
      ? prices[(prices.length - 1) / 2]
      : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
    : null;
  jobs.push([
    `region-${region.id}`,
    card({
      eyebrow: 'Austin, Texas',
      title: `Gym prices in ${region.name}`,
      price: median === null ? null : `$${median}`,
      unit: median === null ? 'No confirmed prices here yet' : 'median /mo all-in',
      footer: `${inRegion.length} ${inRegion.length === 1 ? 'gym' : 'gyms'} in ${region.name}`,
    }),
  ]);
}

let written = 0;
await Promise.all(
  jobs.map(async ([name, svg]) => {
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(join(OUT, `${name}.png`), png);
    written += 1;
  }),
);

console.log(`og: ${written} cards written to ${OUT}/ (1200x630)`);
