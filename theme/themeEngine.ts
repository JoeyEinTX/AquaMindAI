import { useState, useEffect, useCallback, useRef } from 'react';
import { WeatherData } from '../types';
import { getWeather } from '../services/weatherService';

export type ThemeType = 'clear' | 'rain' | 'cloudy' | 'snow' | 'night';
export type DayPeriod = 'morning' | 'midday' | 'sunset' | 'night';

export interface ThemeState {
  theme: ThemeType;
  dayPeriod: DayPeriod;
  accentColor: string;
  glassColor: string;
  backgroundGradient: string;
  textPrimary: string;
  textMuted: string;
}

// Detect day period based on local time
const getDayPeriod = (): DayPeriod => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 20) return 'sunset';
  return 'night';
};

// Map weather description to coarse condition
const getWeatherCondition = (description: string, isDay: boolean): ThemeType => {
  if (!isDay) return 'night';
  
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('snow') || lowerDesc.includes('freezing')) return 'snow';
  if (lowerDesc.includes('rain') || lowerDesc.includes('drizzle') || 
      lowerDesc.includes('shower') || lowerDesc.includes('thunderstorm')) return 'rain';
  if (lowerDesc.includes('cloud') || lowerDesc.includes('overcast') || 
      lowerDesc.includes('fog')) return 'cloudy';
  
  return 'clear';
};

// Generate theme colors and gradients based on conditions
const generateThemeState = (condition: ThemeType, period: DayPeriod): ThemeState => {
  let accentColor: string;
  let glassColor: string;
  let backgroundGradient: string;
  let textPrimary: string;
  let textMuted: string;

  // Night theme (overrides everything)
  if (condition === 'night') {
    accentColor = '#60a5fa'; // blue-400
    glassColor = 'rgba(30, 41, 59, 0.12)'; // slate-800 at 12%
    backgroundGradient = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)';
    textPrimary = '#f1f5f9'; // slate-100
    textMuted = '#94a3b8'; // slate-400
    return { theme: condition, dayPeriod: period, accentColor, glassColor, backgroundGradient, textPrimary, textMuted };
  }

  // Day themes based on weather
  switch (condition) {
    case 'clear':
      if (period === 'morning') {
        accentColor = '#fb923c'; // orange-400
        glassColor = 'rgba(251, 146, 60, 0.10)';
        backgroundGradient = 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 30%, #fbbf24 70%, #f59e0b 100%)';
      } else if (period === 'sunset') {
        accentColor = '#f97316'; // orange-500
        glassColor = 'rgba(249, 115, 22, 0.12)';
        backgroundGradient = 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 25%, #fdba74 50%, #fb923c 75%, #c026d3 100%)';
      } else {
        accentColor = '#3b82f6'; // blue-500
        glassColor = 'rgba(59, 130, 246, 0.10)';
        backgroundGradient = 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 40%, #60a5fa 70%, #3b82f6 100%)';
      }
      textPrimary = '#0f172a'; // slate-900
      textMuted = '#475569'; // slate-600
      break;

    case 'rain':
      accentColor = '#06b6d4'; // cyan-500
      glassColor = 'rgba(6, 182, 212, 0.12)';
      backgroundGradient = 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 30%, #67e8f9 60%, #22d3ee 100%)';
      textPrimary = '#0f172a';
      textMuted = '#475569';
      break;

    case 'cloudy':
      accentColor = '#64748b'; // slate-500
      glassColor = 'rgba(100, 116, 139, 0.10)';
      backgroundGradient = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 40%, #cbd5e1 70%, #94a3b8 100%)';
      textPrimary = '#0f172a';
      textMuted = '#475569';
      break;

    case 'snow':
      accentColor = '#a78bfa'; // violet-400
      glassColor = 'rgba(167, 139, 250, 0.10)';
      backgroundGradient = 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 30%, #e0f2fe 60%, #bae6fd 100%)';
      textPrimary = '#0f172a';
      textMuted = '#475569';
      break;

    default:
      accentColor = '#3b82f6';
      glassColor = 'rgba(59, 130, 246, 0.10)';
      backgroundGradient = 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #3b82f6 100%)';
      textPrimary = '#0f172a';
      textMuted = '#475569';
  }

  return { theme: condition, dayPeriod: period, accentColor, glassColor, backgroundGradient, textPrimary, textMuted };
};

// Safe fallback theme
const getFallbackTheme = (): ThemeState => {
  const period = getDayPeriod();
  return generateThemeState(period === 'night' ? 'night' : 'clear', period);
};

// Debounce utility
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const useThemeEngine = (zipCode: string, weatherData: WeatherData | null) => {
  const [themeState, setThemeState] = useState<ThemeState>(getFallbackTheme());
  const lastUpdateRef = useRef<number>(0);
  const updateInProgressRef = useRef<boolean>(false);

  // Debounced theme update to avoid flicker
  const debouncedSetTheme = useCallback(
    debounce((newTheme: ThemeState) => {
      setThemeState(newTheme);
    }, 200),
    []
  );

  const updateTheme = useCallback(
    async (forceUpdate: boolean = false) => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      // Prevent concurrent updates
      if (updateInProgressRef.current) return;
      
      // Check if we need to update (5 min cadence or forced)
      if (!forceUpdate && now - lastUpdateRef.current < fiveMinutes) return;

      updateInProgressRef.current = true;

      try {
        const period = getDayPeriod();
        let condition: ThemeType;

        // Try to use existing weather data first
        if (weatherData) {
          condition = getWeatherCondition(
            weatherData.current.description,
            weatherData.current.isDay
          );
        } else if (zipCode && /^\d{5}$/.test(zipCode)) {
          // Fetch fresh weather data if needed
          try {
            const freshWeather = await getWeather({ zipCode });
            condition = getWeatherCondition(
              freshWeather.current.description,
              freshWeather.current.isDay
            );
          } catch (error) {
            console.warn('[ThemeEngine] Weather fetch failed, using fallback:', error);
            condition = period === 'night' ? 'night' : 'clear';
          }
        } else {
          // No weather data available, use time-based fallback
          condition = period === 'night' ? 'night' : 'clear';
        }

        const newTheme = generateThemeState(condition, period);
        debouncedSetTheme(newTheme);
        lastUpdateRef.current = now;
      } catch (error) {
        console.error('[ThemeEngine] Error updating theme:', error);
        // On error, use safe fallback
        const fallback = getFallbackTheme();
        debouncedSetTheme(fallback);
      } finally {
        updateInProgressRef.current = false;
      }
    },
    [weatherData, zipCode, debouncedSetTheme]
  );

  // Initial theme setup
  useEffect(() => {
    updateTheme(true);
  }, []);

  // Update theme when weather or zip changes
  useEffect(() => {
    updateTheme(false);
  }, [weatherData, zipCode]);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      updateTheme(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updateTheme]);

  return themeState;
};
