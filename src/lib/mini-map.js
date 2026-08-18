/**
 * Single-pin map for gym detail pages. Same lazy contract as the index map:
 * Leaflet is only pulled in when this module is, and this module is only
 * imported when the container scrolls into view.
 */
import L from 'leaflet';

function ensureLeafletCss() {
  const href = '/vendor/leaflet.css';
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function initMiniMap(container, lat, lng) {
  ensureLeafletCss();

  const map = L.map(container, {
    center: [lat, lng],
    zoom: 15,
    scrollWheelZoom: false,
    zoomControl: false,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  const dot = document.createElement('span');
  dot.className = 'gym-dot';
  L.marker([lat, lng], {
    icon: L.divIcon({ html: dot, className: '', iconSize: [18, 18], iconAnchor: [9, 9] }),
    keyboard: false,
  }).addTo(map);

  return map;
}
