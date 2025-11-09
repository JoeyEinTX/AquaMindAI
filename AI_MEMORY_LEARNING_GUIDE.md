# AquaMind AI Memory & Learning System

**Adaptive Intelligence for Personalized Irrigation Management**

## Overview

The AquaMind AI Assistant now features an adaptive memory and learning system that improves recommendations over time by remembering user preferences, tracking interaction patterns, and learning from user behavior.

## Architecture

### Memory Engine (`services/memoryEngine.ts`)

The core of the system is the `MemoryEngine` class that manages:

- **Short-Term Memory**: In-memory storage for current session (max 50 entries)
- **Long-Term Memory**: Persistent storage in `ai-memory.json` (max 500 entries)
- **Learned Patterns**: Behavioral patterns with confidence scores
- **Automatic Learning**: Analyzes interactions to identify user preferences

### Memory Entry Structure

```typescript
{
  id: string;              // Unique identifier
  timestamp: string;       // ISO timestamp
  source: string;          // e.g., 'chat', 'zone_control', 'schedule'
  content: string;         // Human-readable description
  type: 'preference' | 'feedback' | 'observation';
  weight: number;          // 0-1, importance score
  metadata?: object;       // Additional context
}
```

### Behavior Pattern

```typescript
{
  pattern: string;         // Description (e.g., "prefers_short_durations")
  confidence: number;      // 0-1, how certain we are
  evidence: string[];      // Memory IDs supporting this
  lastReinforced: string;  // ISO timestamp
}
```

## Features

### 1. Memory Types

**Preference Memories**
- User-stated preferences (e.g., "I prefer Zone 3 to run shorter")
- Explicit settings and choices
- Weight: Typically 0.7-0.9

**Feedback Memories**
- Whether user followed or ignored AI recommendations
- Action confirmations and rejections
- Weight: 0.7 for followed, 0.3 for rejected

**Observation Memories**
- System-detected patterns
- Unusual behaviors or trends
- Weight: Typically 0.5-0.6

### 2. Learning Patterns

The system automatically detects and learns:

- **`prefers_short_durations`**: User consistently runs zones for shorter times
- **`zone_X_short_runs`**: Specific zone preferences (e.g., Zone 3 runs short)
- **`rain_aware`**: User follows rain-based watering recommendations
- **`morning_watering_preference`**: User prefers morning schedules
- **`zone_X_often_cancelled`**: Zones frequently stopped early (>30% rate)

### 3. Context Injection

Memory data is automatically injected into AI chat prompts when:
- Learning is enabled (`LEARNING_ENABLED=true`)
- Relevant memories exist (filtered by recency and weight)
- Patterns have sufficient confidence (≥60%)

## API Endpoints

### Get Memory Data
```http
GET /ai/memory
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalMemories": 25,
    "preferenceCount": 5,
    "feedbackCount": 15,
    "observationCount": 5,
    "lastUpdated": "2025-11-07T21:30:00Z",
    "learningEnabled": true
  },
  "memories": [...],  // Most recent 50
  "patterns": [...]   // Confidence ≥50%
}
```

### Clear Memory
```http
DELETE /ai/memory
Content-Type: application/json

{
  "clearType": "short-term" | "all"
}
```

### Record Feedback
```http
POST /ai/memory/feedback
Content-Type: application/json

{
  "action": "reduce watering for Zone 3",
  "followed": true,
  "context": {
    "zoneId": 3,
    "durationSec": 300
  }
}
```

### Update Learning Settings
```http
PUT /ai/memory/settings
Content-Type: application/json

{
  "enabled": true | false
}
```

## Configuration

### Environment Variables

```bash
# .env
LEARNING_ENABLED=true  # Enable persistent memory storage
```

- **`true`** (default): Memory persists to disk in `ai-memory.json`
- **`false`**: Memory disabled, no persistent storage

### Memory Files

- **`ai-memory.json`**: Long-term memory and patterns (persistent)
- Location: Project root directory
- Format: JSON with memories and patterns

## Example Learned Behaviors

### Scenario 1: Short Duration Preference

**User Actions:**
1. Manually starts Zone 3 for 5 minutes (instead of default 10)
2. Repeatedly stops zones early
3. Creates schedules with shorter durations

**System Learns:**
- Pattern: `prefers_short_durations` (confidence: 75%)
- Pattern: `zone_3_short_runs` (confidence: 80%)

**Future Recommendations:**
- AI suggests shorter durations for Zone 3
- Advisory engine adjusts recommendations
- Default suggestions favor 5-minute runs

### Scenario 2: Rain-Aware User

**User Actions:**
1. Follows rain delay recommendations
2. Skips scheduled runs when rain is forecast
3. Adjusts schedules based on weather

**System Learns:**
- Pattern: `rain_aware` (confidence: 85%)

**Future Recommendations:**
- AI prioritizes weather-based advisories
- More aggressive rain delay suggestions
- Proactive schedule adjustments

### Scenario 3: Morning Watering

**User Actions:**
1. Always creates morning schedules (6-9 AM)
2. Moves afternoon schedules to morning
3. Runs manual watering in early hours

**System Learns:**
- Pattern: `morning_watering_preference` (confidence: 90%)

**Future Recommendations:**
- AI suggests morning times for new schedules
- Advisory emphasizes morning watering benefits
- Default suggestions favor 6-9 AM window

## Privacy & Control

### Data Storage

- All memory is stored locally in `ai-memory.json`
- No external services or cloud storage
- Data remains on your server/device
- Can be deleted at any time

### Logging

