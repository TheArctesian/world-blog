<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import places from "./places.json";
  import marker from "./pin.png";

  let mapElement;
  let map;

  onMount(async () => {
    if (browser) {
      const leaflet = await import("leaflet");
      let defaultIcon = leaflet.icon({
        iconUrl: marker,

        iconSize: [25, 25], // size of the icon
      });
      map = leaflet.map(mapElement).setView([22.3, 114.16], 4);
      leaflet
        .tileLayer(
          "https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}",
          {
            attribution:
              'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: "abcd",
            minZoom: 2,
            maxZoom: 10,
            ext: "jpg",
          }
        )
        .addTo(map);

      places.forEach((city) => {
        leaflet
          .marker([city.Latitude, city.Longitude], { icon: defaultIcon })
          .bindPopup("<b>" + city.City + "</b><br>Date Visted " + city.Date)
          .openPopup()
          .addTo(map);
      });
    }
  });

  onDestroy(async () => {
    if (map) {
      console.log("Unloading Leaflet map.");
      map.remove();
    }
  });
</script>

<main>
  <div bind:this={mapElement} />
</main>

<style>
  @import "leaflet/dist/leaflet.css";
  @import url("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css");
  main div {
    height: 98vh;
    width: 98.5vw;
    margin:auto;
  }
</style>
