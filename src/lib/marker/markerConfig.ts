import type { MarkerConfig } from './types.js';

import cityIcon from '../city.png';
import skiIcon from '../ski.png';
import hikeIcon from '../hike.png';
import livedIcon from '../lived.png';

export const MARKER_CONFIGS: Record<string, MarkerConfig> = {
  city: { iconUrl: cityIcon, iconSize: [25, 25] },
  ski: { iconUrl: skiIcon, iconSize: [25, 25] },
  hike: { iconUrl: hikeIcon, iconSize: [25, 25] },
  lived: { iconUrl: livedIcon, iconSize: [25, 25] }
};

export const createIcon = (leaflet: any, config: MarkerConfig) => {
  return leaflet.icon(config);
};
