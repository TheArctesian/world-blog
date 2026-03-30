import * as THREE from 'three';
import type { LocationData } from '../marker/types.js';
import type { TimelineEntry } from '../timeline/types.js';
import { GLOBE_CONFIG } from './globeConfig.js';
import { latLonToVector3 } from './tileUtils.js';
import { flyTo } from './cameraControls.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MARKER_OFFSET = 1.005; // slightly above surface
const MARKER_SCALE = 0.15;

const PAN_SETTLE_MS = 2500;
const LABEL_VISIBLE_MS = 3000;
const FADE_DURATION_MS = 400;

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Cache for loaded marker textures.
 */
const textureCache = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();

function getMarkerTexture(iconUrl: string): THREE.Texture {
	if (textureCache.has(iconUrl)) {
		return textureCache.get(iconUrl)!;
	}
	const texture = textureLoader.load(iconUrl);
	texture.colorSpace = THREE.SRGBColorSpace;
	textureCache.set(iconUrl, texture);
	return texture;
}

/**
 * Create a sprite marker on the globe surface.
 */
export function createSpriteMarker(
	lat: number,
	lon: number,
	iconUrl: string,
	radius: number = GLOBE_CONFIG.radius
): THREE.Sprite {
	const texture = getMarkerTexture(iconUrl);
	const material = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		depthTest: true,
		sizeAttenuation: true
	});

	const sprite = new THREE.Sprite(material);
	const position = latLonToVector3(lat, lon, radius * MARKER_OFFSET);
	sprite.position.copy(position);
	sprite.scale.set(MARKER_SCALE, MARKER_SCALE, MARKER_SCALE);

	// Store lat/lon as user data for overlay positioning
	sprite.userData = { lat, lon };

	return sprite;
}

/**
 * Add all static markers to the scene.
 */
export function addAllStaticMarkers(
	markerGroup: THREE.Group,
	locations: LocationData[],
	iconUrl: string
): void {
	for (const loc of locations) {
		const sprite = createSpriteMarker(loc.Latitude, loc.Longitude, iconUrl);
		sprite.userData = { ...sprite.userData, city: loc.City, date: loc.Date };
		markerGroup.add(sprite);
	}
}

/**
 * Clear all markers from the group.
 */
export function clearAllMarkers(markerGroup: THREE.Group): void {
	while (markerGroup.children.length > 0) {
		const child = markerGroup.children[0];
		markerGroup.remove(child);
		if (child instanceof THREE.Sprite) {
			child.material.dispose();
		}
	}
}

/**
 * Add an animated marker with camera fly-to and label overlay.
 * Returns the label element for the overlay system to manage.
 */
export async function addAnimatedMarker(
	markerGroup: THREE.Group,
	camera: THREE.PerspectiveCamera,
	controls: OrbitControls,
	entry: TimelineEntry,
	iconUrl: string,
	overlayContainer: HTMLElement,
	projectToScreen: (pos: THREE.Vector3) => { x: number; y: number; visible: boolean }
): Promise<void> {
	const { Latitude: lat, Longitude: lon } = entry.location;

	// Fly camera to location
	await flyTo(camera, controls, lat, lon, GLOBE_CONFIG.flyDuration, 8);
	await delay(PAN_SETTLE_MS - GLOBE_CONFIG.flyDuration);

	// Add the marker sprite
	const sprite = createSpriteMarker(lat, lon, iconUrl);
	sprite.userData = { ...sprite.userData, city: entry.location.City, date: entry.location.Date };
	markerGroup.add(sprite);

	// Create HTML label overlay
	const labelEl = document.createElement('div');
	labelEl.className = 'place-name-popup place-label-animate';
	labelEl.innerHTML = `
		<div class="place-city">${entry.location.City}</div>
		<div class="place-date">${entry.location.Date}</div>
	`;
	labelEl.style.position = 'absolute';
	labelEl.style.pointerEvents = 'none';
	labelEl.style.zIndex = '100';
	overlayContainer.appendChild(labelEl);

	// Position the label
	const updateLabelPosition = () => {
		const pos = latLonToVector3(lat, lon, GLOBE_CONFIG.radius * MARKER_OFFSET);
		const screen = projectToScreen(pos);
		if (screen.visible) {
			labelEl.style.display = 'block';
			labelEl.style.transform = `translate(${screen.x - 100}px, ${screen.y - 65}px)`;
		} else {
			labelEl.style.display = 'none';
		}
	};

	updateLabelPosition();
	const labelInterval = setInterval(updateLabelPosition, 16);

	await delay(LABEL_VISIBLE_MS);

	// Fade out
	labelEl.classList.add('place-label-fade-out');
	await delay(FADE_DURATION_MS);

	clearInterval(labelInterval);
	labelEl.remove();
}

/**
 * Update marker scales based on camera distance for readability.
 */
export function updateMarkerScales(
	markerGroup: THREE.Group,
	cameraDistance: number
): void {
	const normalizedDistance = cameraDistance / GLOBE_CONFIG.initialCameraDistance;
	const scale = THREE.MathUtils.clamp(
		MARKER_SCALE * Math.pow(normalizedDistance, 1.8),
		0.03,
		0.12
	);
	for (const child of markerGroup.children) {
		if (child instanceof THREE.Sprite) {
			child.scale.set(scale, scale, scale);
		}
	}
}
