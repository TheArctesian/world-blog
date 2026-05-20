import type { Map, Icon } from 'leaflet';
import type { LocationData } from './types.js';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return ch;
    }
  });

// Hand-drawn 5-point star path (slightly imperfect coords for a sketchy feel).
const STAR_PATH = 'M12 2.4 L14.5 8.6 L21.1 9.3 L16 13.9 L17.4 20.5 L12 17.1 L6.5 20.4 L8 13.9 L2.9 9.2 L9.6 8.5 Z';

const renderStars = (rating: number): string => {
  const total = 5;
  const filled = Math.max(0, Math.min(total, Math.round(rating)));
  let html = '<div class="marker-tooltip-rating" aria-label="Rating ' + filled + ' out of ' + total + '">';
  for (let i = 0; i < total; i++) {
    const isFilled = i < filled;
    // Slight per-star rotation gives a hand-drawn jitter.
    const rotations = [-4, 3, -2, 4, -3];
    html += `<svg class="marker-tooltip-star ${isFilled ? 'is-filled' : 'is-empty'}" viewBox="0 0 24 24" style="transform: rotate(${rotations[i]}deg)" aria-hidden="true">`;
    html += `<path d="${STAR_PATH}" stroke-linejoin="round" stroke-linecap="round" />`;
    html += `</svg>`;
  }
  html += '</div>';
  return html;
};

export const createPopupContent = (location: LocationData): string => {
  const city = escapeHtml(location.City);
  const date = escapeHtml(String(location.Date));
  const ratingHtml = typeof location.Rating === 'number' ? renderStars(location.Rating) : '';
  const notesHtml = location.Notes ? `<div class="marker-tooltip-notes">${escapeHtml(location.Notes)}</div>` : '';
  return `
    <div class="marker-tooltip-city">${city}</div>
    <div class="marker-tooltip-date">Date first visited ${date}</div>
    ${ratingHtml}
    ${notesHtml}
  `.trim();
};

export const addMarkersToMap = (
  leaflet: any,
  map: Map,
  locations: LocationData[],
  icon: Icon
): void => {
  locations.forEach((location) => {
    const html = `<div class="marker-tooltip marker-tooltip-leaflet-inner">${createPopupContent(location)}</div>`;
    leaflet
      .marker([location.Latitude, location.Longitude], { icon })
      .bindPopup(html, { className: 'marker-tooltip-leaflet' })
      .addTo(map);
  });
};

export const clearAllMarkers = (map: Map): void => {
  map.eachLayer((layer: any) => {
    if (layer.options && layer.options.icon) {
      map.removeLayer(layer);
    }
  });
};
