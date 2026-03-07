// Map domain
export { MAP_CONFIG, TILE_LAYER } from './map/mapConfig.js';
export type { MapConfig } from './map/types.js';

// Marker domain
export { MARKER_CONFIGS, createIcon } from './marker/markerConfig.js';
export { addMarkersToMap, clearAllMarkers, createPopupContent } from './marker/staticMarkers.js';
export { addAnimatedMarker } from './marker/animatedMarker.js';
export type { LocationData, MarkerConfig } from './marker/types.js';

// Timeline domain
export { TimelineAnimator } from './timeline/animator.js';
export { createTimeline } from './timeline/timelineBuilder.js';
export { parseDate, formatDateForDisplay } from './timeline/dateUtils.js';
export { generateYearMarkers } from './timeline/yearMarkers.js';
export type { TimelineEntry, AnimationState, YearMarker } from './timeline/types.js';
