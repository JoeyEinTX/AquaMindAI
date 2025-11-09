// Touch gesture detection engine
// GPU-safe, throttled, performance-optimized for Pi 5

export type GestureType = 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'long-press' | 'tap';
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface GestureEvent {
  type: GestureType;
  deltaX?: number;
  deltaY?: number;
  velocity?: number;
  duration?: number;
  target?: HTMLElement;
}

export interface GestureCallbacks {
  onSwipeLeft?: (event: GestureEvent) => void;
  onSwipeRight?: (event: GestureEvent) => void;
  onSwipeUp?: (event: GestureEvent) => void;
  onSwipeDown?: (event: GestureEvent) => void;
  onLongPress?: (event: GestureEvent) => void;
  onTap?: (event: GestureEvent) => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  isTracking: boolean;
  longPressTimer: NodeJS.Timeout | null;
}

class GestureEngine {
  private touchState: TouchState = {
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    isTracking: false,
    longPressTimer: null,
  };

  private callbacks: GestureCallbacks = {};
  private element: HTMLElement | null = null;
  
  // Configuration
  private config = {
    minSwipeDistance: 50, // px
    maxSwipeTime: 500, // ms
    longPressDuration: 500, // ms
    tapMaxDistance: 10, // px
    tapMaxDuration: 300, // ms
  };

  // Attach gesture listeners to element
  attach(element: HTMLElement, callbacks: GestureCallbacks): () => void {
    this.element = element;
    this.callbacks = callbacks;
    
    // Use passive listeners where possible for performance
    element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', this.handleTouchCancel, { passive: true });
    
    // Mouse events for desktop testing
    element.addEventListener('mousedown', this.handleMouseDown);
    element.addEventListener('mousemove', this.handleMouseMove);
    element.addEventListener('mouseup', this.handleMouseUp);
    
    // Cleanup function
    return () => {
      element.removeEventListener('touchstart', this.handleTouchStart);
      element.removeEventListener('touchmove', this.handleTouchMove);
      element.removeEventListener('touchend', this.handleTouchEnd);
      element.removeEventListener('touchcancel', this.handleTouchCancel);
      element.removeEventListener('mousedown', this.handleMouseDown);
      element.removeEventListener('mousemove', this.handleMouseMove);
      element.removeEventListener('mouseup', this.handleMouseUp);
      
      this.clearLongPressTimer();
    };
  }

  private handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    this.startTracking(touch.clientX, touch.clientY, e.target as HTMLElement);
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.touchState.isTracking) return;
    
    const touch = e.touches[0];
    this.touchState.currentX = touch.clientX;
    this.touchState.currentY = touch.clientY;
    
    // Cancel long press if moved too much
    const deltaX = Math.abs(this.touchState.currentX - this.touchState.startX);
    const deltaY = Math.abs(this.touchState.currentY - this.touchState.startY);
    
    if (deltaX > this.config.tapMaxDistance || deltaY > this.config.tapMaxDistance) {
      this.clearLongPressTimer();
    }
    
    // Prevent default for significant swipes to avoid scrolling
    if (deltaX > 30 || deltaY > 30) {
      e.preventDefault();
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (!this.touchState.isTracking) return;
    
    this.endTracking(e.target as HTMLElement);
  };

  private handleTouchCancel = () => {
    this.cancelTracking();
  };

  private handleMouseDown = (e: MouseEvent) => {
    this.startTracking(e.clientX, e.clientY, e.target as HTMLElement);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.touchState.isTracking) return;
    
    this.touchState.currentX = e.clientX;
    this.touchState.currentY = e.clientY;
    
    // Cancel long press if moved
    const deltaX = Math.abs(this.touchState.currentX - this.touchState.startX);
    const deltaY = Math.abs(this.touchState.currentY - this.touchState.startY);
    
    if (deltaX > this.config.tapMaxDistance || deltaY > this.config.tapMaxDistance) {
      this.clearLongPressTimer();
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (!this.touchState.isTracking) return;
    
    this.endTracking(e.target as HTMLElement);
  };

  private startTracking(x: number, y: number, target: HTMLElement) {
    this.touchState = {
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      startTime: Date.now(),
      isTracking: true,
      longPressTimer: null,
    };
    
    // Start long press timer
    this.touchState.longPressTimer = setTimeout(() => {
      if (this.touchState.isTracking) {
        this.triggerGesture('long-press', { target });
        this.cancelTracking();
      }
    }, this.config.longPressDuration);
  }

  private endTracking(target: HTMLElement) {
    const duration = Date.now() - this.touchState.startTime;
    const deltaX = this.touchState.currentX - this.touchState.startX;
    const deltaY = this.touchState.currentY - this.touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration; // px/ms
    
    this.clearLongPressTimer();
    
    // Determine gesture type
    if (distance < this.config.tapMaxDistance && duration < this.config.tapMaxDuration) {
      // Tap
      this.triggerGesture('tap', { target, duration });
    } else if (distance >= this.config.minSwipeDistance && duration <= this.config.maxSwipeTime) {
      // Swipe - determine direction
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) {
          this.triggerGesture('swipe-right', { deltaX, deltaY, velocity, duration, target });
        } else {
          this.triggerGesture('swipe-left', { deltaX, deltaY, velocity, duration, target });
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          this.triggerGesture('swipe-down', { deltaX, deltaY, velocity, duration, target });
        } else {
          this.triggerGesture('swipe-up', { deltaX, deltaY, velocity, duration, target });
        }
      }
    }
    
    this.touchState.isTracking = false;
  }

  private cancelTracking() {
    this.clearLongPressTimer();
    this.touchState.isTracking = false;
  }

  private clearLongPressTimer() {
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
      this.touchState.longPressTimer = null;
    }
  }

  private triggerGesture(type: GestureType, data: Partial<GestureEvent> = {}) {
    const event: GestureEvent = {
      type,
      ...data,
    };
    
    // Call appropriate callback
    switch (type) {
      case 'swipe-left':
        this.callbacks.onSwipeLeft?.(event);
        break;
      case 'swipe-right':
        this.callbacks.onSwipeRight?.(event);
        break;
      case 'swipe-up':
        this.callbacks.onSwipeUp?.(event);
        break;
      case 'swipe-down':
        this.callbacks.onSwipeDown?.(event);
        break;
      case 'long-press':
        this.callbacks.onLongPress?.(event);
        break;
      case 'tap':
        this.callbacks.onTap?.(event);
        break;
    }
  }
}

// React hook for gesture detection
import { useEffect, useRef } from 'react';

export const useGestures = (callbacks: GestureCallbacks) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const engine = new GestureEngine();
    const cleanup = engine.attach(element, callbacks);
    
    return cleanup;
  }, [callbacks]);
  
  return ref;
};

// Haptic feedback helper
export const triggerHaptic = (pattern: 'tap' | 'confirm' | 'longPress' | 'error'): void => {
  if (!navigator.vibrate) return;
  
  // Check if haptics enabled in settings
  const settings = localStorage.getItem('hapticsEnabled');
  if (settings === 'false') return;
  
  const patterns = {
    tap: 10,
    confirm: 20,
    longPress: 50,
    error: [50, 50, 50], // Three short bursts
  };
  
  navigator.vibrate(patterns[pattern]);
};
