

import React from 'react';
import { DailySchedule, SprinklerZone, ScheduleEvent, SystemStatus } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';
import { AdjustmentInfoIcon } from './icons/AdjustmentInfoIcon';

interface DailyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    daySchedule: DailySchedule | null;
    zones: SprinklerZone[];
    systemStatus: SystemStatus;
}

const getTooltipText = (adjustment: any) => {
    if (!adjustment) return '';
    return `Adjusted by ${adjustment.user} on ${new Date(adjustment.timestamp).toLocaleString()}`;
};

const DailyDetailModal: React.FC<DailyDetailModalProps> = ({ isOpen, onClose, daySchedule, zones, systemStatus }) => {
    if (!isOpen || !daySchedule) return null;

    const formattedDate = new Date(`${daySchedule.day}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    
    const eventsByZoneId = new Map<number, ScheduleEvent>();
    daySchedule.events.forEach(event => {
        eventsByZoneId.set(event.zoneId, event);
    });

    const dailyTotalUsage = daySchedule.events.reduce((total, event) => {
        const isCanceled = systemStatus === 'Disabled' || event.isCanceled;
        return total + (isCanceled ? 0 : (event.waterUsage || 0));
    }, 0);

    const timeToPercentage = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        return (totalMinutes / (24 * 60)) * 100;
    };

    const durationToPercentage = (duration: number): number => {
        return (duration / (24 * 60)) * 100;
    };

    const timelineLabels = ['12AM', '3AM', '6AM', '9AM', '12PM', '3PM', '6PM', '9PM'];

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-auto border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <CalendarIcon className="w-6 h-6 mr-3 text-green-400" />
                        <h2 className="text-xl font-bold text-green-400">{formattedDate}</h2>
                    </div>
                    {dailyTotalUsage > 0 && (
                        <div className="text-right">
                            <p className="font-bold text-lg text-white">{dailyTotalUsage.toFixed(1)} gal</p>
                            <p className="text-xs text-slate-400">Total Water Usage</p>
                        </div>
                    )}
                </div>
                
                <div className="space-y-3">
                    {/* Timeline Header */}
                    <div className="flex items-center">
                        <div className="w-1/3 pr-4"></div>
                        <div className="w-2/3 relative flex justify-between text-xs text-slate-400 px-1">
                            {timelineLabels.map(label => (
                                <span key={label} className="transform -translate-x-1/2">{label}</span>
                            ))}
                        </div>
                    </div>

                    {/* Zone Timelines */}
                    {zones.map(zone => {
                        const event = eventsByZoneId.get(zone.id);
                        const isWatering = !!event;
                        const isCanceled = isWatering && (systemStatus === 'Disabled' || event.isCanceled);
                        const isModified = isWatering && !isCanceled && event.adjustment;

                        return (
                            <div key={zone.id} className="flex items-center">
                                <div className={`w-1/3 pr-4 ${(isCanceled || !isWatering) ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center space-x-2">
                                        <p className={`font-bold text-white truncate ${isCanceled ? 'line-through' : ''}`}>{zone.name}</p>
                                        {isWatering && event.adjustment && (
                                            <div title={getTooltipText(event.adjustment)}>
                                                <AdjustmentInfoIcon className={`w-4 h-4 flex-shrink-0 ${isModified ? 'text-orange-400' : 'text-slate-500'}`}/>
                                            </div>
                                        )}
                                    </div>
                                    {isWatering && (
                                        <p className={`text-sm ${isCanceled ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                            {event.startTime} (<span className={isModified ? 'font-bold text-orange-400' : ''}>{event.duration} min</span>
                                            {event.waterUsage !== undefined && `, ~${event.waterUsage.toFixed(1)} gal`})
                                        </p>
                                    )}
                                </div>
                                <div className="w-2/3 h-8 bg-slate-700/50 rounded-md relative overflow-hidden border border-slate-600/50">
                                    {/* Timeline grid lines */}
                                    {timelineLabels.slice(0, -1).map((_, index) => (
                                        <div 
                                            key={index}
                                            className="absolute h-full w-px bg-slate-600/50"
                                            style={{ left: `${((index + 1) / timelineLabels.length) * 100}%`}}
                                        ></div>
                                    ))}
                                    {isWatering && (
                                        <div 
                                            className={`absolute h-full rounded-sm ${isCanceled ? 'bg-slate-600' : isModified ? 'bg-orange-500' : 'bg-blue-500'}`}
                                            style={{
                                                left: `${timeToPercentage(event.startTime)}%`,
                                                width: `${durationToPercentage(event.duration)}%`,
                                            }}
                                            title={getTooltipText(event.adjustment) || `Watering from ${event.startTime} for ${event.duration} minutes ${isCanceled ? '(Canceled)' : ''}`}
                                        ></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end mt-8">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailyDetailModal;