
import { WateringSchedule, SprinklerZone, SprinklerType } from '../types';

// Average Gallons Per Minute (GPM) for a full 360-degree head.
// These are baseline values; the calculation will adjust for partial-circle heads.
const SPRINKLER_GPM_PER_360_HEAD: Record<Exclude<SprinklerType, 'Drip'>, number> = {
    'Spray': 1.5, // Standard 15-ft spray head nozzle.
    'Rotor': 2.0, // Common residential rotor.
};

// Legacy fallback for old zones without detailed head data
const LEGACY_SPRINKLER_GPM: Record<SprinklerType, number> = {
    'Spray': 1.5,
    'Rotor': 0.7,
    'Drip': 0.2,
};


/**
 * Calculates the estimated water usage for each event in a schedule using detailed zone data.
 * @param schedule The watering schedule to process.
 * @param zones The list of available sprinkler zones.
 * @returns The same schedule object with waterUsage added to each event.
 */
export const calculateWaterUsage = (schedule: WateringSchedule, zones: SprinklerZone[]): WateringSchedule => {
    const zonesMap = new Map<number, SprinklerZone>(zones.map(z => [z.id, z]));

    const scheduleWithUsage = schedule.schedule.map(daily => {
        const eventsWithUsage = daily.events.map(event => {
            const zone = zonesMap.get(event.zoneId);
            if (!zone) {
                return { ...event, waterUsage: 0 };
            }

            let usage = 0;
            if (zone.sprinklerType === 'Drip') {
                if (zone.flowRateGPH && zone.flowRateGPH > 0) {
                    // Convert Gallons Per Hour to Gallons Per Minute for calculation
                    const gpm = zone.flowRateGPH / 60;
                    usage = event.duration * gpm;
                } else {
                    // Fallback for older drip zone configurations
                    usage = event.duration * LEGACY_SPRINKLER_GPM.Drip;
                }
            } else { // Spray or Rotor
                if (zone.headDetails) {
                    const baseGPM = SPRINKLER_GPM_PER_360_HEAD[zone.sprinklerType] || 0;
                    const { arc90 = 0, arc180 = 0, arc270 = 0, arc360 = 0 } = zone.headDetails;
                    
                    // Calculate total GPM for the zone by summing the prorated flow of each head type
                    const totalGPM = (arc360 * baseGPM) +
                                     (arc270 * baseGPM * 0.75) +
                                     (arc180 * baseGPM * 0.5) +
                                     (arc90 * baseGPM * 0.25);
                    
                    usage = event.duration * totalGPM;
                } else {
                    // Fallback for older spray/rotor configurations that might be in localStorage
                    // This is a rough estimate as we don't know the arcs.
                    // @ts-ignore - checking for legacy property
                    const headCount = zone.headCount || 1; 
                    usage = event.duration * LEGACY_SPRINKLER_GPM[zone.sprinklerType] * headCount;
                }
            }
            
            return { ...event, waterUsage: usage };
        });
        return { ...daily, events: eventsWithUsage };
    });

    return {
        ...schedule,
        schedule: scheduleWithUsage,
    };
};