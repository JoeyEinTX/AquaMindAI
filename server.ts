import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { wsService } from './websocket.js';
import os from 'os';
import { GoogleGenAI } from '@google/genai';
import { parseIntent, validateIntent, type ParsedIntent } from './services/intentParser.js';
import { serverWeatherService } from './services/weatherService.server.js';
import { advisoryEngine } from './services/advisoryEngine.js';
import { memoryEngine } from './services/memoryEngine.js';
import { conversationManager } from './services/conversationManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const httpServer = createServer(app);
const SERVER_START_TIME = Date.now();

// Health monitoring
let lastError: { message: string; timestamp: string; stack?: string } | null = null;

// Middleware
app.use(cors());
app.use(express.json());

// In production, serve the built frontend
if (IS_PRODUCTION) {
  const distPath = join(__dirname, 'dist');
  
  if (existsSync(distPath)) {
    console.log('[SERVER] Serving static frontend from /dist');
    app.use(express.static(distPath));
  } else {
    console.warn('[SERVER] Production mode but /dist folder not found. Run "npm run build" first.');
  }
}

// Types
interface ZoneState {
  id: number;
  name: string;
  isActive: boolean;
  endTime?: number; // Unix timestamp
}

interface RainDelay {
  isActive: boolean;
  expiresAt?: string; // ISO timestamp
  hoursRemaining: number;
}

interface LastRun {
  zoneId: number;
  zoneName: string;
  startedAt: string; // ISO timestamp
  durationSec: number;
}

interface SystemStatus {
  activeZoneId: number | null;
  activeZoneName: string | null;
  elapsedSec: number;
  remainingSec: number;
  rainDelay: RainDelay;
  lastRun: LastRun | null;
  heartbeat: string; // ISO timestamp
}

interface SystemState {
  activeZoneId: number | null;
  activeZoneName: string | null;
  startTime?: number; // Unix timestamp when current zone started
  durationSec: number; // Total duration of current run
  rainDelay: RainDelay;
  lastRun: LastRun | null;
  zones: ZoneState[];
  schedules: Schedule[];
}

interface RainDelayRequest {
  hours: number;
}

interface Schedule {
  id: string;
  zoneId: number;
  startTime: string; // HH:MM format
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  durationSec: number;
  enabled: boolean;
  lastRun?: string; // ISO timestamp
}

interface CreateScheduleRequest {
  zoneId: number;
  startTime: string; // HH:MM
  daysOfWeek: number[];
  durationSec: number;
}

interface UpdateScheduleRequest {
  zoneId?: number;
  startTime?: string;
  daysOfWeek?: number[];
  durationSec?: number;
  enabled?: boolean;
}

interface RunLogEntry {
  id: string; // UUID-style ID
  zoneId: number;
  zoneName: string;
  source: 'manual' | 'schedule';
  startedAt: string; // ISO timestamp
  stoppedAt: string; // ISO timestamp
  durationSec: number;
  success: boolean;
}

// Multi-mode Relay Driver supporting Mock, GPIO, and HTTP modes
class RelayDriver {
  private mode: 'mock' | 'gpio' | 'http' = 'mock';
  private gpioPins: Map<number, any> = new Map(); // For GPIO mode
  private httpBaseUrl: string = '';
  private relays: Map<number, boolean> = new Map(); // For mock mode tracking

  constructor() {
    this.initializeMode();
  }

  private initializeMode(): void {
    // Read environment variables
    const relayMode = process.env.RELAY_MODE || 'mock';
    this.mode = relayMode as 'mock' | 'gpio' | 'http';

    console.log(`[RELAY] Initializing relay driver in ${this.mode.toUpperCase()} mode`);

    if (this.mode === 'gpio') {
      this.initializeGPIO();
    } else if (this.mode === 'http') {
      this.httpBaseUrl = process.env.RELAY_BASE_URL || 'http://localhost:8080';
      console.log(`[RELAY][HTTP] Using base URL: ${this.httpBaseUrl}`);
    } else {
      console.log(`[RELAY][MOCK] Using mock mode for development/testing`);
    }
  }

  private initializeGPIO(): void {
    try {
      // Try to use 'onoff' first (more modern), fallback to 'rpio'
      let Gpio: any;
      try {
        Gpio = require('onoff').Gpio;
        console.log(`[RELAY][GPIO] Using 'onoff' library for GPIO control`);
      } catch {
        Gpio = require('rpio');
        console.log(`[RELAY][GPIO] Using 'rpio' library for GPIO control`);
      }

      // Default GPIO pin mapping (can be overridden by env var)
      const defaultPinMap = {
        1: 17, // GPIO 17
        2: 18, // GPIO 18
        3: 27, // GPIO 27
        4: 22  // GPIO 22
      };

      // Parse GPIO_PIN_MAP from environment (format: "1:17,2:18,3:27,4:22")
      const pinMapEnv = process.env.GPIO_PIN_MAP;
      const pinMap: { [key: number]: number } = { ...defaultPinMap };

      if (pinMapEnv) {
        const pairs = pinMapEnv.split(',');
        pairs.forEach(pair => {
          const [zoneId, pin] = pair.split(':').map(Number);
          if (zoneId && pin) {
            pinMap[zoneId] = pin;
          }
        });
      }

      console.log(`[RELAY][GPIO] GPIO pin mapping:`, pinMap);

      // Initialize GPIO pins
      for (const [zoneId, pin] of Object.entries(pinMap)) {
        try {
          if (Gpio === require('onoff').Gpio) {
            // onoff library
            this.gpioPins.set(Number(zoneId), new Gpio(pin, 'out'));
          } else {
            // rpio library
            require('rpio').open(pin, require('rpio').OUTPUT, require('rpio').LOW);
            this.gpioPins.set(Number(zoneId), pin);
          }
          console.log(`[RELAY][GPIO] Initialized zone ${zoneId} on GPIO pin ${pin}`);
        } catch (error) {
          console.error(`[RELAY][GPIO] Failed to initialize GPIO pin ${pin} for zone ${zoneId}:`, error);
        }
      }
    } catch (error) {
      console.error(`[RELAY][GPIO] Failed to initialize GPIO mode:`, error);
      console.log(`[RELAY] Falling back to mock mode`);
      this.mode = 'mock';
    }
  }

