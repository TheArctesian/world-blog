import { env } from '$env/dynamic/private';

export type CurrentLocation = {
  available: boolean;
  city?: string | null;
  country?: string | null;
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

const reverseGeocode = async (
  lat: number,
  lng: number,
  timeoutMs: number
): Promise<{ city: string | null; country: string | null }> => {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '10');
  url.searchParams.set('accept-language', 'en');

  const res = await fetch(url, {
    headers: { 'User-Agent': NOMINATIM_UA, Accept: 'application/json' },
    signal: withTimeout(undefined, timeoutMs)
  });
  if (!res.ok) return { city: null, country: null };
  const data: { address?: Record<string, string> } = await res.json();
  const a = data.address ?? {};
  const rawCity =
    a.city ||
    a.town ||
    a.village ||
    a.hamlet ||
    a.municipality ||
    a.suburb ||
    a.county ||
    null;
  const city = rawCity ? normalizeCity(rawCity) : null;
  const country = a.country || null;
  return { city, country };
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

  let city = p.city ?? null;
  let country = p.country_name || p.country || null;
  if (!city) {
    try {
      const geo = await reverseGeocode(lat, lng, timeoutMs);
      city = geo.city;
      country = country ?? geo.country;
    } catch {
      // Geocoder failure is non-fatal — we can still return rounded coords.
    }
  }

  const payload: CurrentLocation = {
    available: true,
    city,
    country,
    latitude: approximate(lat),
    longitude: approximate(lng),
    timestampMs: toMillis(p.timestamp)
  };

  cache = { at: Date.now(), payload };
  return payload;
}
