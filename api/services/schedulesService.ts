/**
 * Schedules Service
 * 
 * Handles CRUD operations for watering schedules
 */

import apiClient from '../client';
import { Schedule, CreateScheduleRequest, UpdateScheduleRequest } from '../types';

/**
 * Get all schedules
 */
export async function getSchedules(): Promise<Schedule[]> {
  return apiClient.get<Schedule[]>('/schedules');
}

/**
 * Create a new schedule
 * @param scheduleData - Schedule data
 */
export async function createSchedule(scheduleData: CreateScheduleRequest): Promise<Schedule> {
  return apiClient.post<Schedule>('/schedules', scheduleData);
}

/**
 * Update an existing schedule
 * @param scheduleId - The schedule ID to update
 * @param updates - Partial schedule data to update
 */
export async function updateSchedule(scheduleId: string, updates: UpdateScheduleRequest): Promise<Schedule> {
  return apiClient.put<Schedule>(`/schedules/${scheduleId}`, updates);
}

/**
 * Delete a schedule
 * @param scheduleId - The schedule ID to delete
 */
export async function deleteSchedule(scheduleId: string): Promise<{ success: boolean; message: string }> {
  return apiClient.delete<{ success: boolean; message: string }>(`/schedules/${scheduleId}`);
}

export default {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
