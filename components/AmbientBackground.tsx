import React from 'react';
import { ThemeState } from '../theme/themeEngine';

interface AmbientBackgroundProps {
  themeState: ThemeState;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ themeState }) => {
  const { theme, backgroundGradient } = themeState;

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
      style={{ background: backgroundGradient }}
    >
      {/* Weather-specific overlays */}
      {theme === 'clear' && (
        <div className="absolute inset-0 animate-gradient-shift">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 50%)',
            }}
          />
        </div>
      )}

      {theme === 'rain' && (
        <>
          {/* Rain shimmer effect */}
          <div className="absolute inset-0 opacity-20">
            <div className="rain-streaks" />
          </div>
          {/* Subtle diagonal motion */}
          <div
            className="absolute inset-0 opacity-10 animate-rain-drift"
            style={{
              background: 'repeating-linear-gradient(110deg, transparent, transparent 100px, rgba(255, 255, 255, 0.1) 100px, rgba(255, 255, 255, 0.1) 102px)',
            }}
          />
        </>
      )}

      {theme === 'cloudy' && (
        <>
          {/* Drifting haze layers */}
          <div className="absolute inset-0 opacity-20 animate-cloud-drift-slow">
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at 20% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
              }}
            />
          </div>
          <div className="absolute inset-0 opacity-15 animate-cloud-drift-medium">
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at 70% 60%, rgba(255, 255, 255, 0.25) 0%, transparent 50%)',
              }}
            />
          </div>
        </>
      )}

      {theme === 'snow' && (
        <>
          {/* Very light particle drift */}
          <div className="absolute inset-0 opacity-15 animate-snow-drift">
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 40% 20%, rgba(255, 255, 255, 0.5) 0%, transparent 30%), radial-gradient(circle at 70% 50%, rgba(255, 255, 255, 0.4) 0%, transparent 25%)',
              }}
            />
          </div>
        </>
      )}

      {theme === 'night' && (
        <>
          {/* Starfield effect */}
          <div className="absolute inset-0 opacity-40">
            <div className="stars-layer" />
          </div>
          {/* Subtle glow */}
          <div
            className="absolute inset-0 opacity-10 animate-night-glow"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(96, 165, 250, 0.3) 0%, transparent 60%)',
            }}
          />
        </>
      )}

      {/* Smooth transition overlay */}
      <div className="absolute inset-0 bg-transparent transition-opacity duration-300" />
    </div>
  );
};
