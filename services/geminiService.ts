

import { GoogleGenAI, Type } from '@google/genai';
import { WeatherData, SprinklerZone, WateringPreference, WateringSchedule, DailySchedule, SystemStatus, ProactiveSuggestionResponse, ScheduleEvent } from '../types';

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


const generationResponseSchema = {
    type: Type.OBJECT,
    properties: {
        reasoning: {
            type: Type.STRING,
            description: "A brief explanation of why this schedule was chosen, considering the weather and user preferences."
        },
        schedule: {
            type: Type.ARRAY,
            description: "An array of daily watering schedules for the next 7 days.",
            items: {
                type: Type.OBJECT,
                properties: {
                    day: {
                        type: Type.STRING,
                        description: "The date of the schedule in YYYY-MM-DD format."
                    },
                    events: {
                        type: Type.ARRAY,
                        description: "A list of watering events for that day. Should be empty if no watering is needed.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                zoneId: {
                                    type: Type.INTEGER,
                                    description: "The ID of the zone to water."
                                },
                                zoneName: {
                                    type: Type.STRING,
                                    description: "The name of the zone to water."
                                },
                                startTime: {
                                    type: Type.STRING,
                                    description: "The 24-hour start time for watering (e.g., '05:30')."
                                },
                                duration: {
                                    type: Type.INTEGER,
                                    description: "The duration of watering in minutes."
                                }
                            }
                        }
                    }
                }
            }
        },
    }
};


const chatResponseSchema = {
    type: Type.OBJECT,
    properties: {
        responseType: {
            type: Type.STRING,
            description: "The type of response. Must be either 'answer' for a text-based reply or 'modification' for a schedule change."
        },
        answer: {
            type: Type.STRING,
            description: "The conversational answer to the user's question. This should be an empty string if responseType is 'modification'."
        },
        confirmationMessage: {
            type: Type.STRING,
            description: "A friendly, conversational message confirming the schedule change. This should be an empty string if responseType is 'answer'."
        },
        followUpQuestion: {
            type: Type.STRING,
            description: "An optional, short, yes/no question suggesting a smart compensation. Should be an empty string if not needed or if responseType is 'answer'."
        },
        directChangeSchedule: {
            ...generationResponseSchema.properties.schedule,
            description: "The complete 7-day schedule with ONLY the user's direct command applied. Should be an empty array if responseType is 'answer'."
        },
        compensatedSchedule: {
            ...generationResponseSchema.properties.schedule,
            description: "The complete 7-day schedule with BOTH the user's command AND the smart compensation applied. Should be an empty array if not needed or if responseType is 'answer'."
        },
        reasoning: {
            type: Type.STRING,
            description: "Brief reasoning for the changes or answer. Can be an empty string."
        }
    }
};


const formatZonesForPrompt = (zones: SprinklerZone[]): string => {
    return zones.map(z => {
        let hardwareInfo = '';
        if (z.sprinklerType === 'Drip') {
            hardwareInfo = z.flowRateGPH ? `${z.flowRateGPH} GPH total flow` : 'drip system';
        } else if (z.headDetails) {
            const parts = [];
            if (z.headDetails.arc360) parts.push(`${z.headDetails.arc360} full-circle (360°)`);
            if (z.headDetails.arc270) parts.push(`${z.headDetails.arc270} three-quarter (270°)`);
            if (z.headDetails.arc180) parts.push(`${z.headDetails.arc180} half-circle (180°)`);
            if (z.headDetails.arc90) parts.push(`${z.headDetails.arc90} quarter-circle (90°)`);
            hardwareInfo = parts.length > 0 ? `${parts.join(', ')} ${z.sprinklerType} heads` : `unknown ${z.sprinklerType} heads`;
        } else {
             hardwareInfo = `unknown ${z.sprinklerType} heads`;
        }
        return `- Zone ${z.id} (${z.name}): Connected to Relay ${z.relay}. Contains ${z.plantType} in ${z.sunExposure} with a ${z.waterRequirement} water requirement. Hardware: ${hardwareInfo}.`;
    }).join('\n');
};

