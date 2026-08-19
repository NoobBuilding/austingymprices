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
const dom = new JSDOM('<!doctype html><html><body><div id="map"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'https://austingymprices.pages.dev/',
});
const { window: win } = dom;
Object.defineProperty(win.HTMLElement.prototype, 'clientWidth', { get: () => 800, configurable: true });
Object.defineProperty(win.HTMLElement.prototype, 'clientHeight', { get: () => 700, configurable: true });
win.HTMLElement.prototype.getBoundingClientRect = () => ({
  x: 0, y: 0, width: 800, height: 700, top: 0, left: 0, right: 800, bottom: 700, toJSON() {},
});
for (const k of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'SVGElement',
  'CustomEvent', 'Event', 'requestAnimationFrame', 'cancelAnimationFrame',
  'getComputedStyle', 'DOMParser', 'location', 'navigator']) {
  Object.defineProperty(globalThis, k, { value: win[k], writable: true, configurable: true });
}
Object.defineProperty(globalThis, 'window', { value: win, writable: true, configurable: true });

const { initMap } = await import('../src/lib/map-island.js');
const mapState = { visible: new Set(pins.map((p) => p.slug)), mode: 'membership', selected: null };
const api = initMap(win.document.getElementById('map'), pins, () => mapState);

const bubbles = () =>
  [...win.document.querySelectorAll('span.pin')].map((el) => ({
    label: el.textContent || el.getAttribute('aria-label') || '',
    cls: el.className,
    active: el.classList.contains('active'),
    cluster: el.classList.contains('cluster'),
    dot: el.classList.contains('dot'),
  }));

check(bubbles().length > 0, 'render() emits pins', `${bubbles().length} bubbles`);
check(bubbles().every((b) => !b.active), 'nothing is active when nothing is selected');
check(api.getDisplay() === 'prices', 'prices is the DEFAULT display mode', api.getDisplay());

// Pick a gym that genuinely shares a cluster at the default zoom, from the real
// data — no fixture. This is the pair behind the report ($23 Crunch merged with
// $259 Life Time South).
const realCluster = bubbles().find((b) => b.cluster && b.label.includes('–'));
check(Boolean(realCluster), 'the real payload produces a cluster at the default zoom', realCluster?.label);
const clusterLow = Number((realCluster?.label.match(/\$(\d+)/) || [])[1]);
const inCluster = pins.find((p) => p.allIn === clusterLow);
check(Boolean(inCluster), 'a real gym sits inside that cluster', inCluster?.slug);

// Selecting from the list: render() runs, then revealSelection zooms to break
// the cluster open, exactly as it does in the browser.
mapState.selected = inCluster.slug;
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
const afterSelect = bubbles();
check(
  afterSelect.filter((b) => b.active).length === 1,
  'selecting from the list marks exactly one bubble active',
  `${afterSelect.filter((b) => b.active).length}`,
);
check(
  afterSelect.find((b) => b.active)?.label === `$${inCluster.allIn}`,
  'the active bubble is the SELECTED gym',
  afterSelect.find((b) => b.active)?.label,
);
check(api.map.getZoom() > 12, 'a clustered selection zooms just enough to resolve it', `zoom ${api.map.getZoom()}`);

// Now zoom back out so the selection is inside a cluster again. This is the
// state in the report: cluster drawn, selection held inside it.
api.map.setZoom(12);
api.render();
const held = bubbles().find((b) => b.cluster && b.label.includes('–') && b.label.startsWith(`$${inCluster.allIn}`));
check(Boolean(held), 'zooming back out re-merges the selected gym into a cluster', held?.label);
check(
  held?.active === true,
  'a cluster HOLDING the selection wears .active (the reported bug)',
  held?.cls,
);
check(
  bubbles().filter((b) => b.active).length === 1,
  'still exactly one active bubble once merged',
);

// The lifecycle regression, end to end through the real render: the selection
// must survive a different card being closed.
mapState.selected = nextSelection({
  slug: 'some-other-gym',
  open: false,
  current: inCluster.slug,
});
win.document.dispatchEvent(new win.CustomEvent('filters:changed', { detail: {} }));
check(
  bubbles().filter((b) => b.active).length === 1,
  'the accordion retiring a card does NOT blank the map (the reported repro)',
);

// ── Display modes ────────────────────────────────────────────────────────
console.log('\nMap display modes');
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
check(
  dots.some((b) => b.cluster),
  'clusters still exist in dots mode',
);
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
