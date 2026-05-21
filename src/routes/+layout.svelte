<script>
  import "../app.css";
  import { dev } from "$app/environment";
  import { injectAnalytics } from "@vercel/analytics/sveltekit";

  injectAnalytics({ mode: dev ? "development" : "production" });
</script>

<header></header>
<slot />

<style>
  :global(body) {
    background-color: var(--bg);
    font-family: "Fira Code", monospace;
  }
</style>
