import { SprinklerZone, WateringSchedule, DailySchedule, WeatherData } from '../types';

export const SHOWCASE_MODE = import.meta.env.VITE_SHOWCASE_MODE === 'true';

// Demo zones for showcase
export const getDemoZones = (): SprinklerZone[] => [
  {
    id: 1,
    name: 'Front Lawn',
    enabled: true,
    isWatering: false,
    relay: 1,
    plantType: 'Grass',
    sprinklerType: 'Spray',
    sunExposure: 'Full Sun',
    waterRequirement: 'Standard',
    headDetails: { arc180: 12, arc90: 6 }
  },
  {
    id: 2,
    name: 'Flower Garden',
    enabled: true,
    isWatering: false,
    relay: 2,
    plantType: 'Flowers',
    sprinklerType: 'Drip',
    sunExposure: 'Partial Shade',
    waterRequirement: 'Standard',
    flowRateGPH: 25
  },
  {
    id: 3,
    name: 'Vegetable Garden',
    enabled: true,
    isWatering: false,
    relay: 3,
    plantType: 'Vegetables',
    sprinklerType: 'Drip',
    sunExposure: 'Full Sun',
    waterRequirement: 'High',
    flowRateGPH: 30
  },
  {
    id: 4,
    name: 'Backyard Lawn',
    enabled: true,
    isWatering: false,
    relay: 4,
    plantType: 'Grass',
    sprinklerType: 'Rotor',
    sunExposure: 'Partial Shade',
    waterRequirement: 'Standard',
    headDetails: { arc360: 6, arc180: 4 }
  },
  {
    id: 5,
    name: 'Side Garden',
    enabled: true,
    isWatering: false,
    relay: 5,
    plantType: 'Shrubs',
    sprinklerType: 'Drip',
    sunExposure: 'Full Shade',
    waterRequirement: 'Low',
    flowRateGPH: 15
  }
];

// Demo weather data
export const getDemoWeather = (): WeatherData => ({
  current: {
    temp: 78,
    description: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 8,
    isDay: true
  },
  forecast: [
    { day: new Date(Date.now() + 86400000).toISOString().split('T')[0], temp: 82, precipChance: 20, precipAmount: 0 },
    { day: new Date(Date.now() + 172800000).toISOString().split('T')[0], temp: 85, precipChance: 10, precipAmount: 0 },
    { day: new Date(Date.now() + 259200000).toISOString().split('T')[0], temp: 80, precipChance: 40, precipAmount: 0.15 },
    { day: new Date(Date.now() + 345600000).toISOString().split('T')[0], temp: 76, precipChance: 60, precipAmount: 0.35 },
    { day: new Date(Date.now() + 432000000).toISOString().split('T')[0], temp: 79, precipChance: 15, precipAmount: 0 },
    { day: new Date(Date.now() + 518400000).toISOString().split('T')[0], temp: 83, precipChance: 5, precipAmount: 0 },
    { day: new Date(Date.now() + 604800000).toISOString().split('T')[0], temp: 81, precipChance: 25, precipAmount: 0.05 }
  ],
  recentRainfall: 0.12
});

