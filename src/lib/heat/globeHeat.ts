import * as THREE from 'three';
import { latLonToVector3 } from '../globe/tileUtils.js';
import { HEAT_POINTS, blobIntensity, normalizedWeight } from './heatData.js';
import { buildHeatLut } from './heatPalette.js';
import { paintHeatField, type HeatBlob } from './heatRender.js';

/**
 * Equirectangular texture resolution. 2048x1024 puts one texel at roughly
 * 20km on the equator — far finer than the blooms themselves, and small enough
 * that the whole thing paints once in a few milliseconds.
 */
const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

/**
 * Bloom radius in texels. The globe is only ever seen from a distance, so this
 * is tuned for country-scale glow rather than the city-scale bloom the Leaflet
 * view can afford: small enough that Western Europe and the Bay Area stay
 * distinguishable, large enough that neighbouring stays merge into one wash
 * instead of reading as a scatter of freckles.
 */
const BASE_RADIUS_TEXELS = 55;

const INTENSITY_FLOOR = 0.1;
const INTENSITY_SPAN = 0.2;

/** Sits above the tile meshes (radius * 1.001) and below the marker sprites (1.005). */
const SHELL_OFFSET = 1.0035;

const LAT_SEGMENTS = 96;
const LON_SEGMENTS = 192;

/**
 * A lat/lon grid sphere with explicit equirectangular UVs.
 *
 * Built by hand rather than with SphereGeometry so the mapping is pinned to the
 * same latLonToVector3 the tiles and markers use — there is no chance of the
 * wash landing a hemisphere away from the places it describes.
 */
const buildShellGeometry = (radius: number): THREE.BufferGeometry => {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= LAT_SEGMENTS; j++) {
    const v = j / LAT_SEGMENTS;
    const lat = 90 - 180 * v;

    for (let i = 0; i <= LON_SEGMENTS; i++) {
      const u = i / LON_SEGMENTS;
      const lon = -180 + 360 * u;

      const point = latLonToVector3(lat, lon, radius);
      vertices.push(point.x, point.y, point.z);
      // CanvasTexture flips Y by default, so v=0 (the north pole) has to read
      // from the top row of the canvas via uv.y = 1.
      uvs.push(u, 1 - v);
    }
  }

  for (let j = 0; j < LAT_SEGMENTS; j++) {
    for (let i = 0; i < LON_SEGMENTS; i++) {
      const a = j * (LON_SEGMENTS + 1) + i;
      const b = a + 1;
      const c = a + (LON_SEGMENTS + 1);
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const paintHeatTexture = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const blobs: HeatBlob[] = [];

  for (const point of HEAT_POINTS) {
    const weight = normalizedWeight(point.days);
    const radius = BASE_RADIUS_TEXELS * (0.8 + 0.55 * weight);
    const intensity = blobIntensity(weight, INTENSITY_FLOOR, INTENSITY_SPAN);

    const x = ((point.lon + 180) / 360) * TEXTURE_WIDTH;
    const y = ((90 - point.lat) / 180) * TEXTURE_HEIGHT;

    // Equirectangular squeezes longitude toward the poles, so a bloom drawn as
    // a circle in texel space would render as a pinched ellipse on the sphere.
    // Stretching x by 1/cos(lat) cancels that out; the clamp keeps high-latitude
    // places from smearing across a quarter of the world.
    const cosLat = Math.cos((point.lat * Math.PI) / 180);
    const xScale = Math.min(4, 1 / Math.max(0.25, cosLat));

    // Wrap copies so a bloom near the antimeridian bleeds across the seam.
    for (const offset of [0, -TEXTURE_WIDTH, TEXTURE_WIDTH]) {
      const px = x + offset;
      const reach = radius * xScale * 2;
      if (px < -reach || px > TEXTURE_WIDTH + reach) continue;
      blobs.push({ x: px, y, radius, xScale, intensity, seed: point.seed });
    }
  }

  paintHeatField(ctx, TEXTURE_WIDTH, TEXTURE_HEIGHT, blobs, buildHeatLut());
};

export interface GlobeHeatShell {
  mesh: THREE.Mesh;
  dispose(): void;
}

/**
 * Build the translucent heat shell that wraps the globe.
 *
 * The field is static, so it is baked into a canvas texture once on creation
 * and then costs a single draw call per frame no matter how the camera moves.
 */
export const createGlobeHeatShell = (radius: number): GlobeHeatShell => {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  paintHeatTexture(canvas);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const geometry = buildShellGeometry(radius * SHELL_OFFSET);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 4;

  return {
    mesh,
    dispose(): void {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    }
  };
};
