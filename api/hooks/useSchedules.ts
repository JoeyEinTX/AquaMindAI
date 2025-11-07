/**
 * useSchedules Hook
 * 
 * React hook for schedule CRUD operations with WebSocket updates
 */

import { useState, useEffect, useCallback } from 'react';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '../services/schedulesService';
import { Schedule, CreateScheduleRequest, UpdateScheduleRequest } from '../types';
import { ApiError } from '../client';
import { socketClient } from '../socket';

interface UseSchedulesResult {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSchedule: (data: CreateScheduleRequest) => Promise<Schedule | null>;
  updateSchedule: (id: string, updates: UpdateScheduleRequest) => Promise<Schedule | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
}

/**
 * Hook to manage schedules
 */
export function useSchedules(): UseSchedulesResult {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSchedules();
      setSchedules(data);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to fetch schedules';
      setError(errorMessage);
      console.error('Error fetching schedules:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateSchedule = useCallback(async (data: CreateScheduleRequest): Promise<Schedule | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const newSchedule = await createSchedule(data);
      setSchedules(prev => [...prev, newSchedule]);
      return newSchedule;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to create schedule';
      setError(errorMessage);
      console.error('Error creating schedule:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdateSchedule = useCallback(async (id: string, updates: UpdateScheduleRequest): Promise<Schedule | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedSchedule = await updateSchedule(id, updates);
      setSchedules(prev => prev.map(s => s.id === id ? updatedSchedule : s));
      return updatedSchedule;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to update schedule';
      setError(errorMessage);
      console.error('Error updating schedule:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDeleteSchedule = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to delete schedule';
      setError(errorMessage);
      console.error('Error deleting schedule:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Set up WebSocket listeners for realtime schedule updates
  useEffect(() => {
    // Refresh schedules when a schedule triggers
    const unsubScheduleTriggered = socketClient.on('scheduleTriggered', () => {
      fetchSchedules();
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubScheduleTriggered();
    };
  }, [fetchSchedules]);

  return {
    schedules,
    isLoading,
    error,
    refetch: fetchSchedules,
    createSchedule: handleCreateSchedule,
    updateSchedule: handleUpdateSchedule,
    deleteSchedule: handleDeleteSchedule,
  };
}
