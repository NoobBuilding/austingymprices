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
// Astro splits CSS per page, so concatenate every emitted stylesheet rather
// than guessing which chunk holds the pin rules.
const css = readdirSync('dist/_astro')
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join('dist/_astro', f), 'utf8'))
  .join('\n');
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
check(
  /rastertiles\/voyager/.test(readFileSync(join('dist/_astro', mapChunk), 'utf8')),
  'using CartoDB Voyager tiles',
);
check(!/unsafe-inline/.test(headers), "CSP still forbids 'unsafe-inline'");
check(
  /\/vendor\/leaflet\.css/.test(readFileSync(join('dist/_astro', mapChunk), 'utf8')),
  'Leaflet CSS is attached from our own origin at runtime',
);

// ── Clustering maths (pure, no DOM needed) ───────────────────────────────
console.log('\nClustering');
const { clusterPoints, clusterLabel, pinClasses, countActive, activeBubble } = await import('../src/lib/cluster.js');
const mk = (slug, x, y, price) => ({ pin: { slug, tier: 2 }, price, point: { x, y } });

const far = clusterPoints([mk('a', 0, 0, 10), mk('b', 500, 500, 99)], 44);
check(far.length === 2, 'distant pins stay separate', `${far.length} groups`);

const near = clusterPoints([mk('a', 0, 0, 15), mk('b', 10, 10, 259), mk('c', 5, 5, 40)], 44);
check(near.length === 1, 'nearby pins merge into one group', `${near.length} groups`);
const prices = near[0].members.map((m) => m.price);
check(
  Math.min(...prices) === 15 && Math.max(...prices) === 259,
  'cluster spans the price RANGE of its members, not a count',
  `$${Math.min(...prices)}–${Math.max(...prices)}`,
);
check(
  near[0].members.some((m) => m.pin.slug === 'b'),
  'a selected gym inside a cluster is findable, so the cluster can wear the active state',
);
const fmt = (n) => `$${n}`;
check(
  clusterLabel(near[0].members, fmt) === '$15–259',
  'cluster label is the price range',
  clusterLabel(near[0].members, fmt),
);
check(
  !/\b\d+\s*(gyms?|pins?)\b/i.test(clusterLabel(near[0].members, fmt)),
  'cluster label is never a count',
);

console.log('\nSelected state is unmistakable against every tier');
const cssRule = (sel) => {
  const m = css.match(new RegExp(sel.replace(/[.]/g, '\\.') + '\\{([^}]*)\\}'));
  return m ? m[1] : '';
};
const activeRule = cssRule('.pin.active');
const tier3Rule = cssRule('.pin.tier-3');
const bg = (rule) => (rule.match(/background:([^;]+)/) || [])[1]?.trim();
check(Boolean(activeRule), '.pin.active has a rule');
check(
  bg(activeRule) !== undefined && bg(activeRule) !== bg(tier3Rule),
  'selected fill differs from the tier-3 fill (they collided before)',
  `active=${bg(activeRule)} tier3=${bg(tier3Rule)}`,
);
check(/orange/.test(activeRule), 'selected inverts to orange, which no tier uses as a fill');
check(/scale/.test(activeRule), 'selected adds a scale bump so it reads in a dense cluster');

// Every pin state is a single-specificity class pair, so SOURCE ORDER decides
// the winner. .pin.active sitting before .pin.cluster meant a selected cluster
// kept the white cluster fill and showed only the ring.
const idxActive = css.indexOf('.pin.active{');
const idxCluster = css.indexOf('.pin.cluster{');
const idxTier3 = css.indexOf('.pin.tier-3{');
const idxCall = css.indexOf('.pin.callfor{');
check(
  idxActive > idxCluster && idxActive > idxTier3 && idxActive > idxCall,
  '.pin.active is declared AFTER every other pin state, so selected always wins',
  `active=${idxActive} cluster=${idxCluster} tier3=${idxTier3} callfor=${idxCall}`,
);
check(
  bg(cssRule('.pin.cluster')) !== bg(activeRule),
  'a selected cluster does not keep the plain cluster fill',
  `cluster=${bg(cssRule('.pin.cluster'))} active=${bg(activeRule)}`,
);

