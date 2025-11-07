# AquaMind WebSocket Integration Guide

## Overview

The AquaMind backend now includes a WebSocket server for realtime updates. This allows frontend applications to receive instant notifications about system events without polling.

## Configuration

### Environment Variables

Add to your `.env` file:

```env
WS_PORT=3002
```

Default port is `3002` if not specified.

## WebSocket Events

The WebSocket server emits the following events:

### 1. `heartbeat`
**Frequency:** Every 30 seconds  
**Purpose:** Keep-alive ping to detect stale connections

**Payload:**
```json
{
  "timestamp": "2025-11-06T23:00:00.000Z",
  "connectedClients": 3
}
```

### 2. `status`
**Trigger:** On client connection (initial status)  
**Purpose:** Provides current system state to newly connected clients

**Payload:**
```json
{
  "message": "Connected to AquaMind WebSocket",
  "timestamp": "2025-11-06T23:00:00.000Z"
}
```

### 3. `zoneStarted`
**Trigger:** When a zone begins watering  
**Purpose:** Notify clients that a zone has been activated

**Payload:**
```json
{
  "zoneId": 1,
  "zoneName": "Zone 1",
  "durationSec": 600,
  "source": "manual",
  "timestamp": "2025-11-06T23:00:00.000Z"
}
```

**Fields:**
- `zoneId` - Numeric zone identifier
- `zoneName` - Display name of the zone
- `durationSec` - Scheduled duration in seconds
- `source` - Either `"manual"` or `"schedule"`
- `timestamp` - ISO 8601 timestamp

### 4. `zoneStopped`
**Trigger:** When a zone stops watering  
**Purpose:** Notify clients that a zone has been deactivated

**Payload:**
```json
{
  "zoneId": 1,
  "zoneName": "Zone 1",
  "success": true,
  "timestamp": "2025-11-06T23:00:00.000Z"
}
```

**Fields:**
- `zoneId` - Numeric zone identifier
- `zoneName` - Display name of the zone
- `success` - Boolean indicating if stop was successful
- `timestamp` - ISO 8601 timestamp

### 5. `rainDelayChanged`
**Trigger:** When rain delay is set or cleared  
**Purpose:** Notify clients of rain delay status changes

**Payload (activated):**
```json
{
  "rainDelay": {
    "isActive": true,
    "expiresAt": "2025-11-07T00:00:00.000Z",
    "hoursRemaining": 1
  },
  "timestamp": "2025-11-06T23:00:00.000Z"
}
```

**Payload (cleared):**
```json
{
  "rainDelay": {
    "isActive": false,
    "hoursRemaining": 0
  },
  "timestamp": "2025-11-06T23:00:00.000Z"
}
```

### 6. `scheduleTriggered`
**Trigger:** When a scheduled watering starts  
**Purpose:** Notify clients that an automated schedule has fired

**Payload:**
```json
{
  "scheduleId": "schedule_1730932800000_abc123",
  "zoneId": 1,
  "zoneName": "Zone 1",
  "durationSec": 600,
  "startTime": "06:00",
  "timestamp": "2025-11-06T23:00:00.000Z"
}
```

**Fields:**
- `scheduleId` - Unique schedule identifier
- `zoneId` - Numeric zone identifier
- `zoneName` - Display name of the zone
- `durationSec` - Duration in seconds
- `startTime` - Scheduled time in HH:MM format
- `timestamp` - ISO 8601 timestamp

### 7. `logUpdated`
**Trigger:** When a new run log entry is created  
**Purpose:** Notify clients of completed watering sessions

**Payload:**
```json
{
  "log": {
    "id": "log_1730932800000_xyz789",
    "zoneId": 1,
    "zoneName": "Zone 1",
    "source": "manual",
    "startedAt": "2025-11-06T22:50:00.000Z",
    "stoppedAt": "2025-11-06T23:00:00.000Z",
    "durationSec": 600,
    "success": true
  },
  "timestamp": "2025-11-06T23:00:00.000Z"
}
```

## Backend Implementation

### Event Emission Points

Events are emitted at the following locations in `server.ts`:

1. **Zone Started** - After successful zone activation in `ZoneManager.startZone()`
2. **Zone Stopped** - After zone deactivation in `ZoneManager.stopZone()`
3. **Rain Delay Changed** - After rain delay state change in `ZoneManager.setRainDelay()`
4. **Schedule Triggered** - After successful scheduled start in `Scheduler.checkSchedules()`
5. **Log Updated** - After log entry creation in `RunLogger.addLogEntry()`

### WebSocket Service

The WebSocket service is located in `websocket.ts` and provides:

- Automatic heartbeat mechanism (30s intervals)
- Client connection logging
- Event broadcasting methods
- Graceful shutdown handling

## Testing

