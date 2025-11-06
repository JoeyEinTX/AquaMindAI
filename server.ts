import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Routes
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

app.listen(PORT, () => {
  console.log(`AquaMind Backend server running on port ${PORT}`);
});
