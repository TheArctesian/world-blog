// @ts-ignore - anime.js import issues
import { animate, createTimeline as animeTimeline } from 'animejs';
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
  progress?: number; // 0-100 progress percentage
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
  timeline,
  progress: 0
});

export class TimelineAnimator {
  private state: AnimationState;
  private animeTimeline: any = null;
  private onUpdate: (state: AnimationState) => void;
  private onMarkerAdd: (entry: TimelineEntry) => void;
  private progressAnimation: any = null;

  constructor(
    timeline: TimelineEntry[],
    onUpdate: (state: AnimationState) => void,
    onMarkerAdd: (entry: TimelineEntry) => void
  ) {
    this.state = createAnimationState(timeline);
    this.onUpdate = onUpdate;
    this.onMarkerAdd = onMarkerAdd;
  }

  private createAnimeTimeline(): void {
    // Clear existing timeline
    if (this.animeTimeline) {
      this.animeTimeline.pause();
      this.animeTimeline = null;
    }

    if (this.progressAnimation) {
      this.progressAnimation.pause();
      this.progressAnimation = null;
    }

    // Create a new anime.js timeline
    // @ts-ignore
    this.animeTimeline = animeTimeline({
      easing: 'easeInOutQuad',
      autoplay: false,
      complete: () => {
        this.state.isPlaying = false;
        this.onUpdate(this.state);
      }
    });

    // Create a dummy object to track progress
    const progressTracker = { value: this.state.currentIndex };
    
    // Add each location as a timeline step
    this.state.timeline.forEach((entry, index) => {
      this.animeTimeline!.add({
        targets: progressTracker,
        value: index,
        duration: this.state.speed,
        easing: 'linear',
        update: () => {
          const newIndex = Math.floor(progressTracker.value);
          if (newIndex !== this.state.currentIndex && newIndex >= 0 && newIndex < this.state.timeline.length) {
            this.state.currentIndex = newIndex;
            this.onMarkerAdd(this.state.timeline[newIndex]);
            this.state.progress = ((newIndex + 1) / this.state.timeline.length) * 100;
            this.onUpdate(this.state);
          }
        }
      }, index === 0 ? 0 : `+=${this.state.speed * 0.1}`); // Small overlap for smoother transitions
    });

    // Add overall progress animation
    const progressObj = { progress: 0 };
    // @ts-ignore
    this.progressAnimation = animate({
      targets: progressObj,
      progress: 100,
      duration: this.animeTimeline.duration,
      easing: 'linear',
      autoplay: false,
      update: () => {
        this.state.progress = progressObj.progress;
      }
    });
  }

  play(): void {
    if (this.state.isPlaying) return;
    
    this.state.isPlaying = true;
    
    // If starting from the beginning or reset, create new timeline
    if (this.state.currentIndex === -1 || !this.animeTimeline) {
      this.createAnimeTimeline();
    }
    
    // Play the anime timeline
    if (this.animeTimeline) {
      this.animeTimeline.play();
    }
    
    if (this.progressAnimation) {
      this.progressAnimation.play();
    }
    
    this.onUpdate(this.state);
  }

  pause(): void {
    this.state.isPlaying = false;
    
    if (this.animeTimeline) {
      this.animeTimeline.pause();
    }
    
    if (this.progressAnimation) {
      this.progressAnimation.pause();
    }
    
    this.onUpdate(this.state);
  }

  reset(): void {
    this.pause();
    
    if (this.animeTimeline) {
      this.animeTimeline.restart();
      this.animeTimeline.pause();
    }
    
    if (this.progressAnimation) {
      this.progressAnimation.restart();
      this.progressAnimation.pause();
    }
    
    this.state.currentIndex = -1;
    this.state.progress = 0;
    this.onUpdate(this.state);
  }

  seek(index: number): void {
    if (index < 0 || index >= this.state.timeline.length) return;
    
    this.state.currentIndex = index;
    this.state.progress = ((index + 1) / this.state.timeline.length) * 100;
    
    // Seek to the appropriate position in the timeline
    if (this.animeTimeline) {
      const seekTime = index * this.state.speed;
      this.animeTimeline.seek(seekTime);
    }
    
    if (this.progressAnimation) {
      this.progressAnimation.seek(this.state.progress * this.progressAnimation.duration / 100);
    }
    
    // Add all markers up to this point
    for (let i = 0; i <= index; i++) {
      this.onMarkerAdd(this.state.timeline[i]);
    }
    
    this.onUpdate(this.state);
  }

  setSpeed(speed: number): void {
    const wasPlaying = this.state.isPlaying;
    const currentProgress = this.state.progress || 0;
    
    // Update speed
    this.state.speed = speed;
    
    // If timeline exists, recreate with new speed
    if (this.animeTimeline) {
      this.pause();
      const savedIndex = this.state.currentIndex;
      this.createAnimeTimeline();
      
      // Restore position
      if (savedIndex >= 0) {
        this.seek(savedIndex);
      }
      
      // Resume if was playing
      if (wasPlaying) {
        this.play();
      }
    }
    
    this.onUpdate(this.state);
  }

  getState(): AnimationState {
    return { ...this.state };
  }

  destroy(): void {
    this.pause();
    
    if (this.animeTimeline) {
      this.animeTimeline = null;
    }
    
    if (this.progressAnimation) {
      this.progressAnimation = null;
    }
  }
}