/**
 * AquaMind API Module
 * 
 * Central export point for all API services
 */

// Export the API client and error class
export { default as apiClient, ApiError } from './client';

// Export WebSocket client
export { socketClient } from './socket';
export type { SocketEvent, SocketEventCallback } from './socket';

// Export all types
export * from './types';

// Export all services
export * as statusService from './services/statusService';
export * as zonesService from './services/zonesService';
export * as schedulesService from './services/schedulesService';
export * as rainDelayService from './services/rainDelayService';
export * as logsService from './services/logsService';
export * as healthService from './services/healthService';

// Export all hooks
export { useSystemStatus } from './hooks/useSystemStatus';
export { useZoneControl } from './hooks/useZoneControl';
export { useSchedules } from './hooks/useSchedules';
export { useRainDelay } from './hooks/useRainDelay';
export { useRunLogs } from './hooks/useRunLogs';
export { useSystemHealth } from './hooks/useSystemHealth';
export { useConnectionStatus } from './hooks/useConnectionStatus';
export type { ConnectionStatus, ConnectionState } from './hooks/useConnectionStatus';
