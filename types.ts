
export interface WeatherData {
  current: {
    temp: number;
    description: string;
    humidity: number;
    windSpeed: number;
    isDay: boolean;
  };
  forecast: {
    day: string;
    temp: number;
    precipChance: number;
    precipAmount: number; // in inches
  }[];
  recentRainfall: number; // in inches (last 24h)
}

export type PlantType = 'Grass' | 'Flowers' | 'Vegetables' | 'Shrubs' | 'Trees' | 'Foundation';
export type SprinklerType = 'Spray' | 'Rotor' | 'Drip';
export type SunExposure = 'Full Sun' | 'Partial Shade' | 'Full Shade';
export type WaterRequirement = 'Low' | 'Standard' | 'High';

export interface SprinklerZone {
  id: number;
  name: string;
  enabled: boolean;
  isWatering: boolean;
  manualWateringEndTime?: number; // Unix timestamp
  // New detailed properties for smarter scheduling
  relay: number;
  plantType: PlantType;
  sprinklerType: SprinklerType;
  sunExposure: SunExposure;
  waterRequirement: WaterRequirement;
  // New properties for accurate water usage
  headDetails?: { // For Spray/Rotor
    arc90?: number;
    arc180?: number;
    arc270?: number;
    arc360?: number;
  };
  flowRateGPH?: number; // For Drip lines (Gallons Per Hour)
}

export type WateringPreference = 'Conserve' | 'Standard' | 'Lush';

export interface ScheduleAdjustment {
  by: 'User' | 'AI';
  user: string; // 'AquaMind AI' or the username
  timestamp: string; // ISO 8601 timestamp
}

export interface ScheduleEvent {
  zoneId: number;
  zoneName: string;
  startTime: string; // e.g., "05:00"
  duration: number; // in minutes
  waterUsage?: number; // in gallons
  isCanceled?: boolean;
  adjustment?: ScheduleAdjustment;
}

export interface DailySchedule {
  day: string; // "YYYY-MM-DD"
  events: ScheduleEvent[];
}

export interface WateringSchedule {
  reasoning: string;
  schedule: DailySchedule[];
}

export type SystemStatus = 'Idle' | 'Watering' | 'Scheduled' | 'Optimizing' | 'Rain Delay' | 'Error' | 'AI Schedule Active' | 'Disabled' | string;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type NotificationType = 'info' | 'success' | 'ai';

export interface NotificationAction {
  text: string;
  onClick: () => void;
  style?: 'primary' | 'secondary';
}

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  actions?: NotificationAction[];
  archivedAt?: string;
}

export interface FollowUpAction {
    question: string;
    compensatedSchedule: WateringSchedule;
}

export interface ProactiveSuggestionResponse {
  isAdjustmentNeeded: boolean;
  notificationMessage: string | null;
  newSchedule: WateringSchedule | null;
}

export interface User {
  username: string;
  pin: string;
}