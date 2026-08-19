/**
 * The selection lifecycle, extracted from the page's `toggle` handler so it can
 * actually be executed by a test.
 *
 * It lived inline in index.astro, where nothing could run it, and it was wrong:
 * closing ANY card cleared the selection. Cards were independent <details>, so
 * opening a second card moved the selection to it, and closing that second card
 * then wiped a selection whose own card was still open. The map went white
 * underneath an open card, which reads as "the selected cluster lost its
 * orange" when in truth nothing was selected at all.
 *
 * The cards are now a one-at-a-time accordion (a named <details> group, with
 * index.astro enforcing the same rule for browsers that predate `name`), so the
 * two states that used to drift cannot: **the open card IS the selection.**
 *
 * Invariant: `selected` is non-null exactly when a card is open, and it always
 * names that card.
 *
 * @param {object} o
 * @param {string} o.slug          the card whose <details> just toggled
 * @param {boolean} o.open         its new open state
 * @param {string|null} o.current  the selection before this toggle
 * @returns {string|null} the selection after this toggle
 */
export function nextSelection({ slug, open, current }) {
  // Opening a card selects it. Whatever was open is being closed by the
  // accordion, and its own close event is handled below.
  if (open) return slug;
  // A close event for a card that is not the selection is the accordion
  // retiring the previously-open card. The new selection is already set and
  // must not be clobbered — this is the exact wipe that caused the bug.
  if (current !== slug) return current;
  // The selected card closed and nothing replaced it.
  return null;
}
