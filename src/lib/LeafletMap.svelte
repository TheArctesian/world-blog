<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import type { Map } from 'leaflet';
  import type { LocationData } from './types.js';
  import { MAP_CONFIG, TILE_LAYER } from './mapConfig.js';
  import { MARKER_CONFIGS, createIcon, addMarkersToMap, addAnimatedMarker, clearAllMarkers } from './markerUtils.js';
  import { TimelineAnimator, createTimeline, type TimelineEntry, type AnimationState } from './timelineAnimation.js';
  import AnimationControls from './AnimationControls.svelte';
  
  const dispatch = createEventDispatcher<{
    switchToTimeline: void;
  }>();
  
  import places from './places.json';
  import ski from './ski.json';
  import hike from './mountains.json';
  import lived from './lived.json';

  export let animationMode = false;

  let mapElement: HTMLDivElement;
  let map: Map | null = null;
  let leafletInstance: any = null;
  let animator: TimelineAnimator | null = null;
  let animationState: AnimationState;
  let icons: Record<string, any> = {};
  let currentZoomLevel = 6;

  const initializeMap = async (): Promise<void> => {
    try {
      leafletInstance = await import('leaflet');
      
      const bounds = leafletInstance.latLngBounds(
        leafletInstance.latLng(...MAP_CONFIG.bounds.southWest),
        leafletInstance.latLng(...MAP_CONFIG.bounds.northEast)
      );

      map = leafletInstance.map(mapElement).setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
      map.setMaxBounds(bounds);

      leafletInstance.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map);

      icons = {
        city: createIcon(leafletInstance, MARKER_CONFIGS.city),
        ski: createIcon(leafletInstance, MARKER_CONFIGS.ski),
        hike: createIcon(leafletInstance, MARKER_CONFIGS.hike),
        lived: createIcon(leafletInstance, MARKER_CONFIGS.lived)
      };

      // Initialize animation system first
      initializeAnimation();
      
      // Then handle initial display based on mode
      if (!animationMode) {
        addAllMarkersStatic();
      }
      // Animation mode starts with clean map (no markers)
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
    // Auto-switch to timeline mode when play is pressed
    if (!animationMode) {
      dispatch('switchToTimeline');
      // Use setTimeout to ensure mode switch completes before starting animation
      setTimeout(() => {
        startAnimation();
      }, 150);
    } else {
      startAnimation();
    }
  };

  const startAnimation = (): void => {
    // Only clear markers if not already cleared by mode switch
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
      // In static mode, re-add all markers after reset
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

  // Handle mode switching and marker display
  $: if (map && leafletInstance) {
    if (!animator) {
      initializeAnimation();
    }
    
    if (animationMode) {
      // Animation mode: clear markers only if not already playing
      if (!animationState?.isPlaying) {
        clearAllMarkers(map);
        if (animator) {
          animator.reset(); // Reset to clean state
        }
      }
    } else {
      // Static mode: clear and show all markers
      clearAllMarkers(map);
      if (animator) {
        animator.pause(); // Pause any running animation
      }
      // Add small delay to prevent flicker when switching from animation
      setTimeout(() => {
        if (!animationMode && map) {
          addAllMarkersStatic();
        }
      }, 50);
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
      console.log('Unloading Leaflet map.');
      map.remove();
      map = null;
    }
  });
</script>

<main>
  <div bind:this={mapElement} />
  
  <!-- Always show timeline controls -->
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

  /* Responsive design */
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
