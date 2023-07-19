<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import places   from "./places.json";
    let mapElement;
    let map;

    onMount(async () => {
        if (browser) {
            const leaflet = await import("leaflet");
            map = leaflet.map(mapElement).setView([22.3, 114.16], 4);
            leaflet
                .tileLayer(
                    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                    {
                        maxZoom: 19,
                        attribution:
                            'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, Tiles &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    }
                )
                .addTo(map);
            
            places.forEach(city => {
                leaflet
                .marker([city.Latitude, city.Longitude])
                .addTo(map)
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
    @import url("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.css");
    main div {
        height: 98vh;
        width: 98.5vw;
    }
</style>
