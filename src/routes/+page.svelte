<script lang="ts">
  import MapSwitcher from "$lib/MapSwitcher.svelte";
  import Info from "$lib/info.svelte";
  import TravelStats from "$lib/TravelStats.svelte";
  import CurrentLocation from "$lib/CurrentLocation.svelte";
  import HeatLegend from "$lib/heat/HeatLegend.svelte";
  import { currentLocation } from "$lib/currentLocationStore.js";
  import "../app.css";
  import type { PageData } from "./$types";

  export let data: PageData;

  // Seed the store from SSR so the pill and map marker show immediately
  // without waiting for the client poll.
  if (data.initialLocation) {
    currentLocation.set(data.initialLocation);
  }

  type ViewMode = 'places' | 'timeline' | 'heat';

  // Slight per-button tilts so the group reads as three things pinned to paper
  // rather than one machined segmented control.
  const MODES: { id: ViewMode; label: string; tilt: number }[] = [
    { id: 'places', label: 'Places', tilt: -1.2 },
    { id: 'timeline', label: 'Timeline', tilt: 0.7 },
    { id: 'heat', label: 'Time spent', tilt: -0.8 }
  ];

  let viewMode: ViewMode = 'places';

  $: animationMode = viewMode === 'timeline';
  $: heatMode = viewMode === 'heat';

  $: locVisible = !!$currentLocation?.available &&
    !!($currentLocation?.label || $currentLocation?.city || $currentLocation?.district);
</script>

