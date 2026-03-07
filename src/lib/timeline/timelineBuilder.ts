import type { LocationData } from '../marker/types.js';
import type { TimelineEntry } from './types.js';
import { parseDate } from './dateUtils.js';

export const createTimeline = (
  places: LocationData[],
  ski: LocationData[],
  hike: LocationData[],
  lived: LocationData[]
): TimelineEntry[] => {
  const timeline: TimelineEntry[] = [
    ...places.map(location => ({ location, date: parseDate(location.Date), type: 'city' as const })),
    ...ski.map(location => ({ location, date: parseDate(location.Date), type: 'ski' as const })),
    ...hike.map(location => ({ location, date: parseDate(location.Date), type: 'hike' as const })),
    ...lived.map(location => ({ location, date: parseDate(location.Date), type: 'lived' as const }))
  ];

  return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
};
