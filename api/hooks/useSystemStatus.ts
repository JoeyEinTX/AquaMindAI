/**
 * useSystemStatus Hook
 * 
 * React hook for fetching system status with automatic polling and WebSocket updates
 */

import { useState, useEffect, useCallback } from 'react';
import { getSystemStatus } from '../services/statusService';
import { SystemStatusResponse } from '../types';
import { ApiError } from '../client';
import { socketClient } from '../socket';

interface UseSystemStatusOptions {
  pollingInterval?: number; // Polling interval in milliseconds (0 to disable)
  enabled?: boolean; // Whether to fetch data
}

interface UseSystemStatusResult {
  data: SystemStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and poll system status
 * @param options - Configuration options
 */
export function useSystemStatus(options: UseSystemStatusOptions = {}): UseSystemStatusResult {
  const { pollingInterval = 5000, enabled = true } = options;
  
  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const status = await getSystemStatus();
      setData(status);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to fetch system status';
      setError(errorMessage);
      console.error('Error fetching system status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Set up polling
  useEffect(() => {
    if (!enabled || pollingInterval === 0) return;

    const intervalId = setInterval(fetchStatus, pollingInterval);
    return () => clearInterval(intervalId);
  }, [fetchStatus, pollingInterval, enabled]);

  // Set up WebSocket listeners for realtime updates
  useEffect(() => {
    if (!enabled) return;

    // Refresh status when zones start/stop
    const unsubZoneStarted = socketClient.on('zoneStarted', () => {
      fetchStatus();
    });

    const unsubZoneStopped = socketClient.on('zoneStopped', () => {
      fetchStatus();
    });

    // Refresh status when rain delay changes
    const unsubRainDelay = socketClient.on('rainDelayChanged', () => {
      fetchStatus();
    });

    // Refresh status when schedule triggers
    const unsubSchedule = socketClient.on('scheduleTriggered', () => {
      fetchStatus();
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubZoneStarted();
      unsubZoneStopped();
      unsubRainDelay();
      unsubSchedule();
    };
  }, [fetchStatus, enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
