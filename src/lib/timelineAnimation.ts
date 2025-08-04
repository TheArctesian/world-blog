import type { LocationData } from './types.js';
import { parseDate } from './dateUtils.js';

export interface TimelineEntry {
  location: LocationData;
  date: Date;
  type: 'city' | 'ski' | 'hike' | 'lived';
}

export interface AnimationState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number; // milliseconds between each marker
  timeline: TimelineEntry[];
}

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

  // Sort by date
  return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const createAnimationState = (timeline: TimelineEntry[]): AnimationState => ({
  isPlaying: false,
  currentIndex: -1,
  speed: 4000, // 4 seconds between markers for better tile loading
  timeline
});

export class TimelineAnimator {
  private state: AnimationState;
  private timeoutId: number | null = null;
  private onUpdate: (state: AnimationState) => void;
  private onMarkerAdd: (entry: TimelineEntry) => void;

  constructor(
    timeline: TimelineEntry[],
    onUpdate: (state: AnimationState) => void,
    onMarkerAdd: (entry: TimelineEntry) => void
  ) {
    this.state = createAnimationState(timeline);
    this.onUpdate = onUpdate;
    this.onMarkerAdd = onMarkerAdd;
  }

  play(): void {
    if (this.state.isPlaying) return;
    
    this.state.isPlaying = true;
    this.onUpdate(this.state);
    this.scheduleNext();
  }

  private scheduleNext(): void {
    if (!this.state.isPlaying) return;
    
    this.state.currentIndex++;
    
    if (this.state.currentIndex >= this.state.timeline.length) {
      this.pause();
      return;
    }

    const currentEntry = this.state.timeline[this.state.currentIndex];
    
    // Add marker immediately
    this.onMarkerAdd(currentEntry);
    this.onUpdate(this.state);

    // Schedule next marker based on speed
    this.timeoutId = window.setTimeout(() => {
      this.scheduleNext();
    }, this.state.speed);
  }

  pause(): void {
    this.state.isPlaying = false;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.onUpdate(this.state);
  }

  reset(): void {
    this.pause();
    this.state.currentIndex = -1;
    this.onUpdate(this.state);
  }

  setSpeed(speed: number): void {
    this.state.speed = speed;
    // If playing, restart timing with new speed
    if (this.state.isPlaying) {
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
      }
      this.timeoutId = window.setTimeout(() => {
        this.scheduleNext();
      }, speed);
    }
  }

  getState(): AnimationState {
    return { ...this.state };
  }

  destroy(): void {
    this.pause();
  }
}