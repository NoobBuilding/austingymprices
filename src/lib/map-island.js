/**
 * Map island. Imported dynamically so no Leaflet byte is fetched until the
 * map is actually wanted (CLAUDE.md §9 step 4 performance budget).
 *
 * Clustering is hand-rolled rather than pulled from a plugin, for two reasons:
 * the spec wants clustering to stay minimal so individual pins survive to a
 * fairly wide zoom, and the cluster label must be the PRICE RANGE of its
 * members rather than a count — a count tells you nothing you came for.
 */
import L from 'leaflet';
import { clusterLabel, clusterPoints } from './cluster.js';

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
const DEFAULT_ZOOM = 12;

// Pins closer together than this many pixels merge. Deliberately small so
// clustering stays rare.
const CLUSTER_PX = 44;

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

export function initMap(container, pins, getState) {
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
  // Which selection we have already brought into view, and whether the
  // current one came from a pin click on this map (in which case the user is
  // already looking at it and panning would be jarring).
  let lastRevealed = null;
  let selfInitiated = false;

  const clear = () => {
    for (const m of markers) m.remove();
    markers = [];
  };

  /** Price a pin should display, given the current tab. */
  function priceOf(pin, mode) {
    return mode === 'daypass' ? pin.dayPass : pin.allIn;
  }

  /**
   * Build a pin. The label is set with textContent and the ELEMENT is handed
   * to Leaflet, which appends it — never an HTML string, which Leaflet would
   * assign via innerHTML. Prices are numbers today, but the rule in §8 exists
   * so that a gym-supplied string can never reach an HTML sink by accident.
   */
  function bubble(label, className, latlng, onClick) {
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

    const size = dots ? (className.includes('cluster') ? 18 : 14) : label.length * 8 + 20;
    const height = dots ? size : 26;
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        html: el,
        className: '',
        iconSize: [size, height],
        iconAnchor: [size / 2, height / 2],
      }),
      keyboard: false,
    });
    if (onClick) marker.on('click', onClick);
    return marker;
  }

  function render() {
    const { visible, mode, selected } = getState();
    clear();

    // Split into what we draw individually vs what can merge. Gyms with no
    // price for the current tab never merge — a range must not be computed
    // from a gym whose price we do not have.
    const points = pins.map((pin) => {
      const price = priceOf(pin, mode);
      const shown = visible.has(pin.slug);
      return {
        pin,
        price,
        shown,
        // Day-pass tab, gym has no published pass: faded and inert.
        noPass: mode === 'daypass' && (price === null || price === undefined),
        point: map.latLngToLayerPoint([pin.lat, pin.lng]),
      };
    });

    const clusterable = points.filter((p) => p.shown && !p.noPass && p.price !== null);
    const standalone = points.filter((p) => !p.shown || p.noPass || p.price === null);

    const groups = clusterPoints(clusterable, CLUSTER_PX);

    for (const group of groups) {
      if (group.members.length === 1) {
        const { pin, price } = group.members[0];
        const label = money(price);
        const cls = [
          'pin',
          `tier-${pin.tier ?? 2}`,
          selected === pin.slug ? 'active' : '',
        ]
          .filter(Boolean)
          .join(' ');
        markers.push(bubble(label, cls, [pin.lat, pin.lng], () => select(pin.slug)));
      } else {
        const label = clusterLabel(group.members, money);
        const centre = map.layerPointToLatLng(L.point(group.point.x, group.point.y));
        const holdsSelection = group.members.some((m) => m.pin.slug === selected);
        markers.push(
          bubble(label, `pin cluster${holdsSelection ? ' active' : ''}`, centre, () => {
            map.setView(centre, Math.min(map.getZoom() + 2, 18));
          }),
        );
      }
    }

    for (const p of standalone) {
      const priced = p.price !== null && p.price !== undefined;
      const label = priced ? money(p.price) : 'Call';
      const cls = [
        'pin',
        priced ? `tier-${p.pin.tier ?? 2}` : 'callfor',
        p.noPass ? 'nopass' : '',
        !p.shown ? 'dim' : '',
        selected === p.pin.slug ? 'active' : '',
      ]
        .filter(Boolean)
        .join(' ');
      markers.push(
        bubble(
          label,
          cls,
          [p.pin.lat, p.pin.lng],
          p.shown && !p.noPass ? () => select(p.pin.slug) : null,
        ),
      );
    }

    for (const m of markers) m.addTo(map);

    revealSelection(selected, groups);
  }

  /**
   * Bring the selected gym into view. A selection made from the list is
   * useless if its pin is off-frame or hard against the edge — which is
   * exactly what happened with Crunch, sitting at 90% of the way to the
   * viewport edge while a dark tier-3 pin held the centre.
   *
   * Pans only. Zoom changes only when the gym is merged into a cluster and
   * needs resolving, per the spec.
   */
  function revealSelection(selected, groups) {
    if (!selected) {
      // Selection cleared. Forget what we last revealed, or re-selecting the
      // same gym is treated as "already in view" and never brought back —
      // including never zooming to resolve the cluster it is hiding inside.
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
    const cluster = groups.find(
      (g) => g.members.length > 1 && g.members.some((m) => m.pin.slug === selected),
    );

    if (cluster) {
      // Merged into a cluster: zoom just enough to break it out, centred on
      // the gym itself rather than the cluster centroid.
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