  private async sendHttpRequest(zoneId: number, action: 'on' | 'off'): Promise<void> {
    if (this.mode !== 'http') return;

    const url = `${this.httpBaseUrl}/relay/${zoneId}/${action}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zoneId, action })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`[RELAY][HTTP] Sent ${action.toUpperCase()} trigger to ${url}`);
    } catch (error) {
      console.error(`[RELAY][HTTP] Failed to send ${action} request to ${url}:`, error);
      throw error;
    }
  }

  private controlGPIO(zoneId: number, state: boolean): void {
    if (this.mode !== 'gpio') return;

    const gpioPin = this.gpioPins.get(zoneId);
    if (!gpioPin) {
      console.error(`[RELAY][GPIO] No GPIO pin configured for zone ${zoneId}`);
      return;
    }

    try {
      if (gpioPin instanceof require('onoff').Gpio) {
        // onoff library
        gpioPin.writeSync(state ? 1 : 0);
      } else {
        // rpio library (gpioPin is just the pin number)
        require('rpio').write(gpioPin, state ? require('rpio').HIGH : require('rpio').LOW);
      }
      console.log(`[RELAY][GPIO] Set GPIO pin ${gpioPin} to ${state ? 'HIGH' : 'LOW'} for zone ${zoneId}`);
    } catch (error) {
      console.error(`[RELAY][GPIO] Failed to control GPIO pin for zone ${zoneId}:`, error);
    }
  }

  async activate(relayId: number): Promise<void> {
    try {
      switch (this.mode) {
        case 'mock':
          this.relays.set(relayId, true);
          console.log(`[RELAY][MOCK] Zone ${relayId} simulated ON`);
          break;

        case 'gpio':
          this.controlGPIO(relayId, true);
          break;

        case 'http':
          await this.sendHttpRequest(relayId, 'on');
          break;
      }
    } catch (error) {
      console.error(`[RELAY] Failed to activate relay ${relayId}:`, error);
      throw error;
    }
  }

  async deactivate(relayId: number): Promise<void> {
    try {
      switch (this.mode) {
        case 'mock':
          this.relays.set(relayId, false);
          console.log(`[RELAY][MOCK] Zone ${relayId} simulated OFF`);
          break;

        case 'gpio':
          this.controlGPIO(relayId, false);
          break;

        case 'http':
          await this.sendHttpRequest(relayId, 'off');
          break;
      }
    } catch (error) {
      console.error(`[RELAY] Failed to deactivate relay ${relayId}:`, error);
      throw error;
    }
  }

  isActive(relayId: number): boolean {
    if (this.mode === 'mock') {
      return this.relays.get(relayId) || false;
    }
    // For GPIO and HTTP modes, we don't track state locally
    // This would need to be implemented by querying the hardware
    return false;
  }

  // Cleanup method for GPIO mode
  cleanup(): void {
    if (this.mode === 'gpio') {
      console.log(`[RELAY][GPIO] Cleaning up GPIO pins...`);
      for (const [zoneId, gpioPin] of this.gpioPins) {
        try {
          if (gpioPin instanceof require('onoff').Gpio) {
            gpioPin.unexport();
          } else {
            // rpio cleanup if needed
            require('rpio').close(gpioPin);
          }
          console.log(`[RELAY][GPIO] Cleaned up GPIO pin for zone ${zoneId}`);
        } catch (error) {
          console.error(`[RELAY][GPIO] Failed to cleanup GPIO pin for zone ${zoneId}:`, error);
        }
      }
    }
  }
}

// Run Log Manager for persistent watering history
class RunLogger {
  private logFile = join(process.cwd(), 'run-logs.json');
  private maxEntries = 200; // Keep last 200 entries
  private logs: RunLogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs(): void {
    try {
      const data = readFileSync(this.logFile, 'utf-8');
      this.logs = JSON.parse(data);
      console.log(`[LOG] Loaded ${this.logs.length} run log entries from file`);
    } catch {
      // Initialize empty log file
      this.logs = [];
      this.saveLogs();
      console.log('[LOG] Initialized new run log file');
    }
  }

  private saveLogs(): void {
    try {
      writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error('[LOG] Failed to save run logs:', error);
    }
  }

  addLogEntry(entry: Omit<RunLogEntry, 'id'>): void {
    const logEntry: RunLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...entry
    };

    // Add to beginning of array (most recent first)
    this.logs.unshift(logEntry);

    // Rotate logs - keep only last maxEntries
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(0, this.maxEntries);
    }

    this.saveLogs();

    // Console output
    const sourceLabel = entry.source === 'manual' ? 'manual' : 'schedule';
    const statusLabel = entry.success ? '✓' : '✗';
    console.log(`[LOG] ${statusLabel} Zone ${entry.zoneId} ran for ${entry.durationSec} seconds (${sourceLabel})`);
    
    // Emit WebSocket event
    wsService.emitLogUpdated(logEntry);
  }

  getLogs(limit?: number): RunLogEntry[] {
    return limit ? this.logs.slice(0, limit) : this.logs;
  }

  getRecentRuns(limit: number = 5): RunLogEntry[] {
    return this.logs.slice(0, limit);
  }

  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
    console.log('[LOG] All run logs cleared');
  }
}

// State management with JSON storage
class ZoneManager {
  private stateFile = join(process.cwd(), 'zone-state.json');
  private relayDriver = new RelayDriver();
  private runLogger = new RunLogger();
  private state: SystemState;
  private activeRunStart: Map<number, { startTime: number; source: 'manual' | 'schedule' }> = new Map();

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      const data = readFileSync(this.stateFile, 'utf-8');
      this.state = JSON.parse(data);
    } catch {
      // Initialize default state
      this.state = {
        activeZoneId: null,
        activeZoneName: null,
        durationSec: 600,
        rainDelay: { isActive: false, hoursRemaining: 0 },
        lastRun: null,
        schedules: [],
        zones: [
          { id: 1, name: 'Zone 1', isActive: false },
          { id: 2, name: 'Zone 2', isActive: false },
          { id: 3, name: 'Zone 3', isActive: false },
          { id: 4, name: 'Zone 4', isActive: false },
        ]
      };
      this.saveState();
    }
  }

  private saveState(): void {
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  setRainDelay(isActive: boolean, expiresAt?: string, hours?: number): void {
    this.state.rainDelay.isActive = isActive;
    this.state.rainDelay.expiresAt = expiresAt;
    this.state.rainDelay.hoursRemaining = hours || 0;
    this.saveState();
    
    // Emit WebSocket event
    wsService.emitRainDelayChanged({
      isActive,
      expiresAt,
      hoursRemaining: hours || 0
    });
  }

  async startZone(zoneId: number, durationSeconds: number = 600, source: 'manual' | 'schedule' = 'manual'): Promise<{ success: boolean; message: string }> {
    // Check for active rain delay
    if (this.state.rainDelay.isActive) {
      return { success: false, message: 'Rain delay active' };
    }

    // Stop any currently active zone
    if (this.state.activeZoneId !== null) {
      await this.stopZone(this.state.activeZoneId);
    }

    const zone = this.state.zones.find(z => z.id === zoneId);
    if (!zone) {
      return { success: false, message: `Zone ${zoneId} not found` };
    }

    // Activate relay
    await this.relayDriver.activate(zoneId);

    // Track run start time and source
    this.activeRunStart.set(zoneId, {
      startTime: Date.now(),
      source: source
    });

    // Update state
    zone.isActive = true;
    zone.endTime = Date.now() + (durationSeconds * 1000);
    this.state.activeZoneId = zoneId;
    this.state.activeZoneName = zone.name;

    this.saveState();
    
    // Emit WebSocket event
    wsService.emitZoneStarted({
      zoneId,
      zoneName: zone.name,
      durationSec: durationSeconds,
      source
    });
    
    return { success: true, message: `Zone ${zoneId} started for ${durationSeconds} seconds` };
  }

  async stopZone(zoneId: number, success: boolean = true): Promise<{ success: boolean; message: string }> {
    const zone = this.state.zones.find(z => z.id === zoneId);
    if (!zone) {
      return { success: false, message: `Zone ${zoneId} not found` };
    }

    // Get run start time and source
    const runStart = this.activeRunStart.get(zoneId);
    const stoppedAt = new Date().toISOString();

    // Deactivate relay
    try {
      await this.relayDriver.deactivate(zoneId);
    } catch (error) {
      console.error(`[ERROR] Failed to deactivate relay for zone ${zoneId}:`, error);
      success = false;
    }

    // Calculate actual duration if we have start time
    if (runStart) {
      const actualDurationMs = Date.now() - runStart.startTime;
      const actualDurationSec = Math.floor(actualDurationMs / 1000);

      // Log the completed run
      this.runLogger.addLogEntry({
        zoneId: zone.id,
        zoneName: zone.name,
        source: runStart.source,
        startedAt: new Date(runStart.startTime).toISOString(),
        stoppedAt: stoppedAt,
        durationSec: actualDurationSec,
        success: success
      });

      // Clear the tracking
      this.activeRunStart.delete(zoneId);
    }

    // Update state
    zone.isActive = false;
    zone.endTime = undefined;
    this.state.activeZoneId = null;
    this.state.activeZoneName = null;

    this.saveState();
    
    // Emit WebSocket event
    wsService.emitZoneStopped({
      zoneId,
      zoneName: zone.name,
      success
    });
    
    return { success: true, message: `Zone ${zoneId} stopped` };
  }

  private updateRainDelayStatus(): void {
    const now = new Date();
    if (this.state.rainDelay.isActive && this.state.rainDelay.expiresAt) {
      const expiresAt = new Date(this.state.rainDelay.expiresAt);
      if (now >= expiresAt) {
        // Auto-expire the rain delay
        this.state.rainDelay.isActive = false;
        this.state.rainDelay.expiresAt = undefined;
        this.state.rainDelay.hoursRemaining = 0;
        this.saveState();
      } else {
        // Update hours remaining
        const remainingMs = expiresAt.getTime() - now.getTime();
        this.state.rainDelay.hoursRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));
      }
    }
  }

  async getStatus() {
    const now = Date.now();
    let timeRemaining = 0;

    // Update rain delay status first
    this.updateRainDelayStatus();

    if (this.state.activeZoneId !== null) {
      const activeZone = this.state.zones.find(z => z.id === this.state.activeZoneId);
      if (activeZone?.endTime) {
        timeRemaining = Math.max(0, Math.floor((activeZone.endTime - now) / 1000));
        if (timeRemaining === 0) {
          // Auto-stop if time expired
          await this.stopZone(this.state.activeZoneId);
        }
      }
    }

    return {
      activeZoneId: this.state.activeZoneId,
      timeRemaining,
      rainDelay: this.state.rainDelay
    };
  }

  // Schedule management methods
  getSchedules(): Schedule[] {
    return this.state.schedules;
  }

  createSchedule(scheduleData: CreateScheduleRequest): Schedule {
    const schedule: Schedule = {
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...scheduleData,
      enabled: true
    };

    this.state.schedules.push(schedule);
    this.saveState();
    return schedule;
  }

  updateSchedule(id: string, updates: UpdateScheduleRequest): Schedule | null {
    const scheduleIndex = this.state.schedules.findIndex(s => s.id === id);
    if (scheduleIndex === -1) return null;

    this.state.schedules[scheduleIndex] = { ...this.state.schedules[scheduleIndex], ...updates };
    this.saveState();
    return this.state.schedules[scheduleIndex];
  }

  deleteSchedule(id: string): boolean {
    const scheduleIndex = this.state.schedules.findIndex(s => s.id === id);
    if (scheduleIndex === -1) return false;

    this.state.schedules.splice(scheduleIndex, 1);
    this.saveState();
    return true;
  }

  updateScheduleLastRun(id: string, lastRun: string): void {
    const schedule = this.state.schedules.find(s => s.id === id);
    if (schedule) {
      schedule.lastRun = lastRun;
      this.saveState();
    }
  }

  // Run log methods
  getRunLogs(limit?: number): RunLogEntry[] {
    return this.runLogger.getLogs(limit);
  }

  getRecentRuns(limit: number = 5): RunLogEntry[] {
    return this.runLogger.getRecentRuns(limit);
  }
}

const zoneManager = new ZoneManager();

// Lightweight scheduler using setInterval
class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private lastMinuteChecked: number = -1;

  constructor(private zoneManager: ZoneManager) {
    this.start();
  }

  private start(): void {
    console.log('[SCHEDULER] Starting scheduler...');
    this.intervalId = setInterval(() => {
      this.checkSchedules();
    }, 60000); // Check every minute
  }

  private async checkSchedules(): Promise<void> {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Prevent duplicate runs within the same minute
    if (currentMinute === this.lastMinuteChecked) {
      return;
    }
    this.lastMinuteChecked = currentMinute;

    const schedules = this.zoneManager.getSchedules();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    for (const schedule of schedules) {
      if (!schedule.enabled) continue;

      // Check if this schedule should run now
      if (schedule.startTime === currentTimeStr && schedule.daysOfWeek.includes(currentDay)) {
        // Check if it already ran this minute (prevent duplicate runs)
        if (schedule.lastRun) {
          const lastRun = new Date(schedule.lastRun);
          const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60);
          if (minutesSinceLastRun < 1) {
            console.log(`[SCHEDULER] Skipping schedule ${schedule.id} - already ran recently`);
            continue;
          }
        }

        console.log(`[SCHEDULER] Triggering schedule ${schedule.id} for zone ${schedule.zoneId} at ${currentTimeStr}`);

        try {
          // Start the zone with 'schedule' source
          const result = await this.zoneManager.startZone(schedule.zoneId, schedule.durationSec, 'schedule');
          if (result.success) {
            // Update last run timestamp
            this.zoneManager.updateScheduleLastRun(schedule.id, now.toISOString());
            console.log(`[SCHEDULER] Successfully started zone ${schedule.zoneId} for ${schedule.durationSec} seconds`);
            
            // Emit WebSocket event for schedule trigger
            const zone = this.zoneManager['state'].zones.find(z => z.id === schedule.zoneId);
            wsService.emitScheduleTriggered({
              scheduleId: schedule.id,
              zoneId: schedule.zoneId,
              zoneName: zone?.name || `Zone ${schedule.zoneId}`,
              durationSec: schedule.durationSec,
              startTime: schedule.startTime
            });
          } else {
            console.log(`[SCHEDULER] Failed to start zone ${schedule.zoneId}: ${result.message}`);
          }
        } catch (error) {
          console.error(`[SCHEDULER] Error executing schedule ${schedule.id}:`, error);
        }
      }
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[SCHEDULER] Scheduler stopped');
    }
  }
}

// Start the scheduler
const scheduler = new Scheduler(zoneManager);

// Helper function to get system health metrics
function getSystemHealth() {
  const uptimeSec = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  const memoryUsage = process.memoryUsage();
  const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
  
  // Get CPU load average (1 minute average)
  const loadAvg = os.loadavg();
  const cpuPercent = Math.round(loadAvg[0] * 100);
  
  return {
    uptimeSec,
    cpuPercent,
    memoryMB,
    connectedClients: wsService.getConnectedClients(),
    lastError: lastError ? {
      message: lastError.message,
      timestamp: lastError.timestamp
    } : null,
    timestamp: new Date().toISOString()
  };
}

// Start health broadcast interval (every 30 seconds)
setInterval(() => {
  const health = getSystemHealth();
  wsService.emitHealthUpdated(health);
}, 30000);

// Routes

// Health endpoint
app.get('/health', (req, res) => {
  try {
    const health = getSystemHealth();
    res.json(health);
  } catch (error) {
    console.error('[API] Error getting health:', error);
    res.status(500).json({ success: false, message: 'Failed to get health status' });
  }
});
app.post('/zones/:id/start', async (req, res) => {
  const zoneId = parseInt(req.params.id);
  const { duration } = req.body; // optional duration in seconds

  try {
    const result = await zoneManager.startZone(zoneId, duration || 600);

    // Return 409 Conflict if rain delay is active
    if (!result.success && result.message === 'Rain delay active') {
      return res.status(409).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error(`[API] Error starting zone ${zoneId}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/zones/:id/stop', async (req, res) => {
  const zoneId = parseInt(req.params.id);

  try {
    const result = await zoneManager.stopZone(zoneId);
    res.json(result);
  } catch (error) {
    console.error(`[API] Error stopping zone ${zoneId}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/status', async (req, res) => {
  try {
    const status = await zoneManager.getStatus();
    const recentRuns = zoneManager.getRecentRuns(5);
    res.json({
      ...status,
      recentRuns
    });
  } catch (error) {
    console.error(`[API] Error getting status:`, error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Run logs endpoint
app.get('/logs', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const logs = zoneManager.getRunLogs(limit);
    res.json({
      logs,
      total: logs.length
    });
  } catch (error) {
    console.error(`[API] Error getting logs:`, error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Rain delay endpoints
app.post('/rain-delay', (req, res) => {
  const { hours }: RainDelayRequest = req.body;

  if (!hours || hours <= 0 || hours > 24) {
    return res.status(400).json({ success: false, message: 'Invalid hours. Must be between 1 and 24.' });
  }

  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  zoneManager.setRainDelay(true, expiresAt, hours);

  res.json({
    success: true,
    message: `Rain delay set for ${hours} hours`,
    expiresAt,
    hoursRemaining: hours
  });
});

app.delete('/rain-delay', (req, res) => {
  zoneManager.setRainDelay(false);

  res.json({
    success: true,
    message: 'Rain delay cleared'
  });
});

// Schedule endpoints
app.get('/schedules', (req, res) => {
  const schedules = zoneManager.getSchedules();
  res.json(schedules);
});

app.post('/schedules', (req, res) => {
  const scheduleData: CreateScheduleRequest = req.body;

  // Validate required fields
  if (!scheduleData.zoneId || !scheduleData.startTime || !scheduleData.daysOfWeek || !scheduleData.durationSec) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(scheduleData.startTime)) {
    return res.status(400).json({ success: false, message: 'Invalid time format. Use HH:MM' });
  }

  // Validate daysOfWeek (0-6)
  if (!Array.isArray(scheduleData.daysOfWeek) || scheduleData.daysOfWeek.some(d => d < 0 || d > 6)) {
    return res.status(400).json({ success: false, message: 'Invalid daysOfWeek. Use array of numbers 0-6' });
  }

  try {
    const schedule = zoneManager.createSchedule(scheduleData);
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create schedule' });
  }
});

app.put('/schedules/:id', (req, res) => {
  const { id } = req.params;
  const updates: UpdateScheduleRequest = req.body;

  const schedule = zoneManager.updateSchedule(id, updates);
  if (!schedule) {
    return res.status(404).json({ success: false, message: 'Schedule not found' });
  }

  res.json(schedule);
});

app.delete('/schedules/:id', (req, res) => {
  const { id } = req.params;

  const deleted = zoneManager.deleteSchedule(id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Schedule not found' });
  }

  res.json({ success: true, message: 'Schedule deleted' });
});

// Test route for verification
app.post('/test/start-stop', async (req, res) => {
  console.log('\n=== TESTING MANUAL ZONE CONTROL ===');

  try {
    // Test starting zone 1
    console.log('1. Starting zone 1...');
    const startResult = await zoneManager.startZone(1, 10); // 10 seconds
    console.log('Result:', startResult);

    // Check status
    console.log('2. Checking status after start...');
    const statusAfterStart = await zoneManager.getStatus();
    console.log('Status:', statusAfterStart);

    // Wait 2 seconds then stop
    setTimeout(async () => {
      console.log('3. Stopping zone 1...');
      const stopResult = await zoneManager.stopZone(1);
      console.log('Result:', stopResult);

      // Check final status
      console.log('4. Checking final status...');
      const finalStatus = await zoneManager.getStatus();
      console.log('Status:', finalStatus);

      console.log('=== TEST COMPLETE ===\n');

      res.json({
        test: 'start-stop',
        startResult,
        statusAfterStart,
        stopResult,
        finalStatus
      });
    }, 2000);
  } catch (error) {
    console.error('[TEST] Error in start-stop test:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Test route for rain delay functionality
app.post('/test/rain-delay', async (req, res) => {
  console.log('\n=== TESTING RAIN DELAY FUNCTIONALITY ===');

  try {
    // Set rain delay for 1 hour
    console.log('1. Setting rain delay for 1 hour...');
    zoneManager.setRainDelay(true, new Date(Date.now() + 60 * 60 * 1000).toISOString(), 1);

    // Check status
    console.log('2. Checking status after setting rain delay...');
    const statusAfterDelay = await zoneManager.getStatus();
    console.log('Status:', statusAfterDelay);

    // Try to start zone (should fail)
    console.log('3. Attempting to start zone 1 (should fail due to rain delay)...');
    const startResult = await zoneManager.startZone(1, 10);
    console.log('Start result:', startResult);

    // Clear rain delay
    console.log('4. Clearing rain delay...');
    zoneManager.setRainDelay(false);

    // Check status after clearing
    console.log('5. Checking status after clearing rain delay...');
    const statusAfterClear = await zoneManager.getStatus();
    console.log('Status:', statusAfterClear);

    // Try to start zone again (should succeed)
    console.log('6. Attempting to start zone 1 again (should succeed now)...');
    const startResult2 = await zoneManager.startZone(1, 10);
    console.log('Start result:', startResult2);

    console.log('=== RAIN DELAY TEST COMPLETE ===\n');

    res.json({
      test: 'rain-delay',
      statusAfterDelay,
      startResult,
      statusAfterClear,
      startResult2
    });
  } catch (error) {
    console.error('[TEST] Error in rain-delay test:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Weather forecast endpoint with server-side caching
app.get('/weather/forecast', async (req, res) => {
  try {
    const zipCode = req.query.zipCode as string;
    
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 5-digit zip code required'
      });
    }

    const forecast = await serverWeatherService.getForecast(zipCode);
    
    res.json({
      success: true,
      ...forecast
    });
  } catch (error) {
    console.error('[API] Error fetching weather forecast:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch weather forecast'
    });
  }
});

// Advisory insights endpoint
app.get('/advisory/report', async (req, res) => {
  try {
    const zipCode = req.query.zipCode as string;
    
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 5-digit zip code required'
      });
    }

    // Get weather forecast
    const weatherData = await serverWeatherService.getForecast(zipCode);
    
    // Get recent logs
    const recentLogs = zoneManager.getRunLogs(100); // Last 100 runs
    
    // Get schedules
    const schedules = zoneManager.getSchedules();
    
    // Get zones
    const zones = zoneManager['state'].zones.map(z => ({ id: z.id, name: z.name }));
    
    // Generate advisory report
    const report = advisoryEngine.generateReport(
      weatherData.forecast,
      recentLogs,
      schedules,
      zones
    );
    
    res.json({
      success: true,
      report,
      weatherCache: {
        cachedAt: weatherData.cachedAt,
        expiresAt: weatherData.cacheExpiresAt
      }
    });
  } catch (error) {
    console.error('[API] Error generating advisory report:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate advisory report'
    });
  }
});

// AI Memory endpoints
app.get('/ai/memory', (req, res) => {
  try {
    const memories = memoryEngine.getAllMemories();
    const stats = memoryEngine.getStats();
    const patterns = memoryEngine.getPatterns(0.5); // 50% confidence threshold
    
    res.json({
      success: true,
      stats,
      memories: memories.slice(0, 50), // Return most recent 50
      patterns,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[AI][MEMORY] Error fetching memory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch memory data'
    });
  }
});

app.delete('/ai/memory', (req, res) => {
  try {
    const { clearType } = req.body; // 'short-term' | 'all'
    
    if (clearType === 'short-term') {
      memoryEngine.clearShortTermMemory();
      res.json({
        success: true,
        message: 'Short-term memory cleared',
        timestamp: new Date().toISOString()
      });
    } else if (clearType === 'all') {
      memoryEngine.clearAllMemory();
      res.json({
        success: true,
        message: 'All memory cleared',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid clearType. Use "short-term" or "all"'
      });
    }
  } catch (error) {
    console.error('[AI][MEMORY] Error clearing memory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear memory'
    });
  }
});

app.post('/ai/memory/feedback', (req, res) => {
  try {
    const { action, followed, context } = req.body;
    
    if (!action || typeof followed !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'action and followed parameters are required'
      });
    }
    
    memoryEngine.recordFeedback(action, followed, context);
    
    res.json({
      success: true,
      message: 'Feedback recorded',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[AI][MEMORY] Error recording feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback'
    });
  }
});

app.put('/ai/memory/settings', (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enabled parameter must be a boolean'
      });
    }
    
    memoryEngine.setEnabled(enabled);
    
    res.json({
      success: true,
      message: `Learning ${enabled ? 'enabled' : 'disabled'}`,
      enabled,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[AI][MEMORY] Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Test route for schedule functionality
app.post('/test/schedules', (req, res) => {
  console.log('\n=== TESTING SCHEDULE FUNCTIONALITY ===');

  // Create a test schedule for zone 1 at current time + 1 minute
  const now = new Date();
  const testTime = new Date(now.getTime() + 60000); // 1 minute from now
  const testTimeStr = `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`;

  console.log(`1. Creating test schedule for zone 1 at ${testTimeStr}...`);
  const testSchedule = zoneManager.createSchedule({
    zoneId: 1,
    startTime: testTimeStr,
    daysOfWeek: [testTime.getDay()], // Today
    durationSec: 30
  });
  console.log('Created schedule:', testSchedule);

  // List schedules
  console.log('2. Listing all schedules...');
  const schedules = zoneManager.getSchedules();
  console.log('Schedules:', schedules);

  // Update the schedule
  console.log('3. Updating schedule duration...');
  const updated = zoneManager.updateSchedule(testSchedule.id, { durationSec: 45 });
  console.log('Updated schedule:', updated);

  // Wait and check if it runs (this would need manual testing)
  console.log('4. Schedule will trigger automatically in ~1 minute. Check console logs.');

  // Delete the test schedule after 2 minutes
  setTimeout(() => {
    console.log('5. Deleting test schedule...');
    const deleted = zoneManager.deleteSchedule(testSchedule.id);
    console.log('Deleted:', deleted);
    console.log('=== SCHEDULE TEST COMPLETE ===\n');
  }, 120000); // 2 minutes

  res.json({
    test: 'schedules',
    createdSchedule: testSchedule,
    allSchedules: schedules,
    updatedSchedule: updated,
    note: 'Schedule will trigger in ~1 minute. Check console logs for [SCHEDULER] messages.'
  });
});

// AI Assistant Chat endpoint with intent parsing and action execution
app.post('/ai/chat', async (req, res) => {
  try {
    const { prompt, confirmAction } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Prompt is required and must be a non-empty string' 
      });
    }

    // Sanitize input - remove HTML tags and limit length
    const sanitizedPrompt = prompt
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim()
      .slice(0, 2000); // Limit to 2000 characters

    console.log('[AI] Processing chat request:', sanitizedPrompt.slice(0, 100));

    // Parse intent from user message
    const parsedIntent = parseIntent(sanitizedPrompt);
    console.log('[AI] Parsed intent:', parsedIntent.intent, 'Confidence:', parsedIntent.confidence);

    // If confirmation was provided, execute the pending action
    if (confirmAction && confirmAction.intent) {
      return await executeAction(confirmAction, res);
    }

    // If intent is actionable and detected with high confidence
    if (parsedIntent.intent !== 'unknown' && parsedIntent.confidence > 0.5) {
      // Validate the intent
      const validation = validateIntent(parsedIntent);
      if (!validation.valid) {
        return res.json({
          success: true,
          response: `I understood that you want to ${parsedIntent.intent}, but there's an issue: ${validation.error}`,
          timestamp: new Date().toISOString()
        });
      }

