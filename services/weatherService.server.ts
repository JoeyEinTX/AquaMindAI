/**
 * Server-side Weather Service with Caching
 * Fetches 7-day forecast from Open-Meteo API and caches for 1 hour
 */

interface CachedWeatherData {
  forecast: ForecastDay[];
  cachedAt: number; // Unix timestamp
  location: {
    zipCode: string;
    latitude: number;
    longitude: number;
  };
}

interface ForecastDay {
  date: string; // YYYY-MM-DD
  tempHigh: number; // °F
  tempLow: number; // °F
  precipProbability: number; // 0-100
  precipAmount: number; // inches
  humidity: number; // 0-100
  weatherCode: number;
  weatherDescription: string;
}

interface WeatherForecastResponse {
  forecast: ForecastDay[];
  location: {
    zipCode: string;
    latitude: number;
    longitude: number;
  };
  cachedAt: string; // ISO timestamp
  cacheExpiresAt: string; // ISO timestamp
}

// WMO Weather interpretation codes
const WMO_CODE_MAP: { [key: number]: string } = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
};

const wmoCodeToDescription = (code: number): string => {
  return WMO_CODE_MAP[code] || 'Unknown weather';
};

const getIANATimezoneFromZip = (zip: string): string => {
  const zipPrefix = parseInt(zip.substring(0, 3), 10);
  if (zipPrefix >= 0 && zipPrefix <= 299) return 'America/New_York';
  if (zipPrefix >= 300 && zipPrefix <= 499) return 'America/New_York';
  if (zipPrefix >= 500 && zipPrefix <= 699) return 'America/Chicago';
  if (zipPrefix >= 700 && zipPrefix <= 849) return 'America/Chicago';
  if (zipPrefix >= 850 && zipPrefix <= 935) return 'America/Denver';
  if (zipPrefix >= 936 && zipPrefix <= 999) return 'America/Los_Angeles';
  return 'America/Chicago';
};

class ServerWeatherService {
  private cache: CachedWeatherData | null = null;
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Get 7-day weather forecast with 1-hour server-side caching
   */
  async getForecast(zipCode: string): Promise<WeatherForecastResponse> {
    const now = Date.now();

    // Return cached data if still valid and same location
    if (this.cache && 
        this.cache.location.zipCode === zipCode && 
        (now - this.cache.cachedAt) < this.CACHE_DURATION_MS) {
      console.log('[WEATHER] Returning cached forecast data');
      return {
        forecast: this.cache.forecast,
        location: this.cache.location,
        cachedAt: new Date(this.cache.cachedAt).toISOString(),
        cacheExpiresAt: new Date(this.cache.cachedAt + this.CACHE_DURATION_MS).toISOString()
      };
    }

    console.log('[WEATHER] Fetching fresh forecast data from Open-Meteo API');

    // Geocode zip code
    const geoResponse = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (!geoResponse.ok) {
      if (geoResponse.status === 404) {
        throw new Error(`Zip code ${zipCode} not found`);
      }
      throw new Error('Failed to geocode zip code');
    }

    const geoData = await geoResponse.json();
    const latitude = parseFloat(geoData.places[0].latitude);
    const longitude = parseFloat(geoData.places[0].longitude);
    const timezone = getIANATimezoneFromZip(zipCode);

    // Fetch weather data from Open-Meteo
    const weatherParams = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,relative_humidity_2m_mean',
      temperature_unit: 'fahrenheit',
      precipitation_unit: 'inch',
      timezone: timezone,
      forecast_days: '7',
    });

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?${weatherParams.toString()}`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data from Open-Meteo');
    }

    const weatherData = await weatherResponse.json();

    // Map to our forecast format
    const forecast: ForecastDay[] = [];
    for (let i = 0; i < weatherData.daily.time.length; i++) {
      forecast.push({
        date: weatherData.daily.time[i],
        tempHigh: Math.round(weatherData.daily.temperature_2m_max[i]),
        tempLow: Math.round(weatherData.daily.temperature_2m_min[i]),
        precipProbability: weatherData.daily.precipitation_probability_max[i] || 0,
        precipAmount: parseFloat((weatherData.daily.precipitation_sum[i] || 0).toFixed(2)),
        humidity: Math.round(weatherData.daily.relative_humidity_2m_mean[i] || 50),
        weatherCode: weatherData.daily.weather_code[i],
        weatherDescription: wmoCodeToDescription(weatherData.daily.weather_code[i])
      });
    }

    // Cache the results
    this.cache = {
      forecast,
      cachedAt: now,
      location: {
        zipCode,
        latitude,
        longitude
      }
    };

    console.log(`[WEATHER] Cached forecast for ${zipCode} (expires in 1 hour)`);

    return {
      forecast,
      location: this.cache.location,
      cachedAt: new Date(now).toISOString(),
      cacheExpiresAt: new Date(now + this.CACHE_DURATION_MS).toISOString()
    };
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache = null;
    console.log('[WEATHER] Cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { isCached: boolean; cachedAt?: string; expiresAt?: string; location?: string } {
    if (!this.cache) {
      return { isCached: false };
    }

    const now = Date.now();
    const isValid = (now - this.cache.cachedAt) < this.CACHE_DURATION_MS;

    return {
      isCached: isValid,
      cachedAt: new Date(this.cache.cachedAt).toISOString(),
      expiresAt: new Date(this.cache.cachedAt + this.CACHE_DURATION_MS).toISOString(),
      location: this.cache.location.zipCode
    };
  }
}

export const serverWeatherService = new ServerWeatherService();
export type { ForecastDay, WeatherForecastResponse };
