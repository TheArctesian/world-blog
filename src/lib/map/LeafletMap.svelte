<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import type { Map } from 'leaflet';
  import type { LocationData } from '../marker/types.js';
  import { MAP_CONFIG, TILE_LAYER } from './mapConfig.js';
  import { MARKER_CONFIGS, createIcon } from '../marker/markerConfig.js';
  import { addMarkersToMap, clearAllMarkers } from '../marker/staticMarkers.js';
  import { addAnimatedMarker } from '../marker/animatedMarker.js';
  import { createTimeline } from '../timeline/timelineBuilder.js';
  import { TimelineAnimator } from '../timeline/animator.js';
  import type { TimelineEntry, AnimationState } from '../timeline/types.js';
  import AnimationControls from '../timeline/AnimationControls.svelte';

  import places from '../data/places.json';
  import ski from '../data/ski.json';
  import hike from '../data/mountains.json';
  import lived from '../data/lived.json';

  const dispatch = createEventDispatcher<{
    switchToTimeline: void;
  }>();

  export let animationMode = false;

  let mapElement: HTMLDivElement;
  let map: Map | null = null;
  let leafletInstance: any = null;
  let animator: TimelineAnimator | null = null;
  let animationState: AnimationState;
  let icons: Record<string, any> = {};
  let currentZoomLevel = 6;
  let modeSwitching = false;

  const initializeMap = async (): Promise<void> => {
    try {
      leafletInstance = await import('leaflet');

      const bounds = leafletInstance.latLngBounds(
        leafletInstance.latLng(...MAP_CONFIG.bounds.southWest),
        leafletInstance.latLng(...MAP_CONFIG.bounds.northEast)
      );

      map = leafletInstance.map(mapElement).setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
      map!.setMaxBounds(bounds);

      leafletInstance.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map);

      icons = {
        city: createIcon(leafletInstance, MARKER_CONFIGS.city),
        ski: createIcon(leafletInstance, MARKER_CONFIGS.ski),
        hike: createIcon(leafletInstance, MARKER_CONFIGS.hike),
        lived: createIcon(leafletInstance, MARKER_CONFIGS.lived)
      };

      initializeAnimation();

      if (!animationMode) {
        addAllMarkersStatic();
      }
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  };

  const addAllMarkersStatic = (): void => {
    if (!map || !leafletInstance) return;

    addMarkersToMap(leafletInstance, map, places as LocationData[], icons.city);
    addMarkersToMap(leafletInstance, map, ski as LocationData[], icons.ski);
    addMarkersToMap(leafletInstance, map, hike as LocationData[], icons.hike);
    addMarkersToMap(leafletInstance, map, lived as LocationData[], icons.lived);
  };

  const initializeAnimation = (): void => {
    if (!map || !leafletInstance) return;

    const timeline = createTimeline(
      places as LocationData[],
      ski as LocationData[],
      hike as LocationData[],
      lived as LocationData[]
    );

    animator = new TimelineAnimator(
      timeline,
      (state) => {
        animationState = state;
      },
      (entry: TimelineEntry) => {
        const icon = icons[entry.type];
        addAnimatedMarker(leafletInstance, map!, entry, icon, currentZoomLevel);
      }
    );

    animationState = animator.getState();
  };

  const handlePlay = (): void => {
    if (!animationMode) {
      dispatch('switchToTimeline');
      // Use tick-based delay for mode switch to complete
      requestAnimationFrame(() => {
        startAnimation();
      });
    } else {
      startAnimation();
    }
  };

  const startAnimation = (): void => {
    if (map && !animationMode) {
      clearAllMarkers(map);
    }
    animator?.play();
  };

  const handlePause = (): void => {
    animator?.pause();
  };

  const handleReset = (): void => {
    if (map) {
      clearAllMarkers(map);
      if (!animationMode) {
        addAllMarkersStatic();
      }
    }
    animator?.reset();
  };

  const handleSpeedChange = (event: CustomEvent<{ speed: number }>): void => {
    animator?.setSpeed(event.detail.speed);
  };

  const handleZoomChange = (event: CustomEvent<{ zoom: number }>): void => {
    currentZoomLevel = event.detail.zoom;
  };

  $: if (map && leafletInstance && !modeSwitching) {
    if (!animator) {
      initializeAnimation();
    }

    if (animationMode) {
      if (!animationState?.isPlaying) {
        clearAllMarkers(map);
        if (animator) {
          animator.reset();
        }
      }
    } else {
      modeSwitching = true;
      clearAllMarkers(map);
      if (animator) {
        animator.pause();
      }
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
    if (animator) {
      animator.destroy();
    }
    if (map) {
      map.remove();
      map = null;
    }
  });
</script>

<main>
  <div bind:this={mapElement} />

  {#if animationState}
    <AnimationControls
      {animationState}
      isTimelineMode={animationMode}
      on:play={handlePlay}
      on:pause={handlePause}
      on:reset={handleReset}
      on:speedChange={handleSpeedChange}
      on:zoomChange={handleZoomChange}
    />
  {/if}
</main>

<style>
  @import 'leaflet/dist/leaflet.css';

  main {
    position: relative;
    width: 100%;
    height: 100vh;
  }

  main div {
    height: calc(100vh - 140px);
    width: 100vw;
    margin: 0;
  }

  @media (max-width: 768px) {
    main div {
      height: calc(100vh - 160px);
    }
  }

  @media (max-width: 480px) {
    main div {
      height: calc(100vh - 180px);
    }
  }
</style>
