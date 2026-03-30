import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLOBE_CONFIG } from './globeConfig.js';
import { latLonToVector3 } from './tileUtils.js';

/**
 * Set up orbit controls for the globe.
 */
export function setupOrbitControls(
	camera: THREE.PerspectiveCamera,
	domElement: HTMLElement
): OrbitControls {
	const controls = new OrbitControls(camera, domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.minDistance = GLOBE_CONFIG.minCameraDistance;
	controls.maxDistance = GLOBE_CONFIG.maxCameraDistance;
	controls.enablePan = false;
	controls.rotateSpeed = 0.5;
	controls.zoomSpeed = 0.8;
	controls.autoRotate = false;
	controls.autoRotateSpeed = GLOBE_CONFIG.autoRotateSpeed;
	// Target the globe center
	controls.target.set(0, 0, 0);
	return controls;
}

/**
 * Smoothly fly the camera to look at a specific lat/lon on the globe.
 * Uses spherical interpolation for smooth arc movement.
 */
export function flyTo(
	camera: THREE.PerspectiveCamera,
	controls: OrbitControls,
	lat: number,
	lon: number,
	duration: number = GLOBE_CONFIG.flyDuration,
	targetDistance?: number
): Promise<void> {
	return new Promise((resolve) => {
		const startPosition = camera.position.clone();
		const startTime = performance.now();

		// Calculate target camera position: looking at the point from outside
		const surfacePoint = latLonToVector3(lat, lon, GLOBE_CONFIG.radius);
		const direction = surfacePoint.clone().normalize();
		const distance = targetDistance ?? camera.position.length();
		const endPosition = direction.multiplyScalar(distance);

		const animate = (time: number) => {
			const elapsed = time - startTime;
			const t = Math.min(elapsed / duration, 1);
			// Ease in-out cubic
			const eased = t < 0.5
				? 4 * t * t * t
				: 1 - Math.pow(-2 * t + 2, 3) / 2;

			// SLERP between start and end positions
			const current = new THREE.Vector3().copy(startPosition).lerp(endPosition, eased);
			// Maintain distance from center (arc, not straight line)
			const currentDist = THREE.MathUtils.lerp(startPosition.length(), endPosition.length(), eased);
			current.normalize().multiplyScalar(currentDist);

			camera.position.copy(current);
			camera.lookAt(0, 0, 0);
			controls.update();

			if (t < 1) {
				requestAnimationFrame(animate);
			} else {
				resolve();
			}
		};

		requestAnimationFrame(animate);
	});
}