// Demo schedule
export const getDemoSchedule = (): WateringSchedule => {
  const today = new Date();
  const getDateStr = (daysOffset: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  };

  return {
    reasoning: 'Optimized schedule based on current weather conditions, plant requirements, and water conservation goals. Recent rainfall of 0.12" has been factored in.',
    schedule: [
      {
        day: getDateStr(0),
        events: [
          { zoneId: 1, zoneName: 'Front Lawn', startTime: '05:30', duration: 20, waterUsage: 85 },
          { zoneId: 2, zoneName: 'Flower Garden', startTime: '06:00', duration: 25, waterUsage: 45 },
          { zoneId: 4, zoneName: 'Backyard Lawn', startTime: '06:30', duration: 22, waterUsage: 95 }
        ]
      },
      {
        day: getDateStr(1),
        events: [
          { zoneId: 3, zoneName: 'Vegetable Garden', startTime: '05:30', duration: 30, waterUsage: 65 },
          { zoneId: 5, zoneName: 'Side Garden', startTime: '06:15', duration: 20, waterUsage: 30 }
        ]
      },
      {
        day: getDateStr(2),
        events: [
          { zoneId: 1, zoneName: 'Front Lawn', startTime: '05:30', duration: 20, waterUsage: 85 },
          { zoneId: 4, zoneName: 'Backyard Lawn', startTime: '06:00', duration: 22, waterUsage: 95 }
        ]
      },
      {
        day: getDateStr(3),
        events: [
          { zoneId: 2, zoneName: 'Flower Garden', startTime: '05:45', duration: 15, waterUsage: 35, 
            adjustment: { by: 'AI', user: 'AquaMind AI', timestamp: new Date().toISOString() } },
          { zoneId: 3, zoneName: 'Vegetable Garden', startTime: '06:15', duration: 20, waterUsage: 50,
            adjustment: { by: 'AI', user: 'AquaMind AI', timestamp: new Date().toISOString() } }
        ]
      },
      {
        day: getDateStr(4),
        events: [
          { zoneId: 1, zoneName: 'Front Lawn', startTime: '05:30', duration: 18, waterUsage: 80 },
          { zoneId: 4, zoneName: 'Backyard Lawn', startTime: '06:00', duration: 20, waterUsage: 90 },
          { zoneId: 5, zoneName: 'Side Garden', startTime: '06:30', duration: 18, waterUsage: 28 }
        ]
      }
    ]
  };
};

// Demo AI suggestions with priority levels
export interface DemoSuggestion {
  id: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'efficiency' | 'maintenance' | 'optimization' | 'alert';
  timestamp: Date;
}

export const getDemoSuggestions = (): DemoSuggestion[] => [
  {
    id: 1,
    title: 'Rain Expected - Adjust Schedule',
    description: '60% chance of rain in 2 days (0.35"). Consider reducing watering by 30%.',
    priority: 'high',
    category: 'efficiency',
    timestamp: new Date(Date.now() - 3600000)
  },
  {
    id: 2,
    title: 'Optimal Watering Time Detected',
    description: 'Early morning temperatures (5:30-6:30 AM) are ideal for minimal evaporation.',
    priority: 'medium',
    category: 'optimization',
    timestamp: new Date(Date.now() - 7200000)
  },
  {
    id: 3,
    title: 'Water Conservation Opportunity',
    description: 'Vegetable garden could reduce duration by 5 min with drip efficiency improvements.',
    priority: 'low',
    category: 'efficiency',
    timestamp: new Date(Date.now() - 86400000)
  },
  {
    id: 4,
    title: 'Zone Performance Analysis',
    description: 'Front lawn showing improved moisture retention. Great progress!',
    priority: 'low',
    category: 'optimization',
    timestamp: new Date(Date.now() - 172800000)
  }
];

// Demo run logs
export interface DemoRunLog {
  id: number;
  zoneName: string;
  startTime: string;
  duration: number;
  waterUsed: number;
  status: 'completed' | 'in-progress' | 'cancelled';
}

export const getDemoRunLogs = (): DemoRunLog[] => [
  {
    id: 1,
    zoneName: 'Front Lawn',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    duration: 20,
    waterUsed: 85,
    status: 'completed'
  },
  {
    id: 2,
    zoneName: 'Backyard Lawn',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    duration: 22,
    waterUsed: 95,
    status: 'completed'
  },
  {
    id: 3,
    zoneName: 'Vegetable Garden',
    startTime: new Date(Date.now() - 86400000).toISOString(),
    duration: 30,
    waterUsed: 65,
    status: 'completed'
  },
  {
    id: 4,
    zoneName: 'Flower Garden',
    startTime: new Date(Date.now() - 90000000).toISOString(),
    duration: 25,
    waterUsed: 45,
    status: 'completed'
  }
];

// Check if destructive actions should be disabled
export const isDestructiveActionAllowed = (): boolean => {
  return !SHOWCASE_MODE;
};

// Get AI overview summary for presentations
export const getShowcaseOverview = () => ({
  systemHealth: 'Excellent',
  activeZones: 5,
  totalWaterSaved: '1,240 gallons this month',
  efficiencyGain: '+23%',
  aiOptimizations: 47,
  scheduledEvents: 15,
  nextWatering: 'Tomorrow at 5:30 AM'
});
