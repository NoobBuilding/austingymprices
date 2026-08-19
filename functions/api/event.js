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

const NO_CONTENT = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      // Same-origin only. There is no reason for another site to write here.
      'Vary': 'Origin',
    },
  });

export async function onRequestPost(context) {
  const { request, env } = context;

  // Same-origin guard. sendBeacon sends an Origin header, so a cross-site page
  // cannot quietly inflate a gym's numbers from a visitor's browser.
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return NO_CONTENT();
    } catch {
      return NO_CONTENT();
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NO_CONTENT();
  }

  const event = typeof body?.event === 'string' ? body.event : '';
  const subject = typeof body?.subject === 'string' ? body.subject.toLowerCase() : '';
  if (!EVENTS.has(event) || !SUBJECT_OK.test(subject)) return NO_CONTENT();

  // No DB bound yet? Then the site simply does not count. It must not error:
  // a missing binding is a setup step, not a visitor's problem.
  if (!env?.DB) return NO_CONTENT();

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
    // Never surface storage errors to a visitor mid-click.
    console.error('[event] write failed', err?.message ?? err);
  }

  return NO_CONTENT();
}

// Anything other than POST is not an error worth explaining to a scanner.
export const onRequest = async (context) =>
  context.request.method === 'POST' ? onRequestPost(context) : NO_CONTENT();
