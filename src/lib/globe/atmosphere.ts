import * as THREE from 'three';

const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
	vNormal = normalize(normalMatrix * normal);
	vec4 worldPos = modelMatrix * vec4(position, 1.0);
	vWorldPosition = worldPos.xyz;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const atmosphereFragmentShader = `
uniform vec3 glowColor;
uniform float fresnelPower;
uniform float glowIntensity;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
	vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
	float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), fresnelPower);
	gl_FragColor = vec4(glowColor, fresnel * glowIntensity);
}
`;

/**
 * Create an atmosphere glow mesh around the globe.
 * Inspired by the Geographical-Adventures Globe.shader fresnel effect.
 */
export function createAtmosphere(radius: number, color: string): THREE.Mesh {
	const geometry = new THREE.SphereGeometry(radius * 1.08, 64, 64);
	const material = new THREE.ShaderMaterial({
		vertexShader: atmosphereVertexShader,
		fragmentShader: atmosphereFragmentShader,
		uniforms: {
			glowColor: { value: new THREE.Color(color) },
			fresnelPower: { value: 3.0 },
			glowIntensity: { value: 0.6 }
		},
		side: THREE.BackSide,
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthWrite: false
	});

	return new THREE.Mesh(geometry, material);
}
