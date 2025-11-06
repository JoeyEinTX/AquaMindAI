import React, { useState, useEffect } from 'react';
import { TimerIcon } from './icons/TimerIcon';

interface ManualWateringModalProps {
    isOpen: boolean;
    zoneName: string;
    onClose: () => void;
    onStart: (durationMinutes: number) => void;
}

const ManualWateringModal: React.FC<ManualWateringModalProps> = ({ isOpen, zoneName, onClose, onStart }) => {
    const [isCustom, setIsCustom] = useState(false);
    const [customDuration, setCustomDuration] = useState(60);

    useEffect(() => {
        // Reset state when modal is closed or reopened
        if (isOpen) {
            setIsCustom(false);
            setCustomDuration(60);
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const durations = [10, 20, 30];

    const handleCustomStart = () => {
        const duration = Math.max(1, Math.min(240, customDuration)); // Clamp value
        onStart(duration);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only close if the click is directly on the backdrop itself (e.target)
        // and not on a child element that has bubbled up.
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-11/12 max-w-sm mx-auto border border-gray-200 dark:border-gray-700"
            >
                <div className="flex items-center mb-2">
                    <TimerIcon className="w-6 h-6 mr-3 text-blue-500" />
                    <h2 className="text-2xl font-bold text-blue-500 dark:text-blue-400">Manual Watering</h2>
                </div>
                 <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Set duration for <span className="font-bold">{zoneName}</span>.
                </p>

                {!isCustom ? (
                    <div className="flex flex-col space-y-3 mb-8">
                        {durations.map(duration => (
                            <button
                                key={duration}
                                onClick={() => onStart(duration)}
                                className="w-full text-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/80 font-semibold py-3 px-4 rounded-lg transition"
                            >
                                {duration} minutes
                            </button>
                        ))}
                         <button
                            onClick={() => setIsCustom(true)}
                            className="w-full text-lg bg-gray-200 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700/90 font-semibold py-3 px-4 rounded-lg transition"
                        >
                            Custom Time
                        </button>
                    </div>
                ) : (
                    <div className="mb-8">
                        <div className="flex items-center space-x-4">
                            <input 
                                type="number"
                                value={customDuration}
                                onChange={(e) => setCustomDuration(Number(e.target.value))}
                                min="1"
                                max="240"
                                className="w-full text-center text-xl font-bold bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                autoFocus
                            />
                            <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">minutes</span>
                        </div>
                        <p className="text-xs text-center text-gray-500 mt-2">(1-240 minutes)</p>
                        <div className="mt-4 flex space-x-2">
                            <button 
                                onClick={() => setIsCustom(false)}
                                className="w-1/2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 font-bold py-2 px-4 rounded-lg transition"
                            >Back</button>
                            <button 
                                onClick={handleCustomStart}
                                className="w-1/2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
                            >Start</button>
                        </div>
                    </div>
                )}


                {!isCustom && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 font-bold py-2 px-4 rounded-lg transition"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManualWateringModal;