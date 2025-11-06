import { WeatherData } from '../types';

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
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
};

const wmoCodeToDescription = (code: number): string => {
    return WMO_CODE_MAP[code] || 'Unknown weather';
};

const getIANATimezoneFromZip = (zip: string): string => {
    const zipPrefix = parseInt(zip.substring(0, 3), 10);
    // This is a simplified mapping and not exhaustive, but covers most of the US.
    if (zipPrefix >= 0 && zipPrefix <= 299) return 'America/New_York'; // East Coast
    if (zipPrefix >= 300 && zipPrefix <= 499) return 'America/New_York'; // East Coast, some Central
    if (zipPrefix >= 500 && zipPrefix <= 699) return 'America/Chicago'; // Central
    if (zipPrefix >= 700 && zipPrefix <= 849) return 'America/Chicago'; // Central, some Mountain
    if (zipPrefix >= 850 && zipPrefix <= 935) return 'America/Denver'; // Mountain, some Pacific
    if (zipPrefix >= 936 && zipPrefix <= 999) return 'America/Los_Angeles'; // Pacific
    return 'America/Chicago'; // Default to Central
};


export const getWeather = async (location: { zipCode: string }): Promise<WeatherData> => {
    // Step 1: Geocode zip code to latitude and longitude
    const geoResponse = await fetch(`https://api.zippopotam.us/us/${location.zipCode}`);
    if (!geoResponse.ok) {
        if (geoResponse.status === 404) {
            throw new Error(`Zip code ${location.zipCode} not found.`);
        }
        throw new Error('Failed to geocode zip code.');
    }
    const geoData = await geoResponse.json();
    const latitude = parseFloat(geoData.places[0].latitude);
    const longitude = parseFloat(geoData.places[0].longitude);
    const timezone = getIANATimezoneFromZip(location.zipCode);

    // Step 2: Fetch weather data from Open-Meteo
    const weatherParams = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day',
        daily: 'weather_code,temperature_2m_max,precipitation_sum,precipitation_probability_max',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        precipitation_unit: 'inch',
        timezone: timezone,
        forecast_days: '7',
        past_days: '1', // To get recent rainfall
    });

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?${weatherParams.toString()}`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
        throw new Error('Failed to fetch weather data from the source.');
    }
    const weatherData = await weatherResponse.json();

    // Step 3: Map the API response to our WeatherData type
    const mappedData: WeatherData = {
        current: {
            temp: Math.round(weatherData.current.temperature_2m),
            description: wmoCodeToDescription(weatherData.current.weather_code),
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: Math.round(weatherData.current.wind_speed_10m),
            isDay: weatherData.current.is_day === 1,
        },
        // Use yesterday's precipitation sum as "recent rainfall"
        recentRainfall: weatherData.daily.precipitation_sum[0] > 0 ? parseFloat(weatherData.daily.precipitation_sum[0].toFixed(2)) : 0,
        forecast: [],
    };

    // The daily arrays start with yesterday (past_days=1), so we skip the first entry (index 0) for the forecast
    for (let i = 1; i < weatherData.daily.time.length; i++) {
        mappedData.forecast.push({
            day: weatherData.daily.time[i],
            temp: Math.round(weatherData.daily.temperature_2m_max[i]),
            precipChance: weatherData.daily.precipitation_probability_max[i],
            precipAmount: parseFloat(weatherData.daily.precipitation_sum[i].toFixed(2)),
        });
    }

    return mappedData;
};