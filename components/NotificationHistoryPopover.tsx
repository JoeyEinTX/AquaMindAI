
import React from 'react';
import { Notification } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { InfoIcon } from './icons/StatusIcons';
import { CheckIcon } from './icons/CheckIcon';
import { TrashIcon } from './icons/TrashIcon';

interface NotificationHistoryPopoverProps {
    isOpen: boolean;
    history: Notification[];
    onClear: () => void;
}

const icons: { [key in Notification['type']]: React.ReactNode } = {
    info: <InfoIcon className="w-5 h-5 text-blue-400" />,
    success: <CheckIcon className="w-5 h-5 text-green-400" />,
    ai: <SparklesIcon className="w-5 h-5 text-purple-400" />,
};

const TimeAgo: React.FC<{ date: string }> = ({ date }) => {
    const formatTimeAgo = (d: string) => {
        const now = new Date();
        const past = new Date(d);
        const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return `${Math.floor(interval)}y ago`;
        interval = seconds / 2592000;
        if (interval > 1) return `${Math.floor(interval)}mo ago`;
        interval = seconds / 86400;
        if (interval > 1) return `${Math.floor(interval)}d ago`;
        interval = seconds / 3600;
        if (interval > 1) return `${Math.floor(interval)}h ago`;
        interval = seconds / 60;
        if (interval > 1) return `${Math.floor(interval)}m ago`;
        return `${Math.floor(seconds)}s ago`;
    };

    return <span className="text-xs text-slate-500 flex-shrink-0">{formatTimeAgo(date)}</span>;
};

const NotificationHistoryPopover: React.FC<NotificationHistoryPopoverProps> = ({ isOpen, history, onClear }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="absolute top-full right-0 mt-2 w-80 bg-slate-800/90 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl z-50 transform transition-all origin-top-right animate-fade-in-down"
            style={{ animationDuration: '0.2s' }}
        >
            <div className="flex justify-between items-center p-3 border-b border-slate-700">
                <h3 className="font-bold text-base text-slate-100">Notifications</h3>
                {history.length > 0 && (
                    <button 
                        onClick={onClear} 
                        className="text-xs text-slate-400 hover:text-white hover:underline"
                    >
                        Clear All
                    </button>
                )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
                {history.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-12">No notifications yet.</p>
                ) : (
                    <ul className="divide-y divide-slate-700">
                        {history.map(item => (
                            <li key={item.id} className="p-3 flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-0.5">{icons[item.type]}</div>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-200">{item.message}</p>
                                    {item.archivedAt && <TimeAgo date={item.archivedAt} />}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
             <style>{`
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-down { animation: fade-in-down ease-out; }
            `}</style>
        </div>
    );
};

export default NotificationHistoryPopover;
