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
  import {
    currentLocation,
    formatAgo,
    type CurrentLocation
  } from '../currentLocationStore.js';

  import places from '../data/places.json';
  import ski from '../data/ski.json';
  import hike from '../data/mountains.json';
  import lived from '../data/lived.json';

  const dispatch = createEventDispatcher<{
    requestZoomOut: { lat: number; lon: number; cameraDistance: number };
  }>();

  export let animationMode = false;
  export let heatMode = false;
  export let active = true;
  export let animator: TimelineAnimator | null = null;
  export let initialView: { lat: number; lon: number; zoom: number } | null = null;

  let mapElement: HTMLDivElement;
  let map: Map | null = null;
  let leafletInstance: any = null;
  let icons: Record<string, any> = {};
  let modeSwitching = false;
  let handoffFired = false;
  let liveMarker: any = null;
  let unsubscribeLocation: (() => void) | null = null;
  let heatLayer: any = null;
  let heatLayerPending = false;

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

      // Default Leaflet zoom controls clash with the top-left stats/location
      // pills; the watercolor map also reads better without them. Users can
      // still zoom with scroll wheel and pinch.
      map = leafletInstance.map(mapElement, { zoomControl: false }).setView(center, zoom);
      map!.setMaxBounds(bounds);

      leafletInstance.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map);

      icons = {
        city: createIcon(leafletInstance, MARKER_CONFIGS.city),
        ski: createIcon(leafletInstance, MARKER_CONFIGS.ski),
        hike: createIcon(leafletInstance, MARKER_CONFIGS.hike),
        lived: createIcon(leafletInstance, MARKER_CONFIGS.lived)
      };

      if (!animationMode && !heatMode) {
        addAllMarkersStatic();
      }

      map!.on('zoomend', handleZoomEnd);

      // Subscribe only after the map is ready so the first store value
      // doesn't try to render before Leaflet is initialized.
      unsubscribeLocation = currentLocation.subscribe(renderLiveMarker);
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  };

  const escapePopupText = (value: string): string =>
    value.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return ch;
      }
    });

  const buildLivePopupHtml = (data: CurrentLocation): string => {
    // Mirror the pill's two-tier display: most specific name big, the rest
    // as context underneath.
    const primary = data.district || data.city || 'somewhere';
    const contextParts: string[] = [];
    if (data.district && data.city) contextParts.push(data.city);
    if (data.region) contextParts.push(data.region);
    const primaryHtml = escapePopupText(primary);
    const contextHtml = contextParts.length
      ? escapePopupText(contextParts.join(', '))
      : '';
    const seen = data.timestampMs ? formatAgo(data.timestampMs) : '';
    return `
      <div class="marker-tooltip marker-tooltip-leaflet-inner live-popup">
        <div class="live-popup__label">currently around</div>
        <div class="live-popup__city">${primaryHtml}</div>
        ${contextHtml ? `<div class="live-popup__country">${contextHtml}</div>` : ''}
        ${seen ? `<div class="live-popup__time">seen ${seen}</div>` : ''}
      </div>
    `.trim();
  };

  const renderLiveMarker = (data: CurrentLocation | null): void => {
    if (!map || !leafletInstance) return;
    const usable =
      data?.available &&
      typeof data.latitude === 'number' &&
      typeof data.longitude === 'number';

    if (!usable || !data) {
      if (liveMarker) {
        map.removeLayer(liveMarker);
        liveMarker = null;
      }
      return;
    }

    const html =
      '<div class="live-marker">' +
      '<span class="live-marker__pulse"></span>' +
      '<span class="live-marker__dot"></span>' +
      '</div>';
    const icon = leafletInstance.divIcon({
      className: 'live-marker-wrapper',
      html,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const latlng: [number, number] = [data.latitude as number, data.longitude as number];
    const popupHtml = buildLivePopupHtml(data);

    if (liveMarker) {
      liveMarker.setLatLng(latlng);
      liveMarker.setIcon(icon);
      liveMarker.setPopupContent(popupHtml);
    } else {
      liveMarker = leafletInstance
        .marker(latlng, { icon, zIndexOffset: 1000, live: true })
        .bindPopup(popupHtml, { className: 'marker-tooltip-leaflet' })
        .addTo(map);
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
    // The heat canvas is sized from the map viewport, so a container resize has
    // to re-run its layout too — the map's own `resize` event doesn't fire for
    // an invalidateSize triggered by the globe/leaflet crossfade.
    heatLayer?._reset?.();
  };

  // The heat renderer is only pulled in when the mode is first entered; it is
  // dead weight for visitors who never leave the marker views.
  const syncHeatLayer = async (enabled: boolean): Promise<void> => {
    if (!map || !leafletInstance || heatLayerPending) return;

    if (!enabled) {
      if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
      }
      return;
    }

    if (heatLayer) return;

    heatLayerPending = true;
    try {
      const { createHeatLayer } = await import('../heat/leafletHeat.js');
      // The mode may have been switched away again while the chunk loaded.
      if (!map || !heatMode) return;
      heatLayer = createHeatLayer(leafletInstance);
      heatLayer.addTo(map);
    } catch (error) {
      console.error('Failed to load heat layer:', error);
    } finally {
      heatLayerPending = false;
    }
  };

  $: if (map && leafletInstance) {
    syncHeatLayer(heatMode);
  }

  $: if (map && leafletInstance && !modeSwitching) {
    if (animationMode) {
      if (!animator || !animator.getState().isPlaying) {
        clearAllMarkers(map);
        animator?.reset();
      }
    } else if (heatMode) {
      // The wash carries the whole story in this mode; markers on top of it
      // would just be visual noise.
      modeSwitching = true;
      clearAllMarkers(map);
      animator?.pause();
      modeSwitching = false;
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
    if (unsubscribeLocation) {
      unsubscribeLocation();
      unsubscribeLocation = null;
    }
    if (map) {
      map.off('zoomend', handleZoomEnd);
      map.remove();
      map = null;
    }
    heatLayer = null;
    liveMarker = null;
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
