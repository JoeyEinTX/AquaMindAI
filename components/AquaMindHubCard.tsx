

import React, { useState, useEffect, useRef } from 'react';
import { WateringSchedule, SystemStatus, WateringPreference, DailySchedule, ScheduleEvent } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { LeafIcon } from './icons/LeafIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { AdjustmentInfoIcon } from './icons/AdjustmentInfoIcon';
import { ChatIcon } from './icons/ChatIcon';

interface AquaMindHubCardProps {
    schedule: WateringSchedule | null;
    isScheduleImplemented: boolean;
    onImplementSchedule: () => void;
    systemStatus: SystemStatus;
    isProactivelyChecking: boolean;
    onProactiveCheck: () => void;
    isLoading: boolean;
    preference: WateringPreference;
    setPreference: (p: WateringPreference) => void;
    onGenerateSchedule: () => void;
    onOpenChatModal: () => void;
    onDayClick: (daySchedule: DailySchedule) => void;
    zipCode: string;
}

const getIANATimezoneFromZip = (zip: string): string => {
    const zipPrefix = parseInt(zip.substring(0, 3), 10);
    // This is a simplified mapping and not exhaustive, but covers most of the US.
    if (zipPrefix >= 0 && zipPrefix <= 299) return 'America/New_York'; // East Coast
    if (zipPrefix >= 300 && zipPrefix <= 499) return 'America/New_York'; // East Coast, some Central
    if (zipPrefix >= 500 && zipPrefix <= 699) return 'America/Chicago'; // Central
    if (zipPrefix >= 700 && zipPrefix <= 849) return 'America/Chicago'; // Central, some Mountain
    if (zipPrefix >= 850 && zipPrefix <= 935) return 'America/Denver'; // Mountain, some Pacific
    if (zipPrefix >= 936 && zipPrefix <= 999) return 'America/Los_Angeles'; // Pacific
    return 'America/Chicago'; // Default to Central
};

const getCurrentUserDateTime = (timezone: string): { dateStr: string, timeStr: string } => {
    // The 'sv-SE' locale is used because it formats the date as YYYY-MM-DD,
    // which is what the AI expects and is less ambiguous than other formats.
    const userLocaleNow = new Date().toLocaleString('sv-SE', { timeZone: timezone });
    const [dateStr, timeStr] = userLocaleNow.split(' ');
    return {
        dateStr, // "YYYY-MM-DD"
        timeStr: timeStr.substring(0, 5), // "HH:MM"
    };
};

const formatDate = (dateString: string) => {
    // Add time component to avoid timezone issues where the date might be interpreted as the previous day
    const scheduleDate = new Date(`${dateString}T00:00:00`);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    // Compare date parts only
    if (scheduleDate.toDateString() === today.toDateString()) {
        return 'Today';
    }
    if (scheduleDate.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    }
    return scheduleDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
};