const generateContextualSchedulePrompt = (schedule: WateringSchedule | null, userTodayStr: string): string => {
    if (!schedule || !schedule.schedule || schedule.schedule.length === 0) {
        return "No prior watering history available. Create a schedule based on the forecast.";
    }

    const historyDays: string[] = [];
    const futureDays: string[] = [];

    schedule.schedule.forEach(day => {
        const eventsStr = day.events.map(e => 
            `${e.zoneName} for ${e.duration} min at ${e.startTime}${e.isCanceled ? ' (CANCELED)' : ''}`
        ).join('; ');

        if (day.events.length > 0) {
            if (day.day && day.day.match(/^\d{4}-\d{2}-\d{2}$/)) {
                if (day.day < userTodayStr) {
                    historyDays.push(`- ${day.day}: ${eventsStr}`);
                } else {
                    futureDays.push(`- ${day.day}: ${eventsStr}`);
                }
            }
        }
    });

    const historySection = historyDays.length > 0
        ? `**Watering History (Past Events - Ground Truth):**\n${historyDays.join('\n')}`
        : "**Watering History (Past Events - Ground Truth):**\n- No watering occurred in the last few days according to the schedule.";

    const futureSection = futureDays.length > 0
        ? `**Current & Future Plan:**\n${futureDays.join('\n')}`
        : "**Current & Future Plan:**\n- No watering is scheduled for the upcoming days.";
        
    return `${historySection}\n\n${futureSection}`;
};


