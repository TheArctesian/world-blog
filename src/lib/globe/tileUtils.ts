import * as THREE from 'three';
import type { TileKey, TileBounds } from './types.js';
import { TILE_URL_TEMPLATE, TILE_SEGMENTS } from './globeConfig.js';

/**
 * Convert tile coordinates to lat/lon bounding box (inverse Mercator).
 */
export function tileToLatLonBounds(tile: TileKey): TileBounds {
	const n = Math.pow(2, tile.z);
	const west = (tile.x / n) * 360 - 180;
	const east = ((tile.x + 1) / n) * 360 - 180;
	const north = Math.atan(Math.sinh(Math.PI * (1 - (2 * tile.y) / n))) * (180 / Math.PI);
	const south = Math.atan(Math.sinh(Math.PI * (1 - (2 * (tile.y + 1)) / n))) * (180 / Math.PI);
	return { north, south, east, west };
}

/**
 * Convert lat/lon (degrees) to a 3D point on a sphere.
 * Adapted from Geographical-Adventures' CoordinateToPoint.
 */
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
	const latRad = lat * (Math.PI / 180);
	const lonRad = lon * (Math.PI / 180);
	const y = Math.sin(latRad);
	const r = Math.cos(latRad);
	const x = Math.sin(lonRad) * r;
	const z = Math.cos(lonRad) * r;
	return new THREE.Vector3(x, y, z).multiplyScalar(radius);
}

/**
 * Get the tile URL for a given tile key.
 */
export function getTileUrl(tile: TileKey): string {
	return TILE_URL_TEMPLATE
		.replace('{z}', String(tile.z))
		.replace('{x}', String(tile.x))
		.replace('{y}', String(tile.y));
}

/**
 * Create a curved mesh segment on a sphere for a single map tile.
 * The mesh follows the sphere surface with proper UV mapping.
 */
export function createTileMesh(
	tile: TileKey,
	radius: number,
	segments: number = TILE_SEGMENTS
): THREE.BufferGeometry {
	// Tiles render slightly above the base sphere to avoid z-fighting
	radius = radius * 1.001;
	const bounds = tileToLatLonBounds(tile);

	// Slightly expand tile bounds to eliminate seams between adjacent tiles
	const latRange = bounds.north - bounds.south;
	const lonRange = bounds.east - bounds.west;
	const overlap = 0.001; // tiny overlap factor
	const expandedBounds = {
		north: bounds.north + latRange * overlap,
		south: bounds.south - latRange * overlap,
		east: bounds.east + lonRange * overlap,
		west: bounds.west - lonRange * overlap
	};

	const vertices: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	for (let j = 0; j <= segments; j++) {
		const v = j / segments;
		const lat = expandedBounds.north + (expandedBounds.south - expandedBounds.north) * v;

		for (let i = 0; i <= segments; i++) {
			const u = i / segments;
			const lon = expandedBounds.west + (expandedBounds.east - expandedBounds.west) * u;

			const point = latLonToVector3(lat, lon, radius);
			vertices.push(point.x, point.y, point.z);
			uvs.push(u, v);
		}
	}

	for (let j = 0; j < segments; j++) {
		for (let i = 0; i < segments; i++) {
			const a = j * (segments + 1) + i;
			const b = a + 1;
			const c = a + (segments + 1);
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
}

/**
 * Get the center point of a tile in 3D space.
 */
export function getTileCenter(tile: TileKey, radius: number): THREE.Vector3 {
	const bounds = tileToLatLonBounds(tile);
	const centerLat = (bounds.north + bounds.south) / 2;
	const centerLon = (bounds.east + bounds.west) / 2;
	return latLonToVector3(centerLat, centerLon, radius);
}