const AquaMindHubCard: React.FC<AquaMindHubCardProps> = (props) => {
  const { 
    schedule, isScheduleImplemented, onImplementSchedule, 
    systemStatus, isProactivelyChecking, onProactiveCheck,
    isLoading, preference, setPreference, onGenerateSchedule,
    onOpenChatModal, onDayClick, zipCode
  } = props;
  
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const preferences: WateringPreference[] = ['Conserve', 'Standard', 'Lush'];
  const prevIsScheduleImplemented = useRef(isScheduleImplemented);
  const scheduleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // When a new schedule is generated, always expand the view to show it.
    if (schedule && !isScheduleImplemented) {
        setIsScheduleExpanded(true);
    }
    // When the schedule transitions from not-implemented to implemented, collapse the view.
    if (!prevIsScheduleImplemented.current && isScheduleImplemented) {
        setIsScheduleExpanded(false);
    }
    prevIsScheduleImplemented.current = isScheduleImplemented;
  }, [schedule, isScheduleImplemented]);


  // Collapse reasoning when a new schedule is generated
  useEffect(() => {
    if (schedule) {
      setIsReasoningOpen(false);
    }
  }, [schedule]);
  
    // Effect to enable seamless scrolling ("scroll chaining") for the schedule list.
    useEffect(() => {
        const scheduleElement = scheduleContainerRef.current;

        const handleWheel = (e: WheelEvent) => {
            if (!scheduleElement) return;

            const { scrollTop, scrollHeight, clientHeight } = scheduleElement;
            const deltaY = e.deltaY;
            const scrollBuffer = 1; // Buffer for floating point inaccuracies

            const canScrollUp = scrollTop > 0;
            const canScrollDown = Math.round(scrollTop + clientHeight) < scrollHeight - scrollBuffer;

            // If scrolling up and the element can scroll up, stop the event from bubbling to the window.
            // This prevents the page from scrolling while the inner list is being scrolled.
            if (deltaY < 0 && canScrollUp) {
                e.stopPropagation();
                return;
            }

            // If scrolling down and the element can scroll down, do the same.
            if (deltaY > 0 && canScrollDown) {
                e.stopPropagation();
                return;
            }

            // Otherwise, the element is at its top or bottom boundary.
            // We do nothing, allowing the event to bubble up and trigger the default page scroll.
        };

        if (scheduleElement) {
            scheduleElement.addEventListener('wheel', handleWheel);
        }

        return () => {
            if (scheduleElement) {
                scheduleElement.removeEventListener('wheel', handleWheel);
            }
        };
    }, []); // Empty dependency array ensures this runs once on mount.


  const getTooltipText = (adjustment: any) => {
    if (!adjustment) return '';
    return `Adjusted by ${adjustment.user} on ${new Date(adjustment.timestamp).toLocaleString()}`;
  };

  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-2xl shadow-lg border border-white/20 dark:border-slate-700 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
            <SparklesIcon className="w-6 h-6 mr-3 text-blue-500" />
            <h2 className="text-lg font-bold text-blue-500 dark:text-blue-400">AquaMind Intelligence</h2>
        </div>
         <div className="flex items-center space-x-2">
          {schedule && (
            <button
              onClick={onOpenChatModal}
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg transition-transform transform hover:scale-105 shadow text-sm"
            >
              <ChatIcon className="w-4 h-4" />
              <span>Ask AquaMind</span>
            </button>
          )}
          {schedule && isScheduleImplemented && (
            <button 
              onClick={onProactiveCheck} 
              disabled={isProactivelyChecking}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:cursor-not-allowed"
              title="Check for AI Adjustments"
            >
              {isProactivelyChecking ? (
                <RefreshIcon className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {!schedule ? (
        <div className="text-center py-10 flex-grow flex flex-col justify-center items-center">
            <p className="text-slate-500 dark:text-slate-400 mb-2">No schedule generated yet.</p>
            <p className="text-sm text-slate-400 mb-6">Select your watering goal and generate a smart schedule to get started.</p>
            <div className="w-full max-w-sm">
                 <div className="mb-6">
                    <h3 className="font-semibold mb-3 text-base text-slate-800 dark:text-slate-200">Watering Goal</h3>
                    <div className="flex flex-col sm:flex-row rounded-lg border border-slate-200 dark:border-slate-600">
                        {preferences.map((p, index) => (
                            <button
                                key={p}
                                onClick={() => setPreference(p)}
                                className={`flex-1 py-2 px-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-400 focus:z-10
                                ${preference === p ? 'bg-green-500 text-white' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}
                                ${index === 0 ? 'rounded-l-md' : ''}
                                ${index === preferences.length - 1 ? 'rounded-r-md' : ''}
                                ${index !== 0 ? 'border-l border-slate-200 dark:border-slate-600' : ''}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={onGenerateSchedule}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            Generate Smart Schedule
                        </>
                    )}
                </button>
            </div>
        </div>
      ) : (
        <div className="flex flex-col flex-grow">
            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                        <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-300">Watering Goal</h3>
                        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600">
                            {preferences.map((p, index) => (
                                <button
                                    key={p}
                                    onClick={() => setPreference(p)}
                                    className={`flex-1 py-2 px-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-400 focus:z-10
                                    ${preference === p ? 'bg-green-500 text-white' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}
                                    ${index === 0 ? 'rounded-l-md' : ''}
                                    ${index === preferences.length - 1 ? 'rounded-r-md' : ''}
                                    ${index !== 0 ? 'border-l border-slate-200 dark:border-slate-600' : ''}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={onGenerateSchedule}
                        disabled={isLoading}
                        className="w-full md:mt-5 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg transition shadow-md disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </>
                        ) : (
                            <>
                                <RefreshIcon className="w-5 h-5 mr-2" />
                                Regenerate Schedule
                            </>
                        )}
                    </button>
                </div>
            </div>

            {isScheduleImplemented ? (
              <div> {/* Wrapper to handle the expand/collapse visual grouping */}
                <div className={`flex justify-between items-center p-3 bg-green-100 dark:bg-green-900/50 transition-all duration-300 ${isReasoningOpen ? 'rounded-t-lg' : 'rounded-lg'}`}>
                  <button
                    onClick={() => setIsReasoningOpen(!isReasoningOpen)}
                    className="flex items-center space-x-2 text-sm font-semibold text-green-800 dark:text-green-200"
                    aria-expanded={isReasoningOpen}
                    aria-controls="reasoning-content"
                  >
                    <span>AquaMind's Reasoning</span>
                    <ChevronDownIcon 
                      className={`w-4 h-4 transition-transform duration-300 ${isReasoningOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div className="flex items-center text-sm font-semibold text-green-700 dark:text-green-200">
                    <CheckIcon className="w-4 h-4 mr-1.5" />
                    <span>AI Schedule is active.</span>
                  </div>
                </div>
                {isReasoningOpen && (
                    <div id="reasoning-content" className="p-3 bg-green-50 dark:bg-green-900/30 rounded-b-lg">
                        <p className="text-sm text-green-700 dark:text-green-300">{schedule.reasoning}</p>
                    </div>
                )}
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 rounded-md">
                <button
                    onClick={() => setIsReasoningOpen(!isReasoningOpen)}
                    className="w-full flex justify-between items-center p-3 text-left"
                    aria-expanded={isReasoningOpen}
                    aria-controls="reasoning-content"
                >
                    <p className="text-sm text-green-800 dark:text-green-200 font-semibold">AquaMind's Reasoning</p>
                    <ChevronDownIcon 
                        className={`w-5 h-5 text-green-700 dark:text-green-300 transition-transform duration-300 ${isReasoningOpen ? 'rotate-180' : ''}`}
                    />
                </button>
                {isReasoningOpen && (
                    <div id="reasoning-content" className="px-3 pb-3">
                        <p className="text-sm text-green-700 dark:text-green-300">{schedule.reasoning}</p>
                    </div>
                )}
              </div>
            )}
          
           <div ref={scheduleContainerRef} className={`schedule-container no-scrollbar ${isScheduleExpanded ? 'schedule-expanded' : 'schedule-collapsed'}`}>
            <div className="space-y-6 pr-2 pt-6">
                {schedule.schedule.map((daily) => (
                <div key={daily.day}>
                    <button 
                        className="font-bold text-base mb-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-md px-1"
                        onClick={() => onDayClick(daily)}
                        aria-label={`View details for ${formatDate(daily.day)}`}
                    >
                        {formatDate(daily.day)}
                    </button>
                    {daily.events.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 pl-4 italic">No watering needed.</p>
                    ) : (
                    <ul className="space-y-2 border-l-2 border-slate-200 dark:border-slate-700 ml-2">
                        {daily.events.map((event: ScheduleEvent) => {
                            const isSystemDisabled = systemStatus === 'Disabled';
                            const isCanceled = event.isCanceled || isSystemDisabled;
                            const isModified = !isCanceled && event.adjustment;
                            
                            const timezone = getIANATimezoneFromZip(zipCode);
                            const { dateStr: todayStr, timeStr: currentTimeStr } = getCurrentUserDateTime(timezone);
                            // An event is only completed if the schedule is implemented and the time has passed.
                            const isCompleted = isScheduleImplemented && !isCanceled && daily.day === todayStr && event.startTime < currentTimeStr;
                            
                            const finalIsInactive = isCanceled || isCompleted;
                            const applyDimming = finalIsInactive && !isModified;

                            const dotBgClass = isModified 
                                ? 'bg-orange-500' 
                                : finalIsInactive 
                                    ? (isCompleted ? 'bg-green-500' : 'bg-slate-500') 
                                    : 'bg-blue-500';

                            return (
                                <li 
                                key={`${daily.day}-${event.zoneId}-${event.startTime}`} 
                                className={`relative pl-8 transition-colors duration-300`}
                                >
                                <div className={`absolute left-[-9px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${dotBgClass}`}>
                                    {isCompleted && <CheckIcon className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                                </div>
                                <div className={`flex justify-between items-center ${applyDimming ? 'opacity-50' : ''}`}>
                                        <div>
                                            <div className="flex items-center space-x-1.5">
                                                <p className={`font-semibold ${finalIsInactive ? 'line-through' : ''} ${applyDimming ? 'text-slate-500 dark:text-slate-400' : ''}`}>
                                                    {event.zoneName}
                                                </p>
                                                {event.adjustment && (
                                                    <div title={getTooltipText(event.adjustment)}>
                                                        <AdjustmentInfoIcon className={`w-4 h-4 ${isModified ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`}/>
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-xs text-slate-500 dark:text-slate-400 ${finalIsInactive ? 'line-through' : ''}`}>
                                                <span className={isModified ? 'font-bold text-orange-600 dark:text-orange-400' : ''}>
                                                    {event.duration} minutes
                                                </span>
                                                {event.waterUsage !== undefined && (
                                                    <span className={`ml-2 ${applyDimming ? 'text-slate-500 dark:text-slate-500' : 'text-blue-500 dark:text-blue-400'}`}>
                                                    (~{event.waterUsage.toFixed(1)} gal)
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <span className={`font-mono text-base px-3 py-1 rounded-md ${finalIsInactive ? 'line-through' : ''} ${applyDimming ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-500' : 'bg-slate-100 dark:bg-slate-700'}`}>{event.startTime}</span>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                    )}
                </div>
                ))}
            </div>
          </div>
          
            <div className={`${!isScheduleImplemented ? 'mt-auto pt-6 border-t border-slate-200 dark:border-slate-700' : 'mt-4'}`}>
                {!isScheduleImplemented ? (
                    <button
                        onClick={onImplementSchedule}
                        className="w-full flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                    >
                        <CheckIcon className="w-5 h-5 mr-2" />
                        Implement Schedule
                    </button>
                ) : (
                    <div className="flex flex-col items-center">
                        <button
                            onClick={() => setIsScheduleExpanded(prev => !prev)}
                            className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-semibold py-2 px-3 rounded-lg transition text-sm"
                        >
                            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isScheduleExpanded ? 'rotate-180' : ''}`} />
                            <span>{isScheduleExpanded ? 'Collapse Schedule' : 'View Active Schedule'}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
      <style>{`
        .schedule-container {
            transition: max-height 0.5s ease-in-out, opacity 0.3s ease-in-out, transform 0.4s ease-in-out;
            transform-origin: top;
            overflow: hidden;
        }
        .schedule-collapsed {
            max-height: 0px;
            opacity: 0;
            transform: scaleY(0.95);
            pointer-events: none;
        }
        .schedule-expanded {
            max-height: 400px;
            opacity: 1;
            transform: scaleY(1);
            overflow-y: auto;
        }
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default AquaMindHubCard;