export const generateWateringSchedule = async (
    weather: WeatherData,
    zones: SprinklerZone[],
    preference: WateringPreference,
    scheduleHistory: WateringSchedule | null,
    zipCode: string
): Promise<WateringSchedule> => {

    const timezone = getIANATimezoneFromZip(zipCode);
    const { dateStr: userTodayStr, timeStr: userTimeStr } = getCurrentUserDateTime(timezone);
    const scheduleContext = generateContextualSchedulePrompt(scheduleHistory, userTodayStr);
    
    const prompt = `
        You are an expert AI irrigation controller. Your task is to create an optimal 7-day watering schedule for a home sprinkler system.

        **System Goal:**
        - Keep the lawn and garden healthy.
        - Conserve water by avoiding watering when it's not needed (e.g., after rain, before expected rain).
        
        **Local Time Context:**
        - User's approximate timezone: ${timezone}
        - Current local date for user: ${userTodayStr}
        - Current local time for user: ${userTimeStr}

        **CRITICAL INSTRUCTIONS ON TIMING:**
        1. All start times MUST be in the user's local time.
        2. The optimal watering window is between 04:00 and 07:00 local time to minimize evaporation. Schedule all events within this window unless there's a compelling reason otherwise.
        3. You MUST consider the current local time. Do NOT schedule any watering events for today that have already passed. If it is 11:00 on ${userTodayStr}, you cannot schedule an event for 05:00 on ${userTodayStr}. Plan for the next available optimal window (i.e., tomorrow morning).

        **User Preference:** "${preference}"
        - "Conserve": Prioritize water savings. Water only when absolutely necessary. Shorter durations.
        - "Standard": A balanced approach to lawn health and water usage.
        - "Lush": Prioritize a green, lush lawn. Water more frequently and for longer durations, but still be smart about it.

        **Current & Forecasted Weather:**
        - Current: ${weather.current.temp}°F, ${weather.current.description}, ${weather.current.humidity}% humidity.
        - Recent Rainfall (last 24h): ${weather.recentRainfall} inches.
        - 7-Day Forecast: ${weather.forecast.map(f => `${f.day}: ${f.temp}°F, ${f.precipChance}% chance of ${f.precipAmount}" rain.`).join('\\n')}
        
        **Watering Context from Previous Schedule:**
        ${scheduleContext}

        **Sprinkler Zones (with hardware details):**
        ${formatZonesForPrompt(zones)}

        **Instructions:**
        1.  Analyze all the provided data, including the **Watering Context** and **Local Time Context**. The Watering History is the "ground truth" of what happened recently. Use this to avoid overwatering zones that were recently irrigated. The Future Plan is what you are replacing.
        2.  **Zone-Specific Water Requirements are critical.** Each zone has a 'waterRequirement' setting ('Low', 'Standard', 'High').
            - 'High' means the plants are very thirsty (like new sod or a vegetable garden) and require more frequent or longer watering.
            - 'Standard' is for a typical, established lawn.
            - 'Low' is for drought-tolerant plants that need minimal watering.
            You MUST adjust watering duration and frequency based on this requirement.
        3.  A 'Foundation' plant type indicates a soaker hose or drip line around a house foundation to maintain consistent soil moisture and prevent cracking; this requires frequent, short, low-volume watering cycles, especially in hot, dry weather.
        4.  Generate a JSON object that follows the specified schema.
        5.  The schedule must cover the next 7 days. Each 'day' property MUST be a string in "YYYY-MM-DD" format.
        6.  Provide a brief 'reasoning' for your schedule.
        7.  If no watering is needed on a specific day (e.g., due to sufficient rain), the 'events' array for that day should be empty.
        8.  Do not schedule watering if there has been more than 0.5 inches of recent rain, or if there is a >70% chance of significant rain (>0.5 inches) today or tomorrow.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: generationResponseSchema,
                temperature: 0.2,
            }
        });

        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("AI model returned an empty response.");
        }
        const parsedSchedule = JSON.parse(jsonText);
        
        if (!parsedSchedule.reasoning || !Array.isArray(parsedSchedule.schedule)) {
            throw new Error("Invalid schedule format received from AI.");
        }

        // Post-process to remove past events for today
        const finalSchedule = {
            ...parsedSchedule,
            schedule: parsedSchedule.schedule.map((day: DailySchedule) => {
                if (day.day === userTodayStr) {
                    return {
                        ...day,
                        events: day.events.filter((event: ScheduleEvent) => event.startTime > userTimeStr)
                    };
                }
                return day;
            })
        };

        return finalSchedule;

    } catch (error) {
        console.error("Error generating schedule with Gemini:", error);
        if (error instanceof Error && error.message.includes("fetch failed")) {
             throw new Error("A network error occurred. Please check your connection and try again.");
        }
        throw error;
    }
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

    const timezone = getIANATimezoneFromZip(zipCode);
    const { dateStr: userTodayStr, timeStr: userTimeStr } = getCurrentUserDateTime(timezone);
    const scheduleContext = generateContextualSchedulePrompt(currentSchedule, userTodayStr);

    const prompt = `
        You are AquaMind AI, an expert irrigation controller that interacts with a user via chat.
        You have two primary functions based on the user's input:
        1.  **Answer Questions**: If the user asks a question (e.g., "Why are we watering tomorrow?", "How much water did we use?"), provide a concise, friendly, text-based answer.
        2.  **Execute Commands**: If the user gives a command to change the schedule (e.g., "Cancel the watering for the front lawn", "Water the vegetables for 10 extra minutes"), you must modify the schedule.

        **Current Context:**
        - User Preference: "${preference}"
        - Weather: ${JSON.stringify(weather)}
        - Zones: ${formatZonesForPrompt(zones)}
        - Current Schedule Context:
        ${scheduleContext}

        **Local Time Context:**
        - User's approximate timezone: ${timezone}
        - Current local date for user: ${userTodayStr}
        - Current local time for user: ${userTimeStr}

        **User's Input:** "${userInput}"

        **Instructions:**
        1.  First, determine the user's intent: Is it a question or a command?
        2.  Based on the intent, construct a JSON response using the specified schema.
        3.  **If it's a question:**
            -   Set \`responseType\` to "answer".
            -   Provide the answer in the \`answer\` field.
            -   All other fields related to modification (confirmationMessage, schedules, etc.) MUST be empty strings or empty arrays.
        4.  **If it's a command:**
            -   Set \`responseType\` to "modification".
            -   Set \`answer\` to an empty string.
            -   Follow the modification logic: provide a \`confirmationMessage\`, the \`directChangeSchedule\`, and optionally a \`followUpQuestion\` with its corresponding \`compensatedSchedule\`.
            -   When modifying the schedule, pay close attention to the **Watering History** provided in the context. This is what actually happened and should heavily influence any "smart" suggestions you make (e.g. compensating for a skipped watering).
            -   CRITICAL TIMING: You MUST consider the **Local Time Context**. The optimal watering window is between 04:00 and 07:00 local time. Do not modify or add events for times that have already passed today. If the current time is 11:00 on ${userTodayStr}, you CANNOT cancel an event at 05:00 on ${userTodayStr} because it has passed.
            -   If the command is impossible (e.g. "cancel a watering that already happened"), the \`confirmationMessage\` should explain why, and the schedules returned should be the original, unchanged ones.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: chatResponseSchema,
                temperature: 0.2,
            }
        });

        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("AI model returned an empty chat response.");
        }
        const parsedResponse = JSON.parse(jsonText);

        if (!parsedResponse.responseType) {
            throw new Error("Invalid chat response format received from AI: missing responseType.");
        }
        
        if (parsedResponse.responseType === 'modification') {
            if (!parsedResponse.directChangeSchedule || !Array.isArray(parsedResponse.directChangeSchedule)) {
                 throw new Error("Invalid chat response: modification responseType requires a directChangeSchedule array.");
            }

            const directSchedule: WateringSchedule = {
                reasoning: parsedResponse.reasoning || "Schedule modified by user request.",
                schedule: parsedResponse.directChangeSchedule
            };

            let compensatedSchedule: WateringSchedule | null = null;
            if (parsedResponse.compensatedSchedule && Array.isArray(parsedResponse.compensatedSchedule)) {
                compensatedSchedule = {
                    reasoning: parsedResponse.reasoning || "Schedule adjusted with AI compensation.",
                    schedule: parsedResponse.compensatedSchedule
                }
            }
            
            return {
                ...parsedResponse,
                directChangeSchedule: directSchedule,
                compensatedSchedule: compensatedSchedule,
            };

        } else { // It's an 'answer' type
             return {
                ...parsedResponse,
                directChangeSchedule: currentSchedule, // Unused, but required by type
                compensatedSchedule: null
            };
        }


    } catch (error) {
        console.error("Error processing user chat with Gemini:", error);
        if (error instanceof Error && error.message.includes("fetch failed")) {
             throw new Error("A network error occurred. Please check your connection and try again.");
        }
        throw error;
    }
};

const proactiveResponseSchema = {
    type: Type.OBJECT,
    properties: {
        isAdjustmentNeeded: {
            type: Type.BOOLEAN,
            description: "Set to true if a change is needed, otherwise false."
        },
        notificationMessage: {
            type: Type.STRING,
            description: "A friendly, clear message for the user explaining the change. Null if no adjustment is needed."
        },
        newSchedule: {
            ...generationResponseSchema, // The full schedule object including reasoning
            description: "The complete, new 7-day schedule object. Null if no adjustment is needed."
        }
    }
};

export const getProactiveSuggestions = async (
    weather: WeatherData,
    zones: SprinklerZone[],
    currentSchedule: WateringSchedule,
    systemStatus: SystemStatus,
    zipCode: string
): Promise<ProactiveSuggestionResponse> => {

    const timezone = getIANATimezoneFromZip(zipCode);
    const { dateStr: userTodayStr } = getCurrentUserDateTime(timezone);
    const scheduleContext = generateContextualSchedulePrompt(currentSchedule, userTodayStr);

    const prompt = `
        You are AquaMind AI, an expert irrigation controller performing a proactive, autonomous check.
        Your goal is to see if the current watering plan is still optimal given the very latest weather data, which might have changed since the schedule was created.

        **Current System Status:** ${systemStatus}

        **Local Time Context:**
        - User's approximate timezone: ${timezone}
        - Current local date for user: ${userTodayStr}

        **Current Schedule Context:**
        ${scheduleContext}

        **Latest Weather Data:**
        - Current: ${weather.current.temp}°F, ${weather.current.description}, ${weather.current.humidity}% humidity.
        - Recent Rainfall (last 24h): ${weather.recentRainfall} inches.
        - 7-Day Forecast: ${weather.forecast.map(f => `${f.day}: ${f.temp}°F, ${f.precipChance}% chance of ${f.precipAmount}" rain.`).join('\\n')}

        **Sprinkler Zones:**
        ${formatZonesForPrompt(zones)}

        **Instructions:**
        1.  Compare the "Current & Future Plan" against the "Latest Weather Data".
        2.  **BE CONSERVATIVE.** Your primary goal is to avoid unnecessary, minor adjustments. Only suggest a change if the weather forecast has changed *significantly* and there's a high-confidence reason to act that will save considerable water or prevent lawn damage.
        3.  A **significant change that warrants action** is defined as:
            - A jump in precipitation probability of at least 30% for an upcoming day (e.g., from 20% to 50%).
            - A forecasted temperature swing of more than 10°F compared to the previous forecast.
            - A previously dry forecast now showing significant rainfall (> 0.25 inches).
            - A predicted rainstorm that did not occur, coupled with high temperatures.
        4.  **Do NOT adjust for:** Minor temperature fluctuations (e.g., 85°F to 88°F), small changes in rain chance (e.g., 20% to 30%), or other minor variations. The system should feel stable, not constantly tweaking.
        5.  If no significant adjustment is needed based on these criteria, set \`isAdjustmentNeeded\` to \`false\` and the other fields to \`null\`.
        6.  If an adjustment IS needed:
            -   Set \`isAdjustmentNeeded\` to \`true\`.
            -   Create a complete, new 7-day schedule in the \`newSchedule\` field. This new schedule should be a full replacement for the old one, incorporating your intelligent changes.
            -   Write a clear, user-friendly \`notificationMessage\` explaining EXACTLY what you changed and why (e.g., "I've canceled tomorrow's watering for the Front Lawn because heavy rain is now expected overnight.").
        7.  Generate a response in the specified JSON format.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: proactiveResponseSchema,
                temperature: 0.1,
            }
        });

        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("AI model returned an empty suggestion response.");
        }
        return JSON.parse(jsonText) as ProactiveSuggestionResponse;

    } catch (error) {
        console.error("Error getting proactive suggestions from Gemini:", error);
         if (error instanceof Error && error.message.includes("fetch failed")) {
             throw new Error("A network error occurred. Please check your connection and try again.");
        }
        throw error;
    }
};