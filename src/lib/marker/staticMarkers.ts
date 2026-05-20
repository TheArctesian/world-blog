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

const MONTH_ABBREV: Record<string, string> = {
  jan: 'JAN', january: 'JAN',
  feb: 'FEB', february: 'FEB',
  mar: 'MAR', march: 'MAR',
  apr: 'APR', april: 'APR',
  may: 'MAY',
  jun: 'JUN', june: 'JUN',
  jul: 'JUL', july: 'JUL',
  aug: 'AUG', august: 'AUG',
  sep: 'SEP', sept: 'SEP', september: 'SEP',
  oct: 'OCT', october: 'OCT',
  nov: 'NOV', november: 'NOV',
  dec: 'DEC', december: 'DEC'
};

const parseDateForStamp = (raw: string | number): { month: string | null; year: string; original: string } => {
  const original = String(raw).trim();
  // "Month YYYY" — e.g. "May 2026", "July 2005"
  const monthYear = original.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const month = MONTH_ABBREV[monthYear[1].toLowerCase()];
    if (month) return { month, year: monthYear[2], original };
  }
  // Year only — e.g. 2019
  const yearOnly = original.match(/^(\d{4})$/);
  if (yearOnly) return { month: null, year: yearOnly[1], original };
  // Fallback: shove whatever it is into the year slot
  return { month: null, year: original, original };
};

// Watercolor stamp palette — each entry pairs a soft body tone with a deeper
// ink tone for the date type and cancel mark. Cities pick deterministically
// from this list so a given marker always lands the same color, but adjacent
// markers on the map look like genuinely different pieces of mail.
const STAMP_PALETTE: { bg: string; ink: string; tilt: number }[] = [
  { bg: '#efe5cb', ink: '#5d4a2f', tilt: -5 }, // warm sepia
  { bg: '#e9c9c2', ink: '#6b3b3b', tilt: 4 },  // dusty rose
  { bg: '#cad9c0', ink: '#3d5a3f', tilt: -3 }, // sage
  { bg: '#c5d6e1', ink: '#2c4a63', tilt: 5 },  // faded blue
  { bg: '#edd8a8', ink: '#6e5224', tilt: -6 }, // pale ochre
  { bg: '#d9cee2', ink: '#4a3a63', tilt: 3 },  // lavender
  { bg: '#dfc9b8', ink: '#5a3e26', tilt: -4 }, // kraft
];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const pickStampStyle = (city: string) => STAMP_PALETTE[hashString(city) % STAMP_PALETTE.length];

const renderStamp = (city: string, rawDate: string | number): string => {
  const { month, year, original } = parseDateForStamp(rawDate);
  const { bg, ink, tilt } = pickStampStyle(city);
  const monthHtml = month ? `<span class="stamp-month">${escapeHtml(month)}</span>` : '';
  const yearHtml = `<span class="stamp-year">${escapeHtml(year)}</span>`;
  // Cancel mark: an elliptical "kiss" plus a soft wave — like a real postmark
  // that swept across the stamp on its way through the system.
  const cancel = `
    <svg class="stamp-cancel" viewBox="0 0 80 60" aria-hidden="true">
      <ellipse cx="40" cy="30" rx="30" ry="19" />
      <path d="M6 38 q10 -4 20 0 t20 0 t20 0" />
    </svg>
  `;
  const modifier = month ? '' : ' is-year-only';
  const styleAttr = `style="--stamp-bg: ${bg}; --stamp-ink: ${ink}; --stamp-tilt: ${tilt}deg;"`;
  return `
    <div class="marker-tooltip-stamp${modifier}" ${styleAttr} aria-label="Visited ${escapeHtml(original)}">
      ${monthHtml}
      ${yearHtml}
      ${cancel}
    </div>
  `;
};

export const createPopupContent = (location: LocationData): string => {
  const city = escapeHtml(location.City);
  const stampHtml = renderStamp(location.City, location.Date);
  const ratingHtml = typeof location.Ratings === 'number' ? renderStars(location.Ratings) : '';
  const notesHtml = location.Notes
    ? `<div class="marker-tooltip-notes">${escapeHtml(location.Notes)}</div>`
    : '';
  return `
    ${stampHtml}
    <div class="marker-tooltip-city">${city}</div>
    ${ratingHtml}
    <div class="marker-tooltip-divider" aria-hidden="true"></div>
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
    // `live: true` flags the live-location marker so toggling timeline / static
    // mode doesn't repeatedly add and remove it.
    if (layer.options && layer.options.icon && !layer.options.live) {
      map.removeLayer(layer);
    }
  });
};
