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
const cssFile = readdirSync('dist/_astro').find((f) => f.endsWith('.css'));
const css = readFileSync(join('dist/_astro', cssFile), 'utf8');

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

// The bundle is an ES module and uses Vite's preload helper, which references
// import.meta — a syntax error in eval'd non-module code. Rewrite it to an
// equivalent object literal. This does not touch any logic under test.
const evalSafe = scriptCode.replace(
  /import\.meta/g,
  "({url:'file:///bundle.js',resolve:undefined})",
);

// Stub IntersectionObserver so the lazy map loader never fires: these tests
// cover the list and tabs, and Leaflet needs real layout that jsdom lacks.
// The map has its own build assertions in check-map.mjs.
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

console.log(
  failures.length === 0
    ? '\nOK — tab-aware rendering behaves.'
    : `\n${failures.length} check(s) FAILED.`,
);
process.exit(failures.length === 0 ? 0 : 1);
