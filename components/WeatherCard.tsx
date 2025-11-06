
import React from 'react';
import { WeatherData } from '../types';
import { SunIcon, CloudIcon, RainIcon, MoonIcon } from './icons/WeatherIcons';
import { ThermometerIcon, DropletIcon, WindIcon } from './icons/MetricIcons';
import { AlertTriangleIcon } from './icons/StatusIcons';
import { EditIcon } from './icons/EditIcon';

interface WeatherCardProps {
    weather: WeatherData | null;
    zipCode: string;
    locationError: string | null;
    onEditLocation: () => void;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ weather, zipCode, locationError, onEditLocation }) => {

    if (locationError) {
        return (
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-2xl shadow-lg border border-yellow-500/50 dark:border-yellow-400/50">
                <h2 className="text-lg font-bold mb-4 text-yellow-500 dark:text-yellow-400">Location Error</h2>
                <div className="flex items-center text-yellow-600 dark:text-yellow-300">
                    <AlertTriangleIcon className="w-10 h-10 mr-4 flex-shrink-0" />
                    <p className="text-sm">{locationError}</p>
                </div>
                <button
                    onClick={onEditLocation}
                    className="w-full mt-4 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-700 dark:text-yellow-200 font-semibold py-2 px-4 rounded-lg transition"
                >
                    Set Location
                </button>
            </div>
        );
    }

    if (!weather) {
        return (
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-2xl shadow-lg animate-pulse">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-6"></div>
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">Getting weather for zip code {zipCode}...</p>
            </div>
        );
    }

    const getWeatherIcon = (description: string, isDay: boolean) => {
        const desc = description.toLowerCase();
        if (desc.includes('rain') || desc.includes('shower') || desc.includes('drizzle') || desc.includes('thunderstorm') || desc.includes('snow') || desc.includes('hail')) {
            return <RainIcon className="w-16 h-16 text-blue-400" />;
        }
        if (desc.includes('cloud') || desc.includes('overcast') || desc.includes('fog')) {
            return <CloudIcon className="w-16 h-16 text-slate-400" />;
        }
        
        // At this point, it's likely clear or mostly clear.
        if (isDay) {
            return <SunIcon className="w-16 h-16 text-yellow-400" />;
        } else {
            return <MoonIcon className="w-16 h-16 text-slate-300" />;
        }
    };

    const uiForecast = weather?.forecast.slice(0, 3).map((day) => {
        const dayDate = new Date(`${day.day}T12:00:00`);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        if (dayDate.toDateString() === today.toDateString()) return { ...day, day: 'Today' };
        if (dayDate.toDateString() === tomorrow.toDateString()) return { ...day, day: 'Tomorrow' };
        
        return { ...day, day: dayDate.toLocaleDateString('en-US', { weekday: 'short' }) };
    }) || [];

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-2xl shadow-lg border border-white/20 dark:border-slate-700">
            <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold text-blue-500 dark:text-blue-400">Weather Analysis</h2>
                <button onClick={onEditLocation} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition" title="Change Location">
                    <EditIcon className="w-5 h-5"/>
                </button>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Location: <span className="font-semibold">{zipCode}</span></p>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-5xl font-bold">{weather.current.temp}°F</p>
                    <p className="text-slate-500 dark:text-slate-400">{weather.current.description}</p>
                </div>
                {getWeatherIcon(weather.current.description, weather.current.isDay)}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-sm mb-6">
                <div className="flex flex-col items-center">
                    <DropletIcon className="w-6 h-6 mb-1 text-blue-500"/>
                    <span className="font-semibold">{weather.current.humidity}%</span>
                    <span className="text-xs text-slate-500">Humidity</span>
                </div>
                <div className="flex flex-col items-center">
                    <ThermometerIcon className="w-6 h-6 mb-1 text-red-500"/>
                    <span className="font-semibold">{weather.recentRainfall}"</span>
                    <span className="text-xs text-slate-500">Rain (24h)</span>
                </div>
                <div className="flex flex-col items-center">
                    <WindIcon className="w-6 h-6 mb-1 text-slate-500"/>
                    <span className="font-semibold">{weather.current.windSpeed} mph</span>
                    <span className="text-xs text-slate-500">Wind</span>
                </div>
            </div>

            <div>
                <h3 className="font-semibold mb-2 text-base">3-Day Forecast</h3>
                <div className="space-y-2">
                    {uiForecast.map((day, index) => (
                        <div key={index} className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                            <span className="font-medium w-1/3">{day.day}</span>
                            <span className="text-slate-600 dark:text-slate-300 w-1/3 text-center">{day.temp}°F</span>
                            <span className="text-blue-500 dark:text-blue-400 w-1/3 text-right">{day.precipChance}% Rain</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WeatherCard;