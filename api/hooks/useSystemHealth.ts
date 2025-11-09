/**
 * useSystemHealth Hook
 * 
 * React hook for fetching system health diagnostics with WebSocket updates
 */

import { useState, useEffect, useCallback } from 'react';
import { getSystemHealth } from '../services/healthService';
import { SystemHealth } from '../types';
import { ApiError } from '../client';
import { socketClient } from '../socket';

interface UseSystemHealthOptions {
  pollingInterval?: number; // Polling interval in milliseconds (0 to disable)
  enabled?: boolean; // Whether to fetch data
}

interface UseSystemHealthResult {
  health: SystemHealth | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and monitor system health
 * @param options - Configuration options
 */
export function useSystemHealth(options: UseSystemHealthOptions = {}): UseSystemHealthResult {
  const { pollingInterval = 10000, enabled = true } = options;
  
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const healthData = await getSystemHealth();
      setHealth(healthData);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to fetch system health';
      setError(errorMessage);
      console.error('Error fetching system health:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Initial fetch
  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Set up polling
  useEffect(() => {
    if (!enabled || pollingInterval === 0) return;

    const intervalId = setInterval(fetchHealth, pollingInterval);
    return () => clearInterval(intervalId);
  }, [fetchHealth, pollingInterval, enabled]);

  // Set up WebSocket listener for realtime health updates
  useEffect(() => {
    if (!enabled) return;

    const unsubHealthUpdated = socketClient.on('healthUpdated', (data: SystemHealth) => {
      setHealth(data);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubHealthUpdated();
    };
  }, [enabled]);

  return {
    health,
    isLoading,
    error,
    refetch: fetchHealth,
  };
}
