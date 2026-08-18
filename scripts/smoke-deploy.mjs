/**
 * Post-deploy smoke check. Run against the DEPLOYED site, not a local build.
 *
 *   node scripts/smoke-deploy.mjs https://austingymprices.pages.dev
 *
 * Exists because public/_headers only takes effect on Cloudflare Pages, so a
 * whole class of bug (anything the CSP refuses) is invisible locally. This
 * asserts the security headers are actually being served AND that the page's
 * own assets are compatible with the policy those headers declare.
 *
 * It cannot click a button — that still needs a human with a browser console.
 * It can prove the script is reachable, same-origin and not inlined, which is
 * what broke.
 */
const url = (process.argv[2] || '').replace(/\/$/, '');
if (!url) {
  console.error('usage: node scripts/smoke-deploy.mjs <deployed-url>');
  process.exit(2);
}

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

console.log(`Smoke-testing ${url}\n`);

const res = await fetch(`${url}/`);
const html = await res.text();
const headers = res.headers;

console.log('Security headers');
const csp = headers.get('content-security-policy') || '';
check(res.status === 200, 'page returns 200', `got ${res.status}`);
check(csp.length > 0, 'Content-Security-Policy is served');
check(/script-src[^;]*'self'/.test(csp), "CSP declares script-src 'self'");
check(!/'unsafe-inline'/.test(csp), "CSP does NOT allow 'unsafe-inline'");
check(headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff');
check(headers.get('x-frame-options') === 'DENY', 'X-Frame-Options: DENY');
check(
  headers.get('referrer-policy') === 'strict-origin-when-cross-origin',
  'Referrer-Policy: strict-origin-when-cross-origin',
);

console.log('\nCSP compatibility of the served page');
const inlineScripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(
  (m) => m[2].trim() && !/application\/ld\+json/i.test(m[1]),
);
const inlineStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].filter((m) =>
  m[1].trim(),
);
check(inlineScripts.length === 0, 'no inline <script> bodies', `${inlineScripts.length} found`);
check(inlineStyles.length === 0, 'no inline <style> blocks', `${inlineStyles.length} found`);
check(!/\son[a-z]+\s*=\s*["']/i.test(html), 'no inline event handlers');

console.log('\nClient script is actually reachable');
const srcs = [...html.matchAll(/<script[^>]*\ssrc\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
check(srcs.length > 0, 'page references at least one external script');
for (const src of srcs) {
  check(src.startsWith('/'), `script ${src} is same-origin`);
  const r = await fetch(`${url}${src}`);
  const type = r.headers.get('content-type') || '';
  check(r.status === 200, `script ${src} returns 200`, `got ${r.status}`);
  check(/javascript/i.test(type), `script ${src} served as JavaScript`, type);
}

console.log('\nContent rendered');
const cards = (html.match(/class="card"/g) || []).length;
check(cards > 0, 'gym cards are server-rendered', `${cards} cards`);
check(
  !/\$NaN|\$undefined|\$null/.test(html),
  'no broken price placeholders in the markup',
);

console.log(
  failures.length === 0
    ? '\nOK — deployment smoke check passed.'
    : `\n${failures.length} check(s) FAILED.`,
);
process.exit(failures.length === 0 ? 0 : 1);