      // Check if confirmation is required
      if (parsedIntent.requiresConfirmation) {
        return res.json({
          success: true,
          response: parsedIntent.confirmationMessage || 'Please confirm this action.',
          intent: parsedIntent.intent,
          parameters: parsedIntent.parameters,
          requiresConfirmation: true,
          timestamp: new Date().toISOString()
        });
      }

      // Execute action without confirmation for simple operations
      return await executeAction(parsedIntent, res);
    }

    // No actionable intent detected - use AI for conversational response
    // Check for API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_google_api_key_here' || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({ 
        success: false, 
        message: 'AI service not configured. Please set GOOGLE_API_KEY in .env file.' 
      });
    }

    // Gather grounding context from live system data
    const status = await zoneManager.getStatus();
    const recentLogs = zoneManager.getRecentRuns(10);
    const health = getSystemHealth();
    const schedules = zoneManager.getSchedules();

    // Get weather and advisory data if zip code is available
    let weatherContext = '';
    let advisoryContext = '';
    
    const zipCode = process.env.DEFAULT_ZIP_CODE || req.body.zipCode;
    if (zipCode && /^\d{5}$/.test(zipCode)) {
      try {
        const weatherData = await serverWeatherService.getForecast(zipCode);
        const zones = zoneManager['state'].zones.map(z => ({ id: z.id, name: z.name }));
        const allLogs = zoneManager.getRunLogs(100);
        const advisoryReport = advisoryEngine.generateReport(
          weatherData.forecast,
          allLogs,
          schedules,
          zones
        );
        
        // Build weather context
        const next3Days = weatherData.forecast.slice(0, 3);
        weatherContext = `\n**Weather Forecast (Next 3 Days):**
${next3Days.map(day => 
  `- ${day.date}: ${day.tempHigh}°F, ${day.precipProbability}% rain chance (${day.precipAmount}" expected), ${day.weatherDescription}`
).join('\n')}
`;

        // Build advisory context
        const topInsights = advisoryReport.insights.slice(0, 3);
        advisoryContext = `\n**AI Advisory Insights:**
Summary: ${advisoryReport.summary}
${topInsights.length > 0 ? '\nTop Recommendations:' : ''}
${topInsights.map(insight => `- ${insight.icon} ${insight.message}`).join('\n')}
`;
      } catch (error) {
        console.log('[AI] Weather/advisory data unavailable:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Get memory and learning context
    let memoryContext = '';
    let patternsContext = '';
    
    if (memoryEngine.isEnabled()) {
      const relevantMemories = memoryEngine.getRelevantMemories(10);
      const learnedPatterns = memoryEngine.getPatterns(0.6); // 60% confidence
      
      if (relevantMemories.length > 0) {
        memoryContext = `\n${memoryEngine.formatMemoriesForContext(relevantMemories)}\n`;
      }
      
      if (learnedPatterns.length > 0) {
        patternsContext = `\n${memoryEngine.formatPatternsForContext(learnedPatterns)}\n`;
      }
    }

    // Build context string
    const contextString = `
**Current System Status:**
- Active Zone: ${status.activeZoneId ? `Zone ${status.activeZoneId}` : 'None'}
- Time Remaining: ${status.timeRemaining} seconds
- Rain Delay: ${status.rainDelay.isActive ? `Active (${status.rainDelay.hoursRemaining}h remaining)` : 'Not active'}

**Recent Watering History (Last 10 runs):**
${recentLogs.length > 0 ? recentLogs.map(log => 
  `- ${log.zoneName}: ${log.durationSec}s (${log.source}, ${log.success ? 'successful' : 'failed'}) at ${new Date(log.startedAt).toLocaleString()}`
).join('\n') : '- No recent watering history'}

**System Health:**
- Uptime: ${Math.floor(health.uptimeSec / 3600)}h ${Math.floor((health.uptimeSec % 3600) / 60)}m
- Memory Usage: ${health.memoryMB} MB
- CPU: ${health.cpuPercent}%
- Connected Clients: ${health.connectedClients}

**Schedules (${schedules.length} total):**
${schedules.length > 0 ? schedules.slice(0, 5).map(s => 
  `- Zone ${s.zoneId} at ${s.startTime} on days ${s.daysOfWeek.join(',')} for ${s.durationSec}s (${s.enabled ? 'enabled' : 'disabled'})`
).join('\n') : '- No schedules configured'}
${schedules.length > 5 ? `\n(${schedules.length - 5} more schedules not shown)` : ''}${weatherContext}${advisoryContext}${memoryContext}${patternsContext}
`;

    // Create AI prompt with context
    const fullPrompt = `You are AquaMind AI Assistant, a helpful assistant for an intelligent irrigation system. You help users understand and manage their sprinkler system.

${contextString}

User Question: ${sanitizedPrompt}

Provide a helpful, concise response based on the current system status and context above. Be friendly and conversational. If the user asks about something not in the context, politely explain you don't have that information but offer to help with what you do know.`;

    // Call Gemini API
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ parts: [{ text: fullPrompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    });

    const aiResponse = response.text?.trim();
    
    if (!aiResponse) {
      return res.status(500).json({ 
        success: false, 
        message: 'AI service returned an empty response' 
      });
    }

    // Sanitize output - remove potential HTML/script tags
    const sanitizedResponse = aiResponse
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();

    console.log('[AI] Response generated successfully');

    res.json({
      success: true,
      response: sanitizedResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI] Error processing chat:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid API key' 
        });
      }
      if (error.message.includes('quota')) {
        return res.status(429).json({ 
          success: false, 
          message: 'API quota exceeded. Please try again later.' 
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process your request. Please try again.' 
    });
  }
});

