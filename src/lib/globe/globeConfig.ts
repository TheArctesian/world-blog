import type { GlobeConfig } from './types.js';

export const GLOBE_CONFIG: GlobeConfig = {
	radius: 5,
	initialCameraDistance: 15,
	minCameraDistance: 5.5,
	maxCameraDistance: 20,
	flyDuration: 2000,
	fresnelColor: '#87ceeb',
	backgroundColor: '#1a1a2e',
	initialFocusLat: 37.7749,
	initialFocusLon: -122.4194,
	idleAutoRotateDelayMs: 2500,
	autoRotateSpeed: 0.35
};

export const TILE_URL_TEMPLATE = 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg';

// Limit tile zoom to reasonable levels for performance
// zoom 2 = 16 tiles, zoom 3 = 64, zoom 4 = 256, zoom 5 = 1024
export const MAX_TILE_ZOOM = 4;
export const MIN_TILE_ZOOM = 2;

// Tile subdivisions per mesh quad (higher = smoother curvature)
export const TILE_SEGMENTS = 16;
