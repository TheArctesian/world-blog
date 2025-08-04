<script lang="ts">
  import city from "./city.png";
  import hike from "./hike.png";
  import lived from "./lived.png";
  import ski from "./ski.png";

  let showPop = false;

  function show() {
    showPop = !showPop;
  }
</script>

<button class="info-button hand-drawn-btn" on:click={show}>
  Info
</button>

{#if showPop}
  <div class="modal-overlay" on:click={show}>
    <div class="modal-content watercolor-bg paper-texture" on:click|stopPropagation>
      <button class="close-button hand-drawn-btn" on:click={show}>×</button>
      
      <h2>Travel Legend</h2>
      
      <div class="legend-grid">
        <div class="legend-item">
          <img src={lived} alt="Places lived" />
          <span>Places I've lived</span>
        </div>
        <div class="legend-item">
          <img src={city} alt="Cities visited" />
          <span>Places I've visited</span>
        </div>
        <div class="legend-item">
          <img src={ski} alt="Ski destinations" />
          <span>Places I've skied</span>
        </div>
        <div class="legend-item">
          <img src={hike} alt="Mountains hiked" />
          <span>Mountains I've hiked</span>
        </div>
      </div>
      
      <div class="github-link">
        <a href="https://github.com/TheArctesian/world-blog" target="_blank" class="hand-drawn-btn">
          View on GitHub
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  .info-button {
    /* Styling inherited from hand-drawn-btn */
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(44, 62, 80, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1001;
    padding: 20px;
    box-sizing: border-box;
  }

  .modal-content {
    background: var(--paper);
    border: 3px solid var(--border-soft);
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    max-height: 80vh;
    width: 100%;
    overflow-y: auto;
    box-shadow: 8px 8px 24px var(--shadow);
    transform: rotate(-0.5deg);
    position: relative;
  }

  .close-button {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    min-width: 32px;
    padding: 0;
    font-size: 18px;
    font-weight: bold;
  }

  h2 {
    font-family: 'Caveat', cursive;
    font-size: 28px;
    font-weight: 700;
    color: var(--ink);
    text-align: center;
    margin: 0 0 20px 0;
    transform: rotate(1deg);
  }

  .legend-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  .legend-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(116, 169, 207, 0.1);
    border-radius: 12px;
    border: 2px dashed var(--border-soft);
    transform: rotate(-1deg);
    transition: transform 0.2s ease;
  }

  .legend-item:nth-child(even) {
    transform: rotate(1deg);
  }

  .legend-item:hover {
    transform: rotate(0deg) scale(1.05);
  }

  .legend-item img {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  .legend-item span {
    font-family: 'Kalam', cursive;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
    text-align: center;
    line-height: 1.2;
  }

  .github-link {
    text-align: center;
    margin-top: 16px;
  }

  .github-link a {
    text-decoration: none;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 16px;
    }

    .modal-content {
      max-width: 350px;
      padding: 20px;
    }

    .legend-grid {
      gap: 12px;
    }

    .legend-item {
      padding: 10px;
    }

    .legend-item img {
      width: 35px;
      height: 35px;
    }

    .legend-item span {
      font-size: 13px;
    }

    h2 {
      font-size: 24px;
    }
  }

  @media (max-width: 480px) {
    .modal-overlay {
      padding: 12px;
    }

    .modal-content {
      max-width: 300px;
      padding: 16px;
      max-height: 70vh;
    }

    .legend-grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .legend-item {
      flex-direction: row;
      gap: 12px;
      padding: 8px 12px;
    }

    .legend-item img {
      width: 30px;
      height: 30px;
      flex-shrink: 0;
    }

    .legend-item span {
      font-size: 12px;
      text-align: left;
    }

    h2 {
      font-size: 20px;
      margin-bottom: 16px;
    }

    .close-button {
      width: 28px;
      height: 28px;
      min-width: 28px;
      font-size: 16px;
    }
  }
</style>
