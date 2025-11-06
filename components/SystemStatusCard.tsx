
import React from 'react';
import { SystemStatus, WateringSchedule } from '../types';
import { InfoIcon, ClockIcon, ZapIcon, AlertTriangleIcon } from './icons/StatusIcons';
import { CheckIcon } from './icons/CheckIcon';
import { TrashIcon } from './icons/TrashIcon';

interface SystemStatusCardProps {
    status: SystemStatus;
    onToggleSystem: () => void;
    schedule: WateringSchedule | null;
    isScheduleImplemented: boolean;
}


const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ status, onToggleSystem, schedule, isScheduleImplemented }) => {
    
    const getStatusInfo = (): { icon: React.ReactElement; color: string; text: string } => {
        if (schedule && !isScheduleImplemented) {
            return { icon: <ClockIcon className="w-8 h-8" />, color: 'text-purple-500', text: 'Ready' };
        }

        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('watering')) {
            return { icon: <ZapIcon className="w-8 h-8" />, color: 'text-blue-500', text: status };
        }
        if (lowerStatus.includes('scheduled') || lowerStatus.includes('optimizing') || lowerStatus.includes('ai schedule active')) {
            return { icon: <ClockIcon className="w-8 h-8" />, color: 'text-purple-500', text: status };
        }
        if (lowerStatus.includes('disabled')) {
            return { icon: <AlertTriangleIcon className="w-8 h-8" />, color: 'text-yellow-500', text: 'System Disabled' };
        }
        if (lowerStatus.includes('error')) {
            return { icon: <AlertTriangleIcon className="w-8 h-8" />, color: 'text-red-500', text: 'Error State' };
        }
        return { icon: <InfoIcon className="w-8 h-8" />, color: 'text-gray-500', text: 'Idle' };
    };

    const { icon, color, text } = getStatusInfo();
    const isSystemDisabled = status === 'Disabled';

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-2xl shadow-lg border border-white/20 dark:border-slate-700">
            <h2 className="text-lg font-bold mb-4 text-blue-500 dark:text-blue-400">System Status</h2>
            <div className="flex items-center space-x-4 mb-6">
                <div className={color}>{icon}</div>
                <div>
                    <p className={`text-xl font-semibold ${color}`}>{text}</p>
                </div>
            </div>
            <div className="text-center">
                <h3 className="font-semibold mb-2 text-base">Manual Override</h3>
                <button 
                    onClick={onToggleSystem} 
                    className={`w-full font-bold py-2.5 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-md ${
                        isSystemDisabled
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    }`}
                >
                    {isSystemDisabled ? 'Enable System' : 'Disable System'}
                </button>
            </div>
        </div>
    );
};

export default SystemStatusCard;
