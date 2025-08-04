// @ts-ignore - anime.js import issues
import { animate, createTimeline as animeTimeline } from 'animejs';
import type { Map, Icon, Marker } from 'leaflet';
import type { LocationData, MarkerConfig } from './types.js';
import type { TimelineEntry } from './timelineAnimation.js';

import cityIcon from './city.png';
import skiIcon from './ski.png';
import hikeIcon from './hike.png';
import livedIcon from './lived.png';

export const MARKER_CONFIGS: Record<string, MarkerConfig> = {
  city: { iconUrl: cityIcon, iconSize: [25, 25] },
  ski: { iconUrl: skiIcon, iconSize: [25, 25] },
  hike: { iconUrl: hikeIcon, iconSize: [25, 25] },
  lived: { iconUrl: livedIcon, iconSize: [25, 25] }
};

export const createIcon = (leaflet: any, config: MarkerConfig): Icon => {
  return leaflet.icon(config);
};

export const createPopupContent = (location: LocationData): string => {
  return `<b>${location.City}</b><br>Date first visited ${location.Date}`;
};

export const addMarkersToMap = (
  leaflet: any,
  map: Map,
  locations: LocationData[],
  icon: Icon
): void => {
  locations.forEach((location) => {
    leaflet
      .marker([location.Latitude, location.Longitude], { icon })
      .bindPopup(createPopupContent(location))
      .addTo(map);
  });
};

export const addAnimatedMarker = (
  leaflet: any,
  map: Map,
  entry: TimelineEntry,
  icon: Icon,
  zoomLevel: number = 6
): void => {
  // Step 1: Animate pan to location using anime.js for smoother control
  const currentView = map.getCenter();
  const currentZoom = map.getZoom();
  
  const viewAnimation = {
    lat: currentView.lat,
    lng: currentView.lng,
    zoom: currentZoom
  };

  // Pan and zoom animation
  // @ts-ignore
  animate({
    targets: viewAnimation,
    lat: entry.location.Latitude,
    lng: entry.location.Longitude,
    zoom: zoomLevel,
    duration: 2000,
    easing: 'easeInOutQuad',
    update: () => {
      map.setView([viewAnimation.lat, viewAnimation.lng], viewAnimation.zoom, {
        animate: false // Let anime.js handle the animation
      });
    },
    complete: () => {
      // Create marker with anime.js fade-in animation
      const marker = leaflet
        .marker([entry.location.Latitude, entry.location.Longitude], { 
          icon,
          opacity: 0 // Start invisible
        })
        .bindPopup(createPopupContent(entry.location))
        .addTo(map);

      // Animate marker fade-in
      const markerElement = marker.getElement();
      if (markerElement) {
        // @ts-ignore
        animate({
          targets: markerElement,
          opacity: [0, 1],
          scale: [0.5, 1],
          duration: 800,
          easing: 'spring(1, 80, 10, 0)'
        });
      }

      // Create animated label
      const placeLabel = leaflet.divIcon({
        className: 'place-label',
        html: `<div class="place-name-popup">
                 <div class="place-city">${entry.location.City}</div>
                 <div class="place-date">${entry.location.Date}</div>
               </div>`,
        iconSize: [200, 50],
        iconAnchor: [100, 65] // Position above marker
      });

      const labelMarker = leaflet
        .marker([entry.location.Latitude, entry.location.Longitude], {
          icon: placeLabel,
          opacity: 0,
          interactive: false
        })
        .addTo(map);

      const labelElement = labelMarker.getElement();
      if (labelElement) {
        const popup = labelElement.querySelector('.place-name-popup');
        if (popup) {
          // Animate label appearance with anime.js
          // @ts-ignore
          animeTimeline()
            .add({
              targets: popup,
              opacity: [0, 1],
              translateY: [-20, 0],
              scale: [0.8, 1],
              duration: 600,
              easing: 'easeOutElastic(1, .5)'
            })
            .add({
              targets: popup,
              opacity: 1,
              duration: 2000, // Hold visible
            })
            .add({
              targets: popup,
              opacity: [1, 0],
              translateY: [0, -10],
              scale: [1, 0.9],
              duration: 400,
              easing: 'easeInCubic',
              complete: () => {
                try {
                  map.removeLayer(labelMarker);
                } catch (error) {
                  // Label might have been removed already
                }
              }
            });
        }
      }
    }
  });
};

export const clearAllMarkers = (map: Map): void => {
  map.eachLayer((layer: any) => {
    if (layer.options && layer.options.icon) {
      // Animate markers out before removing
      const element = layer.getElement && layer.getElement();
      if (element) {
        // @ts-ignore
        animate({
          targets: element,
          opacity: 0,
          scale: 0.5,
          duration: 300,
          easing: 'easeInQuad',
          complete: () => {
            map.removeLayer(layer);
          }
        });
      } else {
        map.removeLayer(layer);
      }
    }
  });
};