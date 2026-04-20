<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import type { Map } from 'leaflet';
  import type { LocationData } from '../marker/types.js';
  import { MAP_CONFIG, TILE_LAYER } from './mapConfig.js';
  import { MARKER_CONFIGS, createIcon } from '../marker/markerConfig.js';
  import { addMarkersToMap, clearAllMarkers } from '../marker/staticMarkers.js';
  import { addAnimatedMarker as addAnimatedLeafletMarker } from '../marker/animatedMarker.js';
  import type { TimelineEntry } from '../timeline/types.js';
  import type { TimelineAnimator } from '../timeline/animator.js';
  import { RETURN_LEAFLET_ZOOM, RETURN_CAMERA_DISTANCE } from '../transition/mapping.js';

  import places from '../data/places.json';
  import ski from '../data/ski.json';
  import hike from '../data/mountains.json';
  import lived from '../data/lived.json';

  const dispatch = createEventDispatcher<{
    requestZoomOut: { lat: number; lon: number; cameraDistance: number };
  }>();

  export let animationMode = false;
  export let active = true;
  export let animator: TimelineAnimator | null = null;
  export let initialView: { lat: number; lon: number; zoom: number } | null = null;

  let mapElement: HTMLDivElement;
  let map: Map | null = null;
  let leafletInstance: any = null;
  let icons: Record<string, any> = {};
  let modeSwitching = false;
  let handoffFired = false;

  const initializeMap = async (): Promise<void> => {
    try {
      leafletInstance = await import('leaflet');

      const bounds = leafletInstance.latLngBounds(
        leafletInstance.latLng(...MAP_CONFIG.bounds.southWest),
        leafletInstance.latLng(...MAP_CONFIG.bounds.northEast)
      );

      const center: [number, number] = initialView
        ? [initialView.lat, initialView.lon]
        : MAP_CONFIG.center;
      const zoom = initialView?.zoom ?? MAP_CONFIG.zoom;

      map = leafletInstance.map(mapElement).setView(center, zoom);
      map!.setMaxBounds(bounds);

      leafletInstance.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map);

      icons = {
        city: createIcon(leafletInstance, MARKER_CONFIGS.city),
        ski: createIcon(leafletInstance, MARKER_CONFIGS.ski),
        hike: createIcon(leafletInstance, MARKER_CONFIGS.hike),
        lived: createIcon(leafletInstance, MARKER_CONFIGS.lived)
      };

      if (!animationMode) {
        addAllMarkersStatic();
      }

      map!.on('zoomend', handleZoomEnd);
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  };

  const handleZoomEnd = (): void => {
    if (!map || !active || handoffFired) return;
    const currentZoom = map.getZoom();
    if (currentZoom < RETURN_LEAFLET_ZOOM) {
      handoffFired = true;
      const center = map.getCenter();
      dispatch('requestZoomOut', {
        lat: center.lat,
        lon: center.lng,
        cameraDistance: RETURN_CAMERA_DISTANCE
      });
    }
  };

  const addAllMarkersStatic = (): void => {
    if (!map || !leafletInstance) return;

    addMarkersToMap(leafletInstance, map, places as LocationData[], icons.city);
    addMarkersToMap(leafletInstance, map, ski as LocationData[], icons.ski);
    addMarkersToMap(leafletInstance, map, hike as LocationData[], icons.hike);
    addMarkersToMap(leafletInstance, map, lived as LocationData[], icons.lived);
  };

  export const addMarker = (entry: TimelineEntry): void => {
    if (!map || !leafletInstance) return;
    const icon = icons[entry.type];
    if (!icon) return;
    addAnimatedLeafletMarker(leafletInstance, map, entry, icon, map.getZoom());
  };

  export const clearMarkers = (): void => {
    if (map) {
      clearAllMarkers(map);
    }
  };

  export const refreshStaticMarkers = (): void => {
    clearMarkers();
    addAllMarkersStatic();
  };

  export const focusOn = (lat: number, lon: number, zoom: number): void => {
    if (!map) return;
    handoffFired = false;
    // Snap without animation so the map is ready at the destination before
    // the crossfade reveals it.
    map.setView([lat, lon], zoom, { animate: false });
  };

  export const invalidateSize = (): void => {
    map?.invalidateSize();
  };

  $: if (map && leafletInstance && !modeSwitching) {
    if (animationMode) {
      if (!animator || !animator.getState().isPlaying) {
        clearAllMarkers(map);
        animator?.reset();
      }
    } else {
      modeSwitching = true;
      clearAllMarkers(map);
      animator?.pause();
      addAllMarkersStatic();
      modeSwitching = false;
    }
  }

  onMount(() => {
    if (browser) {
      initializeMap();
    }
  });

  onDestroy(() => {
    if (map) {
      map.off('zoomend', handleZoomEnd);
      map.remove();
      map = null;
    }
  });
</script>

<div class="leaflet-container" bind:this={mapElement}></div>

<style>
  @import 'leaflet/dist/leaflet.css';

  .leaflet-container {
    width: 100%;
    height: 100%;
    margin: 0;
  }
</style>
