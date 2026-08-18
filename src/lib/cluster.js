/**
 * Pixel-distance clustering for map pins. Deliberately free of any Leaflet
 * import so the maths can be tested in plain Node.
 *
 * Greedy and intentionally simple: the spec wants clustering minimal, so
 * individual pins survive to a fairly wide zoom rather than collapsing early.
 */
export function clusterPoints(points, thresholdPx) {
  const groups = [];
  for (const p of points) {
    const hit = groups.find(
      (g) => Math.hypot(g.point.x - p.point.x, g.point.y - p.point.y) < thresholdPx,
    );
    if (hit) {
      hit.members.push(p);
      hit.point = { x: (hit.point.x + p.point.x) / 2, y: (hit.point.y + p.point.y) / 2 };
    } else {
      groups.push({ point: { ...p.point }, members: [p] });
    }
  }
  return groups;
}

/**
 * The label a group wears: a price RANGE, never a count. Only the low end
 * carries the currency symbol — "$15–259" reads as one range, "$15–$259"
 * reads as two prices.
 */
export function clusterLabel(members, format) {
  const prices = members.map((m) => m.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  if (lo === hi) return format(lo);
  return `${format(lo)}–${String(format(hi)).replace(/^\$/, '')}`;
}

/**
 * The classes a rendered bubble wears. Pure, so the "exactly one thing looks
 * selected" invariant can be asserted without a map.
 *
 * A gym is drawn EITHER as a lone pin or inside a cluster, never both, so at
 * most one bubble can carry `active` for a given selection.
 */
export function pinClasses({ tier, priced, selected, dimmed, noPass, cluster }) {
  const classes = ['pin'];
  if (cluster) classes.push('cluster');
  else classes.push(priced ? `tier-${tier ?? 2}` : 'callfor');
  if (noPass) classes.push('nopass');
  if (dimmed) classes.push('dim');
  if (selected) classes.push('active');
  return classes.join(' ');
}

/**
 * How many bubbles would carry `active` for a given selection. Used by the
 * tests to hold the invariant: never more than one.
 */
export function countActive(groups, standalone, selectedSlug) {
  if (!selectedSlug) return 0;
  const inGroups = groups.filter((g) =>
    g.members.some((m) => m.pin.slug === selectedSlug),
  ).length;
  const inStandalone = standalone.filter((p) => p.pin.slug === selectedSlug).length;
  return inGroups + inStandalone;
}
