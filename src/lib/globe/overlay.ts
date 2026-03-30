import * as THREE from 'three';
import { GLOBE_CONFIG } from './globeConfig.js';

/**
 * Project a 3D world position to 2D screen coordinates.
 */
export function worldToScreen(
	position: THREE.Vector3,
	camera: THREE.PerspectiveCamera,
	canvas: HTMLCanvasElement
): { x: number; y: number; visible: boolean } {
	const pos = position.clone();
	pos.project(camera);

	// Check if the point is behind the globe
	const cameraToPoint = position.clone().sub(camera.position);
	const cameraToCenter = new THREE.Vector3().sub(camera.position);
	const pointNormal = position.clone().normalize();
	const cameraDir = cameraToPoint.clone().normalize();

	// Point is on the far side of the globe if:
	// the angle between camera->point and the surface normal is > 90 degrees
	// (i.e., the point faces away from the camera)
	const dotProduct = pointNormal.dot(camera.position.clone().normalize());
	const visible = dotProduct > 0 && pos.z < 1;

	const x = (pos.x * 0.5 + 0.5) * canvas.clientWidth;
	const y = (-pos.y * 0.5 + 0.5) * canvas.clientHeight;

	return { x, y, visible };
}

/**
 * Create a popup element for a marker.
 */
export function createPopupElement(
	city: string,
	date: string | number,
	container: HTMLElement
): HTMLElement {
	const popup = document.createElement('div');
	popup.className = 'globe-popup';
	popup.innerHTML = `
		<div class="place-name-popup">
			<div class="place-city">${city}</div>
			<div class="place-date">${date}</div>
		</div>
	`;
	popup.style.position = 'absolute';
	popup.style.pointerEvents = 'auto';
	popup.style.zIndex = '50';
	container.appendChild(popup);
	return popup;
}