All memory operations are logged with `[AI][MEMORY]` prefix:
```
[AI][MEMORY] Added feedback memory: "User followed AI recommendation..."
[AI][MEMORY] Pattern "prefers_short_durations" reinforced to 75.0% confidence
[AI][MEMORY] Loaded 125 memories and 8 patterns from disk
```

### User Controls

Users can:
1. **View Memory**: See all stored memories and patterns
2. **Clear Short-Term**: Remove session data only
3. **Clear All**: Complete memory reset
4. **Disable Learning**: Prevent persistent storage
5. **Manual Control**: Override any AI suggestion

## Implementation Details

### Memory Rotation

- **Short-Term**: Keeps most recent 50 entries
- **Long-Term**: Keeps most recent 500 entries
- Oldest entries automatically pruned
- Pattern confidence decays if not reinforced

### Weight Calculation

```typescript
// Followed actions = higher weight
weight = followed ? 0.7 : 0.3

// Confidence adjustment
delta = reinforce ? +0.1 : -0.15  // Penalize ignoring more
confidence = clamp(confidence + delta, 0, 1)
```

### Context Filtering

When injecting into AI:
1. Get top 10 most relevant memories
2. Filter by type, source, and weight
3. Sort by recency and importance
4. Format for natural language context
5. Include patterns with ≥60% confidence

## Testing Memory Functions

### Manual Testing

1. **Start the Server**
   ```bash
   npm run dev
   ```

2. **View Current Memory**
   ```bash
   curl http://localhost:3001/ai/memory
   ```

3. **Record a Test Interaction**
   ```bash
   curl -X POST http://localhost:3001/ai/memory/feedback \
     -H "Content-Type: application/json" \
     -d '{"action":"test action","followed":true,"context":{"test":true}}'
   ```

4. **Check Memory File**
   ```bash
   cat ai-memory.json
   ```

5. **Clear Memory**
   ```bash
   curl -X DELETE http://localhost:3001/ai/memory \
     -H "Content-Type: application/json" \
     -d '{"clearType":"all"}'
   ```

### Automated Behavior

The system automatically:
- Records zone starts/stops
- Tracks advisory follow-through
- Analyzes schedule creation patterns
- Monitors cancellation rates
- Updates pattern confidence scores

## Integration with Existing Features

### AI Chat

Memory context is automatically included in chat prompts:
- Recent user preferences
- Learned behavioral patterns
- Past feedback and responses

### Advisory Engine

Advisories can be enhanced with memory data:
- Adjust recommendations based on patterns
- Reference past user actions
- Tailor suggestions to preferences

### Zone Control

Future enhancement opportunity:
- Suggest durations based on zone history
- Warn about patterns (e.g., "Zone 3 often cancelled")
- Auto-adjust defaults per zone

## Frontend Integration (Future)

### Memory Settings Panel

Add to System Status Card:
```tsx
<MemorySettings>
  <Toggle enabled={learningEnabled} onChange={...} />
  <Button onClick={clearShortTerm}>Forget Recent Data</Button>
  <Stats>
    <div>Total Memories: {stats.totalMemories}</div>
    <div>Patterns Learned: {patterns.length}</div>
  </Stats>
</MemorySettings>
```

### Memory Viewer

Create inspection interface:
```tsx
<MemoryViewer>
  <MemoryList memories={memories} />
  <PatternList patterns={patterns} />
  <ClearButton type="all" />
</MemoryViewer>
```

## Best Practices

### For Developers

1. **Always log memory operations** with `[AI][MEMORY]` prefix
2. **Use meaningful content** strings for memories
3. **Include relevant metadata** for context
4. **Set appropriate weights** (0.5 default, 0.7+ important)
5. **Test patterns** with simulated user behaviors

### For Users

1. **Review memory periodically** via API or future UI
2. **Clear memory** if behavior changes significantly
3. **Disable learning** if privacy concerns arise
4. **Provide feedback** through natural interactions
5. **Trust the system** - patterns need time to develop

## Troubleshooting

### Memory Not Persisting

**Problem**: Changes not saved to disk
**Solution**: Check `LEARNING_ENABLED=true` in `.env`

### Poor Recommendations

**Problem**: AI doesn't seem to learn
**Solution**: 
- Need more interactions (10+ minimum)
- Clear old memories if behavior changed
- Check pattern confidence levels

### Memory File Corruption

**Problem**: `ai-memory.json` appears invalid
**Solution**:
```bash
# Backup first
cp ai-memory.json ai-memory.backup.json

# Delete and restart
rm ai-memory.json
# Server will create new file on next memory operation
```

### High Memory Usage

**Problem**: Too many memories consuming resources
**Solution**:
- Automatic rotation (500 max)
- Manual cleanup via API
- Reduce `maxLongTermEntries` in code if needed

## Future Enhancements

1. **Pattern Discovery**: ML-based pattern detection
2. **Collaborative Learning**: Learn from multiple users (opt-in)
3. **Export/Import**: Share patterns between installations  
4. **Advanced Analytics**: Visualize learning over time
5. **Predictive Suggestions**: Proactive recommendations
6. **Voice Context**: Remember voice command preferences
7. **Seasonal Patterns**: Learn across growing seasons

## Summary

The AquaMind AI Memory & Learning System provides:

✅ **Persistent Memory**: Remembers across sessions
✅ **Behavior Learning**: Identifies patterns automatically
✅ **Context-Aware AI**: Tailored recommendations
✅ **Privacy First**: Local storage, user control
✅ **Transparent Logging**: All operations logged
✅ **Simple Configuration**: Single env variable

The system learns from every interaction, continuously improving recommendations to match your unique watering preferences and habits.
