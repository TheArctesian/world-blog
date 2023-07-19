<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import places from "./places.json";
    import marker from "./icons8-marker-64.png"

    let mapElement;
    let map;

    onMount(async () => {
        if (browser) {
            const leaflet = await import("leaflet");
            let defaultIcon = leaflet.icon({
                iconUrl: marker,

                iconSize:     [25, 41], // size of the icon
                shadowSize:   [41, 41], // size of the shadow
                iconAnchor:   [12, 41], // point of the icon which will correspond to marker's location
                shadowAnchor: [4, 62],  // the same for the shadow
                popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
            });
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

            places.forEach((city) => {
                leaflet.marker([city.Latitude, city.Longitude], { icon: defaultIcon })
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
    }
</style>
