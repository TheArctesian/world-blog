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
  // Step 1: Pan to location
  map.setView([entry.location.Latitude, entry.location.Longitude], zoomLevel, {
    animate: true,
    duration: 2.0
  });

  // Step 2: Wait for pan to complete, then show marker and label
  setTimeout(() => {
    // Create marker
    const marker = leaflet
      .marker([entry.location.Latitude, entry.location.Longitude], { 
        icon,
        opacity: 1 // Show immediately, no fade
      })
      .bindPopup(createPopupContent(entry.location))
      .addTo(map);

    // Create label positioned above marker
    const placeLabel = leaflet.divIcon({
      className: 'place-label',
      html: `<div class="place-name-popup place-label-animate">
               <div class="place-city">${entry.location.City}</div>
               <div class="place-date">${entry.location.Date}</div>
             </div>`,
      iconSize: [200, 50],
      iconAnchor: [100, 65] // Position above marker (increased from -15 to 65)
    });

    const labelMarker = leaflet
      .marker([entry.location.Latitude, entry.location.Longitude], {
        icon: placeLabel,
        opacity: 1,
        interactive: false
      })
      .addTo(map);

    // Hide label after 3 seconds with fade out
    setTimeout(() => {
      try {
        // Add fade-out class
        const labelElement = labelMarker.getElement();
        if (labelElement) {
          const popup = labelElement.querySelector('.place-name-popup');
          if (popup) {
            popup.classList.add('place-label-fade-out');
            // Remove after fade animation completes
            setTimeout(() => {
              try {
                map.removeLayer(labelMarker);
              } catch (error) {
                // Label might have been removed already
              }
            }, 400);
          }
        }
      } catch (error) {
        // Label might have been removed already
        try {
          map.removeLayer(labelMarker);
        } catch (e) {
          // Ignore
        }
      }
    }, 3000);
  }, 2500); // Wait for map movement to complete
};

export const clearAllMarkers = (map: Map): void => {
  map.eachLayer((layer: any) => {
    if (layer.options && layer.options.icon) {
      map.removeLayer(layer);
    }
  });
};