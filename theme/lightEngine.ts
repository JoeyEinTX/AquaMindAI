import { ThemeType, DayPeriod } from './themeEngine';

export interface LightState {
  ambientGlow: string;
  ambientDirection: number;
  intensity: number;
  warmth: number; // 0-1, cold to warm
}

// Generate dynamic lighting based on theme and time
export const updateLightMood = (theme: ThemeType, dayPeriod: DayPeriod): LightState => {
  let ambientGlow: string;
  let ambientDirection: number;
  let intensity: number;
  let warmth: number;

  // Night always overrides
  if (theme === 'night') {
    return {
      ambientGlow: 'rgba(96, 165, 250, 0.08)', // Cool blue
      ambientDirection: 225, // Top-left
      intensity: 0.3,
      warmth: 0.1,
    };
  }

  // Day period lighting
  switch (dayPeriod) {
    case 'morning':
      ambientDirection = 45 + Math.random() * 10; // East-ish with variation
      intensity = 0.6;
      warmth = 0.75;
      
      if (theme === 'clear') {
        ambientGlow = 'rgba(251, 146, 60, 0.12)'; // Warm orange
      } else if (theme === 'rain') {
        ambientGlow = 'rgba(6, 182, 212, 0.10)'; // Cool cyan
        warmth = 0.3;
      } else if (theme === 'cloudy') {
        ambientGlow = 'rgba(148, 163, 184, 0.08)'; // Neutral gray
        warmth = 0.4;
      } else if (theme === 'snow') {
        ambientGlow = 'rgba(167, 139, 250, 0.10)'; // Cool violet
        warmth = 0.2;
      } else {
        ambientGlow = 'rgba(251, 146, 60, 0.12)';
      }
      break;

    case 'midday':
      ambientDirection = 90 + Math.random() * 10; // Overhead with variation
      intensity = 0.8;
      warmth = 0.5;
      
      if (theme === 'clear') {
        ambientGlow = 'rgba(59, 130, 246, 0.15)'; // Bright blue
      } else if (theme === 'rain') {
        ambientGlow = 'rgba(6, 182, 212, 0.12)'; // Cyan
        warmth = 0.3;
      } else if (theme === 'cloudy') {
        ambientGlow = 'rgba(148, 163, 184, 0.10)'; // Muted
        warmth = 0.4;
        intensity = 0.5;
      } else if (theme === 'snow') {
        ambientGlow = 'rgba(186, 230, 253, 0.12)'; // Bright ice
        warmth = 0.2;
      } else {
        ambientGlow = 'rgba(59, 130, 246, 0.15)';
      }
      break;

    case 'sunset':
      ambientDirection = 225 + Math.random() * 10; // West-ish with variation
      intensity = 0.7;
      warmth = 0.9;
      
      if (theme === 'clear') {
        ambientGlow = 'rgba(249, 115, 22, 0.18)'; // Deep orange
      } else if (theme === 'rain') {
        ambientGlow = 'rgba(236, 72, 153, 0.12)'; // Pink-ish
        warmth = 0.7;
      } else if (theme === 'cloudy') {
        ambientGlow = 'rgba(251, 146, 60, 0.10)'; // Soft orange
        warmth = 0.6;
      } else if (theme === 'snow') {
        ambientGlow = 'rgba(196, 181, 253, 0.12)'; // Soft violet
        warmth = 0.4;
      } else {
        ambientGlow = 'rgba(249, 115, 22, 0.18)';
      }
      break;

    default:
      ambientDirection = 180;
      intensity = 0.5;
      warmth = 0.5;
      ambientGlow = 'rgba(148, 163, 184, 0.10)';
  }

  return {
    ambientGlow,
    ambientDirection,
    intensity,
    warmth,
  };
};

// Detect season based on month
export const getSeason = (): 'spring' | 'summer' | 'autumn' | 'winter' => {
  const month = new Date().getMonth(); // 0-11
  
  if (month >= 2 && month <= 4) return 'spring'; // Mar-May
  if (month >= 5 && month <= 7) return 'summer'; // Jun-Aug
  if (month >= 8 && month <= 10) return 'autumn'; // Sep-Nov
  return 'winter'; // Dec-Feb
};

// Apply light state to CSS variables
export const applyLightState = (lightState: LightState): void => {
  const root = document.documentElement;
  
  root.style.setProperty('--ambient-glow', lightState.ambientGlow);
  root.style.setProperty('--ambient-direction', `${lightState.ambientDirection}deg`);
  root.style.setProperty('--ambient-intensity', lightState.intensity.toString());
  root.style.setProperty('--ambient-warmth', lightState.warmth.toString());
};

// Hook-like function for components to use
export const useLightEngine = (theme: ThemeType, dayPeriod: DayPeriod): LightState => {
  const lightState = updateLightMood(theme, dayPeriod);
  
  // Apply to DOM
  applyLightState(lightState);
  
  return lightState;
};
