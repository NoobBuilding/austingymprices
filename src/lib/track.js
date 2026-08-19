/**
 * Anonymous event counting (CLAUDE.md §8).
 *
 * Fire-and-forget by construction. `sendBeacon` hands the request to the
 * browser and returns immediately, so counting can never delay or block a
 * visitor's click-through to a gym's site — which matters most for the one
 * event we most want, the outbound click that happens as the page unloads.
 *
 * Nothing identifying is sent: an event name and a subject, both from a fixed
 * vocabulary the server independently re-checks. No cookie is set or read, no
 * id is generated, and nothing is stored in the browser. There is deliberately
 * no session concept — a "session" is an identifier by another name.
 */
const ENDPOINT = '/api/event';

export function track(event, subject) {
  try {
    const body = JSON.stringify({ event, subject: String(subject ?? '').toLowerCase() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    // No beacon (old Safari): still never awaited, and keepalive lets it
    // outlive the page it was fired from.
    fetch(ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Counting is never worth an exception on a visitor's page.
  }
}
