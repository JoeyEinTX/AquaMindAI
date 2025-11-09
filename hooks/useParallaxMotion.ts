import { useState, useEffect, useRef } from 'react';

export interface ParallaxConfig {
  intensity?: number;      // 0-1 (default 0.5)
  maxOffset?: number;      // px (default 8)
  smoothing?: number;      // 0-1 (default 0.1)
  enableGyro?: boolean;    // Device orientation (default true)
  enableCursor?: boolean;  // Desktop cursor (default true)
}

export interface ParallaxOffset {
  x: number;
  y: number;
}

const DEFAULT_CONFIG: Required<ParallaxConfig> = {
  intensity: 0.5,
  maxOffset: 8,
  smoothing: 0.1,
  enableGyro: true,
  enableCursor: true,
};

export const useParallaxMotion = (config: ParallaxConfig = {}): ParallaxOffset => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });
  const [isEnabled, setIsEnabled] = useState(true);
  const targetOffset = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);
  const fpsCounter = useRef({ frames: 0, lastTime: performance.now(), fps: 60 });

  // Check user preferences and settings
  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      console.log('[MOTION] Disabled: prefers-reduced-motion');
      setIsEnabled(false);
      return;
    }

    // Check localStorage setting
    const motionSetting = localStorage.getItem('motionEffects');
    if (motionSetting === 'false') {
      console.log('[MOTION] Disabled: user setting');
      setIsEnabled(false);
      return;
    }

    setIsEnabled(true);
  }, []);

  // Desktop: Cursor tracking
  useEffect(() => {
    if (!isEnabled || !finalConfig.enableCursor) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Normalize to -1 to 1
      const normalizedX = (e.clientX - centerX) / centerX;
      const normalizedY = (e.clientY - centerY) / centerY;

      // Apply intensity and max offset
      targetOffset.current = {
        x: normalizedX * finalConfig.maxOffset * finalConfig.intensity,
        y: normalizedY * finalConfig.maxOffset * finalConfig.intensity,
      };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isEnabled, finalConfig]);

  // Mobile: Device orientation
  useEffect(() => {
    if (!isEnabled || !finalConfig.enableGyro) return;

    // Check if device orientation is supported
    if (!window.DeviceOrientationEvent) {
      return;
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;

      // β (beta): front-to-back tilt (-180 to 180)
      // γ (gamma): left-right tilt (-90 to 90)
      
      // Normalize to -1 to 1
      const normalizedX = Math.max(-1, Math.min(1, e.gamma / 45)); // Use ±45° as full range
      const normalizedY = Math.max(-1, Math.min(1, e.beta / 45));

      // Apply intensity and max offset
      // Invert for natural feel (tilt left = content shifts right)
      targetOffset.current = {
        x: -normalizedX * finalConfig.maxOffset * finalConfig.intensity,
        y: -normalizedY * finalConfig.maxOffset * finalConfig.intensity,
      };
    };

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });

    console.log('[MOTION] Device orientation enabled');

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isEnabled, finalConfig]);

  // RAF loop for smooth interpolation
  useEffect(() => {
    if (!isEnabled) {
      // Reset to center when disabled
      setOffset({ x: 0, y: 0 });
      currentOffset.current = { x: 0, y: 0 };
      targetOffset.current = { x: 0, y: 0 };
      return;
    }

    const animate = () => {
      // FPS tracking
      const now = performance.now();
      fpsCounter.current.frames++;
      
      if (now >= fpsCounter.current.lastTime + 1000) {
        fpsCounter.current.fps = Math.round(
          (fpsCounter.current.frames * 1000) / (now - fpsCounter.current.lastTime)
        );
        
        // Auto-disable if FPS drops below 50
        if (fpsCounter.current.fps < 50) {
          console.warn('[MOTION] Disabled: FPS < 50');
          setIsEnabled(false);
          return;
        }
        
        fpsCounter.current.frames = 0;
        fpsCounter.current.lastTime = now;
      }

      // Smooth interpolation (lerp)
      currentOffset.current.x += (targetOffset.current.x - currentOffset.current.x) * finalConfig.smoothing;
      currentOffset.current.y += (targetOffset.current.y - currentOffset.current.y) * finalConfig.smoothing;

      // Update state (only if changed significantly to avoid unnecessary renders)
      const deltaX = Math.abs(currentOffset.current.x - offset.x);
      const deltaY = Math.abs(currentOffset.current.y - offset.y);
      
      if (deltaX > 0.1 || deltaY > 0.1) {
        setOffset({
          x: Math.round(currentOffset.current.x * 100) / 100,
          y: Math.round(currentOffset.current.y * 100) / 100,
        });
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isEnabled, finalConfig, offset]);

  return offset;
};

// Utility hook for applying parallax to a ref
export const useParallaxRef = (config?: ParallaxConfig) => {
  const offset = useParallaxMotion(config);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    ref.current.style.transition = 'transform 0.1s ease-out';
  }, [offset]);

  return { ref, offset };
};
