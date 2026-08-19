/**
 * Pin placement maths. Deliberately free of any Leaflet import so it can be
 * tested in plain Node.
 *
 * The rule (CLAUDE.md §9 step 4): **41 gyms is not NYC.** Every pin shows its
 * own price at every zoom. Pins that merely crowd each other are nudged apart,
 * not merged — a merged bubble hides a price, and the price is the reason the
 * map exists. Only pins that are *effectively co-located* — the same plaza, a
 * few pixels apart — collapse into one bubble, and even then the bubble names
 * the cheapest price and says how many it is standing on ("$38 +1"), never a
 * range and never a bare count.
 */

/**
 * Merge only what is effectively co-located. `mergePx` is deliberately tiny;
 * anything larger is a crowding problem, which `nudgeApart` solves without
 * hiding a number.
 */
export function mergeCoLocated(points, mergePx) {
  const groups = [];
  for (const p of points) {
    const hit = groups.find(
      (g) => Math.hypot(g.point.x - p.point.x, g.point.y - p.point.y) < mergePx,
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
 * The label a merged bubble wears: the CHEAPEST price it is covering, plus how
 * many more are underneath. "$38 +1" answers both questions a stack raises —
 * what is the best price here, and how much am I not seeing.
 *
 * Never a range ("$15–259" told you nothing you came for and read like one
 * gym's pricing), never a bare count.
 */
export function mergedLabel(members, format) {
  const lo = Math.min(...members.map((m) => m.price));
  return members.length > 1 ? `${format(lo)} +${members.length - 1}` : format(lo);
}

/** Stable identity for a merged group, so an expansion survives a re-render. */
export function groupKey(group) {
  return group.members
    .map((m) => m.pin.slug)
    .sort()
    .join('|');
}

/**
 * Spiderfy-lite. Bubbles that would overlap are pushed apart along the axis
 * needing the LEAST movement — for wide, short price bubbles that is almost
 * always vertical, which costs the least geographic honesty.
 *
 * Displacement is capped: a bubble that has drifted `maxShift` from its true
 * point stops moving and is allowed to overlap instead. A pin that wanders to
 * stay readable is lying about where the gym is, and on a map that is the same
 * class of error as a wrong price.
 *
 * Pure and deterministic — same boxes in, same offsets out, no randomness.
 *
 * @param {{x:number,y:number,w:number,h:number}[]} boxes
 * @returns {{dx:number,dy:number}[]} per-box offsets, index-aligned
 */
export function nudgeApart(boxes, { padding = 3, maxShift = 18, iterations = 24 } = {}) {
  const off = boxes.map(() => ({ dx: 0, dy: 0 }));
  const clamp = (v) => Math.max(-maxShift, Math.min(maxShift, v));

  for (let pass = 0; pass < iterations; pass += 1) {
    let moved = false;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const dx = boxes[j].x + off[j].dx - (boxes[i].x + off[i].dx);
        const dy = boxes[j].y + off[j].dy - (boxes[i].y + off[i].dy);
        const overlapX = (boxes[i].w + boxes[j].w) / 2 + padding - Math.abs(dx);
        const overlapY = (boxes[i].h + boxes[j].h) / 2 + padding - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        // Exactly-coincident centres have no direction to push along, so pick
        // one from the index. Deterministic, which keeps the tests meaningful.
        if (overlapY <= overlapX) {
          const dir = dy === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dy);
          const push = (overlapY / 2) * dir;
          off[i].dy = clamp(off[i].dy - push);
          off[j].dy = clamp(off[j].dy + push);
        } else {
          const dir = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
          const push = (overlapX / 2) * dir;
          off[i].dx = clamp(off[i].dx - push);
          off[j].dx = clamp(off[j].dx + push);
        }
      }
    }
    if (!moved) break;
  }
  return off;
}

/**
 * Where each member sits when a merged bubble is expanded: evenly around the
 * point, starting at the top. Members are within a few pixels of each other by
 * definition, so the fan is the only thing separating them.
 */
export function fanOffsets(count, radius) {
  if (count <= 1) return [{ dx: 0, dy: 0 }];
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
  });
}

/**
 * The classes a rendered bubble wears. Pure, so the "exactly one thing looks
 * selected" invariant can be asserted without a map.
 */
export function pinClasses({ tier, priced, selected, dimmed, noPass, merged }) {
  const classes = ['pin'];
  if (merged) classes.push('merged');
  else classes.push(priced ? `tier-${tier ?? 2}` : 'callfor');
  if (noPass) classes.push('nopass');
  if (dimmed) classes.push('dim');
  if (selected) classes.push('active');
  return classes.join(' ');
}

/** How many bubbles would carry `active`. The invariant: never more than one. */
export function countActive(groups, standalone, selectedSlug) {
  if (!selectedSlug) return 0;
  const inGroups = groups.filter((g) =>
    g.members.some((m) => m.pin.slug === selectedSlug),
  ).length;
  const inStandalone = standalone.filter((p) => p.pin.slug === selectedSlug).length;
  return inGroups + inStandalone;
}

/**
 * Which bubble carries `active` for a selection. Exists so the "the active pin
 * is the selected gym" invariant can be tested with the map's ordering
 * deliberately different from the list's — the list sorts cheapest-first while
 * the map iterates data order, and a position-based lookup would silently light
 * up the wrong gym.
 */
export function activeBubble(groups, standalone, selectedSlug) {
  if (!selectedSlug) return null;
  const group = groups.find((g) => g.members.some((m) => m.pin.slug === selectedSlug));
  if (group) {
    return {
      kind: group.members.length > 1 ? 'merged' : 'pin',
      slugs: group.members.map((m) => m.pin.slug),
    };
  }
  const lone = standalone.find((p) => p.pin.slug === selectedSlug);
  return lone ? { kind: 'pin', slugs: [lone.pin.slug] } : null;
}
