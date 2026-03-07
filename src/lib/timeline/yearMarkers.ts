import type { TimelineEntry, YearMarker } from './types.js';

export const generateYearMarkers = (timeline: TimelineEntry[]): YearMarker[] => {
  if (timeline.length === 0) return [];

  const years = new Set<number>();
  timeline.forEach(entry => {
    years.add(entry.date.getFullYear());
  });

  const sortedYears = Array.from(years).sort((a, b) => a - b);

  const yearMarkers: YearMarker[] = [];

  sortedYears.forEach(year => {
    const firstEntryIndex = timeline.findIndex(entry => entry.date.getFullYear() === year);
    const position = (firstEntryIndex / (timeline.length - 1)) * 100;

    yearMarkers.push({
      year,
      position: Math.max(0, Math.min(100, position))
    });
  });

  return yearMarkers;
};
