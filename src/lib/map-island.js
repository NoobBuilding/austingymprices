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
    const el = document.createElement('span');
    el.className = className;
    el.textContent = label;

    const width = label.length * 8 + 20;
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        html: el,
        className: '',
        iconSize: [width, 26],
        iconAnchor: [width / 2, 13],
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
        ].join(' ');
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
    if (!selected || selected === lastRevealed) return;
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

  map.on('zoomend moveend', render);
  document.addEventListener('filters:changed', render);

  render();
  return { map, render, invalidate: () => map.invalidateSize() };
}
