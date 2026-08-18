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
