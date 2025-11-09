/**
 * WebSocket Test Client for AquaMind
 * 
 * This script connects to the AquaMind WebSocket server and listens for all events.
 * Run with: npx tsx test-websocket.ts
 */

import { io, Socket } from 'socket.io-client';

const WS_PORT = process.env.WS_PORT || '3003';
const WS_URL = `http://localhost:${WS_PORT}`;

console.log(`\n${'='.repeat(60)}`);
console.log('AquaMind WebSocket Test Client');
console.log(`${'='.repeat(60)}\n`);
console.log(`Connecting to: ${WS_URL}`);
console.log(`Time: ${new Date().toISOString()}\n`);

const socket: Socket = io(WS_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log(`[✓] Connected to WebSocket server`);
  console.log(`    Socket ID: ${socket.id}\n`);
});

socket.on('disconnect', (reason) => {
  console.log(`[✗] Disconnected from WebSocket server`);
  console.log(`    Reason: ${reason}\n`);
});

socket.on('connect_error', (error) => {
  console.error(`[✗] Connection error: ${error.message}\n`);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`[⟳] Reconnection attempt ${attemptNumber}...\n`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`[✓] Reconnected after ${attemptNumber} attempts\n`);
});

// Heartbeat event
socket.on('heartbeat', (data) => {
  console.log(`[♥] Heartbeat received`);
  console.log(`    Timestamp: ${data.timestamp}`);
  console.log(`    Connected clients: ${data.connectedClients}\n`);
});

// Initial status event
socket.on('status', (data) => {
  console.log(`[📊] Status event received`);
  console.log(`    Data:`, JSON.stringify(data, null, 2), '\n');
});

// Zone started event
socket.on('zoneStarted', (data) => {
  console.log(`[▶️] Zone Started`);
  console.log(`    Zone ID: ${data.zoneId}`);
  console.log(`    Zone Name: ${data.zoneName}`);
  console.log(`    Duration: ${data.durationSec} seconds`);
  console.log(`    Source: ${data.source}`);
  console.log(`    Timestamp: ${data.timestamp}\n`);
});

// Zone stopped event
socket.on('zoneStopped', (data) => {
  console.log(`[⏹️] Zone Stopped`);
  console.log(`    Zone ID: ${data.zoneId}`);
  console.log(`    Zone Name: ${data.zoneName}`);
  console.log(`    Success: ${data.success}`);
  console.log(`    Timestamp: ${data.timestamp}\n`);
});

// Rain delay changed event
socket.on('rainDelayChanged', (data) => {
  console.log(`[🌧️] Rain Delay Changed`);
  console.log(`    Active: ${data.rainDelay.isActive}`);
  if (data.rainDelay.isActive) {
    console.log(`    Expires At: ${data.rainDelay.expiresAt}`);
    console.log(`    Hours Remaining: ${data.rainDelay.hoursRemaining}`);
  }
  console.log(`    Timestamp: ${data.timestamp}\n`);
});

// Schedule triggered event
socket.on('scheduleTriggered', (data) => {
  console.log(`[⏰] Schedule Triggered`);
  console.log(`    Schedule ID: ${data.scheduleId}`);
  console.log(`    Zone ID: ${data.zoneId}`);
  console.log(`    Zone Name: ${data.zoneName}`);
  console.log(`    Duration: ${data.durationSec} seconds`);
  console.log(`    Start Time: ${data.startTime}`);
  console.log(`    Timestamp: ${data.timestamp}\n`);
});

// Log updated event
socket.on('logUpdated', (data) => {
  console.log(`[📝] Log Entry Created`);
  console.log(`    Log ID: ${data.log.id}`);
  console.log(`    Zone: ${data.log.zoneName} (ID: ${data.log.zoneId})`);
  console.log(`    Source: ${data.log.source}`);
  console.log(`    Duration: ${data.log.durationSec} seconds`);
  console.log(`    Success: ${data.log.success}`);
  console.log(`    Started: ${data.log.startedAt}`);
  console.log(`    Stopped: ${data.log.stoppedAt}`);
  console.log(`    Timestamp: ${data.timestamp}\n`);
});

// Generic event listener for any unhandled events
socket.onAny((eventName, ...args) => {
  if (!['connect', 'disconnect', 'heartbeat', 'status', 'zoneStarted', 'zoneStopped', 
        'rainDelayChanged', 'scheduleTriggered', 'logUpdated'].includes(eventName)) {
    console.log(`[?] Unknown event: ${eventName}`);
    console.log(`    Data:`, args, '\n');
  }
});

// Keep the script running
console.log('Listening for events... (Press Ctrl+C to exit)\n');
console.log(`${'='.repeat(60)}\n`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  socket.disconnect();
  process.exit(0);
});