// Helper function to execute actions based on parsed intent
async function executeAction(intent: ParsedIntent, res: express.Response): Promise<void> {
  try {
    let result: any;
    let actionMessage = '';
    const logEntry = {
      source: 'AI' as 'manual' | 'schedule',
      timestamp: new Date().toISOString()
    };

    switch (intent.intent) {
      case 'startZone':
        result = await zoneManager.startZone(
          intent.parameters.zoneId,
          intent.parameters.durationSec,
          'manual'
        );
        
        if (result.success) {
          const minutes = Math.floor(intent.parameters.durationSec / 60);
          actionMessage = `✓ Started Zone ${intent.parameters.zoneId} for ${minutes} minute${minutes !== 1 ? 's' : ''}`;
          
          // Enhanced logging for AI-triggered actions
          console.log(`[AI][ACTION] Zone ${intent.parameters.zoneId} started via AI command`);
        } else {
          actionMessage = `✗ Failed to start zone: ${result.message}`;
        }
        break;

      case 'stopZone':
        if (intent.parameters.zoneId === 'all') {
          // Stop all active zones
          const status = await zoneManager.getStatus();
          if (status.activeZoneId) {
            result = await zoneManager.stopZone(status.activeZoneId);
            actionMessage = result.success ? 
              `✓ Stopped all zones` : 
              `✗ Failed to stop zones: ${result.message}`;
            console.log(`[AI][ACTION] All zones stopped via AI command`);
          } else {
            actionMessage = 'No zones are currently running';
          }
        } else {
          result = await zoneManager.stopZone(intent.parameters.zoneId);
          actionMessage = result.success ? 
            `✓ Stopped Zone ${intent.parameters.zoneId}` : 
            `✗ Failed to stop zone: ${result.message}`;
          console.log(`[AI][ACTION] Zone ${intent.parameters.zoneId} stopped via AI command`);
        }
        break;

      case 'setRainDelay':
        const hours = intent.parameters.hours;
        const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        zoneManager.setRainDelay(true, expiresAt, hours);
        actionMessage = `✓ Rain delay set for ${hours} hour${hours !== 1 ? 's' : ''}`;
        console.log(`[AI][ACTION] Rain delay set for ${hours} hours via AI command`);
        break;

      case 'clearRainDelay':
        zoneManager.setRainDelay(false);
        actionMessage = `✓ Rain delay cleared`;
        console.log(`[AI][ACTION] Rain delay cleared via AI command`);
        break;

      case 'createSchedule':
        const schedule = zoneManager.createSchedule({
          zoneId: intent.parameters.zoneId,
          startTime: intent.parameters.startTime,
          daysOfWeek: intent.parameters.daysOfWeek,
          durationSec: intent.parameters.durationSec
        });
        
        const days = intent.parameters.daysOfWeek.map((d: number) => 
          ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
        ).join(', ');
        const minutes = Math.floor(intent.parameters.durationSec / 60);
        actionMessage = `✓ Created schedule for Zone ${intent.parameters.zoneId} at ${intent.parameters.startTime} on ${days} for ${minutes} minutes`;
        console.log(`[AI][ACTION] Schedule created via AI command:`, schedule.id);
        break;

      case 'getStatus':
        const status = await zoneManager.getStatus();
        if (status.activeZoneId) {
          const minutes = Math.floor(status.timeRemaining / 60);
          const seconds = status.timeRemaining % 60;
          actionMessage = `Zone ${status.activeZoneId} is currently running with ${minutes}m ${seconds}s remaining.`;
        } else {
          actionMessage = 'No zones are currently running.';
        }
        
        if (status.rainDelay.isActive) {
          actionMessage += ` Rain delay is active for ${status.rainDelay.hoursRemaining} more hour${status.rainDelay.hoursRemaining !== 1 ? 's' : ''}.`;
        }
        break;

      default:
        actionMessage = 'Unknown action';
    }

    res.json({
      success: true,
      response: actionMessage,
      actionExecuted: true,
      intent: intent.intent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI][ACTION] Error executing action:', error);
    res.json({
      success: true,
      response: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      actionExecuted: false,
      timestamp: new Date().toISOString()
    });
  }
}

// Store the actual port being used
let ACTUAL_PORT = PORT;

// Helper function to get network interface IPs
function getNetworkIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = ['localhost'];
  
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        ips.push(alias.address);
      }
    }
  }
  
  return ips;
}

