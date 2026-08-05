import { HEAT_POINTS, blobIntensity, normalizedWeight } from './heatData.js';
import { buildHeatLut } from './heatPalette.js';
import { HEAT_RENDER_SCALE, paintHeatField, type HeatBlob } from './heatRender.js';

/** Extra canvas beyond the viewport, as a fraction of it, so a drag doesn't immediately expose bare edges. */
const PADDING = 0.25;

/**
 * Bloom size in screen pixels.
 *
 * A radius fixed in metres would be sub-pixel at world zoom and fill the screen
 * at street zoom, so the bloom grows with zoom but much slower than the map
 * does. The wash therefore keeps a readable density at every scale while still
 * spreading apart as you zoom in — which is what tells you a cluster was
 * several distinct places rather than one long stay.
 */
const REFERENCE_ZOOM = 3;
const BASE_RADIUS_PX = 42;
const ZOOM_GROWTH = 0.34;
const MIN_RADIUS_PX = 26;
const MAX_RADIUS_PX = 210;

/**
 * Slightly hotter than the globe's floor: zooming in pulls the blooms apart,
 * so an isolated place has to hold its own without any neighbours pooling
 * underneath it.
 */
const INTENSITY_FLOOR = 0.13;
const INTENSITY_SPAN = 0.2;

const radiusForZoom = (zoom: number): number => {
  const scaled = BASE_RADIUS_PX * Math.pow(2, (zoom - REFERENCE_ZOOM) * ZOOM_GROWTH);
  return Math.min(MAX_RADIUS_PX, Math.max(MIN_RADIUS_PX, scaled));
};

export interface HeatLayerHandle {
  addTo(map: any): void;
  remove(): void;
}

/**
 * A canvas overlay that repaints the heat field in layer coordinates.
 *
 * Sizing, positioning and the zoom-animation transform follow Leaflet's own
 * L.Canvas renderer, which is the reference implementation for a padded
 * full-viewport canvas layer.
 */
export const createHeatLayer = (L: any): HeatLayerHandle => {
  const lut = buildHeatLut();

  const HeatLayer = L.Layer.extend({
    onAdd(map: any): void {
      if (!this._canvas) {
        const canvas = L.DomUtil.create('canvas', 'watercolor-heat-layer leaflet-layer');
        canvas.style.pointerEvents = 'none';
        L.DomUtil.addClass(canvas, `leaflet-zoom-${map._zoomAnimated ? 'animated' : 'hide'}`);
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
      }
      map.getPanes().overlayPane.appendChild(this._canvas);
      this._reset();
    },

    onRemove(): void {
      if (this._canvas?.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas);
      }
    },

    getEvents(): Record<string, unknown> {
      const events: Record<string, unknown> = {
        viewreset: this._reset,
        moveend: this._reset,
        zoomend: this._reset,
        resize: this._reset
      };
      if (this._map?._zoomAnimated) {
        events.zoomanim = this._onAnimZoom;
      }
      return events;
    },

    _reset(): void {
      const map = this._map;
      if (!map || !this._canvas) return;

      const size = map.getSize();
      const min = map.containerPointToLayerPoint(size.multiplyBy(-PADDING)).round();
      const boxSize = size.multiplyBy(1 + PADDING * 2).round();

      this._min = min;
      this._center = map.getCenter();
      this._zoom = map.getZoom();

      const canvas = this._canvas;
      L.DomUtil.setPosition(canvas, min);
      canvas.style.width = `${boxSize.x}px`;
      canvas.style.height = `${boxSize.y}px`;
      // Setting width/height also clears the canvas and resets its transform.
      canvas.width = Math.max(1, Math.round(boxSize.x * HEAT_RENDER_SCALE));
      canvas.height = Math.max(1, Math.round(boxSize.y * HEAT_RENDER_SCALE));

      this._draw();
    },

    _draw(): void {
      const map = this._map;
      const ctx = this._ctx;
      if (!map || !ctx) return;

      const width = this._canvas.width;
      const height = this._canvas.height;
      const zoom = map.getZoom();
      const base = radiusForZoom(zoom);
      const s = HEAT_RENDER_SCALE;

      // The map is bounded rather than infinitely wrapping, but a view straddling
      // the antimeridian still needs the copy from the neighbouring world.
      let worldWidth = 0;
      try {
        worldWidth = map.getPixelWorldBounds(zoom)?.getSize().x ?? 0;
      } catch {
        worldWidth = 0;
      }

      const blobs: HeatBlob[] = [];

      for (const point of HEAT_POINTS) {
        const layerPoint = map.latLngToLayerPoint([point.lat, point.lon]);
        const weight = normalizedWeight(point.days);
        const radius = base * (0.8 + 0.55 * weight) * s;
        const intensity = blobIntensity(weight, INTENSITY_FLOOR, INTENSITY_SPAN);

        const y = (layerPoint.y - this._min.y) * s;
        if (y < -radius * 2 || y > height + radius * 2) continue;

        const offsets = worldWidth > 0 ? [0, -worldWidth, worldWidth] : [0];
        for (const offset of offsets) {
          const x = (layerPoint.x + offset - this._min.x) * s;
          if (x < -radius * 2 || x > width + radius * 2) continue;
          blobs.push({ x, y, radius, xScale: 1, intensity, seed: point.seed });
        }
      }

      paintHeatField(ctx, width, height, blobs, lut);
    },

    _onAnimZoom(event: { zoom: number; center: unknown }): void {
      const map = this._map;
      if (!map || !this._canvas || typeof map._getNewPixelOrigin !== 'function') return;

      // Ride the zoom animation with a CSS transform instead of repainting mid
      // flight; _reset lands the real pixels once the animation settles.
      const scale = map.getZoomScale(event.zoom, this._zoom);
      const viewHalf = map.getSize().multiplyBy(0.5 + PADDING);
      const currentCenterPoint = map.project(this._center, event.zoom);
      const offset = viewHalf
        .multiplyBy(-scale)
        .add(currentCenterPoint)
        .subtract(map._getNewPixelOrigin(event.center, event.zoom));

      L.DomUtil.setTransform(this._canvas, offset, scale);
    }
  });

  return new HeatLayer();
};
