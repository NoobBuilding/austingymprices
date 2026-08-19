/**
 * Recently viewed gyms.
 *
 * Deliberately small: a list of slugs in localStorage, rendered as one plain
 * sentence. It is a memory aid for someone comparing five gyms across a few
 * visits, not a feature — no cards, no thumbnails, no "recommended for you".
 *
 * localStorage is best-effort for the same reason the map's display toggle is
 * (see map-island.js): private modes throw on access, and a page that cannot
 * remember is far better than a page that fails to load. Nothing here leaves
 * the browser — it is never sent to the server and is not an identifier.
 */
const KEY = 'agp:recent';
const LIMIT = 5;

export function readRecent() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string').slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

/** Most recent first, no duplicates, capped. */
export function pushRecent(slug) {
  if (!slug) return;
  try {
    const next = [slug, ...readRecent().filter((s) => s !== slug)].slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* preference simply does not persist */
  }
}

/**
 * Render into a container, or leave it hidden when there is no history.
 * `names` maps slug -> display name; a slug with no name is dropped rather
 * than rendered raw, so a stale entry from a delisted gym cannot surface a
 * kebab-case slug at a reader.
 */
export function renderRecent(el, names) {
  if (!el) return;
  const slugs = readRecent().filter((s) => names[s]);
  if (slugs.length === 0) return;

  el.textContent = 'Recently viewed: ';
  slugs.forEach((slug, i) => {
    const a = document.createElement('a');
    a.href = `/gyms/${slug}`;
    // textContent, never innerHTML — gym names are scraper-influenced (§8).
    a.textContent = names[slug];
    el.appendChild(a);
    if (i < slugs.length - 1) el.appendChild(document.createTextNode(', '));
  });
  el.hidden = false;
}
