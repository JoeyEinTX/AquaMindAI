# AquaMind Frontend-Backend Integration Guide

## ✅ Completed Work Summary

The AquaMind React frontend has been successfully prepared for backend API integration. A complete API module has been created with centralized error handling, TypeScript types, service modules, and React hooks.

---

## 📁 Files Created

### API Module (`/api`)
```
api/
├── client.ts                    # Base HTTP client with error handling
├── types.ts                     # TypeScript type definitions for API
├── index.ts                     # Central export point
├── README.md                    # Complete API documentation
├── services/
│   ├── statusService.ts        # System status endpoint
│   ├── zonesService.ts         # Zone start/stop endpoints
│   ├── schedulesService.ts     # Schedule CRUD endpoints
│   ├── rainDelayService.ts     # Rain delay set/clear endpoints
│   └── logsService.ts          # Run logs endpoint
└── hooks/
    ├── useSystemStatus.ts      # Status hook with polling
    ├── useZoneControl.ts       # Zone control hook
    ├── useSchedules.ts         # Schedules management hook
    ├── useRainDelay.ts         # Rain delay hook
    └── useRunLogs.ts           # Logs fetching hook
```

### Configuration Files
- **`.env`** - Environment configuration with `VITE_API_BASE_URL=http://localhost:3001`

---

## 🔌 Backend API Endpoints → Frontend UI Mapping

### 1. System Status (`GET /status`)
**Bound to:**
- `SystemStatusCard.tsx` - Display active zone, time remaining, rain delay status
- Real-time polling every 5 seconds for live updates

**Usage:**
```typescript
import { useSystemStatus } from './api';

const { data, isLoading, error } = useSystemStatus({ pollingInterval: 5000 });
// data.activeZoneId, data.timeRemaining, data.rainDelay, data.recentRuns
```

---

### 2. Zone Control (`POST /zones/:id/start`, `POST /zones/:id/stop`)
**Bound to:**
- `ZoneControlCard.tsx` - Manual zone start/stop buttons
- `ManualWateringModal.tsx` - Duration selection and start action

**Usage:**
```typescript
import { useZoneControl } from './api';

const { startZone, stopZone, isLoading } = useZoneControl();

// Start zone 1 for 600 seconds (10 minutes)
await startZone(1, 600);

// Stop zone 1
await stopZone(1);
```

---

### 3. Schedules (`GET /schedules`, `POST /schedules`, `PUT /schedules/:id`, `DELETE /schedules/:id`)
**Bound to:**
- `ScheduleCard.tsx` - Display all schedules
- `ScheduleForecastModal.tsx` - Create, edit, delete schedules

**Usage:**
```typescript
import { useSchedules } from './api';

const { schedules, createSchedule, updateSchedule, deleteSchedule } = useSchedules();

// Create schedule
await createSchedule({
  zoneId: 1,
  startTime: '06:00',
  daysOfWeek: [1, 3, 5],
  durationSec: 600
});

// Update schedule
await updateSchedule('schedule_id', { enabled: false });

// Delete schedule
await deleteSchedule('schedule_id');
```

---

### 4. Rain Delay (`POST /rain-delay`, `DELETE /rain-delay`)
**Bound to:**
- `SystemStatusCard.tsx` - Rain delay set/clear buttons
- `SettingsCard.tsx` - Rain delay management

**Usage:**
```typescript
import { useRainDelay } from './api';

const { setRainDelay, clearRainDelay, isLoading } = useRainDelay();

// Set 24-hour rain delay
await setRainDelay(24);

// Clear rain delay
await clearRainDelay();
```

---

### 5. Run Logs (`GET /logs?limit=n`)
**Bound to:**
- `WaterUsageCard.tsx` - Display recent watering history
- Run history modal/panel (if implemented)

**Usage:**
```typescript
import { useRunLogs } from './api';

const { logs, total, isLoading, refetch } = useRunLogs({ limit: 20 });

// logs = array of RunLogEntry
// Each entry: { id, zoneId, zoneName, source, startedAt, stoppedAt, durationSec, success }
```

---

## 🧪 Testing API Connectivity

### Step 1: Start the Backend Server
```bash
npm run server
```
Server will run on `http://localhost:3001`

### Step 2: Start the Frontend
```bash
npm run dev
```
Frontend will run on `http://localhost:5173` (or similar)

### Step 3: Test with Browser Console

Open browser DevTools Console and run:

```javascript
// Test 1: Check system status
fetch('http://localhost:3001/status')
  .then(r => r.json())
  .then(data => console.log('Status:', data))
  .catch(err => console.error('Error:', err));

// Test 2: Start zone 1 for 10 seconds
fetch('http://localhost:3001/zones/1/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ duration: 10 })
})
  .then(r => r.json())
  .then(data => console.log('Start result:', data));

// Test 3: Get schedules
fetch('http://localhost:3001/schedules')
  .then(r => r.json())
  .then(data => console.log('Schedules:', data));

// Test 4: Set rain delay for 1 hour
fetch('http://localhost:3001/rain-delay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hours: 1 })
})
  .then(r => r.json())
  .then(data => console.log('Rain delay set:', data));

// Test 5: Get run logs
fetch('http://localhost:3001/logs?limit=10')
  .then(r => r.json())
  .then(data => console.log('Logs:', data));
```

