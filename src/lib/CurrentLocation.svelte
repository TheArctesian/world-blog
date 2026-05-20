<script lang="ts">
  import { onMount } from 'svelte';
  import { currentLocation, startCurrentLocationPolling, formatAgo } from './currentLocationStore.js';

  onMount(() => {
    startCurrentLocationPolling();
  });

  $: data = $currentLocation;
  $: visible = data?.available && data.city;
</script>

{#if visible && data}
  <div
    class="current-location paper-texture"
    aria-label="Currently near {data.city}{data.country ? ', ' + data.country : ''}"
  >
    <span class="pulse" aria-hidden="true"></span>
    <div class="text">
      <span class="label">currently in</span>
      <span class="city">{data.city}</span>
      {#if data.timestampMs}
        <span class="when">seen {formatAgo(data.timestampMs)}</span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .current-location {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    background: var(--paper, #fdfbf3);
    border: 2px solid var(--border-soft, rgba(60, 60, 60, 0.35));
    border-radius: 14px;
    box-shadow: 4px 4px 12px var(--shadow, rgba(0, 0, 0, 0.12));
    transform: rotate(1.2deg);
    font-family: 'Kalam', cursive;
    color: var(--ink, #2c3e50);
    user-select: none;
  }

  .pulse {
    position: relative;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #c44a3f;
    box-shadow: 0 0 0 0 rgba(196, 74, 63, 0.55);
    animation: pulse 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    flex-shrink: 0;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(196, 74, 63, 0.55);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(196, 74, 63, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(196, 74, 63, 0);
    }
  }

  .text {
    display: flex;
    flex-direction: column;
    line-height: 1.05;
  }

  .label {
    font-size: 11px;
    text-transform: lowercase;
    letter-spacing: 0.4px;
    opacity: 0.7;
  }

  .city {
    font-family: 'Caveat', cursive;
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }

  .when {
    font-size: 10px;
    opacity: 0.55;
    margin-top: 3px;
    letter-spacing: 0.3px;
  }

  @media (max-width: 480px) {
    .current-location {
      padding: 7px 11px;
      gap: 8px;
    }
    .city {
      font-size: 20px;
    }
  }
</style>
