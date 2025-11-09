/**
 * Socket.IO Client for AquaMind WebSocket Integration
 * 
 * Provides realtime updates from backend with automatic reconnection
 * and dynamic port detection
 */

import { io, Socket } from 'socket.io-client';
import { getWsBaseUrl, isBackendInitialized, apiClient } from './client';

// WebSocket event types
export type SocketEvent = 
  | 'zoneStarted'
  | 'zoneStopped'
  | 'rainDelayChanged'
  | 'scheduleTriggered'
  | 'logUpdated'
  | 'healthUpdated'
  | 'heartbeat'
  | 'status';

export type SocketEventCallback = (data: any) => void;

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;
  private connectionRetryTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize and connect to WebSocket server
   * Automatically uses the dynamic backend configuration
   */
  async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Ensure backend config is initialized first
      if (!isBackendInitialized()) {
        console.log('[WS] Waiting for backend configuration...');
        await apiClient.initialize();
      }

      const wsUrl = getWsBaseUrl();
      console.log(`[WS] Connecting to ${wsUrl}...`);

      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('[WS] Connection initialization error:', error);
      this.isConnecting = false;
      
      // Retry connection after delay
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.connectionRetryTimeout) {
      return; // Already scheduled
    }

    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[WS] Scheduling reconnect in ${delay}ms...`);

    this.connectionRetryTimeout = setTimeout(() => {
      this.connectionRetryTimeout = null;
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Set up connection event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      const wsUrl = getWsBaseUrl();
      console.log(`[CONFIG] WebSocket connected at ${wsUrl}`);
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      
      // Clear any pending reconnection
      if (this.connectionRetryTimeout) {
        clearTimeout(this.connectionRetryTimeout);
        this.connectionRetryTimeout = null;
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      this.isConnecting = false;
      
      // If disconnected due to server issues, schedule reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[WS] Connection error:', error.message);
      this.isConnecting = false;
      
      // Backend might have restarted on different port
      if (this.reconnectAttempts >= 3) {
        console.log('[WS] Multiple connection failures, backend may have changed ports. Refreshing config...');
        this.refreshConnectionAfterConfigUpdate();
      } else {
        this.reconnectAttempts++;
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[WS] Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_failed', () => {
      console.warn('[WS] Reconnection failed. Will retry with config refresh...');
      this.refreshConnectionAfterConfigUpdate();
    });

    this.socket.on('error', (error) => {
      console.error('[WS] Socket error:', error);
    });
  }

  /**
   * Refresh config and reconnect
   */
  private async refreshConnectionAfterConfigUpdate(): Promise<void> {
    try {
      console.log('[WS] Refreshing backend configuration...');
      
      // Disconnect current socket
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Wait a bit before refreshing config
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force reinitialize
      await apiClient.initialize();

      // Reconnect with new config
      this.reconnectAttempts = 0;
      await this.connect();
    } catch (error) {
      console.error('[WS] Failed to refresh config and reconnect:', error);
      // Schedule another retry
      this.scheduleReconnect();
    }
  }

  /**
   * Subscribe to a specific event
   */
  on(event: SocketEvent, callback: SocketEventCallback): () => void {
    if (!this.socket) {
      console.warn(`[WS] Cannot subscribe to ${event}: Socket not initialized`);
      return () => {};
    }

    this.socket.on(event, callback);

    // Return unsubscribe function
    return () => {
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  /**
   * Unsubscribe from a specific event
   */
  off(event: SocketEvent, callback: SocketEventCallback): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.connectionRetryTimeout) {
      clearTimeout(this.connectionRetryTimeout);
      this.connectionRetryTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      console.log('[WS] Manually disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get the socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Manually reconnect (useful after port changes)
   */
  async reconnect(): Promise<void> {
    console.log('[WS] Manual reconnect requested');
    this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }
}

// Export singleton instance
export const socketClient = new SocketClient();

// Auto-connect on import (will wait for config to be ready)
socketClient.connect().catch(error => {
  console.error('[WS] Initial connection failed:', error);
});
