import React, { useEffect, useState } from 'react';
import { SystemStatus, WateringSchedule } from '../types';
import { InfoIcon, ClockIcon, ZapIcon, AlertTriangleIcon } from './icons/StatusIcons';
import { CheckIcon } from './icons/CheckIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useSystemHealth } from '../api';
import { GlassyCard } from './ui/GlassyCard';

interface AdvisoryInsight {
    type: 'info' | 'warning' | 'recommendation' | 'savings';
    icon: string;
    message: string;
    priority: number;
    actionable?: boolean;
}

interface AdvisoryReport {
    insights: AdvisoryInsight[];
    summary: string;
    generatedAt: string;
}

interface SystemStatusCardProps {
    status: SystemStatus;
    onToggleSystem: () => void;
    schedule: WateringSchedule | null;
    isScheduleImplemented: boolean;
}

function formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}


const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ status, onToggleSystem, schedule, isScheduleImplemented }) => {
    const { health } = useSystemHealth();
    const [advisory, setAdvisory] = useState<AdvisoryReport | null>(null);
    const [isLoadingAdvisory, setIsLoadingAdvisory] = useState(false);

    // Fetch advisory insights
    useEffect(() => {
        const fetchAdvisory = async () => {
            // Get zip code from localStorage or use default
            const zipCode = localStorage.getItem('zipCode') || process.env.DEFAULT_ZIP_CODE;
            if (!zipCode || !/^\d{5}$/.test(zipCode)) {
                return;
            }

            setIsLoadingAdvisory(true);
            try {
                const response = await fetch(`/advisory/report?zipCode=${zipCode}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.report) {
                        setAdvisory(data.report);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch advisory insights:', error);
            } finally {
                setIsLoadingAdvisory(false);
            }
        };

        // Fetch on mount
        fetchAdvisory();

        // Refresh every 30 minutes
        const interval = setInterval(fetchAdvisory, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);
    
    const getStatusInfo = (): { icon: React.ReactElement; color: string; text: string; accentColor: string } => {
        if (schedule && !isScheduleImplemented) {
            return { 
                icon: <ClockIcon className="w-8 h-8" />, 
                color: 'text-purple-400', 
                text: 'Ready',
                accentColor: '#a78bfa'
            };
        }

        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('watering')) {
            return { 
                icon: <ZapIcon className="w-8 h-8" />, 
                color: 'text-blue-400', 
                text: status,
                accentColor: '#60a5fa'
            };
        }
        if (lowerStatus.includes('scheduled') || lowerStatus.includes('optimizing') || lowerStatus.includes('ai schedule active')) {
            return { 
                icon: <ClockIcon className="w-8 h-8" />, 
                color: 'text-purple-400', 
                text: status,
                accentColor: '#a78bfa'
            };
        }
        if (lowerStatus.includes('disabled')) {
            return { 
                icon: <AlertTriangleIcon className="w-8 h-8" />, 
                color: 'text-yellow-400', 
                text: 'System Disabled',
                accentColor: '#fbbf24'
            };
        }
        if (lowerStatus.includes('error')) {
            return { 
                icon: <AlertTriangleIcon className="w-8 h-8" />, 
                color: 'text-red-400', 
                text: 'Error State',
                accentColor: '#f87171'
            };
        }
        return { 
            icon: <InfoIcon className="w-8 h-8" />, 
            color: 'text-slate-400', 
            text: 'Idle',
            accentColor: '#94a3b8'
        };
    };

    const { icon, color, text, accentColor } = getStatusInfo();
    const isSystemDisabled = status === 'Disabled';

    return (
        <GlassyCard accent={accentColor}>
            {/* Status Display */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--accent-color)' }}>
                    System Status
                </h2>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className={`${color} relative`}>
                        {icon}
                        <div 
                            className="absolute inset-0 animate-glow -z-10"
                            style={{ backgroundColor: accentColor }}
                        />
                    </div>
                    <div className="flex-1">
                        <p className={`text-2xl font-bold ${color}`}>{text}</p>
                    </div>
                </div>
            </div>

            {/* Manual Override */}
            <div className="mb-6">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-1 h-4 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                    Manual Override
                </h3>
                <button 
                    onClick={onToggleSystem} 
                    className={`glass-button w-full font-bold py-3 px-4 rounded-xl transition-all duration-200 ${
                        isSystemDisabled
                            ? 'glass-button-primary'
                            : ''
                    }`}
                    style={{
                        backgroundColor: isSystemDisabled ? '#10b981' : 'var(--glass-bg)',
                        borderColor: isSystemDisabled ? '#10b981' : 'rgba(251, 191, 36, 0.5)',
                    }}
                >
                    {isSystemDisabled ? '✓ Enable System' : '⏸ Disable System'}
                </button>
            </div>

            {/* AI Suggestions Section */}
            {advisory && advisory.insights.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-color)' }}>
                        💡 AI Suggestions
                    </h3>
                    <div className="space-y-2">
                        {advisory.insights.slice(0, 2).map((insight, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg text-xs transition-all duration-200 hover:scale-[1.02] ${
                                    insight.type === 'warning' || insight.type === 'recommendation'
                                        ? 'bg-amber-400/10 border border-amber-400/20'
                                        : insight.type === 'savings'
                                        ? 'bg-green-400/10 border border-green-400/20'
                                        : 'bg-blue-400/10 border border-blue-400/20'
                                }`}
                                style={{
                                    color: insight.type === 'warning' || insight.type === 'recommendation'
                                        ? '#fbbf24'
                                        : insight.type === 'savings'
                                        ? '#10b981'
                                        : '#60a5fa'
                                }}
                            >
                                <span className="mr-2">{insight.icon}</span>
                                <span>{insight.message}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {advisory.summary}
                    </p>
                </div>
            )}

            {/* System Health Diagnostics */}
            {health && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span className="w-1 h-4 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                        System Health
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200">
                            <span className="block mb-1" style={{ color: 'var(--text-muted)' }}>Uptime</span>
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                {formatUptime(health.uptimeSec)}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200">
                            <span className="block mb-1" style={{ color: 'var(--text-muted)' }}>Memory</span>
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                {health.memoryMB} MB
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200">
                            <span className="block mb-1" style={{ color: 'var(--text-muted)' }}>CPU</span>
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                {health.cpuPercent}%
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200">
                            <span className="block mb-1" style={{ color: 'var(--text-muted)' }}>Clients</span>
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                {health.connectedClients}
                            </span>
                        </div>
                    </div>
                    {health.lastError && (
                        <div className="mt-3 p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-xs">
                            <span className="text-red-400 font-semibold block mb-1">Last Error:</span>
                            <p className="text-red-300 truncate leading-relaxed">{health.lastError.message}</p>
                        </div>
                    )}
                </div>
            )}
        </GlassyCard>
    );
};

export default SystemStatusCard;
