import React, { useEffect, useState } from 'react';
import { useAIMoodColors } from '../../services/aiMoodEngine';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface RippleEffectProps {
  x: number;
  y: number;
  color?: string;
  intensity?: 'subtle' | 'normal' | 'off';
  onComplete?: () => void;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  x,
  y,
  color,
  intensity = 'normal',
  onComplete,
}) => {
  const moodColors = useAIMoodColors();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-cleanup after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 600);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (intensity === 'off' || !isVisible) {
    return null;
  }

  const rippleColor = color || moodColors.glowColor;
  const opacityMultiplier = intensity === 'subtle' ? 0.4 : 0.6;

  return (
    <span
      className="ripple-effect"
      style={{
        left: x,
        top: y,
        background: rippleColor,
        opacity: opacityMultiplier,
      }}
    />
  );
};

interface RippleContainerProps {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const RippleContainer: React.FC<RippleContainerProps> = ({
  children,
  disabled = false,
  className = '',
  onClick,
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [intensity, setIntensity] = useState<'subtle' | 'normal' | 'off'>('normal');

  // Load intensity from settings
  useEffect(() => {
    const savedIntensity = localStorage.getItem('rippleIntensity') as 'subtle' | 'normal' | 'off';
    if (savedIntensity) {
      setIntensity(savedIntensity);
    }

    // Listen for settings changes
    const handleStorageChange = () => {
      const newIntensity = localStorage.getItem('rippleIntensity') as 'subtle' | 'normal' | 'off';
      if (newIntensity) {
        setIntensity(newIntensity);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || intensity === 'off') {
      onClick?.(e);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = {
      id: Date.now() + Math.random(),
      x,
      y,
    };

    setRipples((prev) => {
      // Limit to 5 concurrent ripples for performance
      const updated = [...prev, newRipple];
      return updated.slice(-5);
    });

    console.log('[RIPPLE] Created at', x, y);

    onClick?.(e);
  };

  const handleRippleComplete = (id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
      style={{ isolation: 'isolate' }}
    >
      {children}
      {ripples.map((ripple) => (
        <RippleEffect
          key={ripple.id}
          x={ripple.x}
          y={ripple.y}
          intensity={intensity}
          onComplete={() => handleRippleComplete(ripple.id)}
        />
      ))}
    </div>
  );
};

// Higher-order component to add ripple to any component
export const withRipple = <P extends object>(
  Component: React.ComponentType<P>,
  disabled?: boolean
) => {
  return React.forwardRef<any, P>((props: P, ref) => (
    <RippleContainer disabled={disabled}>
      <Component {...props} ref={ref} />
    </RippleContainer>
  ));
};
