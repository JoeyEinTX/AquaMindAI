/**
 * Health Service
 * 
 * Service for fetching system health diagnostics
 */

import { apiClient } from '../client';
import { SystemHealth } from '../types';

/**
 * Get current system health metrics
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  return apiClient.get<SystemHealth>('/health');
}
