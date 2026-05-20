import * as THREE from 'three';
import { latLonToVector3 } from './tileUtils.js';
import { GLOBE_CONFIG } from './globeConfig.js';

// Matches the watercolor-red used by the leaflet marker and the pill dot
// so the "currently here" indicator reads the same across all three views.
const LIVE_COLOR = '#c44a3f';
const PAPER_COLOR = '#fdfbf3';

// Above static city markers (1.005) so the live dot layers on top when they
// happen to coincide.
const LIVE_OFFSET = 1.012;

// Dot size at the default (zoomed-out) camera distance. The dot shrinks as
// the user zooms in so it stays a similar-looking dot on screen rather than
// growing to engulf the city it's marking. Mirrors the static-marker scaling
// in markers.ts (`updateMarkerScales`).
const DOT_BASE_SIZE = 0.13;
const DOT_MIN_SIZE = 0.025;
const DOT_DISTANCE_FALLOFF = 1.8;
const PULSE_GROWTH = 2.4; // peak pulse radius = dot * (1 + PULSE_GROWTH)
const PULSE_PERIOD_MS = 2200;
const PULSE_PEAK_OPACITY = 0.65;

let dotTexture: THREE.Texture | null = null;
let pulseTexture: THREE.Texture | null = null;

const createCircleTexture = (
  fill: string | null,
  strokeColor: string | null,
  strokeWidth: number
): THREE.Texture => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - strokeWidth, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const getDotTexture = (): THREE.Texture => {
  if (!dotTexture) {
    dotTexture = createCircleTexture(LIVE_COLOR, PAPER_COLOR, 6);
  }
  return dotTexture;
};

const getPulseTexture = (): THREE.Texture => {
  if (!pulseTexture) {
    pulseTexture = createCircleTexture(null, LIVE_COLOR, 8);
  }
  return pulseTexture;
};

export type LiveMarker = {
  group: THREE.Group;
  dot: THREE.Sprite;
  pulse: THREE.Sprite;
};

export function createLiveMarker(
  lat: number,
  lon: number,
  radius: number = GLOBE_CONFIG.radius
): LiveMarker {
  const group = new THREE.Group();
  group.position.copy(latLonToVector3(lat, lon, radius * LIVE_OFFSET));

  const dotMaterial = new THREE.SpriteMaterial({
    map: getDotTexture(),
    transparent: true,
    // depthTest hides the marker when the camera is on the opposite side
    // of the globe, which is the desired behavior.
    depthTest: true
  });
  const dot = new THREE.Sprite(dotMaterial);
  dot.scale.set(DOT_BASE_SIZE, DOT_BASE_SIZE, DOT_BASE_SIZE);
  dot.renderOrder = 2;
  group.add(dot);

  const pulseMaterial = new THREE.SpriteMaterial({
    map: getPulseTexture(),
    transparent: true,
    depthTest: true,
    opacity: PULSE_PEAK_OPACITY
  });
  const pulse = new THREE.Sprite(pulseMaterial);
  pulse.scale.set(DOT_BASE_SIZE, DOT_BASE_SIZE, DOT_BASE_SIZE);
  pulse.renderOrder = 1;
  group.add(pulse);

  return { group, dot, pulse };
}

// Distance-aware base size: matches the static-marker falloff so the live
// dot stays visually proportionate at every zoom level (no giant blob when
// the camera flies in close).
const dotSizeForDistance = (cameraDistance: number): number => {
  const t = cameraDistance / GLOBE_CONFIG.initialCameraDistance;
  const raw = DOT_BASE_SIZE * Math.pow(t, DOT_DISTANCE_FALLOFF);
  return Math.min(DOT_BASE_SIZE, Math.max(DOT_MIN_SIZE, raw));
};

export function setLiveMarkerPosition(
  marker: LiveMarker,
  lat: number,
  lon: number,
  radius: number = GLOBE_CONFIG.radius
): void {
  marker.group.position.copy(latLonToVector3(lat, lon, radius * LIVE_OFFSET));
}

export function updateLiveMarkerPulse(
  marker: LiveMarker,
  elapsedMs: number,
  cameraDistance: number
): void {
  const base = dotSizeForDistance(cameraDistance);
  marker.dot.scale.set(base, base, base);

  // Ease-out — the ring expands quickly then slows, mirroring the CSS pulse
  // on the pill and the leaflet marker. Peak radius scales with the dot so
  // the whole indicator shrinks together when zoomed in.
  const t = (elapsedMs % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
  const eased = 1 - Math.pow(1 - t, 2.5);
  const pulseScale = base * (1 + PULSE_GROWTH * eased);
  marker.pulse.scale.set(pulseScale, pulseScale, pulseScale);
  marker.pulse.material.opacity = PULSE_PEAK_OPACITY * (1 - t);
}

export function disposeLiveMarker(marker: LiveMarker): void {
  marker.dot.material.dispose();
  marker.pulse.material.dispose();
}
