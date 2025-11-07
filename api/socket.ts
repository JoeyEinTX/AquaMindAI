/**
 * Socket.IO Client for AquaMind WebSocket Integration
 * 
 * Provides realtime updates from backend with automatic reconnection
 */

import { io, Socket } from 'socket.io-client';

// WebSocket event types
export type SocketEvent = 
  | 'zoneStarted'
  | 'zoneStopped'
  | 'rainDelayChanged'
  | 'scheduleTriggered'
  | 'logUpdated'
  | 'heartbeat'
  | 'status';

export type SocketEventCallback = (data: any) => void;

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  /**
   * Initialize and connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = import.meta.env.VITE_WS_BASE_URL || 'http://localhost:3002';

    try {
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('[WS] Connection error:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Set up connection event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[WS] Connection error:', error.message);
      this.reconnectAttempts++;
      this.isConnecting = false;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('[WS] Max reconnection attempts reached. Falling back to polling.');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[WS] Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_failed', () => {
      console.warn('[WS] Reconnection failed. Falling back to polling.');
    });
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
}

// Export singleton instance
export const socketClient = new SocketClient();

// Auto-connect on import
socketClient.connect();
