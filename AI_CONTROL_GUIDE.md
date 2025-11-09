# AquaMind AI Control System - Implementation Guide

## Overview

The AquaMind AI Assistant has been upgraded with natural language command interpretation and real backend action execution. Users can now control their irrigation system through conversational commands like "run zone 3 for 10 minutes" or "pause watering for 2 hours".

## Architecture

### Intent Parsing Layer (`services/intentParser.ts`)

**Purpose**: Classifies user messages into actionable intents using regex pattern matching.

**Supported Intents**:
- `startZone` - Start watering a specific zone
- `stopZone` - Stop a zone or all zones
- `setRainDelay` - Activate rain delay
- `clearRainDelay` - Clear active rain delay
- `createSchedule` - Create a new watering schedule
- `getStatus` - Query current system status
- `unknown` - No actionable intent detected

**Key Functions**:
- `parseIntent(text: string): ParsedIntent` - Main parsing function
- `validateIntent(intent: ParsedIntent)` - Validates parameters before execution
- `generateConfirmationMessage()` - Creates user-friendly confirmation prompts

**Example Patterns**:
```typescript
// Start Zone
"run zone 3 for 10 minutes"
"turn on zone 2"
"water zone 1 for 5 mins"

// Stop Zone
"stop zone 3"
"turn off all zones"

// Rain Delay
"set rain delay for 24 hours"
"pause watering for 1 day"
"clear rain delay"

// Schedule
"create schedule zone 1 at 6:00 AM every Monday for 15 minutes"
```

### Execution Pipeline (Backend)

**Enhanced `/ai/chat` Endpoint** (`server.ts`)

Flow:
1. Receive user message
2. Parse intent using `parseIntent()`
3. If actionable intent detected:
   - Validate parameters with `validateIntent()`
   - Check if confirmation required
   - If confirmation needed → Return confirmation message
   - If no confirmation needed → Execute immediately
4. If no intent detected → Use Gemini AI for conversational response
5. Log all AI-triggered actions with `[AI][ACTION]` prefix

**Action Execution** (`executeAction()` function)

Maps intents to backend services:
- `startZone` → `zoneManager.startZone()`
- `stopZone` → `zoneManager.stopZone()`
- `setRainDelay` → `zoneManager.setRainDelay()`
- `clearRainDelay` → `zoneManager.setRainDelay(false)`
- `createSchedule` → `zoneManager.createSchedule()`
- `getStatus` → `zoneManager.getStatus()`

Returns formatted response with success/error indication (✓/✗ icons).

### Frontend Integration

**Enhanced `useAssistantChat` Hook** (`api/hooks/useAssistantChat.ts`)

**New Features**:
- `confirmAction(messageId: string)` - Confirms and executes pending actions
- Enhanced `ChatMessage` interface with:
  - `actionExecuted?: boolean` - Marks executed actions
  - `requiresConfirmation?: boolean` - Indicates pending confirmation
  - `pendingAction?: { intent, parameters }` - Stores action details

**Updated `AssistantPanel` Component** (`components/AssistantPanel.tsx`)

**Visual Indicators**:
1. **Action Executed Messages**
   - Green background (`bg-green-50`)
   - Lightning bolt icon
   - "Action Executed" label

2. **Confirmation Messages**
   - Two-button interface (Confirm/Cancel)
   - Disabled during loading
   - Auto-scroll to new messages

## Confirmation Flow

### When Confirmation is Required

Confirmations are enforced for:
1. Zone runs > 10 minutes (`durationSec > 600`)
2. Multiple-zone operations (e.g., "stop all zones")
3. Schedule creation (any schedule)

### Confirmation Process

```
User: "run zone 3 for 15 minutes"
  ↓
AI: "Confirm: Start Zone 3 for 15 minutes?" [Confirm] [Cancel]
  ↓ (user clicks Confirm)
AI: "✓ Started Zone 3 for 15 minutes" (with green highlight)
```

### Implementation Details