<div class="watercolor-bg paper-texture">
  <div class="stats-corner">
    <div class="stats-card journal">
      {#if locVisible}
        <CurrentLocation />
        <div class="stats-divider" aria-hidden="true"></div>
      {/if}
      <TravelStats />
    </div>
  </div>

  <div class="top-controls">
    <div class="mode-switch" role="group" aria-label="Map mode">
      {#each MODES as mode}
        <button
          type="button"
          class="mode-option"
          class:is-active={viewMode === mode.id}
          style="--tilt: {mode.tilt}deg"
          aria-pressed={viewMode === mode.id}
          on:click={() => (viewMode = mode.id)}
        >
          {mode.label}
        </button>
      {/each}
    </div>
    <div class="info-container">
      <Info />
    </div>
  </div>

  <!-- Kept mounted and toggled with CSS rather than {#if} + a transition: an
       interrupted outro can leave the node behind at opacity 0, and an invisible
       fixed-position card still swallows clicks on the map beneath it. -->
  <div class="legend-corner" class:is-visible={heatMode} aria-hidden={!heatMode}>
    <HeatLegend />
  </div>

  <MapSwitcher {animationMode} {heatMode} initialLocation={data.initialLocation} />
</div>

<style>
  .stats-corner {
    position: fixed;
    top: 20px;
    left: 24px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: calc(100vw - 280px);
    pointer-events: none; /* journal text shouldn't intercept map drags */
  }

  .stats-card {
    pointer-events: auto;
  }

  /* Single frosted-paper substrate behind both the live-location and
     travel-stats stanzas. backdrop-filter blurs whatever's behind (sky,
     watercolor tiles), the cream tint warms it, no border, no shadow. */
  .stats-corner :global(.journal) {
    position: relative;
    padding: 12px 18px;
    border-radius: 18px;
    background: rgba(250, 248, 243, 0.62);
    -webkit-backdrop-filter: blur(8px) saturate(1.05);
    backdrop-filter: blur(8px) saturate(1.05);
  }

  /* Layered cream halo so the ink stays crisp on both the dark globe sky
     and the lighter watercolor map. */
  .stats-corner :global(.journal),
  .stats-corner :global(.journal *) {
    text-shadow:
      0 0 3px rgba(250, 248, 243, 1),
      0 0 8px rgba(250, 248, 243, 0.95),
      0 1px 1px rgba(250, 248, 243, 1);
  }

  /* Dotted hand-drawn rule between the location stanza and the stats
     stanza — same language as the divider inside marker tooltips. */
  .stats-divider {
    height: 6px;
    margin: 8px -4px 8px;
    background-image: radial-gradient(
      circle 1.2px,
      color-mix(in srgb, var(--ink) 50%, transparent) 99%,
      transparent 100%
    );
    background-size: 7px 6px;
    background-repeat: repeat-x;
    background-position: center;
    opacity: 0.6;
  }

  /* Browsers without backdrop-filter (older Firefox without the flag) fall
     back to a denser solid tint so legibility holds. */
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .stats-corner :global(.journal) {
      background: rgba(250, 248, 243, 0.85);
    }
  }

  .top-controls {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .info-container {
    position: relative;
  }

  /* Three modes pinned to a strip of paper. The card underneath carries the
     frosted substrate; each option only paints itself when it's the live one,
     so the group stays quiet until you look at it. */
  .mode-switch {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-radius: 16px;
    background: rgba(250, 248, 243, 0.72);
    -webkit-backdrop-filter: blur(8px) saturate(1.05);
    backdrop-filter: blur(8px) saturate(1.05);
    box-shadow: 3px 3px 8px var(--shadow);
  }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .mode-switch {
      background: rgba(250, 248, 243, 0.92);
    }
  }

  .mode-option {
    font-family: 'Caveat', cursive;
    font-size: 17px;
    font-weight: 600;
    line-height: 1;
    color: var(--ink);
    background: transparent;
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 6px 13px;
    cursor: pointer;
    white-space: nowrap;
    transform: rotate(var(--tilt));
    transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease,
      transform 0.25s ease;
  }

  .mode-option:hover:not(.is-active) {
    border-color: color-mix(in srgb, var(--water-blue) 55%, transparent);
    transform: rotate(0deg) translateY(-1px);
  }

  .mode-option:focus-visible {
    outline: 2px dashed var(--water-blue);
    outline-offset: 2px;
  }

  .mode-option.is-active {
    background: var(--water-blue);
    border-color: var(--water-blue);
    color: var(--paper);
    box-shadow: 2px 2px 6px var(--shadow);
  }

  /* Sits clear of the timeline strip along the bottom of the viewport. */
  .legend-corner {
    position: fixed;
    left: 24px;
    bottom: 104px;
    z-index: 1000;
    max-width: calc(100vw - 48px);
    opacity: 0;
    visibility: hidden;
    /* Not animatable, so it takes effect on the same frame as the class change:
       the card stops intercepting map clicks the instant heat mode is left,
       without waiting on the fade. */
    pointer-events: none;
    transform: translateY(8px);
    transition: opacity 0.24s ease, transform 0.24s ease, visibility 0s linear 0.24s;
  }

  .legend-corner.is-visible {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0);
    transition: opacity 0.24s ease, transform 0.24s ease, visibility 0s;
  }

  @media (prefers-reduced-motion: reduce) {
    .legend-corner {
      transition: opacity 0.01s linear, visibility 0s linear 0.01s;
      transform: none;
    }

    .legend-corner.is-visible {
      transition: opacity 0.01s linear, visibility 0s;
      transform: none;
    }
  }

  @media (max-width: 768px) {
    .stats-corner {
      top: 12px;
      left: 14px;
      gap: 10px;
      max-width: calc(100vw - 220px);
    }

    .top-controls {
      top: 10px;
      right: 10px;
      gap: 8px;
    }

    .mode-option {
      font-size: 15px;
      padding: 5px 10px;
    }

    .legend-corner {
      left: 14px;
      bottom: 100px;
      max-width: calc(100vw - 28px);
    }
  }

  @media (max-width: 480px) {
    .stats-corner {
      max-width: calc(100vw - 20px);
      gap: 8px;
    }

    .top-controls {
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .mode-option {
      font-size: 14px;
      padding: 4px 9px;
    }

    .legend-corner {
      bottom: 128px;
    }
  }
</style>
