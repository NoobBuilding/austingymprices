/**
 * Map build assertions.
 *
 * Leaflet needs real layout to initialise, so this does not try to run it in
 * jsdom. It asserts the things that can silently regress at build time: the
 * performance budget (no map asset eagerly referenced), the pin payload, the
 * tier tint classes, and CSP compatibility of the tile host.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync('dist/index.html', 'utf8');
const cssFile = readdirSync('dist/_astro').find((f) => f.endsWith('.css'));
const css = readFileSync(join('dist/_astro', cssFile), 'utf8');
const headers = readFileSync('dist/_headers', 'utf8');

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

console.log('check-map: build assertions\n');

console.log('Performance budget — the list must render before any map asset');
const eagerLinks = [...html.matchAll(/<link[^>]*rel="(?:stylesheet|modulepreload|preload)"[^>]*>/g)]
  .map((m) => m[0])
  .filter((t) => /map-island|leaflet/i.test(t));
check(eagerLinks.length === 0, 'no map CSS/JS eagerly linked in the document', eagerLinks.join(' '));

const eagerScripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
check(
  !eagerScripts.some((s) => /map-island|leaflet/i.test(s)),
  'no map script eagerly loaded',
  eagerScripts.join(', '),
);

const mainScript = eagerScripts.find((s) => s.includes('index.astro'));
const mainBytes = readFileSync(join('dist', mainScript.replace(/^\//, '')), 'utf8').length;
check(mainBytes < 20000, 'main script stays small', `${mainBytes} bytes`);

const mapChunk = readdirSync('dist/_astro').find((f) => /^map-island.*\.js$/.test(f));
check(Boolean(mapChunk), 'map is code-split into its own chunk', mapChunk ?? 'none');

console.log('\nPin payload');
const raw = (html.match(/data-pins="([^"]*)"/) || [])[1] ?? '';
const decoded = raw
  .replace(/&quot;/g, '"')
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/&amp;/g, '&');
let pins = [];
try {
  pins = JSON.parse(decoded);
} catch {
  /* handled by the assertion below */
}
check(pins.length > 0, 'pins are embedded as JSON', `${pins.length} pins`);
check(
  pins.every((p) => typeof p.lat === 'number' && typeof p.lng === 'number'),
  'every pin has numeric coordinates',
);
check(
  pins.every((p) => p.lat > 30.0 && p.lat < 30.7 && p.lng > -98.1 && p.lng < -97.4),
  'every pin is inside the Austin area',
);
check(
  pins.every((p) => 'allIn' in p && 'dayPass' in p && 'tier' in p),
  'pins carry both prices and a tier, so the map can be tab-aware',
);

console.log('\nPin styling');
for (const cls of ['.pin', '.pin.tier-1', '.pin.tier-3', '.pin.callfor', '.pin.cluster', '.pin.dim', '.pin.nopass', '.pin.active']) {
  const escaped = cls.replace(/\./g, '\\.');
  check(new RegExp(escaped.replace(/\\\./g, '\\.')).test(css), `${cls} style is present`);
}

console.log('\nCSP compatibility');
check(/basemaps\.cartocdn\.com/.test(headers), 'CartoDB tile host allowed by img-src');
check(!/unsafe-inline/.test(headers), "CSP still forbids 'unsafe-inline'");
check(
  /\/vendor\/leaflet\.css/.test(readFileSync(join('dist/_astro', mapChunk), 'utf8')),
  'Leaflet CSS is attached from our own origin at runtime',
);

console.log(
  failures.length === 0 ? '\nOK — map build is sound.' : `\n${failures.length} check(s) FAILED.`,
);
process.exit(failures.length === 0 ? 0 : 1);
