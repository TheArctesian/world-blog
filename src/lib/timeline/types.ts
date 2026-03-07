import type { LocationData } from '../marker/types.js';

export interface TimelineEntry {
  location: LocationData;
  date: Date;
  type: 'city' | 'ski' | 'hike' | 'lived';
}

export interface AnimationState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number;
  timeline: TimelineEntry[];
}

export interface YearMarker {
  year: number;
  position: number;
}
