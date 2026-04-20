<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import GlobeMap from './globe/GlobeMap.svelte';
  import LeafletMap from './map/LeafletMap.svelte';
  import AnimationControls from './timeline/AnimationControls.svelte';
  import { createTimeline } from './timeline/timelineBuilder.js';
  import { TimelineAnimator } from './timeline/animator.js';
  import type { TimelineEntry, AnimationState } from './timeline/types.js';
  import type { LocationData } from './marker/types.js';
  import { TRANSITION_MS } from './transition/mapping.js';

  import places from './data/places.json';
  import ski from './data/ski.json';
  import hike from './data/mountains.json';
  import lived from './data/lived.json';

  export let animationMode = false;

  type View = 'globe' | 'leaflet';
  let activeView: View = 'globe';
  let transitioning = false;

  let globeMap: GlobeMap | null = null;
  let leafletMap: LeafletMap | null = null;

  let animator: TimelineAnimator | null = null;
  let animationState: AnimationState;

  const handleMarkerAdd = (entry: TimelineEntry): void => {
    // Fan out to both views so each stays in sync and is ready to take over
    // after a crossfade without missing history.
    globeMap?.addMarker(entry);
    leafletMap?.addMarker(entry);
  };

  onMount(() => {
    if (!browser) return;
    const timeline = createTimeline(
      places as LocationData[],
      ski as LocationData[],
      hike as LocationData[],
      lived as LocationData[]
    );
    animator = new TimelineAnimator(
      timeline,
      (state) => { animationState = state; },
      handleMarkerAdd
    );
    animationState = animator.getState();
  });

  onDestroy(() => {
    animator?.destroy();
  });

  const handleRequestZoomIn = async (
    event: CustomEvent<{ lat: number; lon: number; leafletZoom: number }>
  ): Promise<void> => {
    if (transitioning || activeView !== 'globe') return;
    transitioning = true;
    const { lat, lon, leafletZoom } = event.detail;
    leafletMap?.invalidateSize();
    leafletMap?.focusOn(lat, lon, leafletZoom);
    await tick();
    activeView = 'leaflet';
    setTimeout(() => { transitioning = false; }, TRANSITION_MS);
  };

  const handleRequestZoomOut = async (
    event: CustomEvent<{ lat: number; lon: number; cameraDistance: number }>
  ): Promise<void> => {
    if (transitioning || activeView !== 'leaflet') return;
    transitioning = true;
    const { lat, lon, cameraDistance } = event.detail;
    globeMap?.focusOn(lat, lon, cameraDistance);
    await tick();
    activeView = 'globe';
    setTimeout(() => { transitioning = false; }, TRANSITION_MS);
  };

  const handlePlay = (): void => {
    animator?.play();
  };

  const handlePause = (): void => {
    animator?.pause();
  };

  const handleReset = (): void => {
    animator?.reset();
    globeMap?.clearMarkers();
    leafletMap?.clearMarkers();
    if (!animationMode) {
      globeMap?.refreshStaticMarkers();
      leafletMap?.refreshStaticMarkers();
    }
  };

  const handleSpeedChange = (event: CustomEvent<{ speed: number }>): void => {
    animator?.setSpeed(event.detail.speed);
  };
</script>

<main>
  <div class="map-stack">
    <div
      class="map-layer"
      class:active={activeView === 'globe'}
      style="--transition-ms: {TRANSITION_MS}ms"
    >
      <GlobeMap
        bind:this={globeMap}
        {animationMode}
        {animator}
        active={activeView === 'globe'}
        on:requestZoomIn={handleRequestZoomIn}
      />
    </div>
    <div
      class="map-layer"
      class:active={activeView === 'leaflet'}
      style="--transition-ms: {TRANSITION_MS}ms"
    >
      <LeafletMap
        bind:this={leafletMap}
        {animationMode}
        {animator}
        active={activeView === 'leaflet'}
        on:requestZoomOut={handleRequestZoomOut}
      />
    </div>
  </div>

  {#if animationState}
    <AnimationControls
      {animationState}
      isTimelineMode={animationMode}
      on:play={handlePlay}
      on:pause={handlePause}
      on:reset={handleReset}
      on:speedChange={handleSpeedChange}
    />
  {/if}
</main>

<style>
  main {
    position: relative;
    width: 100%;
    height: 100vh;
  }

  .map-stack {
    position: relative;
    width: 100vw;
    height: calc(100vh - 140px);
    overflow: hidden;
  }

  .map-layer {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-ms) ease-in-out;
  }

  .map-layer.active {
    opacity: 1;
    pointer-events: auto;
  }

  @media (max-width: 768px) {
    .map-stack {
      height: calc(100vh - 160px);
    }
  }

  @media (max-width: 480px) {
    .map-stack {
      height: calc(100vh - 180px);
    }
  }
</style>
