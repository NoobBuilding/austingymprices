/**
 * Map island. Imported dynamically so no Leaflet byte is fetched until the
 * map is actually wanted (CLAUDE.md §9 step 4 performance budget).
 *
 * Placement is hand-rolled rather than pulled from a plugin because the rule is
 * unusual: with 41 gyms we want almost NO merging. Every pin shows its own
 * price at every zoom; crowding is solved by nudging bubbles apart, and only
 * effectively co-located pins collapse into one bubble reading "$38 +1".
 */
import L from 'leaflet';
import { track } from './track.js';
import {
  fanOffsets,
  groupKey,
  mergeCoLocated,
  mergedLabel,
  nudgeApart,
} from './cluster.js';

/**
 * Leaflet's stylesheet is attached at runtime rather than imported, because a
 * static CSS import gets hoisted into a render-blocking <link> in <head> — the
 * list would then wait on a map asset it does not need. Same-origin, so
 * style-src 'self' is satisfied.
 */
function ensureLeafletCss() {
  const href = '/vendor/leaflet.css';
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

// Central Austin. Deliberately NOT a fitBounds over every pin: Life Time North
// sits ~10 miles north-west at Lakeline, and framing it would zoom out until
// central Austin, where nearly every gym is, became unreadable. Outliers stay
// reachable by panning; they do not set the frame (CLAUDE.md §9 step 4).
const DEFAULT_CENTER = [30.2711, -97.7437];
// Zoom 11, not 12. At 12 the frame was ~12.5km wide on a phone, which cut off
// the entire south-west cluster — Life Time South, Crunch South Austin, Club
// Pilates and JETSET South all sit ~9km west of centre. Ten of 35 priced pins
// were off-screen on mobile before a single deliberate pan.
//
// Re-centring does not fix it: the pin distribution's 10-90 midpoint is 1.5km
// from this centre, and moving there recovers one pin. The frame was not
// pointed in the wrong direction, it was too tight. Zoom 11 shows 34 of 35 on
// a phone and 34 of 35 on desktop; the one it still excludes is Life Time
// North at Lakeline, 22km out, which is exactly the outlier the paragraph
// above says must not set the frame.
const DEFAULT_ZOOM = 11;

// Pins closer together than this many pixels are treated as the same place —
// the same plaza, a shared building. Deliberately tiny: anything further apart
// is a crowding problem, and crowding is solved by nudging, not by hiding a
// price. With the current data this merges nothing at any zoom, which is the
// intended outcome rather than an accident.
const MERGE_PX = 8;

// Crowding. Bubbles are pushed apart along the cheaper axis, and never further
// than MAX_NUDGE_PX from the gym's true point — past that they are allowed to
// overlap, because a pin that wanders to stay readable is lying about where the
// gym is.
const NUDGE_PAD_PX = 3;
const MAX_NUDGE_PX = 18;

// How far members fan out when a merged bubble is expanded.
const FAN_RADIUS_PX = 30;

const money = (n) => `$${Number.isInteger(n) ? n : Number(n).toFixed(2)}`;

// Map display mode. "prices" is the default and stays the default: the price
// on the pin is the whole point of the site. "dots" exists because a price on
// every pin invites dismissing a gym before reading anything about it, so
// location-first browsing gets its own mode rather than a compromise between
// the two.
const DISPLAY_KEY = 'agp:map-display';
const DISPLAYS = ['prices', 'dots'];

/** localStorage is best-effort: private modes throw on access, and a map that
 *  cannot remember a preference is far better than a map that fails to load. */
function readDisplay() {
  try {
    const saved = window.localStorage.getItem(DISPLAY_KEY);
    return DISPLAYS.includes(saved) ? saved : 'prices';
  } catch {
    return 'prices';
  }
}

function writeDisplay(value) {
  try {
    window.localStorage.setItem(DISPLAY_KEY, value);
  } catch {
    /* preference simply does not persist; the map still works */
  }
}

export function initMap(container, pins, getState, regionBounds = []) {
  ensureLeafletCss();

  const map = L.map(container, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    scrollWheelZoom: false,
    zoomControl: true,
    attributionControl: true,
  });

  // CartoDB Positron — free, no API key, and already allowed by our CSP
  // img-src. Attribution carries both OpenStreetMap and CARTO as their terms
  // require.
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  let markers = [];
  let display = readDisplay();
  // Which merged bubble, if any, is currently fanned open. Keyed by its member
  // slugs so the expansion survives a re-render and a pan.
  let expandedKey = null;
  // Which selection we have already brought into view, and whether the
  // current one came from a pin click on this map (in which case the user is
  // already looking at it and panning would be jarring).
  let lastRevealed = null;
  let selfInitiated = false;

  const clear = () => {
    for (const m of markers) m.remove();
    markers = [];
  };

  /** Price a pin should display, given the current tab. Tab-aware for the same
   *  reason the cards are: a monthly figure on the Classes tab would be
   *  comparing a studio's month against a gym's month, which is the confusion
   *  the third tab exists to remove. */
  function priceOf(pin, mode) {
    if (mode === 'daypass') return pin.dayPass;
    if (mode === 'classes') return pin.perClass;
    return pin.allIn;
  }

  /**
   * Build a pin. The label is set with textContent and the ELEMENT is handed
   * to Leaflet, which appends it — never an HTML string, which Leaflet would
   * assign via innerHTML. Prices are numbers today, but the rule in §8 exists
   * so that a gym-supplied string can never reach an HTML sink by accident.
   */
  /** Rendered size of a bubble, needed before it exists so crowding can be
   *  resolved across the whole set in one pass. */
  function bubbleSize(label, className) {
    if (display === 'dots') {
      const s = className.includes('merged') ? 18 : 14;
      return { w: s, h: s };
    }
    return { w: label.length * 8 + 20, h: 26 };
  }

  function bubble(label, className, latlng, onClick, offset = { dx: 0, dy: 0 }) {
    const dots = display === 'dots';
    const el = document.createElement('span');
    el.className = dots ? `${className} dot` : className;
    // In dots mode the number is deliberately absent from the pin, but the pin
    // is still the only thing announcing this gym on the map — so the label it
    // would have shown becomes its accessible name rather than disappearing.
    if (dots) {
      // A bare <span> is not guaranteed to expose aria-label, so give the dot
      // a role that does. The list remains the accessible equivalent of the
      // map, but a pin should never be an unnamed blob either.
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', label);
    }
    else el.textContent = label;

    const { w, h } = bubbleSize(label, className);
    // The MARKER stays at the gym's true coordinates; only the icon's anchor
    // moves. Nudging is a drawing decision, never a change to where we claim
    // the gym is.
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        html: el,
        className: '',
        iconSize: [w, h],
        iconAnchor: [w / 2 - offset.dx, h / 2 - offset.dy],
      }),
      keyboard: false,
    });
    if (onClick) marker.on('click', onClick);
    return marker;
  }

  function render() {
    const { visible, mode, selected, region } = getState();
    clear();

    // Split into what we draw individually vs what can merge. Gyms with no
    // price for the current tab never merge — a range must not be computed
    // from a gym whose price we do not have.
    // A pin is drawn or it is not. There is no third state.
    //
    // Dimming was an affordance lie: a price bubble at 18% opacity still looks
    // like a price bubble, still invites a tap, and then swallows it. Anything
    // an attribute filter excludes is now simply absent, and anything present
    // is fully clickable.
    const points = pins
      .filter((pin) => visible.has(pin.slug))
      .map((pin) => ({
        pin,
        price: priceOf(pin, mode),
        point: map.latLngToLayerPoint([pin.lat, pin.lng]),
      }));

    // Gyms with no figure for this tab still draw — as a "Call" bubble, which
    // is a real state, not a faded one. The list has already dropped anything
    // the tab excludes outright.
    const mergeable = points.filter((p) => p.price !== null && p.price !== undefined);
    const quiet = points.filter((p) => p.price === null || p.price === undefined);

    const groups = mergeCoLocated(mergeable, MERGE_PX);

    // An expansion that no longer matches any group — because zooming split it
    // apart — is stale and must not keep a phantom fan alive.
    if (expandedKey && !groups.some((g) => groupKey(g) === expandedKey)) {
      expandedKey = null;
    }

    // Describe every bubble first. Nothing is added to the map until crowding
    // has been resolved across the whole set at once.
    const placed = [];

    for (const group of groups) {
      const key = groupKey(group);

      if (group.members.length === 1) {
        const { pin, price, point } = group.members[0];
        const cls = [
          'pin',
          `tier-${pin.tier ?? 2}`,
          selected === pin.slug ? 'active' : '',
        ]
          .filter(Boolean)
          .join(' ');
        placed.push({
          label: money(price), cls, latlng: [pin.lat, pin.lng], point,
          fan: { dx: 0, dy: 0 }, nudge: true, onClick: () => select(pin.slug),
        });
        continue;
      }

      if (expandedKey === key) {
        // Fanned open: each member is its own bubble at its own coordinates,
        // separated by the fan because they are only pixels apart in reality.
        const fans = fanOffsets(group.members.length, FAN_RADIUS_PX);
        group.members.forEach((m, i) => {
          const cls = [
            'pin',
            `tier-${m.pin.tier ?? 2}`,
            'fanned',
            selected === m.pin.slug ? 'active' : '',
          ]
            .filter(Boolean)
            .join(' ');
          placed.push({
            label: money(m.price), cls, latlng: [m.pin.lat, m.pin.lng], point: m.point,
            fan: fans[i], nudge: false, onClick: () => select(m.pin.slug),
          });
        });
        continue;
      }

      // Merged: the cheapest price plus how many more are underneath it.
      const holdsSelection = group.members.some((m) => m.pin.slug === selected);
      placed.push({
        label: mergedLabel(group.members, money),
        cls: `pin merged${holdsSelection ? ' active' : ''}`,
        latlng: map.layerPointToLatLng(L.point(group.point.x, group.point.y)),
        point: group.point,
        fan: { dx: 0, dy: 0 },
        nudge: true,
        onClick: () => {
          expandedKey = expandedKey === key ? null : key;
          render();
        },
      });
    }

    for (const p of quiet) {
      // "Call" is an instruction, and it is only true where we have CONFIRMED
      // the gym does not publish. A row we simply have not read yet gets a
      // hollow marker and no label — promising a phone call would answer a
      // question with a chore.
      const awaiting = p.pin.state === 'awaiting';
      const cls = [
        'pin',
        'callfor',
        awaiting ? 'pending' : '',
        selected === p.pin.slug ? 'active' : '',
      ]
        .filter(Boolean)
        .join(' ');
      placed.push({
        label: awaiting ? '' : 'Call',
        title: awaiting ? `${p.pin.name} — price not yet listed` : undefined,
        cls,
        latlng: [p.pin.lat, p.pin.lng],
        point: p.point,
        fan: { dx: 0, dy: 0 },
        nudge: true,
        // Every drawn pin is clickable. No exceptions — that is the invariant
        // dimming used to break.
        onClick: () => select(p.pin.slug),
      });
    }

    // Crowding, resolved once over everything that is actually visible.
    const nudgeIndex = placed.map((b, i) => (b.nudge ? i : -1)).filter((i) => i >= 0);
    const boxes = nudgeIndex.map((i) => {
      const { w, h } = bubbleSize(placed[i].label, placed[i].cls);
      return { x: placed[i].point.x + placed[i].fan.dx, y: placed[i].point.y + placed[i].fan.dy, w, h };
    });
    const shifts = nudgeApart(boxes, { padding: NUDGE_PAD_PX, maxShift: MAX_NUDGE_PX });
    const offsetFor = new Map(nudgeIndex.map((i, n) => [i, shifts[n]]));

    placed.forEach((b, i) => {
      const shift = offsetFor.get(i) ?? { dx: 0, dy: 0 };
      markers.push(
        bubble(b.label, b.cls, b.latlng, b.onClick, {
          dx: b.fan.dx + shift.dx,
          dy: b.fan.dy + shift.dy,
        }),
      );
    });

    for (const m of markers) m.addTo(map);

    frameRegion(region);

    revealSelection(selected, groups);
  }

  /**
   * Bring the selected gym into view. A selection made from the list is
   * useless if its pin is off-frame or hard against the edge — which is
   * exactly what happened with Crunch, sitting at 90% of the way to the
   * viewport edge while a dark tier-3 pin held the centre.
   *
   * Pans only. Zoom changes only when the gym is stacked under a merged
   * bubble and needs splitting out, per the spec.
   */
  function revealSelection(selected, groups) {
    if (!selected) {
      // Selection cleared. Forget what we last revealed, or re-selecting the
      // same gym is treated as "already in view" and never brought back —
      // including never zooming to split the stack it is hiding inside.
      lastRevealed = null;
      selfInitiated = false;
      return;
    }
    // Already revealed. Consume the self-initiated flag on the way past, or a
    // pin click on the gym that is already selected leaves it set and steals
    // the pan from the NEXT selection made from the list.
    if (selected === lastRevealed) {
      selfInitiated = false;
      return;
    }
    if (selfInitiated) {
      // Came from clicking this very pin; the user can see it already.
      lastRevealed = selected;
      selfInitiated = false;
      return;
    }

    const pin = pins.find((p) => p.slug === selected);
    if (!pin) return;
    lastRevealed = selected;

    const latlng = L.latLng(pin.lat, pin.lng);
    const merged = groups.find(
      (g) => g.members.length > 1 && g.members.some((m) => m.pin.slug === selected),
    );

    if (merged) {
      // Stacked under a merged bubble. Members are within MERGE_PX of each
      // other, so a single zoom step multiplies that gap fourfold and splits
      // them — centred on the gym itself, not the stack's midpoint. The merged
      // bubble wears the selected orange until it does.
      map.setView(latlng, Math.min(map.getZoom() + 2, 17), { animate: true });
      return;
    }

    // Require the pin to be comfortably inside, not technically inside: a
    // bubble hard against the edge reads as absent.
    if (!map.getBounds().pad(-0.15).contains(latlng)) {
      map.panTo(latlng, { animate: true, duration: 0.6 });
    }
  }

  // The map never owns selection. It announces intent; the page updates the
  // single shared state and re-renders both views. Two mirrored handlers each
  // holding their own copy is exactly how the card->pin direction went silently
  // dead, so there is only one copy now.
  function select(slug) {
    selfInitiated = true;
    track('map_pin', slug);
    document.dispatchEvent(new CustomEvent('gym:select', { detail: { slug } }));
  }

  /**
   * The display toggle. A real pair of buttons built with DOM APIs — no inline
   * handler, so script-src 'self' is untouched (CLAUDE.md §8). Deliberately
   * small and low-contrast: it is a preference, not a filter, and it must not
   * compete with the pins for attention.
   */
  function setDisplay(next) {
    if (display === next) return;
    display = next;
    writeDisplay(next);
    track('map_display', next);
    render();
  }

  const DisplayControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
      const wrap = L.DomUtil.create('div', 'map-display');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Map pin display');

      const buttons = DISPLAYS.map((value) => {
        const btn = L.DomUtil.create('button', 'map-display-btn', wrap);
        btn.type = 'button';
        btn.textContent = value === 'prices' ? '$ prices' : 'dots';
        btn.setAttribute('aria-pressed', String(display === value));
        btn.classList.toggle('on', display === value);
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stop(e);
          setDisplay(value);
          for (const b of buttons) {
            const on = b.dataset.display === display;
            b.setAttribute('aria-pressed', String(on));
            b.classList.toggle('on', on);
          }
        });
        btn.dataset.display = value;
        return btn;
      });

      // Clicks and scrolls on the control belong to the control, not the map.
      L.DomEvent.disableClickPropagation(wrap);
      L.DomEvent.disableScrollPropagation(wrap);
      return wrap;
    },
  });
  map.addControl(new DisplayControl());

  /**
   * Legend. Tiny, bottom-right, above the attribution. It exists because the
   * map encodes three separate meanings in colour — price tier, "no published
   * price", and "selected" — and an unlabelled colour code is a puzzle rather
   * than information. Built with DOM APIs, so no inline anything (§8).
   */
  const LEGEND = [
    ['tier-1', 'Under $40'],
    ['tier-2', '$40–100'],
    ['tier-3', '$100+'],
    ['callfor', 'No published price'],
    ['active', 'Selected'],
  ];

  const Legend = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd() {
      const wrap = L.DomUtil.create('div', 'map-legend');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'What the pin colours mean');
      for (const [cls, label] of LEGEND) {
        const row = L.DomUtil.create('span', 'legend-row', wrap);
        const chip = L.DomUtil.create('span', `legend-chip pin ${cls}`, row);
        chip.setAttribute('aria-hidden', 'true');
        const text = L.DomUtil.create('span', 'legend-label', row);
        text.textContent = label;
      }
      L.DomEvent.disableClickPropagation(wrap);
      return wrap;
    },
  });
  map.addControl(new Legend());

  // Clicking the map itself puts a fanned group away. Without this the only
  // way out of an expansion is zooming until the group splits, which is not an
  // exit a user would think to look for. Marker clicks do not reach here —
  // Leaflet stops their propagation — so selecting a fanned member keeps the
  // fan open, which is what you want while comparing two gyms at one address.
  /**
   * Region chips move the CAMERA, never the pin set.
   *
   * Filtering the map by region hid the very thing a map is for: seeing what is
   * nearby, including the gym just over the boundary. The list narrows to a
   * region; the map flies to it and keeps drawing everything. The two answer
   * different questions and should not share a mechanism.
   */
  let lastFramed = null;

  /** Camera moves are motion. Somebody who has asked the OS for less of it
   *  should get the new frame, not a flight to it. */
  function wantsMotion() {
    try {
      return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return true;
    }
  }

  function frameRegion(regionId) {
    if (regionId === lastFramed) return;
    lastFramed = regionId;
    if (!regionId || regionId === 'all') {
      // Per §9: the default frame is central Austin, never a fitBounds over
      // every pin — outliers do not get to set the frame.
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: wantsMotion() });
      return;
    }
    const r = regionBounds.find((b) => b.id === regionId);
    if (!r) return;
    // toBounds takes the box WIDTH, so a radius becomes a diameter.
    map.fitBounds(L.latLng(r.lat, r.lng).toBounds(r.radius_m * 2), {
      padding: [28, 28],
      animate: wantsMotion(),
    });
  }

  map.on('click', () => {
    if (!expandedKey) return;
    expandedKey = null;
    render();
  });

  map.on('zoomend moveend', render);
  document.addEventListener('filters:changed', render);

  render();
  return {
    map,
    render,
    invalidate: () => map.invalidateSize(),
    getDisplay: () => display,
    setDisplay,
  };
}
