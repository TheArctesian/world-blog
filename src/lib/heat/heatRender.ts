/**
 * Projection-agnostic painter for the heat field.
 *
 * Both callers — the Leaflet overlay and the globe's equirectangular texture —
 * do their own lat/lon to pixel maths and hand this module plain canvas-space
 * blobs. Everything about how the wash *looks* lives here, so the two views
 * cannot drift apart.
 */
export interface HeatBlob {
  x: number;
  y: number;
  /** Radius along y, in canvas pixels. */
  radius: number;
  /** Horizontal stretch, used to keep blooms round under equirectangular. */
  xScale: number;
  /** Peak opacity of this blob before neighbours pool on top of it. */
  intensity: number;
  seed: number;
}

/**
 * The wash is blurry by nature, so the intensity field is accumulated at half
 * resolution and scaled up on paint. That is a 4x cut in both the fill cost and
 * the per-pixel colorize pass, and the upscale softens the result in a way that
 * happens to suit the medium.
 */
export const HEAT_RENDER_SCALE = 0.5;

/** Deterministic 0..1 from a seed and a channel index. */
const noise = (seed: number, n: number): number => {
  const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Deterministic 0..1 from integer coordinates, for paper grain. */
const grainAt = (x: number, y: number): number => {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return (h >>> 8) / 16777216;
};

/**
 * A single stay, drawn as one dominant lobe plus two smaller offset ones.
 *
 * A lone radial gradient reads as a perfect circle — obviously machine-made.
 * The satellites push the contour off-centre by a fixed amount per place, so
 * every bloom has its own irregular edge and stays that way across repaints.
 */
const drawBlob = (ctx: CanvasRenderingContext2D, blob: HeatBlob): void => {
  const lobes = [
    { dx: 0, dy: 0, scale: 1, alpha: 1 },
    {
      dx: (noise(blob.seed, 1) - 0.5) * 0.7,
      dy: (noise(blob.seed, 2) - 0.5) * 0.7,
      scale: 0.58 + noise(blob.seed, 3) * 0.16,
      alpha: 0.55
    },
    {
      dx: (noise(blob.seed, 4) - 0.5) * 0.8,
      dy: (noise(blob.seed, 5) - 0.5) * 0.8,
      scale: 0.42 + noise(blob.seed, 6) * 0.16,
      alpha: 0.45
    }
  ];

  for (const lobe of lobes) {
    const r = blob.radius * lobe.scale;
    if (r < 0.5) continue;

    ctx.save();
    ctx.translate(blob.x + lobe.dx * blob.radius * blob.xScale, blob.y + lobe.dy * blob.radius);
    ctx.scale(blob.xScale, 1);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.35, 'rgba(0,0,0,0.62)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.globalAlpha = blob.intensity * lobe.alpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/**
 * Translate accumulated opacity into glaze colours, and rough the result up
 * with paper grain so the wash sits on the map rather than over it.
 */
const colorize = (
  data: Uint8ClampedArray,
  width: number,
  lut: Uint8ClampedArray
): void => {
  for (let i = 0; i < data.length; i += 4) {
    const accumulated = data[i + 3];
    if (accumulated === 0) continue;

    const o = accumulated * 4;
    const bandAlpha = lut[o + 3];
    if (bandAlpha === 0) {
      data[i + 3] = 0;
      continue;
    }

    const pixel = i >> 2;
    // 2px grain blocks: at half render scale these land as ~4px flecks on
    // screen, which is about the tooth of the paper texture used elsewhere.
    const g = grainAt((pixel % width) >> 1, (pixel / width) >> 1);

    data[i] = lut[o];
    data[i + 1] = lut[o + 1];
    data[i + 2] = lut[o + 2];
    data[i + 3] = bandAlpha * (0.84 + 0.16 * g);
  }
};

/**
 * Accumulate every blob into a greyscale field, then recolour it in place.
 *
 * Drawing in greyscale first is what makes overlapping stays pool: each blob
 * composites onto the ones before it, so a cluster of short visits builds the
 * same depth of colour as one long one — which is the honest reading of "time
 * spent here".
 */
export const paintHeatField = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blobs: HeatBlob[],
  lut: Uint8ClampedArray
): void => {
  if (width <= 0 || height <= 0) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, width, height);

  for (const blob of blobs) drawBlob(ctx, blob);
  ctx.globalAlpha = 1;

  if (blobs.length === 0) return;

  const image = ctx.getImageData(0, 0, width, height);
  colorize(image.data, width, lut);
  ctx.putImageData(image, 0, 0);
};
