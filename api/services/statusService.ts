/**
 * Status Service
 * 
 * Handles system status and recent runs
 */

import apiClient from '../client';
import { SystemStatusResponse } from '../types';

/**
 * Get current system status and recent runs
 */
export async function getSystemStatus(): Promise<SystemStatusResponse> {
  return apiClient.get<SystemStatusResponse>('/status');
}

export default {
  getSystemStatus,
};
