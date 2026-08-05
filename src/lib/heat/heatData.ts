import places from '../data/places.json';
import ski from '../data/ski.json';
import mountains from '../data/mountains.json';
import lived from '../data/lived.json';

/**
 * One weighted sample in the heat field.
 *
 * `days` is the recorded length of the stay when the entry carries the
 * Start/End/Days range fields, and FALLBACK_DAYS otherwise. `recorded` keeps
 * that distinction visible so the legend can be honest about coverage instead
 * of implying every place was measured.
 */
export interface HeatPoint {
  lat: number;
  lon: number;
  city: string;
  days: number;
  recorded: boolean;
  /** Stable per-place value used to shape the bloom's organic lobes. */
  seed: number;
}

/**
 * Places without a recorded range still happened, so they belong on the map —
 * they just contribute the smallest possible amount of time.
 */
export const FALLBACK_DAYS = 1;

interface RawEntry {
  City: string;
  Latitude: number;
  Longitude: number;
  Days?: number;
}

const hashString = (value: string): number => {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const toHeatPoints = (rows: RawEntry[]): HeatPoint[] =>
  rows
    .filter((row) => typeof row.Latitude === 'number' && typeof row.Longitude === 'number')
    .map((row) => {
      const recorded = typeof row.Days === 'number' && row.Days > 0;
      return {
        lat: row.Latitude,
        lon: row.Longitude,
        city: row.City,
        days: recorded ? (row.Days as number) : FALLBACK_DAYS,
        recorded,
        seed: hashString(row.City) % 9973
      };
    });

export const HEAT_POINTS: HeatPoint[] = [
  ...toHeatPoints(places as RawEntry[]),
  ...toHeatPoints(ski as RawEntry[]),
  ...toHeatPoints(mountains as RawEntry[]),
  ...toHeatPoints(lived as RawEntry[])
];

export const HEAT_MAX_DAYS = HEAT_POINTS.reduce((max, p) => Math.max(max, p.days), 1);

export const HEAT_RECORDED_COUNT = HEAT_POINTS.filter((p) => p.recorded).length;

export const HEAT_TOTAL_COUNT = HEAT_POINTS.length;

export const HEAT_RECORDED_DAYS = HEAT_POINTS.reduce(
  (sum, p) => sum + (p.recorded ? p.days : 0),
  0
);

const MIN_LOG = Math.log1p(FALLBACK_DAYS);
const LOG_SPAN = Math.log1p(HEAT_MAX_DAYS) - MIN_LOG;

/**
 * Map a stay length onto 0..1.
 *
 * The distribution is heavily skewed — most stays are one to three days and a
 * single one runs four weeks — so a linear scale would flatten almost every
 * place into the palest band. Log spacing anchored at the one-day floor keeps
 * the common 1-7 day range spread across most of the ramp.
 */
export const normalizedWeight = (days: number): number => {
  if (LOG_SPAN <= 0) return 0;
  const t = (Math.log1p(Math.max(FALLBACK_DAYS, days)) - MIN_LOG) / LOG_SPAN;
  return Math.min(1, Math.max(0, t));
};

/**
 * Per-blob opacity before neighbours pool on top.
 *
 * Calibrated against the glaze bands rather than picked by eye: each blob is
 * drawn as three overlapping lobes, so a lone place peaks at roughly 2x this
 * value. `floor` is therefore set so a single unrecorded night lands in the
 * first glaze and a four-week stay lands mid-ramp — which leaves the dark end
 * of the scale to mean what it says, a region returned to again and again.
 */
export const blobIntensity = (weight: number, floor: number, span: number): number =>
  floor + span * weight;
