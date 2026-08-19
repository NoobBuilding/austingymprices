/**
 * Accessibility and SEO checks over the built HTML.
 *
 * Not a substitute for Lighthouse or a screen reader, but it catches the
 * regressions that are easy to introduce and tedious to notice: a page that
 * loses its <h1>, an image without alt text, a heading level skipped, a link
 * whose only text is "here", a control with no accessible name.
 *
 * Runs over every emitted page, because the failure mode is one template
 * drifting while the others stay fine.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

function pages(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...pages(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

const failures = [];
const note = (file, msg) => failures.push(`${file}: ${msg}`);

const files = pages(DIST);
console.log(`check-a11y: ${files.length} pages\n`);

const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

let checked = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  checked += 1;

  // ── Document basics ────────────────────────────────────────────────────
  if (!/<html[^>]+lang="[a-z]{2}/i.test(html)) note(file, 'no lang attribute on <html>');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  if (!title || title.trim().length < 10) note(file, 'missing or too-short <title>');
  if (!/<meta name="description" content="[^"]{40,}"/.test(html)) {
    note(file, 'missing or too-short meta description');
  }
  if (!/rel="canonical"/.test(html)) note(file, 'no canonical link');
  if (!/<meta property="og:image"/.test(html)) note(file, 'no og:image');

  // ── Headings ───────────────────────────────────────────────────────────
  const h1s = html.match(/<h1[\s>]/g) ?? [];
  if (h1s.length === 0) note(file, 'no <h1>');
  if (h1s.length > 1) note(file, `${h1s.length} <h1> elements — should be exactly one`);

  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) {
      note(file, `heading level jumps from h${levels[i - 1]} to h${levels[i]}`);
      break;
    }
  }

  // ── Images ─────────────────────────────────────────────────────────────
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt=/.test(m[0])) note(file, `<img> without alt: ${m[0].slice(0, 70)}`);
  }

  // ── Controls need an accessible name ───────────────────────────────────
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const attrs = m[1];
    const text = stripTags(m[2]);
    const named = text.length > 0 || /aria-label=|aria-labelledby=/.test(attrs);
    if (!named) note(file, `<button> with no accessible name: ${m[0].slice(0, 70)}`);
  }
  for (const m of html.matchAll(/<select\b([^>]*)>/g)) {
    const id = (m[1].match(/id="([^"]+)"/) || [])[1];
    const labelled =
      /aria-label=/.test(m[1]) ||
      (id && new RegExp(`<label[^>]*for="${id}"`).test(html));
    if (!labelled) note(file, `<select> with no label: ${m[0].slice(0, 70)}`);
  }
  for (const m of html.matchAll(/<input\b([^>]*)>/g)) {
    if (/type="(hidden|submit|button)"/.test(m[1])) continue;
    const id = (m[1].match(/id="([^"]+)"/) || [])[1];
    const labelled =
      /aria-label=/.test(m[1]) ||
      (id && new RegExp(`<label[^>]*for="${id}"`).test(html));
    if (!labelled) note(file, `<input> with no label: ${m[0].slice(0, 70)}`);
  }

  // ── Links ──────────────────────────────────────────────────────────────
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const attrs = m[1];
    const text = stripTags(m[2]);
    if (!text && !/aria-label=/.test(attrs)) {
      note(file, `<a> with no text: ${m[0].slice(0, 70)}`);
    }
    if (/^(here|click here|read more|link)$/i.test(text)) {
      note(file, `uninformative link text: "${text}"`);
    }
    // Any target="_blank" must carry rel=noopener.
    if (/target="_blank"/.test(attrs) && !/rel="[^"]*noopener/.test(attrs)) {
      note(file, `target="_blank" without rel=noopener: ${m[0].slice(0, 70)}`);
    }
  }

  // ── Landmarks ──────────────────────────────────────────────────────────
  if (!/<main\b/.test(html)) note(file, 'no <main> landmark');
  if (!/class="skip-link"/.test(html)) note(file, 'no skip link');
}

console.log(`checked ${checked} pages`);

if (failures.length > 0) {
  console.error(`\n${failures.length} accessibility issue(s):\n`);
  // Group identical messages so one template error is not 41 lines of noise.
  const grouped = new Map();
  for (const f of failures) {
    const [file, ...rest] = f.split(': ');
    const msg = rest.join(': ');
    if (!grouped.has(msg)) grouped.set(msg, []);
    grouped.get(msg).push(file);
  }
  for (const [msg, where] of grouped) {
    console.error(`  ${msg}`);
    console.error(`    ${where.length} page(s), e.g. ${where[0]}`);
  }
  process.exit(1);
}
console.log('OK — no accessibility issues found.');
