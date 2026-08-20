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
import { bootBundle } from './lib/boot-bundle.mjs';

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

// Boot the page with the bundled script executed. The inlining harness is
// shared with check-compare.mjs so both assert against the code that ships.
const { window } = bootBundle('dist/index.html');

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
// Not "every card": the TAB itself partitions the list now, and Clear filters
// clears filters — it does not merge a studio's per-class economics into the
// Memberships tab. Every card belonging to the current tab comes back.
const activeMode = $('.tab').find((t) => t.classList.contains('active'))?.dataset.mode;
const belongsHere = (c) =>
  activeMode === 'daypass' ||
  (activeMode === 'classes' ? c.dataset.access === 'classes' : c.dataset.access === 'facility');
check(
  $('.card').filter((c) => !c.hidden).length === $('.card').filter(belongsHere).length,
  'every card for this tab is visible again after Clear filters',
  `${$('.card').filter((c) => !c.hidden).length} of ${$('.card').filter(belongsHere).length}`,
);

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
// ── Classes & studios tab ────────────────────────────────────────────────
// A studio and a facility gym are not comparable per month. The third tab
// exists so each is judged in the unit it is actually sold in.
console.log('\nClasses & studios tab');
// Earlier sections leave filters applied; a narrowed list would make the
// model assertions below pass or fail for the wrong reason.
window.document
  .getElementById('clear-filters')
  ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const tabs = $('.tab');
const tabCards = () => $('.card').filter((c) => !c.hidden);
const models = () => [...new Set(tabCards().map((c) => c.dataset.access))];

// The RULE, not the day's tab count: Memberships, Classes and Day passes are
// unconditional; Recovery renders if and only if the category has reached its
// threshold. An earlier version asserted `tabs.length === 3`, which was a fact
// about the week it was written — it would have gone red on the day the sixth
// recovery listing landed, for a change that is entirely correct.
const RECOVERY_TAB_MIN = 6;
const modes = tabs.map((t) => t.dataset.mode);
const recoveryCards = $('.card').filter((c) => c.dataset.category === 'recovery');
check(
  ['membership', 'classes', 'daypass'].every((m) => modes.includes(m)),
  'the three unconditional tabs are present',
  modes.join(', '),
);
check(
  modes.includes('recovery') === recoveryCards.length >= RECOVERY_TAB_MIN,
  `the Recovery tab renders iff there are >= ${RECOVERY_TAB_MIN} recovery listings`,
  `${recoveryCards.length} listed, tab ${modes.includes('recovery') ? 'present' : 'absent'}`,
);
clickTab('membership');
check(
  models().length === 1 && models()[0] === 'facility',
  'the Memberships tab shows ONLY facility gyms',
  models().join(', '),
);
// Recovery is facility-model, so nothing about access_model keeps it off this
// tab — only the category rule does. Asserted whether or not the tab is gated
// on: "accumulates invisibly" has to mean invisible on every other surface too.
check(
  tabCards().every((c) => c.dataset.category !== 'recovery'),
  'recovery listings never appear on the Memberships tab',
  tabCards().filter((c) => c.dataset.category === 'recovery').length + ' leaked',
);

clickTab('classes');
check(
  models().length === 1 && models()[0] === 'classes',
  'the Classes tab shows ONLY classes businesses',
  models().join(', '),
);
const perClassOrder = tabCards()
  .map((c) => (c.dataset.perclass === '' ? null : Number(c.dataset.perclass)))
  .filter((v) => v !== null);
check(
  perClassOrder.every((v, i, a) => i === 0 || a[i - 1] <= v),
  'the Classes tab sorts by cheapest PER CLASS',
  perClassOrder.slice(0, 5).join(' '),
);
check(
  tabCards().every((c) => !c.querySelector('.price-membership')?.hidden === false || true) &&
    tabCards().every((c) => c.querySelector('.price-class') && !c.querySelector('.price-class').hidden),
  'per-class figures are the visible price on that tab',
);
check(
  tabCards().every((c) => c.querySelector('.price-membership').hidden),
  'and the monthly figure is hidden there',
);
check(
  tabCards().every((c) => [...c.querySelectorAll('.membership-only')].every((e) => e.hidden)),
  'commitment badges never show on the Classes tab — commitment is a membership idea',
);
// The bug this test exists to prevent: on the Classes tab BOTH the membership
// receipt and the day-pass body were hidden and nothing took their place, so
// the chevron expanded into an empty box. The invariant is not "a .detail-class
// element exists" — it is that every tab leaves the open card with something
// to say. Asserted per tab below, and by content, not by presence.
const openBodies = (card) =>
  [...card.querySelectorAll('.detail')].filter((d) => !d.hidden);
const expandedIsEmpty = (card) => {
  const bodies = openBodies(card);
  if (bodies.length === 0) return true;
  return bodies.every((b) => b.textContent.replace(/\s+/g, ' ').trim().length < 40);
};
check(
  tabCards().every((c) => openBodies(c).length === 1),
  'exactly one card body is visible on the Classes tab',
  [...new Set(tabCards().map((c) => openBodies(c).length))].join('/'),
);
check(
  tabCards().every((c) => !expandedIsEmpty(c)),
  'expanding a Classes card shows real content, never an empty box',
  tabCards().filter(expandedIsEmpty).map((c) => c.dataset.slug).slice(0, 3).join(', '),
);
check(
  tabCards().every((c) => {
    const body = openBodies(c)[0];
    return body && body.classList.contains('detail-class');
  }),
  'and the body it shows is the per-class one',
);

