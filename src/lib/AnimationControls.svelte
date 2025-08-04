<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  // @ts-ignore - anime.js import issues
  import { animate } from 'animejs';
  import type { AnimationState } from './timelineAnimation.js';
  import { formatDateForDisplay } from './dateUtils.js';
  import { generateYearMarkers } from './timelineUtils.js';

  export let animationState: AnimationState;
  export let isTimelineMode: boolean = false;
  
  const dispatch = createEventDispatcher<{
    play: void;
    pause: void;
    reset: void;
    speedChange: { speed: number };
    zoomChange: { zoom: number };
    seek: { index: number };
  }>();

  const speedOptions = [
    { label: '0.5x', value: 8000 },
    { label: '1x', value: 4000 },
    { label: '2x', value: 2000 },
    { label: '4x', value: 1000 }
  ];

  const zoomOptions = [
    { label: 'Zoom 4', value: 4 },
    { label: 'Zoom 6', value: 6 },
    { label: 'Zoom 8', value: 8 },
    { label: 'Zoom 10', value: 10 }
  ];

  let currentZoom = 6; // Default zoom level

  $: currentEntry = animationState.currentIndex >= 0 && animationState.currentIndex < animationState.timeline.length 
    ? animationState.timeline[animationState.currentIndex] 
    : null;

  $: progress = animationState.progress || (animationState.timeline.length > 0 
    ? ((animationState.currentIndex + 1) / animationState.timeline.length) * 100 
    : 0);

  $: yearMarkers = generateYearMarkers(animationState.timeline);
  
  let progressBar: HTMLElement;
  let progressFill: HTMLElement;
  let isDragging = false;
  
  onMount(() => {
    // Animate progress bar on mount
    if (progressFill) {
      // @ts-ignore
      animate({
        targets: progressFill,
        opacity: [0, 1],
        scaleX: [0, 1],
        duration: 800,
        easing: 'easeOutElastic(1, .8)'
      });
    }
  });
  
  function handleProgressClick(event: MouseEvent) {
    if (!progressBar || animationState.timeline.length === 0) return;
    
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const index = Math.floor((percentage / 100) * animationState.timeline.length);
    
    dispatch('seek', { index: Math.max(0, Math.min(index, animationState.timeline.length - 1)) });
  }
  
  function handleProgressDrag(event: MouseEvent) {
    if (!isDragging || !progressBar || animationState.timeline.length === 0) return;
    
    const rect = progressBar.getBoundingClientRect();
    const dragX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (dragX / rect.width) * 100));
    const index = Math.floor((percentage / 100) * animationState.timeline.length);
    
    dispatch('seek', { index: Math.max(0, Math.min(index, animationState.timeline.length - 1)) });
  }
  
  function startDrag() {
    isDragging = true;
    document.addEventListener('mousemove', handleProgressDrag);
    document.addEventListener('mouseup', stopDrag);
  }
  
  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', handleProgressDrag);
    document.removeEventListener('mouseup', stopDrag);
  }
</script>

