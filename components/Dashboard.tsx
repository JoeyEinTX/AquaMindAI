
import React from 'react';
import { WeatherData, SprinklerZone, WateringPreference, WateringSchedule, SystemStatus, DailySchedule } from '../types';
import WeatherCard from './WeatherCard';
import SystemStatusCard from './SystemStatusCard';
import ZoneControlCard from './ZoneControlCard';
import AquaMindHubCard from './AquaMindHubCard';
import ScheduleForecastCard from './ScheduleForecastCard';
import WaterUsageCard from './WaterUsageCard';

interface DashboardProps {
  isLoading: boolean;
  isProactivelyChecking: boolean;
  weather: WeatherData | null;
  zones: SprinklerZone[];
  preference: WateringPreference;
  setPreference: (p: WateringPreference) => void;
  schedule: WateringSchedule | null;
  systemStatus: SystemStatus;
  onGenerateSchedule: () => void;
  onOpenManualWateringModal: (zoneId: number) => void;
  onToggleSystem: () => void;
  isScheduleImplemented: boolean;
  onImplementSchedule: () => void;
  zipCode: string;
  locationError: string | null;
  onEditLocation: () => void;
  onOpenManageZonesModal: () => void;
  onProactiveCheck: () => void;
  onOpenChatModal: () => void;
  onDayClick: (daySchedule: DailySchedule) => void;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
  return (
    <div className="flex flex-col gap-6">
      <ScheduleForecastCard 
        schedule={props.schedule} 
        isScheduleImplemented={props.isScheduleImplemented}
        systemStatus={props.systemStatus}
        zipCode={props.zipCode}
      />
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <WeatherCard 
            weather={props.weather} 
            zipCode={props.zipCode}
            locationError={props.locationError} 
            onEditLocation={props.onEditLocation} 
          />
          <SystemStatusCard 
            status={props.systemStatus} 
            onToggleSystem={props.onToggleSystem}
            schedule={props.schedule}
            isScheduleImplemented={props.isScheduleImplemented}
          />
          <WaterUsageCard schedule={props.schedule} />
        </div>

        {/* Center Column */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <AquaMindHubCard
              schedule={props.schedule}
              isScheduleImplemented={props.isScheduleImplemented}
              onImplementSchedule={props.onImplementSchedule}
              systemStatus={props.systemStatus}
              isProactivelyChecking={props.isProactivelyChecking}
              onProactiveCheck={props.onProactiveCheck}
              isLoading={props.isLoading}
              preference={props.preference}
              setPreference={props.setPreference}
              onGenerateSchedule={props.onGenerateSchedule}
              onOpenChatModal={props.onOpenChatModal}
              zipCode={props.zipCode}
              onDayClick={props.onDayClick}
          />
        </div>

        {/* Right Column */}
        <div className="xl:col-span-1 flex flex-col gap-6">
            <ZoneControlCard 
                zones={props.zones} 
                onOpenManualWateringModal={props.onOpenManualWateringModal}
                onOpenManageZonesModal={props.onOpenManageZonesModal}
            />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;