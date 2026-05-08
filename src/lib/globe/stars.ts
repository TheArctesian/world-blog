import * as THREE from 'three';

/**
 * Create a starfield rendered as a large sphere of points around the scene.
 * Stars sit on a shell well outside the camera's max distance so they read as
 * a fixed backdrop regardless of zoom or rotation.
 */
export function createStarfield(count = 2500, radius = 60): THREE.Points {
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	const sizes = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		// Uniform distribution on a sphere via inverse CDF on cos(phi).
		const u = Math.random();
		const v = Math.random();
		const theta = 2 * Math.PI * u;
		const phi = Math.acos(2 * v - 1);
		const r = radius * (0.95 + Math.random() * 0.1);

		positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
		positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
		positions[i * 3 + 2] = r * Math.cos(phi);

		// Slight color variation: mostly white, occasional warm/cool tints.
		const tint = Math.random();
		if (tint < 0.75) {
			colors[i * 3 + 0] = 1.0;
			colors[i * 3 + 1] = 1.0;
			colors[i * 3 + 2] = 1.0;
		} else if (tint < 0.9) {
			colors[i * 3 + 0] = 0.85;
			colors[i * 3 + 1] = 0.9;
			colors[i * 3 + 2] = 1.0;
		} else {
			colors[i * 3 + 0] = 1.0;
			colors[i * 3 + 1] = 0.95;
			colors[i * 3 + 2] = 0.85;
		}

		sizes[i] = 0.5 + Math.pow(Math.random(), 3) * 2.5;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

	const material = new THREE.ShaderMaterial({
		uniforms: {
			pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
		},
		vertexShader: `
			attribute float size;
			attribute vec3 color;
			varying vec3 vColor;
			uniform float pixelRatio;
			void main() {
				vColor = color;
				vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
				gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
				gl_Position = projectionMatrix * mvPosition;
			}
		`,
		fragmentShader: `
			varying vec3 vColor;
			void main() {
				vec2 uv = gl_PointCoord - vec2(0.5);
				float d = length(uv);
				if (d > 0.5) discard;
				float alpha = smoothstep(0.5, 0.0, d);
				gl_FragColor = vec4(vColor, alpha);
			}
		`,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	});

	const stars = new THREE.Points(geometry, material);
	stars.frustumCulled = false;
	stars.renderOrder = -2;
	return stars;
}
