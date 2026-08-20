/**
 * Boot a built page's REAL client bundle inside jsdom.
 *
 * Extracted from check-tabs.mjs so check-compare.mjs can assert the same way
 * rather than inspecting markup and pure helpers only. That distinction is the
 * whole point (CLAUDE.md §9b): a rule that lives inside an event handler cannot
 * be asserted from the outside, and a test that reads only CSS and pure
 * functions stays green while the shipped path is broken.
 *
 * The bundle is an ES module: it statically imports sibling chunks and Vite's
 * preload helper, and references import.meta — none of which is legal in
 * eval'd non-module code. Every chunk is INLINED rather than stubbed, because
 * Rollup merges our own modules into that preload chunk (track.js landed there
 * once and a filename-based stub turned every track() call into "fn is not a
 * function"). Inlining has no such failure mode: the code under test is the
 * code that ships.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ASTRO_DIR = 'dist/_astro';
const IMPORT_META = "({url:'file:///bundle.js',resolve:undefined})";

const parseBindings = (clause) =>
  clause
    .split(',')
    .map((b) => {
      const [imported, local] = b.split(/\s+as\s+/).map((x) => x.trim());
      return { imported, local: local ?? imported };
    })
    .filter((b) => b.imported);

/**
 * @param {string} htmlPath  built page, e.g. 'dist/index.html'
 * @param {{url?: string}} opts  `url` sets window.location, so query-string
 *                               behaviour can be exercised for real.
 * @returns {{ window: Window, dom: JSDOM, errors: string[] }}
 *          `errors` collects anything the page logged to console.error, so a
 *          swallowed exception cannot masquerade as a passing test.
 */
export function bootBundle(htmlPath, { url = 'https://austingymprices.com/' } = {}) {
  const html = readFileSync(htmlPath, 'utf8');
  const scriptSrc = (html.match(/<script[^>]*\ssrc="([^"]+)"/) || [])[1];
  if (!scriptSrc) throw new Error(`${htmlPath} has no external script to boot`);
  const scriptCode = readFileSync(join('dist', scriptSrc.replace(/^\//, '')), 'utf8');

  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url });
  const { window } = dom;

  let prelude = '';
  let chunkCount = 0;

  const evalSafe = scriptCode
    .replace(/import\s*\{([^}]*)\}\s*from\s*"([^"]*)";?/g, (_m, bindings, spec) => {
      const file = spec.replace(/^\.\//, '');
      const names = parseBindings(bindings);
      const chunk = readFileSync(join(ASTRO_DIR, file), 'utf8');
      if (/^\s*import[\s{]/m.test(chunk)) {
        // Nested chunk imports would need resolving too. Fail loudly rather
        // than silently testing a half-wired bundle.
        throw new Error(`chunk ${file} has its own imports; harness needs extending`);
      }
      const exported = (chunk.match(/export\s*\{([^}]*)\}\s*;?\s*$/) || [])[1] ?? '';
      const pairs = exported
        .split(',')
        .map((pair) => {
          const [localName, exportedName] = pair.split(/\s+as\s+/).map((x) => x.trim());
          return [exportedName ?? localName, localName];
        })
        .filter(([ex]) => ex);

      const ns = `__chunk${chunkCount++}`;
      prelude +=
        `const ${ns} = (() => {\n${chunk.replace(/export\s*\{[^}]*\}\s*;?\s*$/, '')}\n` +
        `return {${pairs.map(([ex, loc]) => `${ex}:${loc}`).join(',')}};\n})();\n`;
      return names
        .map((b) => `const ${b.local} = ${ns}[${JSON.stringify(b.imported)}];`)
        .join('');
    })
    .replace(/import\.meta/g, IMPORT_META);

  // jsdom implements no layout, so scrollIntoView throws. Stub it: these tests
  // care that state is correct, not that a scroll happened.
  window.Element.prototype.scrollIntoView = function scrollIntoView() {};

  // jsdom ships no CSS.escape, but every target browser has it. Without this
  // the compare script threw mid-run and its own try/catch swallowed it — the
  // row-order assertions passed while column filtering had never executed.
  // A harness that silently tests half the script is worse than no harness.
  if (!window.CSS) window.CSS = {};
  if (typeof window.CSS.escape !== 'function') {
    // Slugs are kebab-case, so escaping everything outside [A-Za-z0-9_-] is
    // both sufficient and safe here.
    window.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
  }

  // Every island in this repo is wrapped in a try/catch so a JS failure
  // degrades to static content rather than taking the page down. That is right
  // in production and a trap in a test: a swallowed exception looks exactly
  // like a passing run. Collect them so callers can assert none fired.
  const errors = [];
  const realError = window.console.error.bind(window.console);
  window.console.error = (...args) => {
    errors.push(args.map(String).join(' '));
    realError(...args);
  };
  // Stub IntersectionObserver so any lazy map loader never fires — Leaflet
  // needs real layout jsdom lacks, and the map has its own assertions.
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };

  // The import.meta rewrite has to cover the inlined chunks too — a chunk that
  // was never rewritten throws "Cannot use 'import.meta' outside a module".
  window.eval(prelude.replace(/import\.meta/g, IMPORT_META) + evalSafe);

  return { window, dom, errors };
}
