<script lang="ts">
  import { HEAT_BANDS } from './heatPalette.js';
  import {
    HEAT_MAX_DAYS,
    HEAT_RECORDED_COUNT,
    HEAT_TOTAL_COUNT,
    FALLBACK_DAYS
  } from './heatData.js';

  const missing = HEAT_TOTAL_COUNT - HEAT_RECORDED_COUNT;

  // Each swatch shows the glaze exactly as it lands on the map: the band colour
  // at the band's own opacity, over paper.
  const swatches = HEAT_BANDS.map((band, i) => ({
    color: band.color,
    alpha: band.alpha,
    tilt: [-2.5, 1.5, -1, 2, -2, 1][i] ?? 0
  }));
</script>

<figure class="heat-legend">
  <figcaption class="heat-legend__title">time spent</figcaption>

  <div class="heat-legend__ramp" aria-hidden="true">
    {#each swatches as swatch}
      <span
        class="heat-legend__swatch"
        style="--swatch: {swatch.color}; --swatch-alpha: {swatch.alpha}; --tilt: {swatch.tilt}deg"
      ></span>
    {/each}
  </div>

  <div class="heat-legend__scale">
    <span>a night</span>
    <span class="heat-legend__scale-end">{HEAT_MAX_DAYS} days</span>
  </div>

  <p class="heat-legend__note">
    Darker means more time pooled in one place — a long stay, or many short ones
    stacked on top of each other.
  </p>

  {#if missing > 0}
    <p class="heat-legend__caveat">
      {missing} of {HEAT_TOTAL_COUNT} places have no recorded dates yet; they count
      as {FALLBACK_DAYS === 1 ? 'a single night' : `${FALLBACK_DAYS} nights`}.
    </p>
  {/if}
</figure>

<style>
  .heat-legend {
    margin: 0;
    padding: 12px 16px 11px;
    border-radius: 18px;
    max-width: 268px;
    background: rgba(250, 248, 243, 0.72);
    -webkit-backdrop-filter: blur(8px) saturate(1.05);
    backdrop-filter: blur(8px) saturate(1.05);
    color: var(--ink);
    user-select: none;
  }

  /* Same cream halo the stats card uses, so the ink stays crisp whether the
     card sits on the dark globe sky or the pale watercolor map. */
  .heat-legend,
  .heat-legend :global(*) {
    text-shadow:
      0 0 3px rgba(250, 248, 243, 1),
      0 0 8px rgba(250, 248, 243, 0.95);
  }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .heat-legend {
      background: rgba(250, 248, 243, 0.9);
    }
  }

  .heat-legend__title {
    font-family: 'Caveat', cursive;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 8px;
  }

  .heat-legend__ramp {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  /* Each glaze sits on a cream ground so the swatch reads as the same wash the
     map is painted with, not as a flat UI chip. */
  .heat-legend__swatch {
    flex: 1;
    height: 15px;
    border-radius: 7px 5px 8px 6px;
    transform: rotate(var(--tilt));
    background:
      linear-gradient(
        color-mix(in srgb, var(--swatch) calc(var(--swatch-alpha) * 100%), transparent),
        color-mix(in srgb, var(--swatch) calc(var(--swatch-alpha) * 100%), transparent)
      ),
      #f4efe4;
    box-shadow: inset 0 -2px 3px -1px color-mix(in srgb, var(--swatch) 45%, transparent);
  }

  .heat-legend__scale {
    display: flex;
    justify-content: space-between;
    font-family: 'Kalam', cursive;
    font-size: 11px;
    font-style: italic;
    opacity: 0.72;
    margin-top: 6px;
  }

  .heat-legend__scale-end {
    text-align: right;
  }

  .heat-legend__note {
    font-family: 'Kalam', cursive;
    font-size: 11.5px;
    line-height: 1.35;
    margin: 8px 0 0;
    opacity: 0.85;
  }

  .heat-legend__caveat {
    font-family: 'Kalam', cursive;
    font-size: 10.5px;
    line-height: 1.35;
    margin: 6px 0 0;
    padding-top: 6px;
    opacity: 0.6;
    border-top: 1px dashed color-mix(in srgb, var(--ink) 28%, transparent);
  }

  @media (max-width: 480px) {
    .heat-legend {
      max-width: none;
      padding: 10px 13px 9px;
    }

    .heat-legend__title {
      font-size: 19px;
    }

    .heat-legend__note {
      font-size: 11px;
    }
  }
</style>
