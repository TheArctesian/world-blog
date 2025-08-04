<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type { Map } from 'leaflet';
  import type { LocationData } from './types.js';
  import { MAP_CONFIG, TILE_LAYER } from './mapConfig.js';
  import { MARKER_CONFIGS, createIcon, addMarkersToMap } from './markerUtils.js';
  
  import places from './places.json';
  import ski from './ski.json';
  import hike from './mountains.json';
  import lived from './lived.json';

  let mapElement: HTMLDivElement;
  let map: Map | null = null;

  const initializeMap = async (): Promise<void> => {
    try {
      const leaflet = await import('leaflet');
      
      const bounds = leaflet.latLngBounds(
        leaflet.latLng(...MAP_CONFIG.bounds.southWest),
        leaflet.latLng(...MAP_CONFIG.bounds.northEast)
      );

      map = leaflet.map(mapElement).setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
      map.setMaxBounds(bounds);

      leaflet.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map);

      const icons = {
        city: createIcon(leaflet, MARKER_CONFIGS.city),
        ski: createIcon(leaflet, MARKER_CONFIGS.ski),
        hike: createIcon(leaflet, MARKER_CONFIGS.hike),
        lived: createIcon(leaflet, MARKER_CONFIGS.lived)
      };

      addMarkersToMap(leaflet, map, places as LocationData[], icons.city);
      addMarkersToMap(leaflet, map, ski as LocationData[], icons.ski);
      addMarkersToMap(leaflet, map, hike as LocationData[], icons.hike);
      addMarkersToMap(leaflet, map, lived as LocationData[], icons.lived);
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  };

  onMount(() => {
    if (browser) {
      initializeMap();
    }
  });

  onDestroy(() => {
    if (map) {
      console.log('Unloading Leaflet map.');
      map.remove();
      map = null;
    }
  });
</script>

<main>
  <div bind:this={mapElement} />
</main>

<style>
  @import 'leaflet/dist/leaflet.css';
  
  main div {
    height: 98vh;
    width: 98.5vw;
    margin: auto;
  }
</style>
