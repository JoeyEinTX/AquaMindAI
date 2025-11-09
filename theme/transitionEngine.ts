// Cinematic scene transition system
// GPU-safe, optimized for Raspberry Pi 5

export type TransitionType = 'fade' | 'blur' | 'slide' | 'pulse';
export type SlideDirection = 'left' | 'right' | 'up' | 'down';

export interface TransitionConfig {
  duration?: number; // ms
  easing?: string;
  delay?: number;
}

const DEFAULT_CONFIG: Required<TransitionConfig> = {
  duration: 600,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  delay: 0,
};

// Fade scene in (opacity + light bloom)
export const fadeInScene = (element: HTMLElement, config: TransitionConfig = {}): Promise<void> => {
  const { duration, easing, delay } = { ...DEFAULT_CONFIG, ...config };
  
  element.style.opacity = '0';
  element.style.transform = 'scale(0.98)';
  element.style.filter = 'brightness(1.2)';
  element.style.transition = `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms, filter ${duration}ms ${easing} ${delay}ms`;
  
  // Trigger reflow
  element.offsetHeight;
  
  element.style.opacity = '1';
  element.style.transform = 'scale(1)';
  element.style.filter = 'brightness(1)';
  
  return new Promise(resolve => {
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration + delay);
  });
};

// Fade scene out
export const fadeOutScene = (element: HTMLElement, config: TransitionConfig = {}): Promise<void> => {
  const { duration, easing, delay } = { ...DEFAULT_CONFIG, ...config };
  
  element.style.transition = `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms`;
  element.style.opacity = '0';
  element.style.transform = 'scale(0.95)';
  
  return new Promise(resolve => {
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration + delay);
  });
};

// Blur transition (focus shift)
export const blurTransition = (element: HTMLElement, config: TransitionConfig = {}): Promise<void> => {
  const { duration, easing, delay } = { ...DEFAULT_CONFIG, ...config };
  
  const halfDuration = duration / 2;
  
  // Blur out
  element.style.transition = `filter ${halfDuration}ms ${easing} ${delay}ms, opacity ${halfDuration}ms ${easing} ${delay}ms`;
  element.style.filter = 'blur(8px)';
  element.style.opacity = '0.5';
  
  return new Promise(resolve => {
    setTimeout(() => {
      // Blur in
      element.style.transition = `filter ${halfDuration}ms ${easing}, opacity ${halfDuration}ms ${easing}`;
      element.style.filter = 'blur(0px)';
      element.style.opacity = '1';
      
      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, halfDuration);
    }, halfDuration + delay);
  });
};

// Slide in from direction
export const slideIn = (element: HTMLElement, direction: SlideDirection = 'right', config: TransitionConfig = {}): Promise<void> => {
  const { duration, easing, delay } = { ...DEFAULT_CONFIG, ...config };
  
  const transforms = {
    left: 'translateX(-100%)',
    right: 'translateX(100%)',
    up: 'translateY(-100%)',
    down: 'translateY(100%)',
  };
  
  element.style.opacity = '0';
  element.style.transform = transforms[direction];
  element.style.transition = `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms`;
  
  // Trigger reflow
  element.offsetHeight;
  
  element.style.opacity = '1';
  element.style.transform = 'translate(0, 0)';
  
  return new Promise(resolve => {
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration + delay);
  });
};

// Pulse glow (AI speak effect)
export const pulseGlow = (element: HTMLElement, config: TransitionConfig = {}): Promise<void> => {
  const { duration, easing } = { ...DEFAULT_CONFIG, ...config };
  
  element.style.transition = `box-shadow ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
  element.style.boxShadow = '0 0 40px var(--mood-glow, rgba(139, 92, 246, 0.6))';
  element.style.transform = 'scale(1.02)';
  
  return new Promise(resolve => {
    setTimeout(() => {
      element.style.boxShadow = '0 0 0 transparent';
      element.style.transform = 'scale(1)';
      
      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration);
    }, duration);
  });
};

// Apply CSS class-based transition
export const applyTransitionClass = (element: HTMLElement, className: string, duration: number = 600): Promise<void> => {
  element.classList.add(className);
  
  return new Promise(resolve => {
    setTimeout(() => {
      element.classList.remove(className);
      resolve();
    }, duration);
  });
};

// Sync lighting transition with scene change
export const syncLightingTransition = (targetLightState: any, duration: number = 600): void => {
  const root = document.documentElement;
  root.style.setProperty('--transition-duration', `${duration}ms`);
  
  // Trigger any lighting changes with synced duration
  // This works with existing lightEngine CSS variables
};

// Create overlay for smooth transitions
export const createTransitionOverlay = (color: string = 'rgba(0, 0, 0, 0.1)', duration: number = 600): Promise<void> => {
  const overlay = document.createElement('div');
  overlay.className = 'transition-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: ${color};
    pointer-events: none;
    z-index: 9999;
    opacity: 0;
    transition: opacity ${duration / 2}ms ease-in-out;
  `;
  
  document.body.appendChild(overlay);
  
  // Trigger reflow
  overlay.offsetHeight;
  
  // Fade in
  overlay.style.opacity = '1';
  
  return new Promise(resolve => {
    setTimeout(() => {
      // Fade out
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        document.body.removeChild(overlay);
        resolve();
      }, duration / 2);
    }, duration / 2);
  });
};

// React hook for scene transitions
import { useEffect, useRef } from 'react';

export const useSceneTransition = (transitionType: TransitionType = 'fade', config?: TransitionConfig) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const element = ref.current;
    
    switch (transitionType) {
      case 'fade':
        fadeInScene(element, config);
        break;
      case 'blur':
        blurTransition(element, config);
        break;
      case 'slide':
        slideIn(element, 'right', config);
        break;
      case 'pulse':
        pulseGlow(element, config);
        break;
    }
  }, [transitionType, config]);
  
  return ref;
};

// CSS class helpers
export const TRANSITION_CLASSES = {
  fadeIn: 'transition-fade-in',
  fadeOut: 'transition-fade-out',
  slideInRight: 'transition-slide-in-right',
  slideInLeft: 'transition-slide-in-left',
  blurIn: 'transition-blur-in',
  pulseGlow: 'transition-pulse-glow',
  lightBloom: 'transition-light-bloom',
};
