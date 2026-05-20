import places from './places.json';
import ski from './ski.json';
import mountains from './mountains.json';
import lived from './lived.json';

type Entry = { City: string; Latitude: number; Longitude: number };

/**
 * Best-effort coordinate -> country classifier covering the countries that
 * appear in this site's travel data. Bounding boxes are ordered so that the
 * smallest / most-specific region is checked first; tricky alpine borders
 * (Mont Blanc, Lake Como, Donegal vs. Northern Ireland, etc.) have explicit
 * carve-outs.
 */
function countryFromCoords(lat: number, lng: number): string {
  // ── Mont Blanc / Chamonix valley special cases ───────────────────────────
  // Chamonix valley (France) — west of the Swiss border
  if (lat >= 45.85 && lat <= 46.10 && lng >= 6.65 && lng <= 6.95) return 'France';
  // Beaufortain / Les Contamines / Ville des Glaciers (France)
  if (lat >= 45.65 && lat < 45.85 && lng >= 6.65 && lng <= 6.85) return 'France';
  // Courmayeur (Italy, Aosta Valley) — south of Mont Blanc
  if (lat >= 45.75 && lat <= 45.85 && lng >= 6.95 && lng <= 7.05) return 'Italy';
  // Lake Como (Italy, juts into Swiss bounding box)
  if (lat >= 45.95 && lat <= 46.10 && lng >= 9.20 && lng <= 9.50) return 'Italy';

  // ── Microstates & SARs (smallest first) ──────────────────────────────────
  if (lat >= 22.10 && lat <= 22.25 && lng >= 113.50 && lng <= 113.65) return 'Macau';
  if (lat >= 22.15 && lat <= 22.55 && lng >= 113.83 && lng <= 114.50) return 'Hong Kong';
  if (lat >= 1.20 && lat <= 1.50 && lng >= 103.60 && lng <= 104.05) return 'Singapore';
  if (lat >= 42.42 && lat <= 42.66 && lng >= 1.40 && lng <= 1.80) return 'Andorra';
  if (lat >= 42.15 && lat <= 43.55 && lng >= 18.40 && lng <= 20.40) return 'Montenegro';
  if (lat >= 4.00 && lat <= 5.05 && lng >= 114.10 && lng <= 115.40) return 'Brunei';
  if (lat >= 24.50 && lat <= 26.20 && lng >= 50.75 && lng <= 51.65) return 'Qatar';
  if (lat >= -0.70 && lat <= 7.10 && lng >= 72.50 && lng <= 73.80) return 'Maldives';
  if (lat >= -10.20 && lat <= -3.70 && lng >= 46.20 && lng <= 56.30) return 'Seychelles';
  if (lat >= 12.85 && lat <= 13.35 && lng >= -59.70 && lng <= -59.40) return 'Barbados';
  if (lat >= 17.70 && lat <= 18.55 && lng >= -78.40 && lng <= -76.20) return 'Jamaica';

  // ── Europe ───────────────────────────────────────────────────────────────
  // Switzerland (after Lake Como / Mont Blanc carve-outs above)
  if (lat >= 45.82 && lat <= 47.81 && lng >= 5.96 && lng <= 10.50) return 'Switzerland';
  // Austria (Tyrol and east); checked before Germany rules so the western tip
  // doesn't get swallowed
  if (lat >= 46.37 && lat <= 49.02 && lng >= 9.53 && lng <= 17.16) {
    // The Bavaria/Salzburg lobes belong to Germany — exclude the band that
    // is unambiguously German (lat ≥ 47.6 AND lng ≤ 13.0).
    if (lat >= 47.6 && lng <= 13.0) return 'Germany';
    return 'Austria';
  }
  // Germany (Bavaria + everything north)
  if (lat >= 47.27 && lat <= 55.06 && lng >= 5.86 && lng <= 15.05) return 'Germany';
  // Croatia (checked before Italy so the Dalmatian coast doesn't fall into Italy's eastern bbox)
  if (lat >= 42.39 && lat <= 46.55 && lng >= 13.50 && lng <= 19.45) return 'Croatia';
  // Italy
  if (lat >= 35.49 && lat <= 47.10 && lng >= 6.62 && lng <= 18.52) return 'Italy';
  // France (incl. Corsica)
  if (lat >= 41.30 && lat <= 51.10 && lng >= -5.15 && lng <= 9.56) return 'France';
  // Netherlands
  if (lat >= 50.75 && lat <= 53.55 && lng >= 3.31 && lng <= 7.23) return 'Netherlands';
  // Portugal
  if (lat >= 36.96 && lat <= 42.16 && lng >= -9.51 && lng <= -6.18) return 'Portugal';
  // Spain (mainland + Balearics)
  if (lat >= 35.95 && lat <= 43.79 && lng >= -9.40 && lng <= 3.32) return 'Spain';
  // Donegal county (Republic of Ireland) — north of the main island, west of NI
  if (lat >= 54.5 && lat <= 55.4 && lng >= -8.65 && lng <= -7.50) return 'Ireland';
  // Northern Ireland (UK)
  if (lat >= 54.00 && lat <= 55.35 && lng >= -8.20 && lng <= -5.40) return 'UK';
  // Ireland (Republic)
  if (lat >= 51.40 && lat <= 55.45 && lng >= -10.60 && lng <= -5.40) return 'Ireland';
  // UK mainland (England, Scotland, Wales)
  if (lat >= 49.85 && lat <= 60.90 && lng >= -8.65 && lng <= 1.85) return 'UK';
  // Turkey
  if (lat >= 35.80 && lat <= 42.20 && lng >= 26.00 && lng <= 45.00) return 'Turkey';

  // ── Africa ───────────────────────────────────────────────────────────────
  if (lat >= 21.00 && lat <= 36.00 && lng >= -17.30 && lng <= -1.00) return 'Morocco';
  if (lat >= -35.00 && lat <= -22.00 && lng >= 16.00 && lng <= 33.00) return 'South Africa';
  if (lat >= -12.00 && lat <= -0.95 && lng >= 29.00 && lng <= 41.00) return 'Tanzania';

  // ── Asia ─────────────────────────────────────────────────────────────────
  if (lat >= 24.00 && lat <= 46.00 && lng >= 122.50 && lng <= 146.00) return 'Japan';
  if (lat >= 21.50 && lat <= 25.50 && lng >= 119.50 && lng <= 122.10) return 'Taiwan';
  if (lat >= 18.00 && lat <= 54.00 && lng >= 73.00 && lng <= 135.00) return 'China';
  if (lat >= 5.50 && lat <= 20.50 && lng >= 97.30 && lng <= 105.70) return 'Thailand';
  if (lat >= 0.85 && lat <= 7.40 && lng >= 99.60 && lng <= 119.30) return 'Malaysia';
  if (lat >= -11.00 && lat <= 6.10 && lng >= 95.00 && lng <= 141.10) return 'Indonesia';
  if (lat >= 6.70 && lat <= 35.50 && lng >= 68.00 && lng <= 97.40) return 'India';

  // ── Oceania ──────────────────────────────────────────────────────────────
  if (lat >= -43.70 && lat <= -10.50 && lng >= 113.10 && lng <= 153.70) return 'Australia';

  // ── Americas ─────────────────────────────────────────────────────────────
  // Canada (everything north of the 49th parallel west of the Great Lakes)
  if (lat >= 49.00 && lng >= -141.00 && lng <= -52.60) return 'Canada';
  // USA (continental, capped at the 49th parallel for our data)
  if (lat >= 24.40 && lat < 49.00 && lng >= -125.00 && lng <= -66.90) return 'USA';
  // Argentina
  if (lat >= -55.10 && lat <= -21.80 && lng >= -73.60 && lng <= -53.60) return 'Argentina';

  return 'Unknown';
}

const allEntries: Entry[] = [
  ...(places as Entry[]),
  ...(ski as Entry[]),
  ...(mountains as Entry[]),
  ...(lived as Entry[]),
];

export const totalPlaces = allEntries.length;

export const totalCountries = (() => {
  const set = new Set<string>();
  for (const e of allEntries) {
    const country = countryFromCoords(e.Latitude, e.Longitude);
    if (country !== 'Unknown') set.add(country);
  }
  return set.size;
})();

export { countryFromCoords };
