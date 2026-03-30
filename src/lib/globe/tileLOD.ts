import * as THREE from 'three';
import type { TileKey } from './types.js';
import { GLOBE_CONFIG, MAX_TILE_ZOOM, MIN_TILE_ZOOM } from './globeConfig.js';

/**
 * Determine the zoom level based on camera distance to the globe.
 */
export function getZoomForDistance(distance: number): number {
	const { minCameraDistance, maxCameraDistance } = GLOBE_CONFIG;
	const range = maxCameraDistance - minCameraDistance;
	const t = Math.max(0, Math.min(1, (distance - minCameraDistance) / range));
	// Invert: close = high zoom, far = low zoom
	const zoom = Math.round(MIN_TILE_ZOOM + (1 - t) * (MAX_TILE_ZOOM - MIN_TILE_ZOOM));
	return Math.max(MIN_TILE_ZOOM, Math.min(MAX_TILE_ZOOM, zoom));
}

/**
 * Get all tiles at a given zoom level.
 */
export function getAllTilesAtZoom(z: number): TileKey[] {
	const n = Math.pow(2, z);
	const tiles: TileKey[] = [];
	for (let x = 0; x < n; x++) {
		for (let y = 0; y < n; y++) {
			tiles.push({ z, x, y });
		}
	}
	return tiles;
}

/**
 * Get tiles to render. Simply returns all tiles at the computed zoom level.
 * At zoom 2 = 16 tiles, zoom 3 = 64, zoom 4 = 256, zoom 5 = 1024, zoom 6 = 4096.
 * For higher zooms, use frustum culling.
 */
export function getVisibleTiles(
	camera: THREE.PerspectiveCamera,
	radius: number,
	zoom: number
): TileKey[] {
	// For zoom <= 5, return all tiles. The count is still manageable and this
	// avoids horizon flicker from overly aggressive culling while orbit damping.
	if (zoom <= 5) {
		return getAllTilesAtZoom(zoom);
	}

	// For higher zoom, use frustum culling
	const frustum = new THREE.Frustum();
	const projScreenMatrix = new THREE.Matrix4();
	projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
	frustum.setFromProjectionMatrix(projScreenMatrix);

	const allTiles = getAllTilesAtZoom(zoom);
	const n = Math.pow(2, zoom);

	return allTiles.filter(tile => {
		// Approximate tile center on sphere for frustum check
		const lonCenter = ((tile.x + 0.5) / n) * 360 - 180;
		const latTop = Math.atan(Math.sinh(Math.PI * (1 - (2 * tile.y) / n))) * (180 / Math.PI);
		const latBot = Math.atan(Math.sinh(Math.PI * (1 - (2 * (tile.y + 1)) / n))) * (180 / Math.PI);
		const latCenter = (latTop + latBot) / 2;

		const latRad = latCenter * (Math.PI / 180);
		const lonRad = lonCenter * (Math.PI / 180);
		const y = Math.sin(latRad);
		const r = Math.cos(latRad);
		const x = Math.sin(lonRad) * r;
		const z = Math.cos(lonRad) * r;

		const center = new THREE.Vector3(x, y, z).multiplyScalar(radius);
		// Approximate tile angular size for bounding sphere
		const tileSize = (360 / n) * (Math.PI / 180) * radius;
		// Expand the bound so tiles close to the limb are kept stable instead of
		// flickering as the camera moves by sub-pixel amounts.
		const sphere = new THREE.Sphere(center, tileSize * 2.5);
		return frustum.intersectsSphere(sphere);
	});
}

/**
 * Create a unique string key for a tile.
 */
export function tileKeyString(tile: TileKey): string {
	return `${tile.z}/${tile.x}/${tile.y}`;
}
