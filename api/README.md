# AquaMind API Module

This module provides a complete interface to the AquaMind backend API, including typed services, React hooks, and centralized error handling.

## 📁 Structure

```
api/
├── client.ts              # Base API client with error handling
├── types.ts               # TypeScript type definitions
├── index.ts              # Main export file
├── services/             # API service modules
│   ├── statusService.ts     # System status
│   ├── zonesService.ts      # Zone start/stop
│   ├── schedulesService.ts  # Schedule CRUD
│   ├── rainDelayService.ts  # Rain delay operations
│   └── logsService.ts       # Run history logs
└── hooks/                # React hooks
    ├── useSystemStatus.ts   # Status with polling
    ├── useZoneControl.ts    # Zone operations
    ├── useSchedules.ts      # Schedule management
    ├── useRainDelay.ts      # Rain delay control
    └── useRunLogs.ts        # Run logs fetching
```

## 🚀 Setup

### 1. Environment Configuration

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:3001
```

### 2. Start the Backend Server

```bash
npm run server
```

The backend will run on `http://localhost:3001`.

## 📖 Usage

### Using Services Directly

```typescript
import { statusService, zonesService } from './api';

// Get system status
const status = await statusService.getSystemStatus();

// Start a zone
const result = await zonesService.startZone(1, 300); // Zone 1 for 300 seconds
```

### Using React Hooks (Recommended)

#### System Status with Auto-Polling

```typescript
import { useSystemStatus } from './api';

function StatusComponent() {
  const { data, isLoading, error, refetch } = useSystemStatus({
    pollingInterval: 5000, // Poll every 5 seconds
    enabled: true
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Active Zone: {data?.activeZoneId ?? 'None'}</p>
      <p>Time Remaining: {data?.timeRemaining ?? 0}s</p>
      <p>Rain Delay: {data?.rainDelay.isActive ? 'Active' : 'Inactive'}</p>
    </div>
  );
}
```

#### Zone Control

```typescript
import { useZoneControl } from './api';

function ZoneControlComponent() {
  const { startZone, stopZone, isLoading, error } = useZoneControl();

  const handleStart = async () => {
    const success = await startZone(1, 600); // Zone 1, 10 minutes
    if (success) {
      console.log('Zone started successfully');
    }
  };

  const handleStop = async () => {
    const success = await stopZone(1);
    if (success) {
      console.log('Zone stopped successfully');
    }
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isLoading}>Start Zone</button>
      <button onClick={handleStop} disabled={isLoading}>Stop Zone</button>
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

#### Schedule Management

```typescript
import { useSchedules } from './api';

function SchedulesComponent() {
  const { 
    schedules, 
    isLoading, 
    error, 
    createSchedule, 
    updateSchedule, 
    deleteSchedule 
  } = useSchedules();

  const handleCreate = async () => {
    const newSchedule = await createSchedule({
      zoneId: 1,
      startTime: '06:00',
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      durationSec: 600
    });
    if (newSchedule) {
      console.log('Schedule created:', newSchedule);
    }
  };

  return (
    <div>
      <h2>Schedules ({schedules.length})</h2>
      {schedules.map(schedule => (
        <div key={schedule.id}>
          Zone {schedule.zoneId} at {schedule.startTime}
        </div>
      ))}
    </div>
  );
}
```

#### Rain Delay

```typescript
import { useRainDelay } from './api';

function RainDelayComponent() {
  const { setRainDelay, clearRainDelay, isLoading, error } = useRainDelay();

  const handleSet = async () => {
    const success = await setRainDelay(24); // 24 hours
    if (success) {
      console.log('Rain delay set');
    }
  };

  const handleClear = async () => {
    const success = await clearRainDelay();
    if (success) {
      console.log('Rain delay cleared');
    }
  };

  return (
    <div>
      <button onClick={handleSet} disabled={isLoading}>Set 24h Delay</button>
      <button onClick={handleClear} disabled={isLoading}>Clear Delay</button>
    </div>
  );
}
```

#### Run Logs

```typescript
import { useRunLogs } from './api';

function LogsComponent() {
  const { logs, total, isLoading, error, refetch } = useRunLogs({
    limit: 20,
    enabled: true
  });

  return (
    <div>
      <h2>Run History ({total} total)</h2>
      {logs.map(log => (
        <div key={log.id}>
          {log.zoneName} - {log.source} - {log.durationSec}s
        </div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Get system status and recent runs |
| `/zones/:id/start` | POST | Start a zone (body: `{ duration?: number }`) |
| `/zones/:id/stop` | POST | Stop a zone |
| `/schedules` | GET | Get all schedules |
| `/schedules` | POST | Create a schedule |
| `/schedules/:id` | PUT | Update a schedule |
| `/schedules/:id` | DELETE | Delete a schedule |
| `/rain-delay` | POST | Set rain delay (body: `{ hours: number }`) |
| `/rain-delay` | DELETE | Clear rain delay |
| `/logs` | GET | Get run logs (query: `?limit=number`) |

## 🛠️ Error Handling

All services and hooks include built-in error handling:

- **Network errors**: Caught and reported as `"Failed to connect to the backend"`
- **API errors**: Include status codes and error messages from the server
- **Type safety**: Full TypeScript support for request/response types

Errors are returned in the `error` field of hooks, or thrown as `ApiError` exceptions in services.

## 🧪 Testing API Connectivity

### Quick Test with Browser Console

1. Start the backend server: `npm run server`
2. Start the frontend: `npm run dev`
3. Open browser console and test:

```javascript
// Test status endpoint
fetch('http://localhost:3001/status')
  .then(r => r.json())
  .then(console.log);

// Test starting a zone
fetch('http://localhost:3001/zones/1/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ duration: 10 })
})
  .then(r => r.json())
  .then(console.log);
```

### Using the API in Components

Import and use the hooks in your React components for seamless integration with automatic loading states and error handling.

## 📝 Type Definitions

All request and response types are fully typed in `api/types.ts`. Import them as needed:

```typescript
import type { 
  SystemStatusResponse, 
  Schedule, 
  CreateScheduleRequest 
} from './api';
```

## 🔄 Polling and Real-Time Updates

The `useSystemStatus` hook includes automatic polling to keep the UI in sync with the backend:

```typescript
// Poll every 3 seconds
useSystemStatus({ pollingInterval: 3000 });

// Disable polling
useSystemStatus({ pollingInterval: 0 });
```

## 🎯 Next Steps for Integration

1. **Replace mock data** in existing components with hooks
2. **Add loading spinners** using `isLoading` from hooks
3. **Show error messages** using `error` from hooks
4. **Test each UI action** (start zone, create schedule, etc.)
5. **Verify backend responses** in browser network tab
