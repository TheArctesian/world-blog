import type { TimelineEntry } from './timelineAnimation.js';

export interface YearMarker {
  year: number;
  position: number; // percentage position on timeline
}

export const generateYearMarkers = (timeline: TimelineEntry[]): YearMarker[] => {
  if (timeline.length === 0) return [];

  const years = new Set<number>();
  timeline.forEach(entry => {
    years.add(entry.date.getFullYear());
  });

  const sortedYears = Array.from(years).sort((a, b) => a - b);
  const minYear = sortedYears[0];
  const maxYear = sortedYears[sortedYears.length - 1];
  
  // Generate year markers with positions
  const yearMarkers: YearMarker[] = [];
  
  // Calculate position for each year based on timeline distribution
  sortedYears.forEach(year => {
    // Find first entry for this year
    const firstEntryIndex = timeline.findIndex(entry => entry.date.getFullYear() === year);
    const position = (firstEntryIndex / (timeline.length - 1)) * 100;
    
    yearMarkers.push({
      year,
      position: Math.max(0, Math.min(100, position))
    });
  });

  return yearMarkers;
};