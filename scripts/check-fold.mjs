/**
 * Mobile fold check — real layout, real Chrome.
 *
 *   node scripts/check-fold.mjs <url> [width] [height...]
 *
 * Asserts that the first gym tile is at least partially visible below the hero
 * stack without scrolling. The hero is the whole preamble a reader must get
 * past — H1, subhead, tabs, search, region chips, filter row, count line — and
 * if it eats the entire first screen the site opens on a promise with no
 * evidence behind it.
 *
 * NOT part of `npm run verify`: it needs a Chrome binary, and the gate has to
 * run in CI without one. Run it by hand against the deployed URL, which is the
 * only place the real CSS applies anyway (CLAUDE.md §8).
 *
 * Heights are checked in pairs on purpose. 844 is the iPhone 14's CSS viewport;
 * ~660 is what is actually left after Safari's toolbars, and that is the number
 * that decides whether a real thumb sees a price. §9b's warning stands — no
 * headless run replaces a human with a phone — but "the tile is 200px below the
 * fold" is a fact this can establish and an opinion it need not wait for.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const url = process.argv[2];
if (!url) { console.error('usage: check-fold.mjs <url> [width] [heights...]'); process.exit(2); }
const width = Number(process.argv[3] || 390);
const heights = (process.argv.slice(4).length ? process.argv.slice(4) : ['844', '660']).map(Number);

function findChrome() {
  const cache = join(homedir(), '.cache', 'puppeteer', 'chrome');
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      const p = join(cache, d, 'chrome-mac-x64', 'Google Chrome for Testing.app',
        'Contents', 'MacOS', 'Google Chrome for Testing');
      if (existsSync(p)) return p;
      const p2 = join(cache, d, 'chrome-mac-arm64', 'Google Chrome for Testing.app',
        'Contents', 'MacOS', 'Google Chrome for Testing');
      if (existsSync(p2)) return p2;
    }
  }
  const sys = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(sys)) return sys;
  throw new Error('no Chrome binary found');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome did not expose a debugging target');
}

function client(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', res); ws.addEventListener('error', rej);
  });
  return {
    ready,
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    }),
    close: () => ws.close(),
  };
}

const MEASURE = `(() => {
  const r = (s) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect() : null; };
  const y = (s) => { const b = r(s); return b ? Math.round(b.top + window.scrollY) : null; };
  const hero = r('.hero');
  const card = r('.card');
  const count = r('.count');
  return {
    viewport: window.innerHeight,
    heroBottom: hero ? Math.round(hero.bottom + window.scrollY) : null,
    countTop: y('.count'),
    countBottom: count ? Math.round(count.bottom + window.scrollY) : null,
    firstCardTop: y('.card'),
    firstCardBottom: card ? Math.round(card.bottom + window.scrollY) : null,
    h1Bottom: y('h1') === null ? null : Math.round(r('h1').bottom + window.scrollY),
    subBottom: r('.sub') ? Math.round(r('.sub').bottom + window.scrollY) : null,
    tabsBottom: r('.tabs') ? Math.round(r('.tabs').bottom + window.scrollY) : null,
    searchBottom: r('.search') ? Math.round(r('.search').bottom + window.scrollY) : null,
    chipsBottom: r('.chip-row') ? Math.round(r('.chip-row').bottom + window.scrollY) : null,
    filtersBottom: r('.filters') ? Math.round(r('.filters').bottom + window.scrollY) : null,
    // Rows a control group actually occupies. One distinct top offset = one
    // line; more than one means it wrapped.
    tabRows: new Set([...document.querySelectorAll('.tabs .tab')]
      .map((el) => Math.round(el.getBoundingClientRect().top))).size,
    chipRows: new Set([...document.querySelectorAll('#regions .chip')]
      .map((el) => Math.round(el.getBoundingClientRect().top))).size,
    filterRows: new Set([...document.querySelectorAll('#filters .pill')]
      .filter((el) => el.getBoundingClientRect().height > 0)
      .map((el) => Math.round(el.getBoundingClientRect().top))).size,
    filtersCollapsed: !!document.querySelector('#filters.collapsed'),
    filtersToggleVisible: (() => {
      const t = document.getElementById('filters-toggle');
      return !!t && !t.hidden && t.getBoundingClientRect().height > 0;
    })(),
    // The PRICE, not merely the card: a tile whose price is below the fold has
    // not shown the reader anything they came for.
    firstPriceTop: (() => {
      const card = document.querySelector('.card');
      if (!card) return null;
      const el = [...card.querySelectorAll('.price')].find((p) => !p.hidden);
      if (!el) return null;
      return Math.round(el.getBoundingClientRect().top + window.scrollY);
    })(),
    subheadLines: (() => {
      const el = document.querySelector('.sub');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
      return Math.round(el.getBoundingClientRect().height / lh);
    })(),
  };
})()`;

const port = 9333 + Math.floor(process.uptime() * 1000) % 500;
const chrome = spawn(findChrome(), [
  '--headless=new', `--remote-debugging-port=${port}`, '--no-first-run',
  '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
  `--window-size=${width},${Math.max(...heights)}`, 'about:blank',
], { stdio: 'ignore' });

let failures = 0;
const check = (ok, label, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

try {
  const c = client(await cdp(port));
  await c.ready;
  await c.send('Page.enable');

  console.log(`\nMobile fold — ${url} at ${width}px wide\n`);
  for (const h of heights) {
    await c.send('Emulation.setDeviceMetricsOverride', {
      width, height: h, deviceScaleFactor: 2, mobile: true,
    });
    await c.send('Page.navigate', { url });
    await sleep(2500);
    const { result } = await c.send('Runtime.evaluate', { expression: MEASURE, returnByValue: true });
    const m = result.value;
    if (process.env.FOLD_DEBUG) console.log(JSON.stringify(m, null, 2));

    if (process.env.FOLD_SHOT) {
      const shot = await c.send('Page.captureScreenshot', { format: 'png' });
      const { writeFileSync } = await import('node:fs');
      const out = `${process.env.FOLD_SHOT}-${width}x${h}.png`;
      writeFileSync(out, Buffer.from(shot.data, 'base64'));
      console.log(`   screenshot ${out}`);
    }

    console.log(`viewport ${width}x${h}`);
    console.log(`   H1 ends ${m.h1Bottom} · subhead ends ${m.subBottom} (${m.subheadLines} lines)`);
    console.log(`   tabs ${m.tabsBottom} · search ${m.searchBottom} · chips ${m.chipsBottom} · filters ${m.filtersBottom}`);
    console.log(`   count line ${m.countTop}–${m.countBottom} · first tile starts ${m.firstCardTop}`);
    // A missing measurement is a FAILURE, never a pass. `null < 844` is true in
    // JavaScript, so the earlier form reported success when the selector had
    // not matched anything at all — an assertion that goes green on absent data
    // is exactly the shape CLAUDE.md §9b warns about.
    if (typeof m.firstCardTop !== 'number') {
      check(false, 'the first gym tile could be measured at all', 'no .card matched — measurement failed');
    } else {
      const visible = m.firstCardTop < h;
      const px = h - m.firstCardTop;
      check(visible, 'the first gym tile is at least partially visible without scrolling',
        visible ? `${px}px of it is on screen` : `it starts ${-px}px BELOW the fold`);
    }

    if (typeof m.firstPriceTop !== 'number') {
      check(false, "the first card's price could be measured", 'no visible .price matched');
    } else {
      const pv = m.firstPriceTop < h;
      check(pv, "the first card's PRICE is at least partially visible without scrolling",
        pv ? `price starts at ${m.firstPriceTop}, ${h - m.firstPriceTop}px above the fold`
           : `price starts at ${m.firstPriceTop}, ${m.firstPriceTop - h}px below`);
    }

    check(m.tabRows === 1, 'the tab row renders on ONE line', `${m.tabRows} row(s)`);
    check(m.chipRows === 1, 'the region chips do not wrap', `${m.chipRows} row(s)`);
    check(
      m.filtersCollapsed || m.filterRows <= 1,
      'the filter row does not wrap — collapsed behind its toggle, and one scrolling line when open',
      m.filtersCollapsed ? 'collapsed' : `${m.filterRows} row(s) when open`,
    );
    // The invariant is REACHABILITY, not the presence of a button: filters must
    // be either on screen or openable. Demanding the toggle unconditionally
    // asserted the phone's inventory and went red on desktop, where the row is
    // simply always open — the "suspect the assertion first" shape exactly.
    check(
      !m.filtersCollapsed || m.filtersToggleVisible,
      'the filters are reachable — on screen, or behind a visible toggle',
      m.filtersCollapsed ? (m.filtersToggleVisible ? 'collapsed, toggle visible' : 'COLLAPSED WITH NO TOGGLE') : 'open',
    );

    // Open it for real and measure again. Claiming "one line when open"
    // without opening it would be asserting the comment, not the behaviour.
    if (m.filtersCollapsed) {
      const OPEN = `(() => {
        document.getElementById('filters-toggle').click();
        const pills = [...document.querySelectorAll('#filters .pill')]
          .filter((el) => el.getBoundingClientRect().height > 0);
        return {
          rows: new Set(pills.map((el) => Math.round(el.getBoundingClientRect().top))).size,
          pills: pills.length,
          collapsed: !!document.querySelector('#filters.collapsed'),
        };
      })()`;
      const opened = (await c.send('Runtime.evaluate', { expression: OPEN, returnByValue: true })).result.value;
      check(!opened.collapsed, 'tapping Filters opens the row', `${opened.pills} controls revealed`);
      check(opened.rows === 1, 'and it opens as ONE scrolling line, not a wrapped block',
        `${opened.rows} row(s)`);
    }
    console.log('');
  }
  c.close();
} finally {
  chrome.kill();
}

console.log(failures === 0 ? 'OK — the first tile survives the fold.' : `${failures} fold failure(s).`);
process.exit(failures ? 1 : 0);
