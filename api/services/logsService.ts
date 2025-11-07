/**
 * Logs Service
 * 
 * Handles fetching run history logs
 */

import apiClient from '../client';
import { GetLogsResponse, GetLogsParams } from '../types';

/**
 * Get run logs with optional limit
 * @param params - Query parameters (limit)
 */
export async function getLogs(params?: GetLogsParams): Promise<GetLogsResponse> {
  const queryString = params?.limit ? `?limit=${params.limit}` : '';
  return apiClient.get<GetLogsResponse>(`/logs${queryString}`);
}

export default {
  getLogs,
};
