import type { Map, Icon } from 'leaflet';
import type { LocationData } from './types.js';

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

export const clearAllMarkers = (map: Map): void => {
  map.eachLayer((layer: any) => {
    if (layer.options && layer.options.icon) {
      map.removeLayer(layer);
    }
  });
};
