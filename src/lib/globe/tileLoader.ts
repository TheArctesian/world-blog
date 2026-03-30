import * as THREE from 'three';
import type { TileKey } from './types.js';
import { getTileUrl } from './tileUtils.js';
import { tileKeyString } from './tileLOD.js';

const MAX_CACHE_SIZE = 300;
const MAX_CONCURRENT_LOADS = 8;

interface CacheEntry {
	texture: THREE.Texture;
	lastUsed: number;
}

/**
 * Manages loading and caching of tile textures.
 */
export class TileTextureLoader {
	private cache = new Map<string, CacheEntry>();
	private loading = new Set<string>();
	private loader = new THREE.TextureLoader();
	private placeholder: THREE.Texture;
	private activeLoads = 0;
	private queue: Array<{ key: string; tile: TileKey; resolve: (tex: THREE.Texture) => void }> = [];

	constructor() {
		this.loader.setCrossOrigin('anonymous');

		// Create a placeholder texture (watercolor blue)
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext('2d')!;

		// Watercolor-style gradient placeholder
		const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 180);
		gradient.addColorStop(0, '#b8d4e3');
		gradient.addColorStop(0.5, '#9ec5d9');
		gradient.addColorStop(1, '#87b6cd');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 256, 256);

		this.placeholder = new THREE.CanvasTexture(canvas);
		this.placeholder.colorSpace = THREE.SRGBColorSpace;
		this.placeholder.flipY = false;
		this.placeholder.needsUpdate = true;
	}

	/**
	 * Get a texture for a tile. Returns cached texture or placeholder while loading.
	 */
	getTexture(tile: TileKey): THREE.Texture {
		const key = tileKeyString(tile);

		// Check cache
		const cached = this.cache.get(key);
		if (cached) {
			cached.lastUsed = Date.now();
			return cached.texture;
		}

		// Start loading if not already
		if (!this.loading.has(key)) {
			this.loading.add(key);
			this.enqueueLoad(key, tile);
		}

		return this.placeholder;
	}

	/**
	 * Check if a tile texture is loaded (not just placeholder).
	 */
	isLoaded(tile: TileKey): boolean {
		return this.cache.has(tileKeyString(tile));
	}

	private enqueueLoad(key: string, tile: TileKey): void {
		if (this.activeLoads < MAX_CONCURRENT_LOADS) {
			this.doLoad(key, tile);
		} else {
			this.queue.push({
				key,
				tile,
				resolve: () => {}
			});
		}
	}

	private doLoad(key: string, tile: TileKey): void {
		this.activeLoads++;
		const url = getTileUrl(tile);

		this.loader.load(
			url,
				(texture) => {
					texture.minFilter = THREE.LinearFilter;
					texture.magFilter = THREE.LinearFilter;
					texture.colorSpace = THREE.SRGBColorSpace;
					texture.flipY = false;
					texture.wrapS = THREE.ClampToEdgeWrapping;
					texture.wrapT = THREE.ClampToEdgeWrapping;

				this.cache.set(key, {
					texture,
					lastUsed: Date.now()
				});
				this.loading.delete(key);
				this.activeLoads--;
				this.evictIfNeeded();
				this.processQueue();
			},
			undefined,
			() => {
				// Failed to load - remove from loading set so it can retry later
				this.loading.delete(key);
				this.activeLoads--;
				this.processQueue();
			}
		);
	}

	private processQueue(): void {
		while (this.queue.length > 0 && this.activeLoads < MAX_CONCURRENT_LOADS) {
			const next = this.queue.shift()!;
			if (this.loading.has(next.key)) {
				this.doLoad(next.key, next.tile);
			}
		}
	}

	private evictIfNeeded(): void {
		if (this.cache.size <= MAX_CACHE_SIZE) return;

		// Sort by last used and remove oldest
		const entries = Array.from(this.cache.entries());
		entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);

		const toRemove = entries.slice(0, this.cache.size - MAX_CACHE_SIZE + 50);
		for (const [key, entry] of toRemove) {
			entry.texture.dispose();
			this.cache.delete(key);
		}
	}

	/**
	 * Clear loading queue (useful when zoom level changes dramatically).
	 */
	clearQueue(): void {
		this.queue = [];
		this.loading.clear();
	}

	dispose(): void {
		this.clearQueue();
		for (const [, entry] of this.cache) {
			entry.texture.dispose();
		}
		this.cache.clear();
		this.placeholder.dispose();
	}
}
