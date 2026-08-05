/**
 * Sequential single-hue ramp for the heat wash: diluted pigment through to
 * concentrated pigment, light to dark.
 *
 * The hue is mulberry, and that is the whole point. Stamen watercolor paints
 * land in tan and ochre and water in cyan, which rules out the obvious warm
 * ramp — a straw-to-terracotta scale was tried first and its two palest glazes
 * were indistinguishable from bare land, so the low end of the scale simply
 * vanished wherever it mattered. Mulberry is absent from the basemap, so every
 * step separates against tan, sand and water alike, and it still reads as a
 * pigment (alizarin pulled toward ultramarine) rather than as UI chrome.
 *
 * The bands are deliberately discrete. A continuous gradient reads as airbrush;
 * stacked glazes with a visible edge where each one dried read as watercolor,
 * and they double as a quantized legend the eye can actually count.
 */
export interface HeatBand {
  /** Lower bound on accumulated intensity, 0..1. */
  from: number;
  color: string;
  alpha: number;
  /** Short legend caption. */
  label: string;
}

/**
 * Opacities are pitched high for a wash. Stamen watercolor is a busy,
 * high-frequency texture, and anything under about 40% on the first glaze
 * disappears into the paper grain of the tiles themselves rather than reading
 * as a mark on top of them.
 */
export const HEAT_BANDS: HeatBand[] = [
  { from: 0.05, color: '#e3c8d4', alpha: 0.42, label: 'passed through' },
  { from: 0.2, color: '#c898b0', alpha: 0.54, label: '' },
  { from: 0.36, color: '#a86e8e', alpha: 0.64, label: '' },
  { from: 0.53, color: '#85496f', alpha: 0.73, label: '' },
  { from: 0.71, color: '#5f2f53', alpha: 0.81, label: '' },
  { from: 0.88, color: '#452041', alpha: 0.88, label: 'stayed a while' }
];

/** Width, in intensity units, of the blend from one glaze into the next. */
const EDGE = 0.03;

/** Width of the darker pigment ring that collects at the top of each glaze. */
const RING = 0.055;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Build a 256-entry RGBA lookup table indexed by accumulated intensity.
 *
 * Keeping the colorization in a LUT means the per-pixel pass is three array
 * reads and a multiply, which is what makes a full-viewport repaint cheap
 * enough to run on every pan.
 */
export const buildHeatLut = (): Uint8ClampedArray => {
  const lut = new Uint8ClampedArray(256 * 4);
  const bands = HEAT_BANDS.map((b) => ({ ...b, rgb: hexToRgb(b.color) }));

  for (let i = 0; i < 256; i++) {
    const t = i / 255;

    let idx = -1;
    for (let b = 0; b < bands.length; b++) {
      if (t >= bands[b].from) idx = b;
    }
    if (idx < 0) continue; // below the first glaze: bare paper

    const band = bands[idx];
    // Blend out of the previous glaze so band edges are soft rather than
    // aliased. Below the first band there is no previous colour, only
    // transparency, so glaze one fades up from nothing.
    const prev = idx > 0 ? bands[idx - 1] : { rgb: band.rgb, alpha: 0 };
    const m = Math.min(1, (t - band.from) / EDGE);

    let r = lerp(prev.rgb[0], band.rgb[0], m);
    let g = lerp(prev.rgb[1], band.rgb[1], m);
    let b2 = lerp(prev.rgb[2], band.rgb[2], m);
    let a = lerp(prev.alpha, band.alpha, m);

    // Pigment ring: real watercolour dries darkest where the wash stopped
    // spreading, so darken and thicken the last sliver before the next glaze.
    const nextFrom = idx + 1 < bands.length ? bands[idx + 1].from : Infinity;
    if (nextFrom !== Infinity) {
      const ring = Math.max(0, 1 - (nextFrom - t) / RING);
      a *= 1 + 0.18 * ring;
      r *= 1 - 0.1 * ring;
      g *= 1 - 0.1 * ring;
      b2 *= 1 - 0.1 * ring;
    }

    const o = i * 4;
    lut[o] = r;
    lut[o + 1] = g;
    lut[o + 2] = b2;
    lut[o + 3] = Math.min(255, a * 255);
  }

  return lut;
};
