<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { AnimationState } from './types.js';
  import { formatDateForDisplay } from './dateUtils.js';
  import { generateYearMarkers } from './yearMarkers.js';

  export let animationState: AnimationState;
  export let isTimelineMode: boolean = false;

  const dispatch = createEventDispatcher<{
    play: void;
    pause: void;
    reset: void;
    speedChange: { speed: number };
  }>();

  const speedOptions = [
    { label: '0.5x', value: 8000 },
    { label: '1x', value: 4000 },
    { label: '2x', value: 2000 },
    { label: '4x', value: 1000 }
  ];

  $: currentEntry = animationState.currentIndex >= 0 && animationState.currentIndex < animationState.timeline.length
    ? animationState.timeline[animationState.currentIndex]
    : null;

  $: progress = animationState.timeline.length > 0
    ? ((animationState.currentIndex + 1) / animationState.timeline.length) * 100
    : 0;

  $: yearMarkers = generateYearMarkers(animationState.timeline);

  // Filter year labels to prevent overlap - skip labels that are too close in % position
  $: visibleYearMarkers = (() => {
    if (yearMarkers.length === 0) return [];
    const minGap = 6; // minimum % gap between labels
    const result = [yearMarkers[0]];
    for (let i = 1; i < yearMarkers.length; i++) {
      if (yearMarkers[i].position - result[result.length - 1].position >= minGap) {
        result.push(yearMarkers[i]);
      }
    }
    return result;
  })();
</script>

