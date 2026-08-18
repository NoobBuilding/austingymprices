/**
 * DOM regression tests for tab-aware card content.
 *
 * These execute the REAL bundled client script against the REAL built HTML in
 * jsdom, because two production bugs in a row came from client behaviour that
 * static inspection of the markup could not catch:
 *
 *   1. Astro inlined the script and the CSP refused it.
 *   2. element.hidden = true had no visual effect on the commitment badges,
 *      because the author rule .tag { display: inline-block } silently beats
 *      the UA stylesheet's [hidden] { display: none }.
 *
 * The second is why these assert BOTH that `hidden` is set AND that the CSS
 * makes `hidden` authoritative. Setting the property is not the same as the
 * element being invisible.
 *
 * Crucially the day-pass assertions run again after a FILTER change, which
 * re-renders the list — not only after the tab-switch event.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const html = readFileSync('dist/index.html', 'utf8');

// The built stylesheet must make `hidden` win over any author display rule.
const css = readdirSync('dist/_astro')
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join('dist/_astro', f), 'utf8'))
  .join('\n');

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

console.log('check-tabs: executing the real bundle against the real build\n');

console.log('CSS makes [hidden] authoritative');
check(
  /\[hidden\]\{display:none!important\}/.test(css),
  '[hidden] { display: none !important } present in the built CSS',
);

// Boot the page with the bundled script executed.
const scriptSrc = (html.match(/<script[^>]*\ssrc="([^"]+)"/) || [])[1];
const scriptCode = readFileSync(join('dist', scriptSrc.replace(/^\//, '')), 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;

// The bundle is an ES module: it statically imports Vite's preload helper and
// references import.meta, neither of which is legal in eval'd non-module code.
// Rewrite both into local stubs. The map is never loaded in these tests
// (IntersectionObserver is stubbed below), so the preload helper is never
// actually invoked — only its binding needs to exist. No logic under test is
// touched.
const evalSafe = scriptCode
  .replace(
    /import\s*\{([^}]*)\}\s*from\s*"[^"]*";?/,
    (_m, bindings) => {
      const names = bindings
        .split(',')
        .map((b) => b.split(/\s+as\s+/).pop().trim())
        .filter(Boolean);
      // __vite__mapDeps is already defined in the chunk; only the imported
      // binding needs a stand-in.
      return `const ${names.map((n) => `${n} = (fn) => fn()`).join(', ')};`;
    },
  )
  .replace(/import\.meta/g, "({url:'file:///bundle.js',resolve:undefined})");

// Stub IntersectionObserver so the lazy map loader never fires: these tests
// cover the list and tabs, and Leaflet needs real layout that jsdom lacks.
// The map has its own build assertions in check-map.mjs.
// jsdom implements no layout, so scrollIntoView throws. Stub it: the tests
// care that selection state is correct, not that a scroll happened.
window.Element.prototype.scrollIntoView = function scrollIntoView() {};

window.IntersectionObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

window.eval(evalSafe);

const $ = (sel) => Array.from(window.document.querySelectorAll(sel));
const visible = (sel) => $(sel).filter((el) => !el.hidden);

console.log('\nInitial render (Memberships tab)');
check(
  window.document.documentElement.dataset.filtersReady === 'true',
  'filter script initialised',
);
check(visible('.membership-only').length > 0, 'membership badges visible on Memberships tab',
  `${visible('.membership-only').length} visible`);
check(visible('.detail-daypass').length === 0, 'no day-pass bodies visible');
check(visible('.price-daypass').length === 0, 'no day-pass prices visible');

const clickTab = (mode) => {
  const tab = $('.tab').find((t) => t.dataset.mode === mode);
  tab.dispatchEvent(new window.Event('click', { bubbles: true }));
};

console.log('\nAfter switching to Day passes');
clickTab('daypass');
check(
  visible('.membership-only').length === 0,
  'ZERO membership badges visible on the Day passes tab',
  `${visible('.membership-only').length} still visible`,
);
check(visible('.detail-membership').length === 0, 'no membership receipts visible');
check(visible('.price-membership').length === 0, 'no membership prices visible');
check(visible('.detail-daypass').length > 0, 'day-pass bodies are visible');

console.log('\nAfter a FILTER change while on Day passes (the re-render path)');
const search = window.document.getElementById('q');
search.value = 'gym';
search.dispatchEvent(new window.Event('input', { bubbles: true }));
check(
  visible('.membership-only').length === 0,
  'ZERO membership badges after a search re-render',
  `${visible('.membership-only').length} visible`,
);

const chip = $('#regions .chip').find((c) => c.dataset.region === 'hyde-park');
chip.dispatchEvent(new window.Event('click', { bubbles: true }));
check(
  visible('.membership-only').length === 0,
  'ZERO membership badges after a region re-render',
  `${visible('.membership-only').length} visible`,
);

const tierBtn = $('.tier').find((b) => b.dataset.tier === '2');
tierBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
check(
  visible('.membership-only').length === 0,
  'ZERO membership badges after a tier re-render',
  `${visible('.membership-only').length} visible`,
);

console.log('\nDay passes tab only lists gyms with a published day pass');
window.document
  .getElementById('clear-filters')
  .dispatchEvent(new window.Event('click', { bubbles: true }));
const shownCards = $('.card').filter((c) => !c.hidden);
check(
  shownCards.every((c) => c.dataset.daypass !== ''),
  'every visible card has a day-pass price',
  `${shownCards.length} cards shown`,
);

console.log('\nSwitching back to Memberships restores membership chrome');
clickTab('membership');
check(visible('.membership-only').length > 0, 'membership badges visible again',
  `${visible('.membership-only').length} visible`);
check(visible('.detail-daypass').length === 0, 'day-pass bodies hidden again');

console.log('\nClear filters resets the list');
search.value = 'zzzzqqqq';
search.dispatchEvent(new window.Event('input', { bubbles: true }));
const emptyEl = window.document.getElementById('empty');
check(!emptyEl.hidden, 'empty state shows when nothing matches');
window.document
  .getElementById('clear-filters')
  .dispatchEvent(new window.Event('click', { bubbles: true }));
check(emptyEl.hidden, 'empty state clears after Clear filters');
check($('.card').filter((c) => !c.hidden).length === $('.card').length,
  'all cards visible again after Clear filters');

// ── Selection: one state, both directions ────────────────────────────────
console.log('\nSelection sync (card -> pin direction, the one that was dead)');
let lastDetail = null;
window.document.addEventListener('filters:changed', (e) => {
  lastDetail = e.detail;
});

const target = $('.card').find((c) => c.dataset.slug === 'crunch-south-austin');
const details = target.querySelector('details');
details.open = true;
details.dispatchEvent(new window.Event('toggle', { bubbles: false }));

check(target.classList.contains('hl'), 'opening a card marks it selected in the list');
check(
  lastDetail?.selected === 'crunch-south-austin',
  'opening a card publishes the selection the map renders from',
  String(lastDetail?.selected),
);

details.open = false;
details.dispatchEvent(new window.Event('toggle', { bubbles: false }));
check(!target.classList.contains('hl'), 'closing a card clears the selection');
check(lastDetail?.selected === null, 'the cleared selection is published too');

// Pin -> card direction, driven by the same event the map dispatches.
window.document.dispatchEvent(
  new window.CustomEvent('gym:select', { detail: { slug: 'big-tex-gym' } }),
);
const bigTex = $('.card').find((c) => c.dataset.slug === 'big-tex-gym');
check(bigTex.classList.contains('hl'), 'a pin selection highlights the card');
check(bigTex.querySelector('details').open, 'a pin selection opens the card');
check(
  lastDetail?.selected === 'big-tex-gym',
  'both directions end in the same published state',
);

// A filter re-render must not silently drop the selection.
const q2 = window.document.getElementById('q');
q2.value = 'big';
q2.dispatchEvent(new window.Event('input', { bubbles: true }));
check(
  bigTex.classList.contains('hl'),
  'selection survives a filter re-render',
);

console.log(
  failures.length === 0
    ? '\nOK — tab-aware rendering behaves.'
    : `\n${failures.length} check(s) FAILED.`,
);
process.exit(failures.length === 0 ? 0 : 1);