const classLabels = $('.tier').map((t) => t.textContent.trim());
check(
  classLabels.some((l) => /class/.test(l)),
  'price bands are relabelled in the unit the tab measures in',
  classLabels.join(' | '),
);

clickTab('daypass');
check(
  models().length === 2,
  'the Day passes tab spans BOTH models — either kind can sell a visit',
  models().join(', '),
);
check(
  $('.tier').map((t) => t.textContent.trim()).every((l) => !/class/.test(l)),
  'and the bands revert to monthly labels',
);
// Same emptiness invariant on Day passes. This tab was already correct — it
// keeps its own body — but the check belongs on every tab, not on the one that
// happened to break: the next tab added must satisfy it too.
check(
  tabCards().every((c) => openBodies(c).length === 1 && !expandedIsEmpty(c)),
  'expanding a Day passes card shows real content, never an empty box',
  tabCards().filter(expandedIsEmpty).map((c) => c.dataset.slug).slice(0, 3).join(', '),
);
clickTab('membership');
check(
  tabCards().every((c) => openBodies(c).length === 1 && !expandedIsEmpty(c)),
  'expanding a Memberships card shows real content, never an empty box',
  tabCards().filter(expandedIsEmpty).map((c) => c.dataset.slug).slice(0, 3).join(', '),
);

// ── Pagination ───────────────────────────────────────────────────────────
// The unfiltered list opens at one page; any active filter shows every match,
// because filtering IS the narrowing tool. The map must see all of it either
// way — pagination uses a class precisely so `hidden` keeps meaning "filtered
// out", which is what the map reads.
console.log('\nPagination');
// Earlier sections leave filters applied; pagination only engages on the
// unfiltered list, so start from a clean slate.
window.document
  .getElementById('clear-filters')
  ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const PAGE_SIZE = 12;
const showAllBtn = window.document.getElementById('show-all');
const allCards = () => $('.card');
const paged = () => allCards().filter((c) => c.classList.contains('beyond-fold'));
const visibleCards = () => allCards().filter((c) => !c.hidden);

check(Boolean(showAllBtn), 'the show-all expander exists');
check(
  visibleCards().length - paged().length === PAGE_SIZE,
  'the unfiltered list opens at one page',
  `${visibleCards().length - paged().length} shown of ${visibleCards().length}`,
);
check(!showAllBtn.hidden, 'the expander is offered when there is more to show');
check(
  paged().every((c) => !c.hidden),
  'paginated cards are NOT marked hidden — the map still draws their pins',
);

// Filtering must switch pagination off entirely.
window.document.querySelector('#regions .chip[data-region="downtown"]')?.dispatchEvent(
  new window.MouseEvent('click', { bubbles: true }),
);
check(
  paged().length === 0,
  'a region chip shows every match, with no pagination',
  `${paged().length} folded`,
);
check(showAllBtn.hidden, 'and the expander goes away while filtered');

window.document.getElementById('clear-filters')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check(paged().length > 0, 'clearing filters returns to one page');

showAllBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check(paged().length === 0, 'the expander reveals the whole list');
check(showAllBtn.hidden, 'and retires itself');

window.document.querySelector('#regions .chip[data-region="downtown"]')?.dispatchEvent(
  new window.MouseEvent('click', { bubbles: true }),
);
window.document.getElementById('clear-filters')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check(
  paged().length === 0,
  'expansion is sticky — the list does not fold back up on the next filter change',
);

// ── Compare picker discoverability ───────────────────────────────────────
console.log('\nCompare picker');
const pill = window.document.getElementById('cmp-pill');
const pillLabel = window.document.getElementById('cmp-label');
const boxes = $('.cmp-box');
check(Boolean(pill) && Boolean(pillLabel), 'the pill and its label exist');
check(
  $('.cmp-word').length === allCards().length,
  'every compare control is LABELLED, not a bare checkbox',
  `${$('.cmp-word').length} labelled`,
);
check(
  $('.cmp-word')[0]?.textContent.trim().toLowerCase() === 'compare',
  'and the label says what it does',
);
check(pill.hidden, 'the pill starts hidden at zero picks');

const pick = (i) => {
  boxes[i].checked = true;
  boxes[i].dispatchEvent(new window.Event('change', { bubbles: true }));
};
pick(0);
check(!pill.hidden, 'the pill appears on the FIRST pick, so the mechanic teaches itself');
check(
  /pick 1 more/i.test(pillLabel.textContent),
  'and it says what to do next rather than showing a dead count',
  pillLabel.textContent.trim(),
);
check(!pill.hasAttribute('href'), 'at one pick it is a prompt, not a link to nowhere');
check(pill.getAttribute('aria-disabled') === 'true', 'and it reports itself disabled');

pick(1);
check(/Compare \(2\)/.test(pillLabel.textContent), 'two picks reads as a count', pillLabel.textContent.trim());
check(
  /^\/compare\?gyms=[^,]+,[^,]+$/.test(pill.getAttribute('href') ?? ''),
  'and now links to the comparison',
  pill.getAttribute('href'),
);
check(pill.getAttribute('aria-disabled') === 'false', 'and is no longer disabled');

process.exit(failures.length === 0 ? 0 : 1);
