import { WeatherData, SprinklerZone, WateringPreference, WateringSchedule, SystemStatus, ProactiveSuggestionResponse } from '../types';

export const generateWateringSchedule = async (
    weather: WeatherData,
    zones: SprinklerZone[],
    preference: WateringPreference,
    scheduleHistory: WateringSchedule | null,
    zipCode: string
): Promise<WateringSchedule> => {
    console.log("Using MOCK AI for schedule generation.");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    const today = new Date();
    const schedule = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayString = date.toISOString().split('T')[0];
        
        // Water every other day for mock
        if (i % 2 === 0 && zones.length > 1) {
            schedule.push({
                day: dayString,
                events: [
                    { zoneId: zones[0].id, zoneName: zones[0].name, startTime: '05:00', duration: 20 },
                    { zoneId: zones[1].id, zoneName: zones[1].name, startTime: '05:25', duration: 15 },
                ]
            });
        } else {
             schedule.push({
                day: dayString,
                events: []
            });
        }
    }

    return {
        reasoning: "This is a mock schedule generated for offline use. It waters the main zones every other day to provide a consistent baseline for testing.",
        schedule: schedule
    };
};

export const processUserChat = async (
    weather: WeatherData,
    zones: SprinklerZone[],
    preference: WateringPreference,
    currentSchedule: WateringSchedule,
    userInput: string,
    zipCode: string
): Promise<{
    responseType: 'answer' | 'modification';
    answer: string | null;
    confirmationMessage: string | null;
    followUpQuestion: string | null;
    directChangeSchedule: WateringSchedule;
    compensatedSchedule: WateringSchedule | null;
}> => {
    console.log("Using MOCK AI for chat processing.");
    await new Promise(resolve => setTimeout(resolve, 500));

    if (userInput.toLowerCase().includes('cancel')) {
        const modifiedSchedule: WateringSchedule = JSON.parse(JSON.stringify(currentSchedule));
        let canceled = false;
        let canceledZoneName = '';
        
        // Find and "cancel" the first upcoming, non-canceled event
        for (const day of modifiedSchedule.schedule) {
            for (const event of day.events) {
                if (!event.isCanceled) {
                    event.isCanceled = true;
                    canceled = true;
                    canceledZoneName = event.zoneName;
                    break;
                }
            }
            if (canceled) break;
        }

        return {
            responseType: 'modification',
            answer: null,
            confirmationMessage: canceled ? `Okay, I've canceled the next watering event for ${canceledZoneName} as you requested.` : "There were no upcoming, active events to cancel.",
            followUpQuestion: null,
            directChangeSchedule: modifiedSchedule,
            compensatedSchedule: null,
        };
    }

    return {
        responseType: 'answer',
        answer: `This is a mock response. You said: "${userInput}". Try asking me to "cancel watering".`,
        confirmationMessage: null,
        followUpQuestion: null,
        directChangeSchedule: currentSchedule, // No change
        compensatedSchedule: null
    };
};

export const getProactiveSuggestions = async (
    weather: WeatherData,
    zones: SprinklerZone[],
    currentSchedule: WateringSchedule,
    systemStatus: SystemStatus
): Promise<ProactiveSuggestionResponse> => {
    console.log("Using MOCK AI for proactive suggestions.");
    await new Promise(resolve => setTimeout(resolve, 800));

    // Only suggest a change ~20% of the time for testing
    if (Math.random() < 0.2 && currentSchedule && zones.length > 0) {
        const newSchedule: WateringSchedule = JSON.parse(JSON.stringify(currentSchedule));
        
        // Add a new event for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        let dayToModify = newSchedule.schedule.find(d => d.day === tomorrowStr);
        if (!dayToModify && newSchedule.schedule.length > 1) {
            // If tomorrow isn't in the schedule for some reason, just pick the second day
            dayToModify = newSchedule.schedule[1];
        }

        if (dayToModify) {
             dayToModify.events.push({ zoneId: zones[0].id, zoneName: zones[0].name, startTime: '06:15', duration: 10 });
        }
       
        return {
            isAdjustmentNeeded: true,
            notificationMessage: `Mock AI Suggestion: A sudden (mock) heatwave is expected! I've added an extra watering for the ${zones[0].name} tomorrow to keep it healthy.`,
            newSchedule: newSchedule,
        };
    }

    return {
        isAdjustmentNeeded: false,
        notificationMessage: null,
        newSchedule: null
    };
};
