<script lang="ts">
  import { totalPlaces, totalCountries } from './data/placeStats';
</script>

<div class="travel-stats" aria-label="{totalPlaces} places visited across {totalCountries} countries">
  <div class="stat">
    <span class="number">{totalPlaces}</span>
    <span class="label">
      places
      <small>visited</small>
    </span>
  </div>
  <div class="stat">
    <span class="number">{totalCountries}</span>
    <span class="label">
      countries
      <small>across</small>
    </span>
  </div>
</div>

<style>
  .travel-stats {
    display: flex;
    align-items: baseline;
    gap: 18px;
    color: var(--ink, #2c3e50);
    user-select: none;
    line-height: 1;
  }

  .stat {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }

  .number {
    font-family: 'Caveat', cursive;
    font-size: 30px;
    font-weight: 700;
    line-height: 1;
  }

  .label {
    font-family: 'Kalam', cursive;
    font-size: 13px;
    letter-spacing: 0.2px;
    line-height: 1.05;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .label small {
    font-style: italic;
    font-size: 11px;
    opacity: 0.6;
    margin-top: 1px;
  }

  @media (max-width: 480px) {
    .travel-stats { gap: 14px; }
    .number { font-size: 24px; }
    .label { font-size: 12px; }
    .label small { font-size: 10px; }
  }
</style>
