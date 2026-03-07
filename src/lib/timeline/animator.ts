import type { TimelineEntry, AnimationState } from './types.js';

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
    this.state = {
      isPlaying: false,
      currentIndex: -1,
      speed: 4000,
      timeline
    };
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

    this.onMarkerAdd(currentEntry);
    this.onUpdate(this.state);

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
