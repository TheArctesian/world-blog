import { env } from '$env/dynamic/private';

export type CurrentLocation = {
  available: boolean;
  // Most specific neighbourhood / suburb / quarter, when one exists.
  district?: string | null;
  city?: string | null;
  // The trailing label component: state abbreviation for US/CA
  // ("CA", "ON"), short country name otherwise ("UK", "France").
  region?: string | null;
  // Full country name; kept around for aria-labels and debugging.
  country?: string | null;
  // Pre-formatted display string, e.g. "South Bank, London, UK" /
  // "Berkeley, CA". Built server-side so every consumer renders the same.
  label?: string | null;
  latitude?: number;
  longitude?: number;
  timestampMs?: number;
};

type DawarichPoint = {
  latitude: string | number;
  longitude: string | number;
  timestamp: number | string;
  city?: string | null;
  country?: string | null;
  country_name?: string | null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const NOMINATIM_UA = 'world-blog/1.0 (dev@stephenokita.com)';
const DEFAULT_TIMEOUT_MS = 3000;

let cache: { at: number; payload: CurrentLocation } | null = null;

const empty = (): CurrentLocation => ({ available: false });

// Round to ~11 km so anything we surface (API response, SSR'd HTML, marker
// position) stays at city-level precision rather than exact GPS coords.
const approximate = (n: number): number => Math.round(n * 10) / 10;

const toMillis = (ts: number | string): number | undefined => {
  if (typeof ts === 'number') return ts < 1e12 ? ts * 1000 : ts;
  const parsed = Date.parse(ts);
  if (Number.isFinite(parsed)) return parsed;
  const n = Number(ts);
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
  return undefined;
};

// OSM administrative names are often noisier than what a human would say:
// "Greater London", "City of New York", "Metropolitan City of Milan", etc.
const normalizeCity = (raw: string): string =>
  raw.replace(/^(Greater|City of|Metropolitan City of|Municipality of)\s+/i, '').trim();

// Short forms people actually use in addresses. We're conservative here —
// only countries whose long names are awkward enough to be worth shortening.
const COUNTRY_SHORT_NAMES: Record<string, string> = {
  'United Kingdom': 'UK',
  'United States': 'USA',
  'United States of America': 'USA',
  'United Arab Emirates': 'UAE',
  'Czech Republic': 'Czechia',
  'Russian Federation': 'Russia',
  "People's Republic of China": 'China',
  'Republic of Korea': 'South Korea',
  'Republic of Ireland': 'Ireland'
};

const shortCountry = (full: string | null | undefined): string | null => {
  if (!full) return null;
  return COUNTRY_SHORT_NAMES[full] ?? full;
};

// "US-CA" → "CA". Used for US/CA where the address convention is
// city + state-abbrev rather than city + country.
const stateAbbrev = (iso: string | undefined): string | null => {
  if (!iso) return null;
  const parts = iso.split('-');
  if (parts.length !== 2) return null;
  return /^[A-Z]{2}$/.test(parts[1]) ? parts[1] : null;
};

const USES_STATE_NOT_COUNTRY = new Set(['us', 'ca']);

const buildLabel = (
  district: string | null,
  city: string | null,
  region: string | null
): string | null => {
  const parts = [district, city, region]
    .filter((p): p is string => !!p && p.length > 0)
    // Adjacent duplicates (e.g. district === city) read awkwardly.
    .filter((p, i, arr) => i === 0 || p !== arr[i - 1]);
  return parts.length > 0 ? parts.join(', ') : null;
};

const withTimeout = (signal: AbortSignal | undefined, ms: number): AbortSignal => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  if (signal) {
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      ctrl.abort();
    });
  }
  // Once the consumer is done we don't strictly need to clear; GC handles it.
  return ctrl.signal;
};

type GeocodeResult = {
  district: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

const reverseGeocode = async (
  lat: number,
  lng: number,
  timeoutMs: number
): Promise<GeocodeResult> => {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  // zoom=14 returns suburb/quarter-level detail in dense cities while still
  // collapsing to the city itself in places like Berkeley that have no
  // sub-city granularity.
  url.searchParams.set('zoom', '14');
  url.searchParams.set('accept-language', 'en');

  const res = await fetch(url, {
    headers: { 'User-Agent': NOMINATIM_UA, Accept: 'application/json' },
    signal: withTimeout(undefined, timeoutMs)
  });
  if (!res.ok) return { district: null, city: null, region: null, country: null };
  const data: { address?: Record<string, string> } = await res.json();
  const a = data.address ?? {};

  // District: most specific first. We skip `city_district` because OSM uses
  // names like "London Borough of Lambeth" there — too administrative to
  // read as a neighbourhood label.
  const rawDistrict =
    a.neighbourhood ||
    a.quarter ||
    a.suburb ||
    a.borough ||
    null;
  const district = rawDistrict ? rawDistrict.trim() : null;

  const rawCity =
    a.city ||
    a.town ||
    a.village ||
    a.hamlet ||
    a.municipality ||
    a.county ||
    null;
  const city = rawCity ? normalizeCity(rawCity) : null;

  const countryFull = a.country || null;
  const cc = (a.country_code || '').toLowerCase();
  const region = USES_STATE_NOT_COUNTRY.has(cc)
    ? stateAbbrev(a['ISO3166-2-lvl4']) || a.state || null
    : shortCountry(countryFull);

  return { district, city, region, country: countryFull };
};

export async function getCurrentLocation(
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CurrentLocation> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.payload;

  const apiKey = env.DAWARICH_API_KEY;
  const baseUrl = env.DAWARICH_BASE_URL ?? 'https://find.stephenokita.com';
  if (!apiKey) return empty();

  const url = new URL('/api/v1/points', baseUrl);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('order_by', 'timestamp');

  let points: DawarichPoint[];
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: withTimeout(undefined, timeoutMs)
    });
    if (!res.ok) return empty();
    const body = await res.json();
    points = Array.isArray(body) ? body : [];
  } catch {
    return empty();
  }
  if (points.length === 0) return empty();

  const p = points[0];
  const lat = typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude;
  const lng = typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return empty();

  let district: string | null = null;
  let city: string | null = p.city ?? null;
  let region: string | null = null;
  let country: string | null = p.country_name || p.country || null;
  try {
    const geo = await reverseGeocode(lat, lng, timeoutMs);
    district = geo.district;
    city = city ?? geo.city;
    region = geo.region;
    country = country ?? geo.country;
  } catch {
    // Geocoder failure is non-fatal — we can still return rounded coords.
  }

  const payload: CurrentLocation = {
    available: true,
    district,
    city,
    region,
    country,
    label: buildLabel(district, city, region),
    latitude: approximate(lat),
    longitude: approximate(lng),
    timestampMs: toMillis(p.timestamp)
  };

  cache = { at: Date.now(), payload };
  return payload;
}