// Config endpoint - returns dynamic backend configuration
app.get('/config', (req, res) => {
  const networkIPs = getNetworkIPs();
  const hostname = req.hostname || 'localhost';
  
  res.json({
    apiBaseUrl: `http://${hostname}:${ACTUAL_PORT}`,
    wsBaseUrl: `ws://${hostname}:${ACTUAL_PORT}`,
    learningEnabled: memoryEngine.isEnabled(),
    port: ACTUAL_PORT,
    networkIPs: networkIPs.map(ip => ({
      apiBaseUrl: `http://${ip}:${ACTUAL_PORT}`,
      wsBaseUrl: `ws://${ip}:${ACTUAL_PORT}`
    })),
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for SPA in production (must be after all API routes)
if (IS_PRODUCTION) {
  app.get('*', (req, res) => {
    const indexPath = join(__dirname, 'dist', 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not built. Run "npm run build" first.');
    }
  });
}

// Error capture middleware (must be after routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errorInfo = {
    message: err.message || 'Unknown error',
    timestamp: new Date().toISOString(),
    stack: err.stack
  };
  
  lastError = errorInfo;
  console.error('[ERROR]', errorInfo);
  
  res.status(500).json({
    success: false,
    message: errorInfo.message
  });
});

// Initialize WebSocket service
wsService.initialize(httpServer);

// Auto-port detection with EADDRINUSE handling
function startServer(port: number, maxRetries: number = 5): void {
  httpServer.listen(port)
    .on('listening', () => {
      ACTUAL_PORT = port; // Store the actual port being used
      console.log(`[SERVER] AquaMind Backend server running on port ${port}`);
      console.log(`[WS] WebSocket server initialized (sharing port ${port})`);
      console.log(`[API] REST API available at http://localhost:${port}`);
      console.log(`[CONFIG] Dynamic config endpoint: GET http://localhost:${port}/config`);
      console.log(`[AI] AI Chat endpoint: POST http://localhost:${port}/ai/chat`);
    })
    .on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        const retriesLeft = maxRetries - 1;
        
        if (retriesLeft > 0) {
          console.log(`[SERVER] Port ${port} is in use, trying port ${nextPort}...`);
          startServer(nextPort, retriesLeft);
        } else {
          console.error(`[SERVER] Failed to find available port after ${maxRetries} attempts`);
          process.exit(1);
        }
      } else {
        console.error(`[SERVER] Server error:`, err);
        process.exit(1);
      }
    });
}

// Start server with auto-port detection
startServer(PORT);
