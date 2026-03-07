import type { Map, Icon } from 'leaflet';
import type { TimelineEntry } from '../timeline/types.js';
import { createPopupContent } from './staticMarkers.js';

const PAN_DURATION = 2.0;
const PAN_SETTLE_MS = 2500;
const LABEL_VISIBLE_MS = 3000;
const FADE_DURATION_MS = 400;

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export const addAnimatedMarker = async (
  leaflet: any,
  map: Map,
  entry: TimelineEntry,
  icon: Icon,
  zoomLevel: number = 6
): Promise<void> => {
  map.setView([entry.location.Latitude, entry.location.Longitude], zoomLevel, {
    animate: true,
    duration: PAN_DURATION
  });

  await delay(PAN_SETTLE_MS);

  const marker = leaflet
    .marker([entry.location.Latitude, entry.location.Longitude], {
      icon,
      opacity: 1
    })
    .bindPopup(createPopupContent(entry.location))
    .addTo(map);

  const placeLabel = leaflet.divIcon({
    className: 'place-label',
    html: `<div class="place-name-popup place-label-animate">
             <div class="place-city">${entry.location.City}</div>
             <div class="place-date">${entry.location.Date}</div>
           </div>`,
    iconSize: [200, 50],
    iconAnchor: [100, 65]
  });

  const labelMarker = leaflet
    .marker([entry.location.Latitude, entry.location.Longitude], {
      icon: placeLabel,
      opacity: 1,
      interactive: false
    })
    .addTo(map);

  await delay(LABEL_VISIBLE_MS);

  try {
    const labelElement = labelMarker.getElement();
    if (labelElement) {
      const popup = labelElement.querySelector('.place-name-popup');
      if (popup) {
        popup.classList.add('place-label-fade-out');
        await delay(FADE_DURATION_MS);
      }
    }
    map.removeLayer(labelMarker);
  } catch {
    try { map.removeLayer(labelMarker); } catch { /* already removed */ }
  }
};
