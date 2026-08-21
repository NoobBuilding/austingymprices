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
    const visible = m.firstCardTop < h;
    const px = h - m.firstCardTop;
    check(visible, 'the first gym tile is at least partially visible without scrolling',
      visible ? `${px}px of it is on screen` : `it starts ${-px}px BELOW the fold`);
    console.log('');
  }
  c.close();
} finally {
  chrome.kill();
}

console.log(failures === 0 ? 'OK — the first tile survives the fold.' : `${failures} fold failure(s).`);
process.exit(failures ? 1 : 0);
