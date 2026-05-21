import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type CurrentLocation = {
  available: boolean;
  district?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  label?: string | null;
  latitude?: number;
  longitude?: number;
  timestampMs?: number;
};

const REFRESH_MS = 5 * 60 * 1000;

export const currentLocation = writable<CurrentLocation | null>(null);

let polling = false;
let pollHandle: ReturnType<typeof setInterval> | null = null;

const fetchOnce = async (): Promise<void> => {
  try {
    const res = await fetch('/api/current-location');
    if (!res.ok) return;
    const payload = (await res.json()) as CurrentLocation;
    currentLocation.set(payload);
  } catch {
    // Network blip; next tick will retry.
  }
};

// Multiple components subscribe (pill + map marker), so the polling itself
// runs once globally rather than per-component.
export const startCurrentLocationPolling = (): void => {
  if (!browser || polling) return;
  polling = true;
  fetchOnce();
  pollHandle = setInterval(fetchOnce, REFRESH_MS);
};

export const formatAgo = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};
