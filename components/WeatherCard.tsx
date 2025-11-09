import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';
import { SunIcon, CloudIcon, RainIcon, MoonIcon } from './icons/WeatherIcons';
import { ThermometerIcon, DropletIcon, WindIcon } from './icons/MetricIcons';
import { AlertTriangleIcon } from './icons/StatusIcons';
import { EditIcon } from './icons/EditIcon';
import { GlassyCard } from './ui/GlassyCard';

interface WeatherCardProps {
    weather: WeatherData | null;
    zipCode: string;
    locationError: string | null;
    onEditLocation: () => void;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ weather, zipCode, locationError, onEditLocation }) => {
    const [prevTemp, setPrevTemp] = useState<number | null>(null);
    const [showCountUp, setShowCountUp] = useState(false);

    useEffect(() => {
        if (weather?.current.temp && prevTemp !== weather.current.temp) {
            if (prevTemp !== null) {
                setShowCountUp(true);
                setTimeout(() => setShowCountUp(false), 500);
            }
            setPrevTemp(weather.current.temp);
        }
    }, [weather?.current.temp]);

    if (locationError) {
        return (
            <GlassyCard className="border-yellow-500/50">
                <div className="flex items-start gap-4">
                    <AlertTriangleIcon className="w-10 h-10 flex-shrink-0 text-yellow-500" />
                    <div className="flex-1">
                        <h2 className="text-lg font-bold mb-2 text-yellow-500">Location Error</h2>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{locationError}</p>
                        <button
                            onClick={onEditLocation}
                            className="glass-button w-full py-2 px-4 rounded-lg font-semibold"
                        >
                            Set Location
                        </button>
                    </div>
                </div>
            </GlassyCard>
        );
    }

    if (!weather) {
        return (
            <GlassyCard className="animate-pulse">
                <div className="h-5 bg-white/20 rounded w-3/4 mb-4"></div>
                <div className="h-10 bg-white/20 rounded w-1/2 mb-6"></div>
                <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                    Getting weather for zip code {zipCode}...
                </p>
            </GlassyCard>
        );
    }

    const getWeatherIcon = (description: string, isDay: boolean) => {
        const desc = description.toLowerCase();
        if (desc.includes('rain') || desc.includes('shower') || desc.includes('drizzle') || desc.includes('thunderstorm') || desc.includes('snow') || desc.includes('hail')) {
            return <RainIcon className="w-16 h-16 text-blue-400 transition-all duration-300" />;
        }
        if (desc.includes('cloud') || desc.includes('overcast') || desc.includes('fog')) {
            return <CloudIcon className="w-16 h-16 text-slate-400 transition-all duration-300" />;
        }
        
        if (isDay) {
            return <SunIcon className="w-16 h-16 text-yellow-400 transition-all duration-300" />;
        } else {
            return <MoonIcon className="w-16 h-16 text-slate-300 transition-all duration-300" />;
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
        <GlassyCard>
            {/* Header with location */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--accent-color)' }}>
                        Weather Analysis
                    </h2>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Location: <span className="font-semibold">{zipCode}</span>
                    </p>
                </div>
                <button 
                    onClick={onEditLocation} 
                    className="p-2 rounded-full hover:bg-white/10 transition-all duration-200"
                    title="Change Location"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <EditIcon className="w-5 h-5"/>
                </button>
            </div>

            {/* Main temperature display */}
            <div className="flex items-center justify-between mb-6 relative">
                <div>
                    <p 
                        className={`text-5xl font-bold ${showCountUp ? 'animate-count-up' : ''}`}
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {weather.current.temp}°F
                    </p>
                    <p className="text-lg mt-1 transition-all duration-300" style={{ color: 'var(--text-muted)' }}>
                        {weather.current.description}
                    </p>
                </div>
                <div className="relative">
                    {getWeatherIcon(weather.current.description, weather.current.isDay)}
                    <div 
                        className="absolute inset-0 animate-glow -z-10"
                        style={{ backgroundColor: 'var(--accent-color)' }}
                    />
                </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-4 text-center text-sm mb-6">
                <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200">
                    <DropletIcon className="w-6 h-6 mb-2 text-blue-400"/>
                    <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                        {weather.current.humidity}%
                    </span>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Humidity
                    </span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200">
                    <div className="relative">
                        <ThermometerIcon className="w-6 h-6 mb-2 text-blue-400"/>
                        {weather.recentRainfall > 0 && (
                            <div 
                                className="absolute inset-0 animate-droplet-fill"
                                style={{ 
                                    background: 'linear-gradient(to top, rgba(59, 130, 246, 0.3) 0%, transparent 100%)',
                                    height: `${Math.min(weather.recentRainfall * 50, 100)}%`
                                }}
                            />
                        )}
                    </div>
                    <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                        {weather.recentRainfall}"
                    </span>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Rain (24h)
                    </span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200">
                    <WindIcon className="w-6 h-6 mb-2 text-slate-400"/>
                    <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                        {weather.current.windSpeed} mph
                    </span>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Wind
                    </span>
                </div>
            </div>

            {/* 3-Day Forecast */}
            <div>
                <h3 className="font-semibold mb-3 text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-1 h-5 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                    3-Day Forecast
                </h3>
                <div className="space-y-2">
                    {uiForecast.map((day, index) => (
                        <div 
                            key={index} 
                            className="flex justify-between items-center text-sm p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/5"
                            style={{ 
                                animationDelay: `${index * 100}ms`,
                                opacity: 0,
                                animation: 'count-up 0.5s ease-out forwards'
                            }}
                        >
                            <span className="font-medium w-1/3" style={{ color: 'var(--text-primary)' }}>
                                {day.day}
                            </span>
                            <span className="w-1/3 text-center font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {day.temp}°F
                            </span>
                            <div className="w-1/3 text-right flex items-center justify-end gap-2">
                                <div className="relative h-2 w-12 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="absolute inset-y-0 left-0 bg-blue-400 rounded-full transition-all duration-500"
                                        style={{ width: `${day.precipChance}%` }}
                                    />
                                </div>
                                <span className="text-blue-400 font-medium">{day.precipChance}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </GlassyCard>
    );
};

export default WeatherCard;
