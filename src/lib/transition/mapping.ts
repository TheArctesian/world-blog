import { GLOBE_CONFIG } from '../globe/globeConfig.js';

export const HANDOFF_CAMERA_DISTANCE = 5.9;
export const HANDOFF_LEAFLET_ZOOM = 5;
export const RETURN_LEAFLET_ZOOM = 4;
export const RETURN_CAMERA_DISTANCE = 8;
export const TRANSITION_MS = 450;

export function cameraDistanceToLeafletZoom(distance: number): number {
	const { minCameraDistance, maxCameraDistance } = GLOBE_CONFIG;
	const clamped = Math.max(minCameraDistance, Math.min(maxCameraDistance, distance));
	const t = (clamped - minCameraDistance) / (maxCameraDistance - minCameraDistance);
	return Math.round(6 - t * 4);
}

export function leafletZoomToCameraDistance(zoom: number): number {
	const clamped = Math.max(2, Math.min(6, zoom));
	const t = (6 - clamped) / 4;
	const { minCameraDistance, maxCameraDistance } = GLOBE_CONFIG;
	return minCameraDistance + t * (maxCameraDistance - minCameraDistance);
}

export function cameraDirectionToLatLon(
	position: { x: number; y: number; z: number }
): { lat: number; lon: number } {
	const len = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
	if (len === 0) return { lat: 0, lon: 0 };
	const nx = position.x / len;
	const ny = position.y / len;
	const nz = position.z / len;
	const lat = Math.asin(ny) * (180 / Math.PI);
	const lon = Math.atan2(nx, nz) * (180 / Math.PI);
	return { lat, lon };
}
