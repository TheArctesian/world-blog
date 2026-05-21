<script lang="ts">
  import { onMount } from "svelte";
  import MapSwitcher from "$lib/MapSwitcher.svelte";
  import Info from "$lib/info.svelte";
  import TravelStats from "$lib/TravelStats.svelte";
  import CurrentLocation from "$lib/CurrentLocation.svelte";
  import { currentLocation } from "$lib/currentLocationStore.js";
  import "../app.css";
  import type { PageData } from "./$types";

  export let data: PageData;

  // Seed the store from SSR so the pill and map marker show immediately
  // without waiting for the client poll.
  if (data.initialLocation) {
    currentLocation.set(data.initialLocation);
  }

  let animationMode = false;

  const toggleAnimationMode = () => {
    animationMode = !animationMode;
  };

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
    <button class="mode-toggle hand-drawn-btn" on:click={toggleAnimationMode}>
      {animationMode ? 'Static View' : 'Timeline Animation'}
    </button>
    <div class="info-container">
      <Info />
    </div>
  </div>

  <MapSwitcher {animationMode} initialLocation={data.initialLocation} />
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
  }
</style>
