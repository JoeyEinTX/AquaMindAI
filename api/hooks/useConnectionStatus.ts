/**
 * Connection Status Hook
 * 
 * Monitors both backend HTTP and WebSocket connectivity
 * Provides a unified connection status for the UI
 */

import { useState, useEffect } from 'react';
import { socketClient } from '../socket';
import { apiClient, isBackendInitialized } from '../client';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export interface ConnectionStatus {
  state: ConnectionState;
  color: 'green' | 'yellow' | 'red';
  emoji: string;
  label: string;
  backendOnline: boolean;
  websocketOnline: boolean;
}

/**
 * Hook to track connection status
 */
export function useConnectionStatus(): ConnectionStatus {
  const [backendOnline, setBackendOnline] = useState(false);
  const [websocketOnline, setWebsocketOnline] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);

  // Check backend health
  const checkBackendHealth = async () => {
    if (isCheckingBackend) return;
    
    setIsCheckingBackend(true);
    try {
      // Only check if backend is initialized
      if (!isBackendInitialized()) {
        setBackendOnline(false);
        return;
      }

      await apiClient.get('/health');
      setBackendOnline(true);
      console.log('[STATUS] Backend connected');
    } catch (error) {
      setBackendOnline(false);
      console.log('[STATUS] Backend disconnected');
    } finally {
      setIsCheckingBackend(false);
    }
  };

  // Monitor WebSocket connection
  useEffect(() => {
    const updateWebSocketStatus = () => {
      const isConnected = socketClient.isConnected();
      setWebsocketOnline(isConnected);
      console.log('[STATUS] WebSocket', isConnected ? 'connected' : 'disconnected');
    };

    // Initial check
    updateWebSocketStatus();

    // Subscribe to socket events
    const socket = socketClient.getSocket();
    if (socket) {
      socket.on('connect', () => {
        setWebsocketOnline(true);
        console.log('[STATUS] WebSocket connected');
      });

      socket.on('disconnect', () => {
        setWebsocketOnline(false);
        console.log('[STATUS] WebSocket disconnected');
      });

      socket.on('reconnect_attempt', () => {
        console.log('[STATUS] WebSocket reconnecting...');
      });
    }

    // Cleanup
    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('reconnect_attempt');
      }
    };
  }, []);

  // Monitor backend connection with periodic health checks
  useEffect(() => {
    // Initial check
    checkBackendHealth();

    // Check every 10 seconds
    const interval = setInterval(checkBackendHealth, 10000);

    return () => clearInterval(interval);
  }, []);

  // Derive connection state from both backend and WebSocket status
  const getConnectionStatus = (): ConnectionStatus => {
    // Both connected - all good
    if (backendOnline && websocketOnline) {
      return {
        state: 'connected',
        color: 'green',
        emoji: '🟢',
        label: 'Connected',
        backendOnline,
        websocketOnline,
      };
    }

    // Both offline - disconnected
    if (!backendOnline && !websocketOnline) {
      return {
        state: 'disconnected',
        color: 'red',
        emoji: '🔴',
        label: 'Disconnected',
        backendOnline,
        websocketOnline,
      };
    }

    // One is down - reconnecting state
    return {
      state: 'reconnecting',
      color: 'yellow',
      emoji: '🟡',
      label: 'Reconnecting…',
      backendOnline,
      websocketOnline,
    };
  };

  return getConnectionStatus();
}
