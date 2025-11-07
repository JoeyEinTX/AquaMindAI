/**
 * useRainDelay Hook
 * 
 * React hook for rain delay operations
 */

import { useState, useCallback } from 'react';
import { setRainDelay, clearRainDelay } from '../services/rainDelayService';
import { ApiError } from '../client';

interface UseRainDelayResult {
  setRainDelay: (hours: number) => Promise<boolean>;
  clearRainDelay: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage rain delay
 */
export function useRainDelay(): UseRainDelayResult {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetRainDelay = useCallback(async (hours: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await setRainDelay(hours);
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to set rain delay';
      setError(errorMessage);
      console.error('Error setting rain delay:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClearRainDelay = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await clearRainDelay();
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to clear rain delay';
      setError(errorMessage);
      console.error('Error clearing rain delay:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    setRainDelay: handleSetRainDelay,
    clearRainDelay: handleClearRainDelay,
    isLoading,
    error,
  };
}