1. Backend returns `requiresConfirmation: true` with `intent` and `parameters`
2. Frontend displays message with Confirm/Cancel buttons
3. On Confirm, frontend calls `/ai/chat` with `confirmAction` payload
4. Backend executes action and returns result
5. Result displayed with "Action Executed" badge

## Security & Safety

### Built-in Protections

1. **Input Sanitization**
   - HTML tag removal on both frontend and backend
   - Character limit (2000 chars)
   - XSS prevention

2. **Parameter Validation**
   - Zone IDs: Must be 1-4
   - Duration: Max 60 minutes (3600 seconds)
   - Rain delay: Max 168 hours (7 days)
   - Time format validation for schedules

3. **Confirmation Requirements**
   - Long-running operations require explicit approval
   - Multi-zone operations require confirmation
   - Schedule creation requires confirmation

4. **Comprehensive Logging**
   - All AI actions logged with `[AI][ACTION]` prefix
   - Source tracking: Actions marked as `source: 'manual'` in logs
   - Console output for debugging: `[AI][ACTION] Zone X started via AI command`

### Log Examples

```
[AI] Processing chat request: run zone 3 for 10 minutes
[AI] Parsed intent: startZone Confidence: 0.9
[AI][ACTION] Zone 3 started via AI command
[LOG] ✓ Zone 3 ran for 600 seconds (manual)
```

## Testing Locally

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test Natural Language Commands

**Basic Zone Control**:
```
"start zone 1"
"run zone 2 for 5 minutes"
"stop zone 3"
"turn off all zones"
```

**Rain Delay**:
```
"set rain delay for 2 hours"
"pause watering for 1 day"
"clear rain delay"
"resume watering"
```

**Status Queries**:
```
"what's running?"
"show status"
"is anything active?"
```

**Schedule Creation**:
```
"create schedule zone 1 at 6:00 AM every Monday for 15 minutes"
"add schedule for zone 2 at 18:00 on weekdays for 10 minutes"
```

### 3. Verify Confirmation Flow

Try a long-duration command:
```
"run zone 1 for 20 minutes"
```

Expected behavior:
1. AI responds with confirmation prompt
2. Confirm/Cancel buttons appear
3. Click Confirm
4. See green "Action Executed" message
5. Zone starts running

### 4. Check Console Logs

Backend logs show intent parsing and execution:
```
[AI] Processing chat request: run zone 3 for 10 minutes
[AI] Parsed intent: startZone Confidence: 0.9
[AI][ACTION] Zone 3 started via AI command
```

### 5. Verify Run Logs

Check `run-logs.json` - AI-triggered runs are logged as `source: "manual"`:
```json
{
  "id": "log_...",
  "zoneId": 3,
  "zoneName": "Zone 3",
  "source": "manual",
  "startedAt": "2025-01-07T...",
  "durationSec": 600,
  "success": true
}
```

## API Response Format

### Standard Response (No Action)
```json
{
  "success": true,
  "response": "Zone 1 is currently running with 5m 23s remaining.",
  "timestamp": "2025-01-07T..."
}
```

### Confirmation Required Response
```json
{
  "success": true,
  "response": "Confirm: Start Zone 3 for 15 minutes?",
  "intent": "startZone",
  "parameters": {
    "zoneId": 3,
    "durationSec": 900
  },
  "requiresConfirmation": true,
  "timestamp": "2025-01-07T..."
}
```

### Action Executed Response
```json
{
  "success": true,
  "response": "✓ Started Zone 3 for 15 minutes",
  "actionExecuted": true,
  "intent": "startZone",
  "timestamp": "2025-01-07T..."
}
```

## New/Modified Files

### New Files
- `services/intentParser.ts` - Intent parsing engine
- `AI_CONTROL_GUIDE.md` - This documentation

### Modified Files
- `server.ts` - Enhanced /ai/chat endpoint with action execution
- `api/hooks/useAssistantChat.ts` - Added confirmation support
- `components/AssistantPanel.tsx` - Visual indicators and confirmation UI

## Supported Intents - Complete Reference

