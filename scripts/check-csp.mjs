/**
 * Fails the build if dist/ contains anything our Content-Security-Policy
 * would refuse to execute.
 *
 * This exists because a production-only bug shipped: Astro inlined the
 * bundled filter script as <script type="module">…</script>, which works
 * locally (astro dev/preview do not apply public/_headers — that file is a
 * Cloudflare Pages feature) and is silently refused on the deployed site
 * under script-src 'self'. Every filter on the index page was dead.
 *
 * Local verification could not have caught it, so the check runs against the
 * build output instead of against a running server.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

const problems = [];

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');

  // 1. Inline <script> with a body. CSP script-src 'self' refuses these.
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    const body = m[2].trim();
    const isJsonLd = /type\s*=\s*["']application\/ld\+json["']/i.test(attrs);
    if (body.length > 0 && !isJsonLd) {
      problems.push(
        `${file}: inline <script> with a ${body.length}-char body. CSP is ` +
          `script-src 'self' — this will NOT execute in production. ` +
          `(JSON-LD is exempt; it is data, not script.)`,
      );
    }
  }

  // 2. Inline <style>. CSP style-src 'self' refuses these too.
  for (const m of html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
    if (m[2].trim().length > 0) {
      problems.push(
        `${file}: inline <style> block. CSP is style-src 'self' — this will ` +
          `NOT apply in production, and the page will render unstyled.`,
      );
    }
  }

  // 3. Inline event handlers (onclick=, onload=, …).
  for (const m of html.matchAll(/\s(on[a-z]+)\s*=\s*["']/gi)) {
    problems.push(`${file}: inline event handler ${m[1]}= — banned by CLAUDE.md §8 and by CSP.`);
  }

  // 4. javascript: URLs.
  if (/(?:href|src)\s*=\s*["']\s*javascript:/i.test(html)) {
    problems.push(`${file}: javascript: URL — banned by CSP.`);
  }

  // 5. Every script src must be same-origin (a root-relative path).
  for (const m of html.matchAll(/<script[^>]*\ssrc\s*=\s*["']([^"']+)["']/g)) {
    const src = m[1];
    if (!src.startsWith('/')) {
      problems.push(
        `${file}: script src "${src}" is not a root-relative same-origin path. ` +
          `CSP script-src 'self' allows only same-origin scripts.`,
      );
    }
  }
}

const files = htmlFiles(DIST).length;
console.log(`check-csp: scanned ${files} HTML file(s) in ${DIST}/`);

if (problems.length > 0) {
  console.error(`\n${problems.length} CSP violation(s) in the build output:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    `\nThese would fail ONLY in production, because public/_headers is a\n` +
      `Cloudflare Pages feature and is not applied by astro dev or preview.`,
  );
  process.exit(1);
}
console.log('OK — no inline scripts, styles, or handlers. Build is CSP-clean.');
