
import React from 'react';
import { WateringSchedule, SystemStatus, ScheduleEvent } from '../types';
import { AdjustmentInfoIcon } from './icons/AdjustmentInfoIcon';

interface ScheduleForecastCardProps {
  schedule: WateringSchedule | null;
  isScheduleImplemented: boolean;
  systemStatus: SystemStatus;
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

const getTooltipText = (adjustment: any) => {
    if (!adjustment) return '';
    return `Adjusted by ${adjustment.user} on ${new Date(adjustment.timestamp).toLocaleString()}`;
};

const ScheduleForecastCard: React.FC<ScheduleForecastCardProps> = ({ schedule, isScheduleImplemented, systemStatus, zipCode }) => {
  const isSystemDisabled = systemStatus === 'Disabled';

  const renderContent = () => {
    if (!schedule) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">Generate a schedule to see the 4-day plan.</p>
        </div>
      );
    }

    if (!isScheduleImplemented) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">A new schedule is ready.</p>
          <p className="text-sm text-slate-400">Click "Implement Schedule" below to activate it.</p>
        </div>
      );
    }

    const timezone = getIANATimezoneFromZip(zipCode);
    const { dateStr: todayStr, timeStr: currentTimeStr } = getCurrentUserDateTime(timezone);

    const forecastDays = [];
    const [year, month, day] = todayStr.split('-').map(Number);
    // Use UTC date objects for reliable date math that isn't affected by browser timezone
    const todayInCorrectTZ = new Date(Date.UTC(year, month - 1, day));

    for (let i = 0; i < 4; i++) {
      const date = new Date(todayInCorrectTZ);
      date.setUTCDate(todayInCorrectTZ.getUTCDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const daySchedule = schedule.schedule.find(d => d.day === dateStr);

      let title;
      if (i === 0) title = 'Today';
      else if (i === 1) title = 'Tomorrow';
      else title = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      
      const dayOfMonth = date.getUTCDate();

      forecastDays.push({ title, dayOfMonth, schedule: daySchedule, date });
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 pt-2">
        {forecastDays.map(({ title, dayOfMonth, schedule: daySchedule }) => {
          const events = daySchedule?.events || [];

          return (
            <div 
              key={daySchedule?.day || title} 
              className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg flex flex-col"
            >
              <div className="text-center mb-2 flex-shrink-0">
                  <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wider">{title}</span>
                  <span className="block text-xl font-light text-slate-600 dark:text-slate-400">{dayOfMonth}</span>
              </div>
              <div className="space-y-1 flex-grow">
                  {events.length > 0 ? (
                      events.map((event: ScheduleEvent) => {
                          const isCanceled = event.isCanceled || isSystemDisabled;
                          // An event is only considered completed if the schedule is implemented and the time has passed.
                          const isCompleted = isScheduleImplemented && !isCanceled && daySchedule?.day === todayStr && event.startTime < currentTimeStr;
                          const isInactive = isCanceled || isCompleted;
                          const isModified = !isCanceled && event.adjustment;

                          let bgColor, textColor;
                          const extraClasses = isInactive ? 'line-through' : '';

                          if (isModified) {
                              bgColor = 'bg-orange-100 dark:bg-orange-900/50';
                              textColor = 'text-orange-800 dark:text-orange-200';
                          } else if (isInactive) {
                              bgColor = 'bg-slate-200 dark:bg-slate-600/50';
                              textColor = 'text-slate-500 dark:text-slate-400';
                          } else {
                              bgColor = 'bg-blue-100 dark:bg-blue-900/50';
                              textColor = 'text-blue-800 dark:text-blue-200';
                          }

                          return (
                              <div 
                                key={`${event.zoneId}-${event.startTime}`} 
                                className={`text-xs p-1.5 rounded grid grid-cols-[1fr_auto_1fr] items-center gap-1 transition-colors ${bgColor} ${textColor} ${extraClasses}`}
                              >
                                  {/* Left-justified content */}
                                  <div className="flex items-center gap-1 truncate">
                                      <p className="font-semibold truncate">{event.zoneName}</p>
                                      {isModified && (
                                          <div title={getTooltipText(event.adjustment)} className="flex-shrink-0">
                                              <AdjustmentInfoIcon className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                                          </div>
                                      )}
                                  </div>

                                  {/* Center-justified content */}
                                  <p className="text-center">{event.duration} min</p>

                                  {/* Right-justified content */}
                                  <p className="text-right font-mono">{event.startTime}</p>
                              </div>
                          );
                      })
                  ) : (
                      <div className="flex items-center justify-center h-full text-center">
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No watering</p>
                      </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-2xl shadow-lg border border-white/20 dark:border-slate-700">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2">
        <h2 className="text-lg font-bold text-blue-500 dark:text-blue-400">4-Day Schedule</h2>
      </div>
      {renderContent()}
    </div>
  );
};

export default ScheduleForecastCard;