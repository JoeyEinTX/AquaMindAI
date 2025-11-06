
import React, { useMemo } from 'react';
import { WateringSchedule } from '../types';
import { WaterDropIcon } from './icons/WaterDropIcon';

interface WaterUsageCardProps {
    schedule: WateringSchedule | null;
}

const WaterUsageCard: React.FC<WaterUsageCardProps> = ({ schedule }) => {

    const totalUsage = useMemo(() => {
        if (!schedule) return 0;

        return schedule.schedule.reduce((total, day) => {
            return total + day.events.reduce((dayTotal, event) => {
                return dayTotal + (event.waterUsage || 0);
            }, 0);
        }, 0);
    }, [schedule]);

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-2xl shadow-lg border border-white/20 dark:border-slate-700">
            <h2 className="text-lg font-bold mb-4 text-blue-500 dark:text-blue-400">Water Usage</h2>
            <div className="flex items-center space-x-4">
                <div className="text-blue-400 bg-blue-500/10 p-3 rounded-full">
                    <WaterDropIcon className="w-8 h-8"/>
                </div>
                <div>
                    {schedule ? (
                        <>
                            <p className="text-3xl font-bold text-slate-800 dark:text-white">
                                {totalUsage.toFixed(0)}
                                <span className="text-lg font-medium text-slate-500 dark:text-slate-400"> gal</span>
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Projected 7-day total</p>
                        </>
                    ) : (
                         <p className="text-slate-500 dark:text-slate-400">Generate a schedule to see usage.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WaterUsageCard;