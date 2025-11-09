/**
 * API Request and Response Types
 * 
 * These types match the backend API contracts defined in server.ts
 */

// ============================================================================
// Status Endpoint Types
// ============================================================================

export interface RainDelay {
  isActive: boolean;
  expiresAt?: string; // ISO timestamp
  hoursRemaining: number;
}

export interface LastRun {
  zoneId: number;
  zoneName: string;
  startedAt: string; // ISO timestamp
  durationSec: number;
}

export interface RunLogEntry {
  id: string;
  zoneId: number;
  zoneName: string;
  source: 'manual' | 'schedule';
  startedAt: string; // ISO timestamp
  stoppedAt: string; // ISO timestamp
  durationSec: number;
  success: boolean;
}

export interface SystemStatusResponse {
  activeZoneId: number | null;
  timeRemaining: number; // seconds
  rainDelay: RainDelay;
  recentRuns: RunLogEntry[];
}

// ============================================================================
// Zone Control Types
// ============================================================================

export interface StartZoneRequest {
  duration?: number; // Duration in seconds, optional
}

export interface StartZoneResponse {
  success: boolean;
  message: string;
}

export interface StopZoneResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Rain Delay Types
// ============================================================================

export interface SetRainDelayRequest {
  hours: number; // Must be between 1 and 24
}

export interface SetRainDelayResponse {
  success: boolean;
  message: string;
  expiresAt?: string;
  hoursRemaining?: number;
}

export interface ClearRainDelayResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Schedule Types
// ============================================================================

export interface Schedule {
  id: string;
  zoneId: number;
  startTime: string; // HH:MM format
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  durationSec: number;
  enabled: boolean;
  lastRun?: string; // ISO timestamp
}

export interface CreateScheduleRequest {
  zoneId: number;
  startTime: string; // HH:MM
  daysOfWeek: number[];
  durationSec: number;
}

export interface UpdateScheduleRequest {
  zoneId?: number;
  startTime?: string;
  daysOfWeek?: number[];
  durationSec?: number;
  enabled?: boolean;
}

// ============================================================================
// Logs Types
// ============================================================================

export interface GetLogsResponse {
  logs: RunLogEntry[];
  total: number;
}

export interface GetLogsParams {
  limit?: number;
}

// ============================================================================
// Health Types
// ============================================================================

export interface SystemHealth {
  uptimeSec: number;
  cpuPercent: number;
  memoryMB: number;
  connectedClients: number;
  lastError: {
    message: string;
    timestamp: string;
  } | null;
  timestamp: string;
}
