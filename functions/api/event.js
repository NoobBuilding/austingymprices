/**
 * First-party, anonymous event counter (CLAUDE.md §8).
 *
 * Counts three things and nothing else: what day it is, what happened, and
 * which gym or control it happened to. There is no cookie, no session, no
 * identifier, no request body beyond a whitelisted event name and subject, and
 * nothing derived from the visitor — no IP, no user agent, no referrer is read
 * or stored. A row is `(day, event, subject, count)`; it cannot be joined back
 * to a person because nothing about the person was ever written down.
 *
 * This is deliberately a counter, not analytics. The outbound-click dataset is
 * the future proof-of-value in every gym conversation and it cannot be
 * recovered retroactively, so it needs a durable first-party store rather than
 * a third-party tool's retention window.
 *
 * Failure is silent by design. This endpoint must never be able to break a
 * visitor's click-through: the client fires it with sendBeacon and never waits,
 * and an unconfigured or failing database returns 204 rather than an error.
 */

// Whitelists, not validation-by-regex. An endpoint that accepts arbitrary
// strings is a free write primitive pointed at our own storage.
const EVENTS = new Set([
  'outbound',        // clicked through to a gym's own site — the important one
  'compare',         // which gyms were compared TOGETHER (sorted slug set)
  'compare_count',   // how many gyms were in that comparison
  'filter_tier',
  'filter_region',
  'filter_activity',
  'filter_nocontract',
  'tab',             // memberships | daypasses
  'map_display',     // prices | dots
  'map_pin',         // a pin click
]);

const SUBJECT_OK = /^[a-z0-9][a-z0-9|_-]{0,180}$/;

/**
 * Always 204, always with a reason.
 *
 * Silent failure is right for the VISITOR — a counter must never break a
 * click-through — but it was wrong for the operator: every path returned an
 * identical 204, so "the beacon fired and nothing was stored" was
 * indistinguishable from "stored fine". The status stays 204 in every case (a
 * non-2xx would log a console error on a page that promises none); the reason
 * travels in a header, which sendBeacon ignores and DevTools shows.
 *
 * The tokens name a code path, not a secret. No key, no visitor data, and no
 * SQL reaches this header.
 */
const NO_CONTENT = (reason) =>
  new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      // Same-origin only. There is no reason for another site to write here.
      'Vary': 'Origin',
      'X-Event-Status': reason,
    },
  });

export async function onRequestPost(context) {
  const { request, env } = context;

  // Same-origin guard. sendBeacon sends an Origin header, so a cross-site page
  // cannot quietly inflate a gym's numbers from a visitor's browser.
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return NO_CONTENT('cross-origin');
    } catch {
      return NO_CONTENT('bad-origin');
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NO_CONTENT('bad-json');
  }

  const event = typeof body?.event === 'string' ? body.event : '';
  const subject = typeof body?.subject === 'string' ? body.subject.toLowerCase() : '';
  if (!EVENTS.has(event)) return NO_CONTENT('unknown-event');
  if (!SUBJECT_OK.test(subject)) return NO_CONTENT('bad-subject');

  // No DB bound yet? Then the site simply does not count. It must not error:
  // a missing binding is a setup step, not a visitor's problem.
  if (!env?.DB) return NO_CONTENT('no-binding');

  // The date is the server's, in UTC. Taking it from the client would let the
  // client choose which day to write to.
  const day = new Date().toISOString().slice(0, 10);

  try {
    await env.DB.prepare(
      `INSERT INTO events (day, event, subject, count) VALUES (?1, ?2, ?3, 1)
       ON CONFLICT(day, event, subject) DO UPDATE SET count = count + 1`,
    )
      .bind(day, event, subject)
      .run();
  } catch (err) {
    // Never surface storage errors to a visitor mid-click. The full message
    // goes to the deployment log (`wrangler pages deployment tail`); only a
    // short, non-sensitive marker travels back.
    console.error('[event] write failed', err?.message ?? err);
    return NO_CONTENT(`write-failed:${(err?.message ?? 'unknown').slice(0, 60)}`);
  }

  return NO_CONTENT('stored');
}

/**
 * GET is a health check, not an error. It reports ONLY whether the D1 binding
 * is attached to the deployment actually serving this request — the one fact
 * that a dashboard cannot confirm, because a binding added to the wrong
 * environment, or to a deployment that was never replaced, looks identical to a
 * correct one from the Cloudflare UI. No data is read and none is returned.
 */
export async function onRequestGet(context) {
  const bound = Boolean(context.env?.DB);
  return new Response(JSON.stringify({ bound }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const onRequest = async (context) => {
  if (context.request.method === 'POST') return onRequestPost(context);
  if (context.request.method === 'GET') return onRequestGet(context);
  return NO_CONTENT('not-post');
};
