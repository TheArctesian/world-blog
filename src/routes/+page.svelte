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
</script>

<div class="watercolor-bg paper-texture">
  <div class="stats-corner">
    <TravelStats />
    <CurrentLocation />
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
    left: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    /* Leave room for the right-side controls so the bar doesn't collide. */
    max-width: calc(100vw - 280px);
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
      top: 10px;
      left: 10px;
      gap: 8px;
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
      flex-direction: column;
      align-items: flex-start;
      max-width: calc(100vw - 20px);
    }

    .top-controls {
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
  }
</style>
