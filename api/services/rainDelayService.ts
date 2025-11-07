/**
 * Rain Delay Service
 * 
 * Handles rain delay operations (set/clear)
 */

import apiClient from '../client';
import { SetRainDelayRequest, SetRainDelayResponse, ClearRainDelayResponse } from '../types';

/**
 * Set a rain delay
 * @param hours - Number of hours for rain delay (1-24)
 */
export async function setRainDelay(hours: number): Promise<SetRainDelayResponse> {
  const body: SetRainDelayRequest = { hours };
  return apiClient.post<SetRainDelayResponse>('/rain-delay', body);
}

/**
 * Clear the active rain delay
 */
export async function clearRainDelay(): Promise<ClearRainDelayResponse> {
  return apiClient.delete<ClearRainDelayResponse>('/rain-delay');
}

export default {
  setRainDelay,
  clearRainDelay,
};
