/**
 * Zones Service
 * 
 * Handles zone start/stop operations
 */

import apiClient from '../client';
import { StartZoneRequest, StartZoneResponse, StopZoneResponse } from '../types';

/**
 * Start a zone with optional duration
 * @param zoneId - The zone ID to start
 * @param duration - Duration in seconds (optional, defaults to backend default of 600s)
 */
export async function startZone(zoneId: number, duration?: number): Promise<StartZoneResponse> {
  const body: StartZoneRequest = duration ? { duration } : {};
  return apiClient.post<StartZoneResponse>(`/zones/${zoneId}/start`, body);
}

/**
 * Stop a zone
 * @param zoneId - The zone ID to stop
 */
export async function stopZone(zoneId: number): Promise<StopZoneResponse> {
  return apiClient.post<StopZoneResponse>(`/zones/${zoneId}/stop`);
}

export default {
  startZone,
  stopZone,
};