console.log('\nAt most one bubble is ever selected');
const groups2 = clusterPoints([mk('a', 0, 0, 15), mk('b', 10, 10, 259)], 44);
const alone = [mk('c', 900, 900, 40)];
check(countActive(groups2, alone, 'b') === 1, 'a gym inside a cluster marks exactly one bubble');
check(countActive(groups2, alone, 'c') === 1, 'a lone gym marks exactly one bubble');
check(countActive(groups2, alone, null) === 0, 'no selection marks nothing');
check(countActive(groups2, alone, 'nonexistent') === 0, 'an unknown slug marks nothing');
check(
  pinClasses({ tier: 3, priced: true, selected: true }).includes('active'),
  'a tier-3 pin can still be marked selected',
);
check(
  !pinClasses({ tier: 3, priced: true, selected: false }).includes('active'),
  'an unselected tier-3 pin is NOT marked selected (the reported bug)',
);

console.log('\nThe active pin is the SELECTED gym, with list order != map order');
// Map iterates data order; the list sorts cheapest-first. If anything resolved
// by position rather than slug, these two orderings would light the wrong pin.
const mapOrder = [
  mk('east-austin-athletic-club', 700, 100, 233),
  mk('crunch-south-austin', 40, 700, 23),
  mk('life-time-south', 300, 400, 259),
];
const listOrder = [...mapOrder].sort((a, b) => a.price - b.price).map((p) => p.pin.slug);
check(
  listOrder[0] === 'crunch-south-austin' && mapOrder[0].pin.slug !== 'crunch-south-austin',
  'the fixture genuinely has list order != map order',
  `list=${listOrder[0]} map=${mapOrder[0].pin.slug}`,
);

const spread = clusterPoints(mapOrder, 44);
const lone = [];
const chosen = activeBubble(spread, mapOrder, 'crunch-south-austin');
check(chosen !== null, 'selecting a gym resolves to a bubble');
check(
  chosen.slugs.includes('crunch-south-austin'),
  'the active bubble is the SELECTED gym, not the first or nearest one',
  chosen.slugs.join(','),
);
check(
  !chosen.slugs.includes('east-austin-athletic-club'),
  'the dark tier-3 gym at the front of map order is NOT marked active',
);
check(countActive(spread, lone, 'crunch-south-austin') === 1, 'exactly one bubble is active');

// And when it IS clustered, the cluster holding it is the one that lights up.
const tight = clusterPoints(
  [mk('a', 0, 0, 38), mk('crunch-south-austin', 8, 8, 23)], 44,
);
const clustered = activeBubble(tight, [], 'crunch-south-austin');
check(clustered?.kind === 'cluster', 'a clustered selection resolves to its cluster');
check(
  clustered.slugs.includes('crunch-south-austin'),
  'the cluster that lights up is the one containing the selected gym',
);

console.log('\nSelecting from the list brings the pin into view');
const islandSrc = readFileSync('src/lib/map-island.js', 'utf8');
check(/function revealSelection/.test(islandSrc), 'the map reveals the selection');
check(/panTo\(/.test(islandSrc), 'it pans rather than jumping');
check(/getBounds\(\)\.pad\(/.test(islandSrc),
  'it requires the pin to be COMFORTABLY inside, not merely inside');
check(/selfInitiated/.test(islandSrc),
  'a pin click does not pan — the user is already looking at it');
check(/setView\(latlng, Math\.min\(map\.getZoom\(\) \+ 2/.test(islandSrc),
  'zoom changes only to resolve a cluster');

// ── Selection is one piece of state, rendered by both views ──────────────
console.log('\nPin <-> card selection sync');
const mapSrc = readFileSync(join('dist/_astro', mapChunk), 'utf8');
const mainSrc = readFileSync(join('dist', mainScript.replace(/^\//, '')), 'utf8');

check(!/activeSlug/.test(mapSrc), 'the map keeps no private copy of the selection');
check(
  /holdsSelection|cluster active/.test(readFileSync('src/lib/map-island.js', 'utf8')),
  'a cluster containing the selected gym wears the active state',
);
check(
  /gym:select/.test(mapSrc) && /gym:select/.test(mainSrc),
  'pin -> card: the map announces selection and the page listens',
);
check(
  /addEventListener\(`toggle`|addEventListener\('toggle'/.test(mainSrc),
  'card -> pin: opening a card is observed',
);
check(
  /selected/.test(mainSrc) && /selected/.test(mapSrc),
  'both views read `selected` from the shared state',
);

const srcIndex = readFileSync('src/pages/index.astro', 'utf8');
check(
  /function setSelected/.test(srcIndex),
  'both directions funnel through a single setSelected()',
);
check(
  !/gym:highlight/.test(mainSrc) && !/gym:highlight/.test(mapSrc),
  'the old two-handler mirroring is gone',
);

console.log(
  failures.length === 0 ? '\nOK — map build is sound.' : `\n${failures.length} check(s) FAILED.`,
);
process.exit(failures.length === 0 ? 0 : 1);