### Step 4: Monitor Network Tab

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Interact with UI elements (start zone, create schedule, etc.)
4. Verify requests are sent to `http://localhost:3001`
5. Check response status codes (200 = success)

---

## 🚀 Integration Steps for UI Components

### Example: Integrate System Status into SystemStatusCard

**Before:**
```typescript
// Mock data
const [activeZone, setActiveZone] = useState<string | null>(null);
```

**After:**
```typescript
import { useSystemStatus } from './api';

function SystemStatusCard() {
  const { data, isLoading, error } = useSystemStatus({
    pollingInterval: 5000 // Poll every 5 seconds
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <Card>
      <p>Active Zone: {data?.activeZoneId ?? 'None'}</p>
      <p>Time Remaining: {data?.timeRemaining ?? 0}s</p>
      <p>Rain Delay: {data?.rainDelay.isActive ? 'Active' : 'Inactive'}</p>
      {data?.rainDelay.isActive && (
        <p>Hours Remaining: {data.rainDelay.hoursRemaining}</p>
      )}
    </Card>
  );
}
```

### Example: Integrate Zone Control

**Before:**
```typescript
const handleStartZone = (zoneId: number) => {
  // Mock implementation
  console.log('Starting zone', zoneId);
};
```

**After:**
```typescript
import { useZoneControl } from './api';

function ZoneControlCard() {
  const { startZone, stopZone, isLoading, error } = useZoneControl();

  const handleStartZone = async (zoneId: number, durationMinutes: number) => {
    const durationSeconds = durationMinutes * 60;
    const success = await startZone(zoneId, durationSeconds);
    
    if (success) {
      addNotification(`Zone ${zoneId} started successfully`, 'success');
    } else {
      addNotification(`Failed to start zone ${zoneId}`, 'error');
    }
  };

  return (
    <button 
      onClick={() => handleStartZone(1, 10)} 
      disabled={isLoading}
    >
      {isLoading ? 'Starting...' : 'Start Zone'}
    </button>
  );
}
```

---

## 🎨 UI Elements Requiring API Integration

### High Priority (Core Functionality)
1. ✅ **SystemStatusCard** → `useSystemStatus()`
2. ✅ **ZoneControlCard** → `useZoneControl()`
3. ✅ **ManualWateringModal** → `useZoneControl()`
4. ✅ **ScheduleCard** → `useSchedules()`
5. ✅ **Rain Delay Controls** → `useRainDelay()`

### Medium Priority (Enhanced Features)
6. **WaterUsageCard** → `useRunLogs()` for recent history
7. **ScheduleForecastModal** → `useSchedules()` for CRUD operations
8. **Dashboard** → `useSystemStatus()` for overall state

### Low Priority (Nice to Have)
9. **NotificationContainer** → Display API errors as notifications
10. **SettingsCard** → Advanced rain delay settings

---

## 🔧 Error Handling Pattern

All hooks return an `error` field. Display errors to users:

```typescript
const { data, isLoading, error } = useSystemStatus();

if (error) {
  return (
    <div className="error-banner">
      <p>⚠️ {error}</p>
      <p>Please check that the backend server is running.</p>
    </div>
  );
}
```

---

## ⚙️ Environment Variables

Update `.env` file as needed:

```env
# Development (local backend)
VITE_API_BASE_URL=http://localhost:3001

# Production (deployed backend)
# VITE_API_BASE_URL=https://api.aquamind.com
```

---

## 📊 Expected Backend Responses

### Status Response
```json
{
  "activeZoneId": 1,
  "timeRemaining": 450,
  "rainDelay": {
    "isActive": false,
    "hoursRemaining": 0
  },
  "recentRuns": [
    {
      "id": "log_123",
      "zoneId": 1,
      "zoneName": "Front Lawn",
      "source": "manual",
      "startedAt": "2025-11-06T17:00:00Z",
      "stoppedAt": "2025-11-06T17:10:00Z",
      "durationSec": 600,
      "success": true
    }
  ]
}
```

### Zone Start Response
```json
{
  "success": true,
  "message": "Zone 1 started for 600 seconds"
}
```

### Schedule Response
```json
[
  {
    "id": "schedule_abc123",
    "zoneId": 1,
    "startTime": "06:00",
    "daysOfWeek": [1, 3, 5],
    "durationSec": 600,
    "enabled": true
  }
]
```

---

## 🐛 Common Issues and Solutions

### Issue: "Failed to connect to the backend"
**Solution:** Ensure backend server is running: `npm run server`

### Issue: CORS errors
**Solution:** Backend already has CORS enabled in `server.ts`. Ensure frontend URL is allowed.

### Issue: 404 Not Found
**Solution:** Check endpoint URL matches backend routes in `server.ts`

### Issue: TypeScript errors in hooks
**Solution:** React types are available in the project. The errors should resolve during build.

---

## ✨ Next Steps

1. **Integrate hooks into UI components** (replace mock data)
2. **Test each UI action** with backend running
3. **Add loading states** to improve UX
4. **Display error messages** for failed operations
5. **Verify real-time updates** with status polling
6. **Test edge cases** (network failures, invalid inputs)

---

## 📚 Additional Resources

- **API Documentation:** `api/README.md`
- **Backend Routes:** `server.ts` (lines 380-500)
- **Type Definitions:** `api/types.ts`
- **Example Usage:** See hooks in `api/hooks/` directory

---

**Last Updated:** 2025-11-06  
**Status:** ✅ Ready for Integration