### 1. Start Zone
**Intent**: `startZone`  
**Patterns**:
- "start zone {id}"
- "run zone {id} for {duration} {minutes|seconds}"
- "turn on zone {id}"
- "activate zone {id}"
- "water zone {id}"

**Parameters**:
- `zoneId`: 1-4
- `durationSec`: Duration in seconds (default: 600 = 10 min)

**Confirmation**: Required if duration > 10 minutes

**Examples**:
- "run zone 3 for 10 minutes" → No confirmation
- "start zone 2 for 30 minutes" → Requires confirmation

### 2. Stop Zone
**Intent**: `stopZone`  
**Patterns**:
- "stop zone {id}"
- "turn off zone {id}"
- "stop all zones"
- "turn off everything"

**Parameters**:
- `zoneId`: 1-4 or "all"

**Confirmation**: Required for "all" zones

**Examples**:
- "stop zone 3" → No confirmation
- "stop all zones" → Requires confirmation

### 3. Rain Delay
**Intent**: `setRainDelay`  
**Patterns**:
- "set rain delay for {hours} hours"
- "pause watering for {hours|days}"
- "delay irrigation for {hours}"

**Parameters**:
- `hours`: 1-168 (1 hour to 7 days)

**Confirmation**: Not required

**Examples**:
- "set rain delay for 24 hours"
- "pause watering for 2 days" (converts to 48 hours)

### 4. Clear Rain Delay
**Intent**: `clearRainDelay`  
**Patterns**:
- "clear rain delay"
- "remove rain delay"
- "resume watering"
- "continue irrigation"

**Parameters**: None

**Confirmation**: Not required

### 5. Create Schedule
**Intent**: `createSchedule`  
**Patterns**:
- "create schedule zone {id} at {HH:MM} on {days} for {duration}"
- "add schedule for zone {id} at {time} every {day}"

**Parameters**:
- `zoneId`: 1-4
- `startTime`: HH:MM format (24-hour)
- `daysOfWeek`: Array of 0-6 (0=Sunday)
- `durationSec`: Duration in seconds

**Confirmation**: Always required

**Day Aliases**:
- "weekday" → [1,2,3,4,5]
- "weekend" → [0,6]
- "day" → [0,1,2,3,4,5,6]
- Individual days: "monday", "tuesday", etc.

**Examples**:
- "create schedule zone 1 at 6:00 AM every Monday for 15 minutes"
- "add schedule for zone 2 at 18:00 on weekdays for 10 minutes"

### 6. Get Status
**Intent**: `getStatus`  
**Patterns**:
- "what's running?"
- "show status"
- "check current status"
- "is anything active?"

**Parameters**: None

**Confirmation**: Not required

**Response**: Detailed status including active zones, time remaining, and rain delay info

## Troubleshooting

### Issue: Commands not being recognized

**Solution**: Check intent patterns in `services/intentParser.ts`. Add new patterns if needed.

### Issue: Action not executing after confirmation

**Solution**: Check browser console for errors. Verify backend logs show `[AI][ACTION]` messages.

### Issue: Confirmation buttons not appearing

**Solution**: Verify `requiresConfirmation` logic in `intentParser.ts` and that the frontend hook properly handles the response.

### Issue: Run logs not showing AI-triggered actions

**Solution**: Check that `source` parameter is being passed correctly in `zoneManager.startZone()` calls.

## Future Enhancements

Potential improvements:
1. Voice input support
2. Multi-step action sequences ("water all zones sequentially")
3. Conditional logic ("if rain tomorrow, cancel schedule")
4. Historical data queries ("how much did we water last week?")
5. Integration with weather forecasts for smart scheduling
6. Custom intent patterns via configuration file
7. Multi-language support
8. Action history and undo capabilities

## Summary

The AI Control System successfully enables:
- ✅ Natural language command interpretation
- ✅ Real backend action execution
- ✅ User confirmation for critical operations
- ✅ Visual feedback for executed actions
- ✅ Comprehensive logging and security
- ✅ Seamless integration with existing backend services

Users can now control their irrigation system conversationally while maintaining safety through confirmations and validation.
