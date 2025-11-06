
import React, { useState, useEffect } from 'react';
import { SprinklerZone } from '../types';
import { PowerIcon } from './icons/PowerIcon';
import { TimerIcon } from './icons/TimerIcon';
import { SettingsIcon } from './icons/SettingsIcon';

interface ZoneControlCardProps {
    zones: SprinklerZone[];
    onOpenManualWateringModal: (zoneId: number) => void;
    onOpenManageZonesModal: () => void;
}

const Countdown: React.FC<{ endTime: number }> = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = useState(endTime - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const newTimeLeft = endTime - Date.now();
            if (newTimeLeft <= 0) {
                clearInterval(timer);
            }
            setTimeLeft(newTimeLeft);
        }, 1000);

        return () => clearInterval(timer);
    }, [endTime]);

    if (timeLeft <= 0) return null;

    const minutes = Math.floor((timeLeft / 1000) / 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    return (
        <div className="flex items-center text-xs text-blue-600 dark:text-blue-300 mt-2 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">
            <TimerIcon className="w-4 h-4 mr-1"/>
            <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        </div>
    );
};


const ZoneControlCard: React.FC<ZoneControlCardProps> = ({ zones, onOpenManualWateringModal, onOpenManageZonesModal }) => {
    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-2xl shadow-lg border border-white/20 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-blue-500 dark:text-blue-400">Zone Controls</h2>
               <button
                    onClick={onOpenManageZonesModal}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title="Manage Zones"
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex flex-col gap-3">
                {zones.map(zone => (
                    <div
                        key={zone.id}
                        className={`p-3 rounded-lg border transition-all ${zone.enabled ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50' : 'bg-slate-200 dark:bg-slate-900 opacity-60 border-slate-300 dark:border-slate-700'}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-bold text-base">{zone.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{`${zone.plantType} | ${zone.sunExposure}`}</p>
                                {zone.isWatering && zone.manualWateringEndTime && (
                                    <Countdown endTime={zone.manualWateringEndTime} />
                                )}
                            </div>
                            <button
                                disabled={!zone.enabled}
                                onClick={() => onOpenManualWateringModal(zone.id)}
                                className={`p-2 rounded-full transition ${!zone.enabled ? 'cursor-not-allowed' : ''} ${
                                    zone.isWatering
                                        ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300'
                                        : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
                                }`}
                                title={zone.isWatering ? 'Stop Manual Watering' : 'Start Manual Watering'}
                            >
                                <PowerIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                ))}
                 {zones.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        No zones configured. Click the settings icon above to add one.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ZoneControlCard;