<div class="timeline-controls">
  <!-- Combined progress + year timeline -->
  <div class="timeline-bar">
    <div class="track">
      <div class="track-fill" style="width: {progress}%"></div>
      <!-- Event ticks on the track -->
      {#each yearMarkers as marker}
        <div
          class="tick"
          class:active={currentEntry && currentEntry.date.getFullYear() === marker.year}
          style="left: {marker.position}%"
        ></div>
      {/each}
    </div>
    <!-- Year labels below the track -->
    <div class="year-labels">
      {#each visibleYearMarkers as marker}
        <span
          class="year-label"
          class:active={currentEntry && currentEntry.date.getFullYear() === marker.year}
          style="left: {marker.position}%"
        >{marker.year}</span>
      {/each}
    </div>
  </div>

  <!-- Bottom row: location info + controls -->
  <div class="bottom-row">
    <div class="location-info">
      {#if currentEntry}
        <span class="location-name">{currentEntry.location.City}</span>
        <span class="location-date">{formatDateForDisplay(currentEntry.date)}</span>
        <span class="location-type type-{currentEntry.type}">
          {currentEntry.type === 'city' ? 'City' :
           currentEntry.type === 'ski' ? 'Ski' :
           currentEntry.type === 'hike' ? 'Hike' : 'Lived'}
        </span>
      {:else if !isTimelineMode && !animationState.isPlaying}
        <span class="helper-text">Press play to watch the journey unfold</span>
      {/if}
    </div>

    <div class="controls">
      <button
        class="ctrl-btn"
        class:primary={!isTimelineMode}
        on:click={() => animationState.isPlaying ? dispatch('pause') : dispatch('play')}
        aria-label={animationState.isPlaying ? 'Pause' : 'Play'}
      >
        {#if animationState.isPlaying}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        {:else}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        {/if}
      </button>

      <button
        class="ctrl-btn"
        on:click={() => dispatch('reset')}
        aria-label="Reset"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      </button>

      <select
        class="speed-select"
        value={animationState.speed}
        on:change={(e) => dispatch('speedChange', { speed: parseInt(e.currentTarget.value) })}
        aria-label="Speed"
      >
        {#each speedOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>

      <span class="counter">{animationState.currentIndex + 1}/{animationState.timeline.length}</span>
    </div>
  </div>
</div>

<style>
  .timeline-controls {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(250, 248, 243, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid rgba(135, 206, 235, 0.25);
    padding: 8px 20px 10px;
    z-index: 1000;
  }

  /* --- Track --- */
  .timeline-bar {
    position: relative;
    margin-bottom: 6px;
  }

  .track {
    position: relative;
    height: 6px;
    background: rgba(135, 206, 235, 0.15);
    border-radius: 3px;
    overflow: visible;
  }

  .track-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, var(--sky-blue), var(--water-blue));
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .tick {
    position: absolute;
    top: -2px;
    width: 2px;
    height: 10px;
    background: rgba(44, 62, 80, 0.18);
    border-radius: 1px;
    transform: translateX(-50%);
    transition: background 0.3s;
  }

  .tick.active {
    background: var(--sky-blue);
    box-shadow: 0 0 4px rgba(135, 206, 235, 0.6);
  }

  /* --- Year labels --- */
  .year-labels {
    position: relative;
    height: 16px;
    margin-top: 2px;
  }

  .year-label {
    position: absolute;
    transform: translateX(-50%);
    font-family: 'Caveat', cursive;
    font-size: 11px;
    font-weight: 600;
    color: rgba(44, 62, 80, 0.4);
    white-space: nowrap;
    transition: color 0.3s;
  }

  .year-label.active {
    color: var(--water-blue);
    font-weight: 700;
  }

  /* --- Bottom row --- */
  .bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .location-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 28px;
    flex: 1;
    min-width: 0;
  }

  .location-name {
    font-family: 'Caveat', cursive;
    font-weight: 700;
    font-size: 18px;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .location-date {
    font-size: 13px;
    color: var(--water-blue);
    font-weight: 500;
    white-space: nowrap;
  }

  .location-type {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--water-teal);
    color: white;
    white-space: nowrap;
    letter-spacing: 0.3px;
  }

  .helper-text {
    font-family: 'Caveat', cursive;
    font-size: 15px;
    color: rgba(44, 62, 80, 0.5);
  }

  /* --- Controls --- */
  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .ctrl-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid rgba(135, 206, 235, 0.4);
    border-radius: 8px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    font-family: 'Kalam', cursive;
  }

  .ctrl-btn:hover {
    background: rgba(135, 206, 235, 0.12);
    border-color: var(--sky-blue);
  }

  .ctrl-btn.primary {
    background: var(--sky-blue);
    color: white;
    border-color: var(--sky-blue);
    animation: pulse 2.5s ease-in-out infinite;
  }

  .ctrl-btn.primary:hover {
    background: var(--water-blue);
    border-color: var(--water-blue);
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(135, 206, 235, 0.4); }
    50% { box-shadow: 0 0 0 6px rgba(135, 206, 235, 0); }
  }

  .speed-select {
    height: 32px;
    padding: 0 8px;
    border: 1.5px solid rgba(135, 206, 235, 0.4);
    border-radius: 8px;
    background: transparent;
    color: var(--ink);
    font-family: 'Kalam', cursive;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    -webkit-appearance: none;
    appearance: none;
    padding-right: 20px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%232c3e50' opacity='0.4'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 6px center;
  }

  .speed-select:hover {
    border-color: var(--sky-blue);
  }

  .counter {
    font-size: 11px;
    color: rgba(44, 62, 80, 0.4);
    font-variant-numeric: tabular-nums;
    min-width: 48px;
    text-align: right;
    white-space: nowrap;
  }

  /* --- Mobile --- */
  @media (max-width: 768px) {
    .timeline-controls {
      padding: 6px 12px 8px;
    }

    .location-name {
      font-size: 16px;
    }

    .year-label {
      font-size: 10px;
    }
  }

  @media (max-width: 480px) {
    .timeline-controls {
      padding: 6px 8px 8px;
    }

    .bottom-row {
      flex-direction: column;
      gap: 4px;
    }

    .location-info {
      justify-content: center;
    }

    .controls {
      width: 100%;
      justify-content: center;
    }

    .location-name {
      font-size: 15px;
    }

    .counter {
      display: none;
    }
  }
</style>
