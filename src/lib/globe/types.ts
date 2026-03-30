export interface GlobeConfig {
	radius: number;
	initialCameraDistance: number;
	minCameraDistance: number;
	maxCameraDistance: number;
	flyDuration: number;
	fresnelColor: string;
	backgroundColor: string;
	initialFocusLat: number;
	initialFocusLon: number;
	idleAutoRotateDelayMs: number;
	autoRotateSpeed: number;
}

export interface TileKey {
	z: number;
	x: number;
	y: number;
}

export interface TileBounds {
	north: number;
	south: number;
	east: number;
	west: number;
}