### Using the Test Client

Run the included test client to monitor all WebSocket events:

```bash
npm run server    # Terminal 1: Start the backend server
npx tsx test-websocket.ts    # Terminal 2: Start the test client
```

The test client will:
- Connect to the WebSocket server
- Display all received events with formatted output
- Show heartbeat pings every 30 seconds
- Automatically reconnect if disconnected

### Manual Testing

Trigger events manually using the REST API:

```bash
# Start a zone (triggers: zoneStarted, then zoneStopped, then logUpdated)
curl -X POST http://localhost:3001/zones/1/start \
  -H "Content-Type: application/json" \
  -d '{"duration": 10}'

# Set rain delay (triggers: rainDelayChanged)
curl -X POST http://localhost:3001/rain-delay \
  -H "Content-Type: application/json" \
  -d '{"hours": 1}'

# Clear rain delay (triggers: rainDelayChanged)
curl -X DELETE http://localhost:3001/rain-delay
```

### Browser Testing

Create an HTML file to test in the browser:

```html
<!DOCTYPE html>
<html>
<head>
  <title>AquaMind WebSocket Test</title>
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
  <h1>AquaMind WebSocket Test</h1>
  <div id="events"></div>
  
  <script>
    const socket = io('http://localhost:3002');
    const eventsDiv = document.getElementById('events');
    
    socket.on('connect', () => {
      addEvent('Connected', { socketId: socket.id });
    });
    
    socket.onAny((eventName, data) => {
      addEvent(eventName, data);
    });
    
    function addEvent(name, data) {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${name}:</strong> ${JSON.stringify(data, null, 2)}`;
      eventsDiv.prepend(div);
    }
  </script>
</body>
</html>
```

## Frontend Integration

### React/TypeScript Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = 'http://localhost:3002';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const socketInstance = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true
    });
    
    socketInstance.on('connect', () => {
      console.log('[WS] Connected');
      setIsConnected(true);
    });
    
    socketInstance.on('disconnect', () => {
      console.log('[WS] Disconnected');
      setIsConnected(false);
    });
    
    // Listen for zone events
    socketInstance.on('zoneStarted', (data) => {
      console.log('[WS] Zone started:', data);
      // Update your UI state here
    });
    
    socketInstance.on('zoneStopped', (data) => {
      console.log('[WS] Zone stopped:', data);
      // Update your UI state here
    });
    
    socketInstance.on('logUpdated', (data) => {
      console.log('[WS] New log entry:', data);
      // Update your logs list here
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
  }, []);
  
  return { socket, isConnected };
}
```

### Vue/Nuxt Example

```typescript
// composables/useWebSocket.ts
import { io, Socket } from 'socket.io-client';

export const useWebSocket = () => {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  
  onMounted(() => {
    socket.value = io('http://localhost:3002', {
      transports: ['websocket']
    });
    
    socket.value.on('connect', () => {
      isConnected.value = true;
    });
    
    socket.value.on('disconnect', () => {
      isConnected.value = false;
    });
    
    socket.value.on('zoneStarted', (data) => {
      // Handle event
    });
  });
  
  onUnmounted(() => {
    socket.value?.disconnect();
  });
  
  return { socket, isConnected };
};
```

## Production Deployment

### CORS Configuration

For production, update the CORS settings in `websocket.ts`:

```typescript
this.io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
    methods: ['GET', 'POST']
  }
});
```

### SSL/TLS

For secure connections, use `wss://` protocol:

```typescript
const socket = io('wss://api.yourdomain.com', {
  transports: ['websocket']
});
```

### Load Balancing

When using multiple backend instances, enable sticky sessions in your load balancer to ensure WebSocket connections remain with the same server instance.

## Troubleshooting

### Connection Issues

1. **Check port availability:**
   ```bash
   netstat -an | grep 3002
   ```

2. **Verify WebSocket server is running:**
   - Check console for `[WS] WebSocket server initialized on port 3002`

3. **Test with the test client:**
   ```bash
   npx tsx test-websocket.ts
   ```

### Event Not Received

1. Check that the test client is connected
2. Verify the event is being emitted in server logs (`[WS] Broadcasting...`)
3. Ensure no firewall is blocking port 3002

### Multiple Connections

The server tracks connected clients. Check the heartbeat event payload for `connectedClients` count.

## Summary

The WebSocket implementation provides:

✅ **5 Core Events:** zoneStarted, zoneStopped, rainDelayChanged, scheduleTriggered, logUpdated  
✅ **Heartbeat Mechanism:** 30-second keep-alive pings  
✅ **Auto-Reconnection:** Built-in reconnection logic  
✅ **Test Client:** Ready-to-use testing tool  
✅ **Production Ready:** Configurable ports and CORS

All events mirror REST API response formats for consistency.
