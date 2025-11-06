
import React, { useState, useEffect } from 'react';
import { Notification as NotificationType } from '../types';
import { InfoIcon } from './icons/StatusIcons';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface NotificationProps {
    notification: NotificationType;
    onDismiss: (id: number) => void;
}

const NOTIFICATION_DURATION = 10000; // 10 seconds

const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Only set a timeout if there are no primary actions
        if (!notification.actions?.some(a => a.style === 'primary')) {
            const timer = setTimeout(() => {
                handleClose();
            }, NOTIFICATION_DURATION);

            return () => clearTimeout(timer);
        }
    }, [notification.actions]);
    
    const handleAnimationEnd = () => {
        if (isExiting) {
            onDismiss(notification.id);
        }
    };

    const handleClose = () => {
        setIsExiting(true);
    };

    const handleActionClick = (e: React.MouseEvent, action: NonNullable<NotificationType['actions']>[0]) => {
        e.stopPropagation();
        action.onClick();
        handleClose();
    };

    const icons: { [key in NotificationType['type']]: React.ReactNode } = {
        info: <InfoIcon className="w-6 h-6 text-blue-400" />,
        success: <CheckIcon className="w-6 h-6 text-green-400" />,
        ai: <SparklesIcon className="w-6 h-6 text-purple-400" />,
    };
    
    const animationClasses = isExiting 
        ? 'animate-fade-out-right'
        : 'animate-fade-in-right';

    return (
        <div
            className={`flex items-start w-full max-w-sm p-4 rounded-xl shadow-2xl border transition-all duration-300 transform ${animationClasses} bg-slate-800/80 backdrop-blur-lg border-slate-700`}
            onAnimationEnd={handleAnimationEnd}
            role="alert"
            style={{
                animationFillMode: 'forwards'
            }}
        >
            <div className="flex-shrink-0">
                {icons[notification.type]}
            </div>
            <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">{notification.message}</p>
                 {notification.actions && notification.actions.length > 0 && (
                    <div className="mt-3 flex space-x-2">
                        {notification.actions.map((action, index) => {
                             const buttonClass = action.style === 'primary' 
                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                : "bg-slate-600 hover:bg-slate-500 text-slate-100";
                            return (
                                <button
                                    key={index}
                                    onClick={(e) => handleActionClick(e, action)}
                                    className={`text-sm font-semibold py-1 px-3 rounded-md transition-colors ${buttonClass}`}
                                >
                                    {action.text}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClose();
                    }}
                    className="inline-flex p-1.5 text-slate-400 rounded-md hover:text-slate-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500"
                    aria-label="Dismiss"
                >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
             <style>{`
                @keyframes fade-in-right {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fade-out-right {
                    from { opacity: 1; transform: translateX(0); }
                    to { opacity: 0; transform: translateX(100%); }
                }
                .animate-fade-in-right { animation: fade-in-right 0.5s ease-out forwards; }
                .animate-fade-out-right { animation: fade-out-right 0.5s ease-in forwards; }
            `}</style>
        </div>
    );
};

export default Notification;
