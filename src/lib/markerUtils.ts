import type { Map, Icon } from 'leaflet';
import type { LocationData, MarkerConfig } from './types.js';

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