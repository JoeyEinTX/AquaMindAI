/**
 * useRunLogs Hook
 * 
 * React hook for fetching run history logs with WebSocket updates
 */

import { useState, useEffect, useCallback } from 'react';
import { getLogs } from '../services/logsService';
import { RunLogEntry } from '../types';
import { ApiError } from '../client';
import { socketClient } from '../socket';

interface UseRunLogsOptions {
  limit?: number;
  enabled?: boolean;
}

interface UseRunLogsResult {
  logs: RunLogEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch run logs
 * @param options - Configuration options
 */
export function useRunLogs(options: UseRunLogsOptions = {}): UseRunLogsResult {
  const { limit, enabled = true } = options;
  
  const [logs, setLogs] = useState<RunLogEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await getLogs(limit ? { limit } : undefined);
      setLogs(response.logs);
      setTotal(response.total);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to fetch run logs';
      setError(errorMessage);
      console.error('Error fetching run logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Set up WebSocket listeners for realtime log updates
  useEffect(() => {
    if (!enabled) return;

    // Refresh logs when a zone stops (new log entry)
    const unsubZoneStopped = socketClient.on('zoneStopped', () => {
      fetchLogs();
    });

    // Refresh logs when log is updated
    const unsubLogUpdated = socketClient.on('logUpdated', () => {
      fetchLogs();
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubZoneStopped();
      unsubLogUpdated();
    };
  }, [fetchLogs, enabled]);

  return {
    logs,
    total,
    isLoading,
    error,
    refetch: fetchLogs,
  };
}
