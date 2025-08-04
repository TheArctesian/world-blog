<script>
  import LeafletMap from "$lib/LeafletMap.svelte";
  import Popup from "$lib/Popup.svelte";
  import Info from "$lib/info.svelte";
  import "../app.css";

  let animationMode = false;

  const toggleAnimationMode = () => {
    animationMode = !animationMode;
  };
</script>

<!-- <Popup /> -->
<div class="watercolor-bg paper-texture">
  <div class="top-controls">
    <button class="mode-toggle hand-drawn-btn" on:click={toggleAnimationMode}>
      {animationMode ? 'Static View' : 'Timeline Animation'}
    </button>
    <div class="info-container">
      <Info />
    </div>
  </div>
  
  <LeafletMap {animationMode} on:switchToTimeline={() => animationMode = true} />
</div>

<style>
  .top-controls {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mode-toggle {
    /* Button styling inherited from hand-drawn-btn class */
  }

  .info-container {
    position: relative;
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .top-controls {
      top: 10px;
      right: 10px;
      gap: 8px;
    }
  }

  @media (max-width: 480px) {
    .top-controls {
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
  }
</style>
