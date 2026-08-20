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
for (const cls of ['.pin', '.pin.tier-1', '.pin.tier-3', '.pin.callfor', '.pin.merged', '.pin.fanned', '.pin.active']) {
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

// ── Placement maths (pure, no DOM needed) ────────────────────────────────
// 41 gyms is not NYC: every pin shows its own price at every zoom. Crowding is
// solved by nudging bubbles apart; only effectively co-located pins merge.
console.log('\nPlacement — nudge, do not merge');
const {
  mergeCoLocated, mergedLabel, groupKey, nudgeApart, fanOffsets,
  pinClasses, countActive, activeBubble,
} = await import('../src/lib/cluster.js');
const mk = (slug, x, y, price) => ({ pin: { slug, tier: 2 }, price, point: { x, y } });

const MERGE_PX = 8;
const crowded = mergeCoLocated([mk('a', 0, 0, 15), mk('b', 25, 4, 259)], MERGE_PX);
check(crowded.length === 2, 'pins 25px apart do NOT merge — they crowd, they are not co-located', `${crowded.length} groups`);

const spread = mergeCoLocated([mk('a', 0, 0, 10), mk('b', 500, 500, 99)], MERGE_PX);
check(spread.length === 2, 'distant pins stay separate', `${spread.length} groups`);

const stacked = mergeCoLocated([mk('a', 0, 0, 38), mk('b', 3, 2, 55), mk('c', 1, 1, 120)], MERGE_PX);
check(stacked.length === 1, 'effectively co-located pins DO merge', `${stacked.length} group`);
check(stacked[0].members.length === 3, 'the merged group holds all three', `${stacked[0].members.length}`);

const fmt = (n) => `$${n}`;
const label = mergedLabel(stacked[0].members, fmt);
check(label === '$38 +1'.replace('+1', '+2'), 'merged label is CHEAPEST price + how many more', label);
check(!/–|—/.test(label), 'merged label is never a price RANGE (ranges are gone)', label);
check(/^\$\d/.test(label), 'merged label leads with a price, never a bare count', label);
check(!/\b\d+\s*(gyms?|pins?)\b/i.test(label), 'merged label is not a count of gyms');
check(
  mergedLabel(mergeCoLocated([mk('a', 0, 0, 38), mk('b', 2, 2, 55)], MERGE_PX)[0].members, fmt) === '$38 +1',
  'two stacked gyms read "$38 +1"',
);
check(
  mergedLabel([mk('a', 0, 0, 41)], fmt) === '$41',
  'a group of one is just its price, with no "+0"',
);

check(
  groupKey(stacked[0]) === 'a|b|c',
  'a merged group has a stable slug-keyed identity, so an expansion survives a re-render',
  groupKey(stacked[0]),
);
check(
  groupKey({ members: [mk('c', 0, 0, 1), mk('a', 0, 0, 2)] }) === groupKey({ members: [mk('a', 0, 0, 2), mk('c', 0, 0, 1)] }),
  'the key does not depend on member order',
);

console.log('\nNudging — readable without lying about location');
const overlapping = [
  { x: 100, y: 100, w: 60, h: 26 },
  { x: 110, y: 104, w: 60, h: 26 },
];
const shifts = nudgeApart(overlapping, { padding: 3, maxShift: 18 });
const sep = (a, b, sa, sb) => ({
  dx: Math.abs(b.x + sb.dx - (a.x + sa.dx)),
  dy: Math.abs(b.y + sb.dy - (a.y + sa.dy)),
});
const after = sep(overlapping[0], overlapping[1], shifts[0], shifts[1]);
check(
  after.dx >= (60 + 60) / 2 + 3 - 0.01 || after.dy >= 26 + 3 - 0.01,
  'two overlapping bubbles end up clear of each other',
  `dx=${after.dx.toFixed(1)} dy=${after.dy.toFixed(1)}`,
);
check(
  after.dy > Math.abs(overlapping[1].y - overlapping[0].y),
  'wide short bubbles separate VERTICALLY — the cheaper axis',
  `dy ${Math.abs(overlapping[1].y - overlapping[0].y)} -> ${after.dy.toFixed(1)}`,
);
check(
  shifts.every((s) => Math.hypot(s.dx, s.dy) <= 18 * Math.SQRT2 + 0.01),
  'no bubble is displaced past the cap — a pin that wanders is lying about location',
  shifts.map((s) => `${s.dx.toFixed(1)},${s.dy.toFixed(1)}`).join(' | '),
);
check(
  nudgeApart([{ x: 0, y: 0, w: 40, h: 26 }, { x: 400, y: 400, w: 40, h: 26 }], {})
    .every((s) => s.dx === 0 && s.dy === 0),
  'bubbles that do not overlap are not moved at all',
);
const coincident = nudgeApart([{ x: 5, y: 5, w: 40, h: 26 }, { x: 5, y: 5, w: 40, h: 26 }], {});
check(
  coincident[0].dy !== coincident[1].dy || coincident[0].dx !== coincident[1].dx,
  'exactly coincident boxes still get pushed apart deterministically',
  JSON.stringify(coincident),
);
check(
  JSON.stringify(nudgeApart(overlapping, { padding: 3, maxShift: 18 })) === JSON.stringify(shifts),
  'nudging is deterministic — same boxes in, same offsets out',
);

const fan = fanOffsets(3, 30);
check(fan.length === 3, 'a fan produces one offset per member');
check(
  fan.every((f) => Math.abs(Math.hypot(f.dx, f.dy) - 30) < 0.01),
  'every fanned member sits at the fan radius',
);
check(
  new Set(fan.map((f) => `${f.dx.toFixed(2)},${f.dy.toFixed(2)}`)).size === 3,
  'fanned members do not land on top of each other',
);
check(
  fanOffsets(1, 30)[0].dx === 0 && fanOffsets(1, 30)[0].dy === 0,
  'a single member is not fanned anywhere',
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
// Resolve var() against the :root block rather than grepping for the word
// "orange". `background: var(--orange)` contains "orange" whether or not the
// token exists, and an undefined custom property makes the whole declaration
// invalid at computed-value time — the pin would silently fall back to
// transparent, i.e. look exactly like the bug being guarded against.
const rootBlock = (css.match(/:root\{([^}]*)\}/) || [])[1] ?? '';
const tokens = Object.fromEntries(
  [...rootBlock.matchAll(/(--[a-z0-9-]+):\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]),
);
const resolve = (value) =>
  (value ?? '').replace(/var\((--[a-z0-9-]+)\)/g, (_, name) => tokens[name] ?? 'UNDEFINED');

check(
  Object.keys(tokens).length > 0,
  'design tokens are defined on :root, so pin colours can resolve',
  `${Object.keys(tokens).length} tokens`,
);
for (const decl of ['background', 'border-color']) {
  const raw = (activeRule.match(new RegExp(decl + ':([^;]+)')) || [])[1];
  check(
    Boolean(raw) && !/UNDEFINED/.test(resolve(raw)),
    `.pin.active ${decl} resolves to a real colour`,
    `${raw?.trim()} -> ${resolve(raw)}`,
  );
}
check(
  resolve(bg(activeRule)) === (tokens['--orange'] ?? 'MISSING'),
  'selected inverts to orange, which no tier uses as a fill',
  `${resolve(bg(activeRule))}`,
);
check(/scale/.test(activeRule), 'selected adds a scale bump so it reads in a dense cluster');

// Every pin state is a single-specificity class pair, so SOURCE ORDER decides
// the winner. .pin.active sitting before .pin.cluster meant a selected cluster
// kept the white cluster fill and showed only the ring.
const idxActive = css.indexOf('.pin.active{');
const idxMerged = css.indexOf('.pin.merged{');
const idxTier3 = css.indexOf('.pin.tier-3{');
const idxCall = css.indexOf('.pin.callfor{');
check(
  idxActive > idxMerged && idxActive > idxTier3 && idxActive > idxCall,
  '.pin.active is declared AFTER every other pin state, so selected always wins',
  `active=${idxActive} merged=${idxMerged} tier3=${idxTier3} callfor=${idxCall}`,
);
check(
  bg(cssRule('.pin.merged')) !== bg(activeRule),
  'a selected merged bubble does not keep the plain merged fill',
  `merged=${bg(cssRule('.pin.merged'))} active=${bg(activeRule)}`,
);

console.log('\nAt most one bubble is ever selected');
const groups2 = mergeCoLocated([mk('a', 0, 0, 15), mk('b', 3, 3, 259)], MERGE_PX);
const alone = [mk('c', 900, 900, 40)];
check(countActive(groups2, alone, 'b') === 1, 'a gym inside a merged bubble marks exactly one bubble');
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

const mapGroups = mergeCoLocated(mapOrder, MERGE_PX);
const lone = [];
const chosen = activeBubble(mapGroups, mapOrder, 'crunch-south-austin');
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
check(countActive(mapGroups, lone, 'crunch-south-austin') === 1, 'exactly one bubble is active');

// And when it IS clustered, the cluster holding it is the one that lights up.
const tight = mergeCoLocated([mk('a', 0, 0, 38), mk('crunch-south-austin', 3, 3, 23)], MERGE_PX);
const stackedSel = activeBubble(tight, [], 'crunch-south-austin');
check(stackedSel?.kind === 'merged', 'a stacked selection resolves to its merged bubble');
check(
  stackedSel.slugs.includes('crunch-south-austin'),
  'the merged bubble that lights up is the one containing the selected gym',
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
  'zoom changes only to split a merged bubble');

// ── Selection is one piece of state, rendered by both views ──────────────
console.log('\nPin <-> card selection sync');
const mapSrc = readFileSync(join('dist/_astro', mapChunk), 'utf8');
const mainSrc = readFileSync(join('dist', mainScript.replace(/^\//, '')), 'utf8');

check(!/activeSlug/.test(mapSrc), 'the map keeps no private copy of the selection');
check(
  /holdsSelection/.test(readFileSync('src/lib/map-island.js', 'utf8')),
  'a merged bubble containing the selected gym wears the active state',
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

// ── The selection lifecycle, executed ────────────────────────────────────
// This is the rule that actually broke. It used to live inline in the page's
// `toggle` handler where no test could reach it, so every map assertion stayed
// green while the map went white underneath an open card.
console.log('\nSelection lifecycle — one card open at a time');
const mainSrcForAccordion = readFileSync(join('dist', mainScript.replace(/^\//, '')), 'utf8');
const { nextSelection } = await import('../src/lib/selection.js');

check(
  nextSelection({ slug: 'crunch', open: true, current: null }) === 'crunch',
  'opening a card selects it',
);
check(
  nextSelection({ slug: 'crunch', open: false, current: 'crunch' }) === null,
  'closing the open card clears the selection',
);
check(
  nextSelection({ slug: 'crunch', open: false, current: null }) === null,
  'closing a card with nothing selected stays null',
);

// THE REGRESSION. Opening B while A is open makes the accordion close A, and
// A's close event still arrives. It must not wipe the selection B just took.
check(
  nextSelection({
    slug: 'crunch-south-austin',
    open: false,
    current: 'life-time-south',
  }) === 'life-time-south',
  'the accordion retiring the previous card does NOT wipe the new selection',
);

// The two toggle events fire in an order the spec does not pin down, so the
// rule has to converge either way. Both orders must land on the newly opened
// card, or the map goes white underneath an open card again.
const swapOpenFirst = ['open-b', 'close-a'].reduce(
  (sel, ev) =>
    ev === 'open-b'
      ? nextSelection({ slug: 'b', open: true, current: sel })
      : nextSelection({ slug: 'a', open: false, current: sel }),
  'a',
);
const swapCloseFirst = ['close-a', 'open-b'].reduce(
  (sel, ev) =>
    ev === 'open-b'
      ? nextSelection({ slug: 'b', open: true, current: sel })
      : nextSelection({ slug: 'a', open: false, current: sel }),
  'a',
);
check(swapOpenFirst === 'b', 'A->B converges when the open event lands first', swapOpenFirst);
check(swapCloseFirst === 'b', 'A->B converges when the close event lands first', swapCloseFirst);

// The no-JS half of the accordion. If the `name` attribute is ever dropped, the
// browser silently goes back to allowing several cards open at once and the
// invariant above quietly stops being true for anyone with JS off.
const detailsTags = [...html.matchAll(/<details[^>]*>/g)].map((m) => m[0]);
check(detailsTags.length > 0, 'cards render as <details>', `${detailsTags.length}`);
check(
  detailsTags.every((t) => /\sname="[^"]+"/.test(t)),
  'cards are a NAMED <details> group, so one-at-a-time holds with JS off',
  detailsTags.find((t) => !/\sname="/.test(t)) ?? 'all named',
);
check(
  new Set(detailsTags.map((t) => (t.match(/\sname="([^"]+)"/) || [])[1])).size === 1,
  'every card shares one accordion group name',
);
check(
  /details\[open\]/.test(mainSrcForAccordion),
  'the page also enforces one-at-a-time for browsers that predate <details name>',
);

// The invariant itself, stated: a non-null selection always names an open card.
check(
  nextSelection({ slug: 'a', open: true, current: null }) === 'a' &&
    nextSelection({ slug: 'a', open: false, current: 'a' }) === null,
  'selection is non-null exactly when a card is open',
);

// ── The real render(), actually run ──────────────────────────────────────
// Leaflet needs a laid-out container, so give jsdom one. This runs the SAME
// initMap the browser runs, over the SAME pin payload the page ships, and
// inspects the classes it really puts in the DOM — rather than the pure
// helpers, which render() does not call.
console.log('\nreal render() — pin classes as actually emitted');
const { JSDOM } = await import('jsdom');

function bootMap(payload) {
  const dom = new JSDOM('<!doctype html><html><body><div id="map"></div></body></html>', {
    pretendToBeVisual: true,
    url: 'https://austingymprices.pages.dev/',
  });
  const { window: w } = dom;
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get: () => 800, configurable: true });
  Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get: () => 700, configurable: true });
  w.HTMLElement.prototype.getBoundingClientRect = () => ({
    x: 0, y: 0, width: 800, height: 700, top: 0, left: 0, right: 800, bottom: 700, toJSON() {},
  });
  // Report reduced motion. jsdom cannot run a Leaflet fly-through, so an
  // animated camera move would be asserted mid-flight; the island honours this
  // preference for real users too, which is why it is worth stubbing rather
  // than working around.
  w.matchMedia = (q) => ({
    matches: /prefers-reduced-motion/.test(q),
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
  for (const k of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'SVGElement',
    'CustomEvent', 'Event', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'DOMParser', 'location', 'navigator']) {
    Object.defineProperty(globalThis, k, { value: w[k], writable: true, configurable: true });
  }
  Object.defineProperty(globalThis, 'window', { value: w, writable: true, configurable: true });
  return { window: w, payload };
}

const { window: win } = bootMap(pins);
const { initMap } = await import('../src/lib/map-island.js');
const mapState = {
  visible: new Set(pins.map((p) => p.slug)),
  mode: 'membership',
  selected: null,
  region: 'all',
};
const regionBounds = JSON.parse(readFileSync('data/regions.json', 'utf8')).map((r) => ({
  id: r.id,
  ...r.search,
}));
const api = initMap(win.document.getElementById('map'), pins, () => mapState, regionBounds);

// Pins live in the marker pane. The LEGEND deliberately reuses the real pin
// classes for its swatches so a key entry can never drift from the thing it
// describes — which means a bare `span.pin` query would count the key as pins.
const PIN_SEL = '.leaflet-marker-pane span.pin';
const bubbles = () =>
  [...win.document.querySelectorAll(PIN_SEL)].map((el) => ({
    label: el.textContent || el.getAttribute('aria-label') || '',
    cls: el.className,
    active: el.classList.contains('active'),
    merged: el.classList.contains('merged'),
    dot: el.classList.contains('dot'),
  }));

check(bubbles().length > 0, 'render() emits pins', `${bubbles().length} bubbles`);
check(
  win.document.querySelectorAll('.map-legend .pin').length > 0 &&
    ![...win.document.querySelectorAll(PIN_SEL)].some((el) => el.closest('.map-legend')),
  'legend swatches reuse pin classes but are NOT counted as pins',
);
check(bubbles().every((b) => !b.active), 'nothing is active when nothing is selected');
check(api.getDisplay() === 'prices', 'prices is the DEFAULT display mode', api.getDisplay());

// THE POINT OF THE REDESIGN: Austin is not NYC, and the price on the pin is the
// reason the map exists. The RULE is that the great majority of pins show their
// own price — §9 fixes it at 80%. This used to assert that NOTHING merged at the
// default zoom, which was a fact about a 34-pin dataset at zoom 12; it went red
// the moment the default frame widened to stop cutting off south-west Austin,
// for a change that made the map strictly better. Assert the invariant.
{
  const drawn = bubbles();
  const merged = drawn.filter((b) => b.merged);
  const share = drawn.length === 0 ? 1 : (drawn.length - merged.length) / drawn.length;
  check(
    share >= 0.8,
    'at the DEFAULT frame, the great majority of pins show their own price',
    `${merged.length} merged of ${drawn.length} drawn (${Math.round(share * 100)}%)`,
  );
}
// Zooming OUT can legitimately merge a genuinely co-located pair — Austin
// Bouldering Project and Lift ATX are 4.4px apart at zoom 11. Asserting "never
// merges" pinned a property of the dataset on the day it was written; the rule
// is that merging stays MINIMAL and, when it happens, is labelled correctly.
for (const z of [11, 12, 14, 16]) {
  api.map.setZoom(z);
  api.render();
  const drawn = bubbles();
  const merged = drawn.filter((b) => b.merged);
  // "Minimal" is a PROPORTION, not a count. Capping it at one merge was itself a
  // fact about the day it was written: at 25 priced pins two co-located pairs
  // (Lift ATX with Austin Bouldering Project, Kawi with EAAC) are still minimal,
  // and hard-coding 1 would fail every time the city gets denser. The rule is
  // that the great majority of pins show their own price.
  const unmergedShare = drawn.length === 0 ? 1 : (drawn.length - merged.length) / drawn.length;
  check(
    unmergedShare >= 0.8,
    `merging stays minimal at zoom ${z} — this is not NYC`,
    `${merged.length} merged of ${drawn.length} drawn (${Math.round(unmergedShare * 100)}% show their own price)`,
  );
  check(
    merged.every((b) => /^\$[\d.]+ \+\d+$/.test(b.label)),
    `any merged bubble at zoom ${z} reads "cheapest +N"`,
    merged.map((b) => b.label).join(', ') || 'none merged',
  );
}
api.map.setZoom(12);
api.render();
// The rule is that PRICE RANGES are gone (§9): "$15–259" told you nothing you
// came for and read like one gym's pricing. A merged "$38 +1" is not a range —
// it is the specified label, cheapest price plus how many more are underneath.
// Asserting "plain price only" outlawed the very format the spec requires two
// paragraphs earlier, and passed only while nothing happened to merge.
check(
  bubbles()
    .filter((b) => b.label !== 'Call')
    .every((b) => /^\$[\d.]+$/.test(b.label) || /^\$[\d.]+ \+\d+$/.test(b.label)),
  'every priced bubble is a plain price or a "cheapest +N" — never a range',
  bubbles().find(
    (b) => b.label !== 'Call' && !/^\$[\d.]+$/.test(b.label) && !/^\$[\d.]+ \+\d+$/.test(b.label),
  )?.label ?? 'all conform',
);
check(
  !bubbles().some((b) => /[–-]\s*\$?\d/.test(b.label.replace(/^\$[\d.]+/, ''))),
  'and no bubble label contains a range separator',
);

// Selecting from the list.
// The camera half of the viewport-stability class (see check-tabs.mjs). §9 lets
// a selection PAN to bring an off-frame pin into view, and lets a merged stack
// zoom in to split itself. Neither licenses throwing away a zoom level the
// reader chose. A pin already comfortably in frame must move the camera not at
// all — otherwise every click quietly undoes the user's own navigation.
const inFrame = pins.find((p) => p.allIn !== null && api.map.getBounds().pad(-0.3).contains([p.lat, p.lng]));
if (inFrame) {
  const z0 = api.map.getZoom();
  const c0 = api.map.getCenter();
  mapState.selected = inFrame.slug;
  win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
  check(api.map.getZoom() === z0, 'selecting a pin already in frame does not change zoom', `${z0} -> ${api.map.getZoom()}`);
  check(
    Math.abs(api.map.getCenter().lat - c0.lat) < 1e-6 && Math.abs(api.map.getCenter().lng - c0.lng) < 1e-6,
    'and does not move the camera at all',
  );
  mapState.selected = null;
  win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
}

const target = pins.find((p) => p.allIn !== null);
mapState.selected = target.slug;
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
check(
  bubbles().filter((b) => b.active).length === 1,
  'selecting from the list marks exactly one bubble active',
  `${bubbles().filter((b) => b.active).length}`,
);
check(
  bubbles().find((b) => b.active)?.label === `$${target.allIn}`,
  'the active bubble is the SELECTED gym',
  bubbles().find((b) => b.active)?.label,
);

// The accordion regression, end to end through the real render.
mapState.selected = nextSelection({
  slug: 'some-other-gym',
  open: false,
  current: target.slug,
});
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
check(
  bubbles().filter((b) => b.active).length === 1,
  'the accordion retiring a card does NOT blank the map (the reported repro)',
);

// ── Interaction model: the map frames, the list filters ──────────────────
// Dimming is gone. A price bubble at 18% opacity still looks like a price
// bubble, still invites a tap, and then swallows it — an affordance lie, and
// the only thing on this map that could look interactive and not be.
console.log('\nInteraction model — draw or do not draw');

const pinEls = () => [...win.document.querySelectorAll(PIN_SEL)];
check(
  !/\.pin\.dim|\.pin\.nopass/.test(css),
  'no .dim or .nopass rule survives in the stylesheet',
);
check(
  !/'dim'|'nopass'|`dim`|`nopass`/.test(readFileSync('src/lib/map-island.js', 'utf8')),
  'and the island never applies those classes',
);
check(
  pinEls().every((el) => !el.classList.contains('dim') && !el.classList.contains('nopass')),
  'no rendered pin carries a dimmed class',
);
// A pin the CSS makes inert is the exact failure being removed. The stylesheet
// may only disable pointer events on something that is not a pin.
const pinRules = css.split('}').filter((b) => /\.pin[.{ ]/.test(b));
check(
  !pinRules.some((b) => /pointer-events:\s*none/.test(b)),
  'no pin rule disables pointer events',
  pinRules.find((b) => /pointer-events:\s*none/.test(b)) ?? 'none',
);

// Region is a CAMERA. Changing it must move the viewport and leave the pin
// set alone; changing an attribute filter must do the opposite.
mapState.selected = null;
// A region chip is a CAMERA, so it changes the zoom — and zoom changes how many
// bubbles a fixed set of gyms collapses into. Counting DOM elements across a
// camera move therefore measures merging, not filtering. Pin the zoom on both
// sides so the count answers the question actually being asked: does choosing a
// region remove any gym from the map? (It must not.)
const atFixedZoom = () => {
  api.map.setZoom(12);
  api.render();
  return pinEls().length;
};

mapState.region = 'all';
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
const pinsAll = atFixedZoom();
const centreAll = api.map.getCenter();

mapState.region = 'the-domain';
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
const movedTo = api.map.getCenter();
check(
  atFixedZoom() === pinsAll,
  'a region chip does NOT change how many pins are drawn',
  `${pinsAll} -> ${atFixedZoom()}`,
);
check(
  Math.abs(movedTo.lat - centreAll.lat) > 0.005 || Math.abs(movedTo.lng - centreAll.lng) > 0.005,
  'but it DOES move the camera',
  `${centreAll.lat.toFixed(4)},${centreAll.lng.toFixed(4)} -> ${movedTo.lat.toFixed(4)},${movedTo.lng.toFixed(4)}`,
);

mapState.region = 'all';
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
// Asserted against the DEFAULT CENTRE itself, not against whatever the camera
// happened to be showing when the baseline was captured — earlier tests pan the
// map on selection, so that baseline was not necessarily the default frame at
// all. §9's rule is that "All of Austin" returns to the default central frame;
// this now checks that claim rather than a coincidence.
check(
  Math.abs(api.map.getCenter().lat - 30.2711) < 0.01 &&
    Math.abs(api.map.getCenter().lng - -97.7437) < 0.01,
  '"All of Austin" returns to the default central frame, never a fitBounds over outliers',
);

// An attribute filter is expressed by the visible SET, and must change the
// number of pins drawn.
const half = new Set([...mapState.visible].slice(0, Math.max(1, Math.floor(pinsAll / 2))));
const fullSet = mapState.visible;
mapState.visible = half;
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
check(
  pinEls().length < pinsAll,
  'an attribute filter DOES change how many pins are drawn',
  `${pinsAll} -> ${pinEls().length}`,
);
check(
  pinEls().every((el) => Number(win.getComputedStyle(el).opacity || 1) >= 0.9),
  'every drawn pin is fully opaque — nothing is half-present',
);
mapState.visible = fullSet;
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
// Measured at the same fixed zoom as the baseline, so this compares gyms drawn
// rather than bubbles merged.
check(
  atFixedZoom() === pinsAll,
  'and clearing it brings them back',
  `${pinsAll} -> ${atFixedZoom()}`,
);

// ── Mobile ───────────────────────────────────────────────────────────────
// The map lives behind a toggle on a phone; without it the map is unreachable
// there, which is indistinguishable from not having one.
console.log('\nMobile map toggle');
const indexHtml = readFileSync('dist/index.html', 'utf8');
check(/id="map-toggle"/.test(indexHtml), 'the toggle is server-rendered, not JS-injected');
check(
  /aria-expanded="false"/.test(indexHtml.match(/<button[^>]*id="map-toggle"[^>]*>/)?.[0] ?? ''),
  'and reports its expanded state',
);
const toggleRule = css.split('}').find((b) => b.includes('.map-toggle') && /position:fixed/.test(b));
check(Boolean(toggleRule), 'the toggle is fixed-position', toggleRule ? 'yes' : 'missing');
check(
  /left:50%/.test(toggleRule ?? '') && /translate/.test(toggleRule ?? ''),
  'and centred horizontally',
);
// A phone-width media query must REVEAL it — it is display:none on desktop.
// The minifier rewrites `max-width: 920px` as `width<=920px`, so match the
// shipped form rather than the authored one — an assertion against source that
// never ships is an assertion that cannot fail.
const flat = css.replace(/\s/g, '');
const mobileReveal = flat
  .split('@media')
  .find(
    (b) =>
      /(max-width:920px|width<=920px)/.test(b) &&
      /\.map-toggle[^{]*\{[^}]*display:block/.test(b),
  );
check(Boolean(mobileReveal), 'a phone-width media query reveals it (<=920px)');
check(
  /env\(safe-area-inset-bottom/.test(toggleRule ?? ''),
  'it clears the home indicator and browser chrome, which overlay the bottom band',
);

// ── Merged bubbles, through the real render ──────────────────────────────
// Nothing in the live data is co-located, so this uses a payload that is: two
// gyms at effectively the same address, which is the only case that may merge.
console.log('\nMerged bubbles — co-located gyms only');
const coLocated = [
  { slug: 'plaza-a', name: 'Plaza A', lat: 30.2711, lng: -97.7437, allIn: 38, dayPass: 10, tier: 1 },
  { slug: 'plaza-b', name: 'Plaza B', lat: 30.27111, lng: -97.74371, allIn: 55, dayPass: 12, tier: 2 },
  { slug: 'far-away', name: 'Far Away', lat: 30.35, lng: -97.80, allIn: 120, dayPass: null, tier: 3 },
];
const { window: win2 } = bootMap(coLocated);
const state2 = { visible: new Set(coLocated.map((p) => p.slug)), mode: 'membership', selected: null };
const api2 = initMap(win2.document.getElementById('map'), coLocated, () => state2);
const bub2 = () =>
  [...win2.document.querySelectorAll(PIN_SEL)].map((el) => ({
    label: el.textContent || el.getAttribute('aria-label') || '',
    cls: el.className,
    active: el.classList.contains('active'),
    merged: el.classList.contains('merged'),
    fanned: el.classList.contains('fanned'),
    el,
  }));

const mergedBubble = bub2().find((b) => b.merged);
check(Boolean(mergedBubble), 'two co-located gyms merge into one bubble', mergedBubble?.label);
check(mergedBubble?.label === '$38 +1', 'the merged bubble reads cheapest + count', mergedBubble?.label);
check(bub2().length === 2, 'the far-away gym is untouched', `${bub2().length} bubbles`);

// A merged bubble holding the selection goes orange, and stays merged.
state2.selected = 'plaza-b';
win2.document.dispatchEvent(new win2.CustomEvent('filters:changed', { detail: {} }));
const afterSel = bub2().find((b) => b.merged);
check(
  afterSel?.active === true,
  'a merged bubble CONTAINING the selection wears .active',
  afterSel?.cls,
);
check(
  bub2().filter((b) => b.active).length === 1,
  'still exactly one active bubble',
);

// Clicking expands it into its members.
state2.selected = null;
api2.map.setZoom(12);
api2.render();
bub2().find((b) => b.merged).el.parentElement.click();
const fanned = bub2();
check(
  fanned.filter((b) => b.fanned).length === 2,
  'clicking a merged bubble fans it open into its members',
  fanned.map((b) => b.label).join(', '),
);
check(
  fanned.some((b) => b.label === '$38') && fanned.some((b) => b.label === '$55'),
  'each fanned member shows its own price',
  fanned.map((b) => b.label).join(', '),
);
check(!fanned.some((b) => b.merged), 'the merged bubble is gone while expanded');

// Clicking a fanned member selects it and KEEPS the fan open — you are
// comparing two gyms at one address, and collapsing mid-comparison is hostile.
state2.selected = 'plaza-b';
win2.document.dispatchEvent(new win2.CustomEvent('filters:changed', { detail: {} }));
check(
  bub2().filter((b) => b.fanned).length === 2,
  'selecting a fanned member keeps the fan open',
);
check(
  bub2().filter((b) => b.active).length === 1 &&
    bub2().find((b) => b.active)?.label === '$55',
  'the selected fanned member is the one that goes orange',
  bub2().find((b) => b.active)?.label,
);

// Clicking the map background puts it away — otherwise the only exit is
// zooming until the group splits, which nobody would think to try.
api2.map.fire('click');
check(
  bub2().some((b) => b.merged) && !bub2().some((b) => b.fanned),
  'clicking the map background collapses the fan',
  bub2().map((b) => b.label).join(', '),
);
state2.selected = null;
win2.document.dispatchEvent(new win2.CustomEvent('filters:changed', { detail: {} }));

// ── Display modes ────────────────────────────────────────────────────────
console.log('\nMap display modes');
// The interaction-model section above deliberately cleared the selection.
mapState.selected = target.slug;
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
// Baseline the grouping in PRICES mode first, so the dots comparison below is
// against what this dataset actually does rather than against a constant.
const pricesMergedCount = bubbles().filter((b) => b.merged).length;
api.setDisplay('dots');
const dots = bubbles();
check(dots.every((b) => b.dot), 'dots mode puts every pin in dot form', `${dots.length} pins`);
check(
  dots.every((b) => !win.document.querySelector('span.pin')?.textContent || b.label !== ''),
  'a dot still carries its price as an accessible name',
);
check(
  [...win.document.querySelectorAll('span.pin')].every((el) => el.textContent === ''),
  'dots mode shows NO numbers on the map',
);
check(
  dots.filter((b) => b.active).length === 1 && dots.find((b) => b.active)?.dot === true,
  'selection survives the display switch and is still the one active pin',
);
// Dots mode changes what a bubble PRINTS, never which bubbles exist. So the
// invariant is not "nothing merges" — that was a fact about a sparser dataset,
// and it went red the moment the default frame widened. The rule is that the
// two display modes merge IDENTICALLY: if switching to dots changed the
// grouping, the toggle would be moving pins around rather than relabelling them.
check(
  dots.filter((b) => b.merged).length === pricesMergedCount,
  'dots mode merges exactly as prices mode does — the toggle relabels, it never regroups',
  `dots ${dots.filter((b) => b.merged).length} vs prices ${pricesMergedCount}`,
);
api2.setDisplay('dots');
const mergedDot = [...win2.document.querySelectorAll(PIN_SEL)].find((el) =>
  el.classList.contains('merged'),
);
check(
  Boolean(mergedDot) && mergedDot.classList.contains('dot'),
  'a co-located pair still merges in dots mode, as a merged dot',
  mergedDot?.className,
);
check(
  mergedDot?.getAttribute('aria-label') === '$38 +1',
  'the merged dot keeps "cheapest + count" as its accessible name',
  mergedDot?.getAttribute('aria-label'),
);
api2.setDisplay('prices');
api.setDisplay('prices');
check(
  [...win.document.querySelectorAll('span.pin')].some((el) => /^\$/.test(el.textContent)),
  'switching back restores the prices',
);
check(api.getDisplay() === 'prices', 'display mode round-trips');

const control = win.document.querySelector('.map-display');
check(Boolean(control), 'the display control is rendered on the map');
check(
  [...(control?.querySelectorAll('button') ?? [])].length === 2,
  'the control offers exactly two modes',
);
check(
  [...(control?.querySelectorAll('button') ?? [])].every((b) => b.hasAttribute('aria-pressed')),
  'each mode button reports its pressed state',
);
check(/map-display/.test(css), 'the display control is styled');
check(/\.pin\.dot/.test(css), 'dot styling is present');

console.log(
  failures.length === 0 ? '\nOK — map build is sound.' : `\n${failures.length} check(s) FAILED.`,
);
process.exit(failures.length === 0 ? 0 : 1);
