import * as THREE from 'three';
import type { TileKey } from './types.js';
import { createTileMesh } from './tileUtils.js';
import { tileKeyString } from './tileLOD.js';
import type { TileTextureLoader } from './tileLoader.js';

/**
 * Manages the Three.js scene graph for tile meshes.
 */
export class TileRenderer {
	private tileGroup: THREE.Group;
	private activeMeshes = new Map<string, THREE.Mesh>();
	private textureLoader: TileTextureLoader;
	private radius: number;

	constructor(scene: THREE.Scene, textureLoader: TileTextureLoader, radius: number) {
		this.tileGroup = new THREE.Group();
		scene.add(this.tileGroup);
		this.textureLoader = textureLoader;
		this.radius = radius;
	}

	/**
	 * Update visible tiles. Call each frame or when camera changes significantly.
	 */
	updateTiles(tiles: TileKey[]): void {
		const newTileKeys = new Set(tiles.map(t => tileKeyString(t)));

		// Remove tiles no longer needed
		for (const [key, mesh] of this.activeMeshes) {
			if (!newTileKeys.has(key)) {
				this.tileGroup.remove(mesh);
				mesh.geometry.dispose();
				(mesh.material as THREE.MeshBasicMaterial).dispose();
				this.activeMeshes.delete(key);
			}
		}

		// Add new tiles
		for (const tile of tiles) {
			const key = tileKeyString(tile);
			if (this.activeMeshes.has(key)) continue;

			// Create new tile mesh
			const geometry = createTileMesh(tile, this.radius);
			const texture = this.textureLoader.getTexture(tile);
			const material = new THREE.MeshBasicMaterial({
				map: texture,
				side: THREE.DoubleSide
			});

			const mesh = new THREE.Mesh(geometry, material);
			this.tileGroup.add(mesh);
			this.activeMeshes.set(key, mesh);
		}
	}

	/**
	 * Refresh textures for tiles that may have finished loading.
	 */
	refreshTextures(): void {
		for (const [key, mesh] of this.activeMeshes) {
			const parts = key.split('/');
			const tile: TileKey = { z: parseInt(parts[0]), x: parseInt(parts[1]), y: parseInt(parts[2]) };
			const texture = this.textureLoader.getTexture(tile);
			const mat = mesh.material as THREE.MeshBasicMaterial;
			if (mat.map !== texture) {
				mat.map = texture;
				mat.needsUpdate = true;
			}
		}
	}

	private clearAll(): void {
		for (const [, mesh] of this.activeMeshes) {
			this.tileGroup.remove(mesh);
			mesh.geometry.dispose();
			(mesh.material as THREE.MeshBasicMaterial).dispose();
		}
		this.activeMeshes.clear();
	}

	dispose(): void {
		this.clearAll();
		this.tileGroup.parent?.remove(this.tileGroup);
	}
}
