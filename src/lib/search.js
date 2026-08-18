/**
 * Search normalisation, shared by the server-rendered card attributes and the
 * client-side filter so the two can never drift apart.
 *
 * Two forms are kept for every haystack:
 *
 *   normalised — lowercased, accents folded, every non-alphanumeric run
 *                collapsed to a single space. Makes "gold's gym" match
 *                "golds gym" and "[solidcore]" match "solidcore".
 *   compact    — the same with ALL spaces removed. Makes "lifetime" match
 *                "Life Time", and makes progressive typing work: "laf" is not
 *                a substring of "la fitness" but is of "lafitness".
 *
 * A query matches if it hits either form.
 */

/** Lowercase, fold accents, reduce punctuation to spaces, collapse runs. */
export function normalizeSearch(value) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Normalised with every space removed. */
export function compactSearch(value) {
  return normalizeSearch(value).replace(/ /g, '');
}

/**
 * Does `query` match a haystack already reduced to its two forms?
 * An empty query matches everything.
 */
export function matchesQuery(haystackNormalized, haystackCompact, query) {
  const normalized = normalizeSearch(query);
  if (normalized === '') return true;
  if (haystackNormalized.includes(normalized)) return true;
  return haystackCompact.includes(compactSearch(query));
}

/** The text a gym is searchable by. Kept here so card and tests agree. */
export function gymSearchText(gym, regionName) {
  return [gym.name, gym.sub_locality, regionName, gym.category].filter(Boolean).join(' ');
}
