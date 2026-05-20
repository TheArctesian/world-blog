<script lang="ts">
  import { totalPlaces, totalCountries } from './data/placeStats';
</script>

<div class="travel-stats paper-texture" aria-label="Travel statistics">
  <div class="stat">
    <span class="number">{totalPlaces}</span>
    <span class="label">places</span>
  </div>
  <div class="divider" aria-hidden="true"></div>
  <div class="stat">
    <span class="number">{totalCountries}</span>
    <span class="label">countries</span>
  </div>
</div>

<style>
  .travel-stats {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    padding: 10px 16px;
    background: var(--paper, #fdfbf3);
    border: 2px solid var(--border-soft, rgba(60, 60, 60, 0.35));
    border-radius: 14px;
    box-shadow: 4px 4px 12px var(--shadow, rgba(0, 0, 0, 0.12));
    transform: rotate(-1deg);
    font-family: 'Kalam', cursive;
    color: var(--ink, #2c3e50);
    user-select: none;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
  }

  .number {
    font-family: 'Caveat', cursive;
    font-size: 28px;
    font-weight: 700;
  }

  .label {
    font-size: 12px;
    font-weight: 500;
    margin-top: 2px;
    letter-spacing: 0.4px;
    text-transform: lowercase;
  }

  .divider {
    width: 2px;
    height: 28px;
    background: var(--border-soft, rgba(60, 60, 60, 0.35));
    border-radius: 2px;
    transform: rotate(4deg);
  }

  @media (max-width: 480px) {
    .travel-stats {
      gap: 10px;
      padding: 8px 12px;
    }

    .number {
      font-size: 22px;
    }

    .label {
      font-size: 11px;
    }

    .divider {
      height: 22px;
    }
  }
</style>
