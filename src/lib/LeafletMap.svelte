<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import places from "./places.json";
  import ski from "./ski.json";
  import hike from "./mountains.json";
  import hikeMarker from "./hike.png";
  import marker from "./city.png";
  import skiMarker from "./ski.png";
  import lived from "./lived.json";
  import livedMarker from "./lived.png";

  let mapElement;
  let map;

  onMount(async () => {
    if (browser) {
      const leaflet = await import("leaflet");
      let defaultIcon = leaflet.icon({
        iconUrl: marker,
        iconSize: [25, 25], // size of the icon
      });
      let skiIcon = leaflet.icon({
        iconUrl: skiMarker,
        iconSize: [25, 25],
      });
      let hikeIcon = leaflet.icon({
        iconUrl: hikeMarker,
        iconSize: [25, 25],
      });
      let livedIcon = leaflet.icon({
        iconUrl: livedMarker,
        iconSize: [25, 25],
      });
      var southWest = leaflet.latLng(-89.98155760646617, -180),
        northEast = leaflet.latLng(89.99346179538875, 180),
        bounds = leaflet.latLngBounds(southWest, northEast);

      map = leaflet.map(mapElement).setView([37.8, -122.27], 8);

      map.setMaxBounds(bounds);
      leaflet;

      var OpenStreetMap_Mapnik = L.tileLayer(
        "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.{ext}",
        {
          minZoom: 2,
          maxZoom: 16,
          attribution:
            '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          ext: "png",
        }
      ).addTo(map);

      places.forEach((city) => {
        leaflet
          .marker([city.Latitude, city.Longitude], { icon: defaultIcon })
          .bindPopup(
            "<b>" + city.City + "</b><br>Date first visited " + city.Date
          )
          .openPopup()
          .addTo(map);
      });

      ski.forEach((ski) => {
        leaflet
          .marker([ski.Latitude, ski.Longitude], { icon: skiIcon })
          .bindPopup(
            "<b>" + ski.City + "</b><br>Date first visited " + ski.Date
          )
          .openPopup()
          .addTo(map);
      });
      hike.forEach((hike) => {
        leaflet
          .marker([hike.Latitude, hike.Longitude], { icon: hikeIcon })
          .bindPopup(
            "<b>" + hike.City + "</b><br>Date first visited " + hike.Date
          )
          .openPopup()
          .addTo(map);
      });

      lived.forEach((lived) => {
        leaflet
          .marker([lived.Latitude, lived.Longitude], { icon: livedIcon })
          .bindPopup(
            "<b>" + lived.City + "</b><br>Date first visited " + lived.Date
          )
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
    margin: auto;
  }
</style>
