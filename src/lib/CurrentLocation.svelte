<script lang="ts">
  import { onMount } from 'svelte';
  import { currentLocation, startCurrentLocationPolling, formatAgo } from './currentLocationStore.js';

  onMount(() => {
    startCurrentLocationPolling();
  });

  $: data = $currentLocation;
  $: visible = data?.available && (data.label || data.city || data.district);
  $: locationText =
    data?.label ||
    [data?.district, data?.city, data?.region]
      .filter((p): p is string => !!p)
      .join(', ');
  $: ariaLabel = `Currently near ${locationText || 'an unknown location'}`;
</script>

{#if visible && data}
  <div class="current-location" aria-label={ariaLabel}>
    <div class="location-line">
      <span class="location">{locationText}</span>
      <span class="pulse-dot" aria-hidden="true"></span>
    </div>
    {#if data.timestampMs}
      <div class="when-line">seen {formatAgo(data.timestampMs)}</div>
    {/if}
  </div>
{/if}

<style>
  .current-location {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    color: var(--ink, #2c3e50);
    user-select: none;
    line-height: 1.1;
  }

  .location-line {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .location {
    font-family: 'Caveat', cursive;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.2px;
  }

  /* Wet-ink stamp at the end of the location — same red as the map markers
     so the indicator reads as the same dot across all three surfaces. */
  .pulse-dot {
    display: inline-block;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #c44a3f;
    margin-bottom: 4px;
    box-shadow: 0 0 0 0 rgba(196, 74, 63, 0.6);
    animation: pulse 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(196, 74, 63, 0.6); }
    70%  { box-shadow: 0 0 0 11px rgba(196, 74, 63, 0); }
    100% { box-shadow: 0 0 0 0 rgba(196, 74, 63, 0); }
  }

  .when-line {
    font-family: 'Kalam', cursive;
    font-style: italic;
    font-size: 13px;
    opacity: 0.65;
    letter-spacing: 0.2px;
  }

  @media (max-width: 480px) {
    .location { font-size: 22px; }
    .when-line { font-size: 11px; }
  }
</style>