<div class="timeline-controls watercolor-bg paper-texture">
  <div class="controls-row">
    <button 
      class="control-btn hand-drawn-btn"
      class:primary={!isTimelineMode}
      on:click={() => animationState.isPlaying ? dispatch('pause') : dispatch('play')}
      aria-label={animationState.isPlaying ? 'Pause animation' : (isTimelineMode ? 'Play animation' : 'Start timeline animation')}
    >
      {animationState.isPlaying ? 'Pause' : (isTimelineMode ? 'Play' : 'Start Timeline')}
    </button>
    
    <button 
      class="control-btn hand-drawn-btn"
      on:click={() => dispatch('reset')}
      aria-label="Reset animation"
    >
      Reset
    </button>

    <select 
      class="speed-select hand-drawn-btn"
      value={animationState.speed}
      on:change={(e) => dispatch('speedChange', { speed: parseInt(e.currentTarget.value) })}
      aria-label="Animation speed"
    >
      {#each speedOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>

    <select 
      class="zoom-select hand-drawn-btn"
      value={currentZoom}
      on:change={(e) => {
        currentZoom = parseInt(e.currentTarget.value);
        dispatch('zoomChange', { zoom: currentZoom });
      }}
      aria-label="Animation zoom level"
    >
      {#each zoomOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>

  <div class="progress-container">
    <div 
      class="progress-bar" 
      bind:this={progressBar}
      on:click={handleProgressClick}
      on:mousedown={startDrag}
      role="slider"
      aria-label="Timeline progress"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      tabindex="0"
    >
      <div 
        class="progress-fill" 
        bind:this={progressFill}
        style="width: {progress}%"
      >
        <div class="progress-glow"></div>
      </div>
      <div 
        class="progress-handle"
        style="left: {progress}%"
        class:dragging={isDragging}
      ></div>
    </div>
    <div class="progress-text">
      {animationState.currentIndex + 1} / {animationState.timeline.length}
    </div>
  </div>

  <!-- Year timeline -->
  <div class="year-timeline">
    {#each yearMarkers as marker}
      <div 
        class="year-marker" 
        style="left: {marker.position}%"
        class:current={currentEntry && currentEntry.date.getFullYear() === marker.year}
      >
        <div class="year-tick"></div>
        <div class="year-label">{marker.year}</div>
      </div>
    {/each}
  </div>

  {#if currentEntry}
    <div class="current-location">
      <span class="location-name">{currentEntry.location.City}</span>
      <span class="location-date">{formatDateForDisplay(currentEntry.date)}</span>
      <span class="location-type type-{currentEntry.type}">
        {currentEntry.type === 'city' ? 'City' : 
         currentEntry.type === 'ski' ? 'Ski' : 
         currentEntry.type === 'hike' ? 'Hike' : 'Lived'}
      </span>
    </div>
  {:else if !isTimelineMode && !animationState.isPlaying}
    <div class="helper-text">
      Click "Start Timeline" to watch my journey unfold chronologically!
    </div>
  {/if}
</div>

<style>
  .timeline-controls {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--paper);
    border-top: 3px solid var(--border-soft);
    padding: 16px;
    box-shadow: 0 -4px 20px var(--shadow);
    z-index: 1000;
    transform: rotate(-0.5deg);
    transform-origin: bottom center;
  }

  .controls-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .control-btn {
    min-width: 80px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn.primary {
    background: var(--sky-blue);
    color: var(--paper);
    border-color: var(--sky-blue);
    box-shadow: 0 4px 12px rgba(135, 206, 235, 0.3);
    animation: gentle-pulse 2s ease-in-out infinite;
  }

  .control-btn.primary:hover {
    background: var(--sky-blue-light);
    border-color: var(--sky-blue-light);
    transform: rotate(0deg) translateY(-3px);
  }

  @keyframes gentle-pulse {
    0%, 100% { transform: rotate(-1deg) scale(1); }
    50% { transform: rotate(-1deg) scale(1.05); }
  }

  .speed-select, .zoom-select {
    padding: 8px 12px;
    cursor: pointer;
    min-width: 80px;
    height: 40px;
  }

  .progress-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .progress-bar {
    flex: 1;
    height: 12px;
    background: var(--paper);
    border: 2px solid var(--border-soft);
    border-radius: 8px;
    overflow: visible;
    position: relative;
    box-shadow: inset 2px 2px 4px var(--shadow);
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  
  .progress-bar:hover {
    transform: scaleY(1.2);
  }

  .progress-bar::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 20%, rgba(135, 206, 235, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(176, 224, 230, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--sky-blue) 0%,
      var(--sky-blue-light) 30%,
      var(--sky-blue-pale) 60%,
      var(--sky-blue) 100%
    );
    position: relative;
    transition: width 0.6s ease;
    border-radius: 4px;
  }

  .progress-fill::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 60%),
      radial-gradient(ellipse at 70% 80%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
      linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
    border-radius: 4px;
  }
  
  .progress-glow {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 8px;
    height: 20px;
    background: radial-gradient(circle, rgba(135, 206, 235, 0.8) 0%, transparent 70%);
    border-radius: 50%;
    animation: pulse-glow 2s ease-in-out infinite;
  }
  
  @keyframes pulse-glow {
    0%, 100% { 
      opacity: 0.6;
      transform: scale(1);
    }
    50% { 
      opacity: 1;
      transform: scale(1.5);
    }
  }
  
  .progress-handle {
    position: absolute;
    top: -6px;
    width: 24px;
    height: 24px;
    background: var(--sky-blue);
    border: 3px solid var(--paper);
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(135, 206, 235, 0.5);
    transform: translateX(-50%);
    cursor: grab;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .progress-handle:hover {
    transform: translateX(-50%) scale(1.2);
    box-shadow: 0 4px 12px rgba(135, 206, 235, 0.7);
  }
  
  .progress-handle.dragging {
    cursor: grabbing;
    transform: translateX(-50%) scale(1.3);
    box-shadow: 0 6px 16px rgba(135, 206, 235, 0.9);
  }

  .progress-text {
    font-size: 12px;
    color: #666;
    min-width: 60px;
    text-align: right;
  }

  .current-location {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(116, 169, 207, 0.1);
    border-radius: 12px;
    border: 2px dashed var(--border-soft);
    transform: rotate(0.5deg);
  }

  .location-name {
    font-family: 'Caveat', cursive;
    font-weight: 700;
    font-size: 18px;
    color: var(--ink);
  }

  .location-date {
    font-size: 14px;
    color: var(--water-blue);
    font-weight: 500;
  }

  .location-type {
    font-size: 14px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 8px;
    background: var(--water-teal);
    color: var(--paper);
    transform: rotate(-2deg);
  }

  /* Year timeline */
  .year-timeline {
    position: relative;
    height: 40px;
    margin-top: 8px;
    border-top: 1px dashed var(--border-soft);
  }

  .year-marker {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .year-tick {
    width: 2px;
    height: 12px;
    background: var(--border-soft);
    border-radius: 1px;
    margin-bottom: 4px;
    transition: all 0.3s ease;
  }

  .year-marker.current .year-tick {
    background: var(--sky-blue);
    height: 16px;
    width: 3px;
    box-shadow: 0 0 6px rgba(135, 206, 235, 0.5);
  }

  .year-label {
    font-family: 'Caveat', cursive;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
    transform: rotate(-1deg);
    white-space: nowrap;
    transition: all 0.3s ease;
  }

  .year-marker.current .year-label {
    color: var(--sky-blue);
    font-size: 14px;
    font-weight: 700;
    transform: rotate(0deg);
  }

  .helper-text {
    text-align: center;
    padding: 12px 16px;
    background: rgba(135, 206, 235, 0.1);
    border-radius: 12px;
    border: 2px dashed var(--border-soft);
    font-family: 'Caveat', cursive;
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
    transform: rotate(0.5deg);
    animation: gentle-glow 3s ease-in-out infinite;
  }

  @keyframes gentle-glow {
    0%, 100% { background: rgba(135, 206, 235, 0.1); }
    50% { background: rgba(135, 206, 235, 0.2); }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .timeline-controls {
      padding: 12px;
      transform: none;
    }

    .controls-row {
      gap: 12px;
    }

    .control-btn {
      min-width: 60px;
      height: 36px;
      font-size: 14px;
    }

    .speed-select, .zoom-select {
      min-width: 60px;
      height: 36px;
      font-size: 14px;
    }

    .current-location {
      flex-direction: column;
      gap: 8px;
      text-align: center;
    }

    .year-timeline {
      height: 35px;
    }

    .year-label {
      font-size: 10px;
    }

    .year-marker.current .year-label {
      font-size: 12px;
    }

    .helper-text {
      font-size: 14px;
      padding: 10px 12px;
    }
  }

  @media (max-width: 480px) {
    .timeline-controls {
      padding: 8px;
    }

    .controls-row {
      gap: 8px;
    }

    .control-btn {
      min-width: 50px;
      height: 32px;
      font-size: 12px;
    }

    .speed-select, .zoom-select {
      min-width: 50px;
      height: 32px;
      font-size: 12px;
    }

    .location-name {
      font-size: 16px;
    }

    .location-date {
      font-size: 12px;
    }

    .year-timeline {
      height: 30px;
    }

    .year-label {
      font-size: 9px;
    }

    .year-marker.current .year-label {
      font-size: 11px;
    }

    .helper-text {
      font-size: 12px;
      padding: 8px 10px;
    }
  }
</style>