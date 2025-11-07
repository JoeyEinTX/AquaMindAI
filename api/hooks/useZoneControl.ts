/**
 * useZoneControl Hook
 * 
 * React hook for zone start/stop operations
 */

import { useState, useCallback } from 'react';
import { startZone, stopZone } from '../services/zonesService';
import { ApiError } from '../client';

interface UseZoneControlResult {
  startZone: (zoneId: number, duration?: number) => Promise<boolean>;
  stopZone: (zoneId: number) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to control zone operations (start/stop)
 */
export function useZoneControl(): UseZoneControlResult {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartZone = useCallback(async (zoneId: number, duration?: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await startZone(zoneId, duration);
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to start zone';
      setError(errorMessage);
      console.error('Error starting zone:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStopZone = useCallback(async (zoneId: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await stopZone(zoneId);
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to stop zone';
      setError(errorMessage);
      console.error('Error stopping zone:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    startZone: handleStartZone,
    stopZone: handleStopZone,
    isLoading,
    error,
  };
}
