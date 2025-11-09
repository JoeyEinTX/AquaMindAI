# AquaMind Showcase Mode Guide

## Overview

Showcase Mode is a special configuration designed for presentations, demonstrations, and deployment previews. It pre-loads demo data, disables destructive actions, and enhances the UI with additional features to create an impressive, polished experience.

## Features

### ✨ What's Included in Showcase Mode

1. **Pre-loaded Demo Data**
   - 5 configured irrigation zones with realistic settings
   - 7-day weather forecast with varied conditions
   - AI-optimized watering schedule
   - Historical run logs
   - Smart AI suggestions with priority levels

2. **Enhanced UI Elements**
   - AI Suggestions Panel with color-coded priority badges
   - Demo system metrics and statistics
   - Polished animations and transitions
   - Professional visual polish

3. **Safety Features**
   - Blocks real API calls for scheduling
   - Prevents actual relay control operations
   - Uses simulated data instead of live weather
   - Safe for public demonstrations

4. **Automatic Onboarding**
   - First-time visitors see guided walkthrough
   - Highlights key features and capabilities
   - Dismissible and stored in localStorage

## Enabling Showcase Mode

### Option 1: Environment Variable

Add to your `.env` file:

```bash
VITE_SHOWCASE_MODE=true
```

### Option 2: Production Build

Add to your `.env.production` file:

```bash
VITE_SHOWCASE_MODE=true
```

### Option 3: Runtime Toggle

For development, you can set it directly:

```bash
# Windows (PowerShell)
$env:VITE_SHOWCASE_MODE="true"
npm run dev

# Linux/Mac
VITE_SHOWCASE_MODE=true npm run dev
```

## Running in Showcase Mode

### Development
```bash
# Add VITE_SHOWCASE_MODE=true to .env
npm run dev
```

### Production Build
```bash
# Ensure VITE_SHOWCASE_MODE=true in .env.production
npm run build
npm start
```

### Docker Deployment
```bash
# Build with showcase mode
docker build -t aquamind-showcase --build-arg VITE_SHOWCASE_MODE=true .

# Run container
docker run -p 3000:3000 aquamind-showcase
```

## Demo Data Overview

### Zones (5 zones configured)
1. **Front Lawn** - Spray system, full sun
2. **Flower Garden** - Drip system, partial shade
3. **Vegetable Garden** - Drip system, full sun, high water needs
4. **Backyard Lawn** - Rotor system, partial shade
5. **Side Garden** - Drip system, full shade, low water needs

### Weather Data
- Current: 78°F, Partly Cloudy, 65% humidity
- 7-day forecast with realistic precipitation patterns
- Recent rainfall: 0.12"

### AI Suggestions (4 active)
1. **High Priority**: Rain expected - adjust schedule
2. **Medium Priority**: Optimal watering time detected
3. **Low Priority**: Water conservation opportunity
4. **Low Priority**: Zone performance analysis

### Watering Schedule
- 5-day optimized schedule
- Mix of AI and user adjustments (demonstrating annotation system)
- Realistic durations based on zone types
- Calculated water usage per event

## Presentation Tips

### For Live Demonstrations

1. **Start with Onboarding**
   - Clear localStorage before demo to trigger walkthrough
   - Let visitors experience the guided tour
   ```javascript
   localStorage.removeItem('hasSeenOnboarding')
   ```

2. **Highlight Key Features**
   - Point out the AI Suggestions panel with priority badges
   - Show the System Status overview
   - Demonstrate voice control (if enabled)
   - Explore the schedule view with annotations

3. **Emphasize AI Intelligence**
   - Explain the color-coded priority system:
     - 🔴 Red (High): Urgent actions needed
     - 🟡 Yellow (Medium): Recommendations
     - 🟢 Green (Low): Optimizations
   - Show how AI learns and adapts

4. **Show Real-Time Updates**
   - Open the AI Assistant panel
   - Demonstrate the floating button animation
   - Show the chat interface (no real AI calls in showcase)

### For Static Presentations

1. **Screenshots**
   - Dashboard with all zones active
   - AI Suggestions panel with varied priorities
   - Schedule view showing the week ahead
   - Assistant panel opened with chat history

2. **Video Walkthrough**
   - Record a 2-3 minute tour
   - Highlight smooth transitions and animations
   - Show the onboarding experience
   - Demonstrate responsive design

## Customizing Demo Data

Edit `utils/showcaseMode.ts` to customize:

### Weather Data
```typescript
export const getDemoWeather = (): WeatherData => ({
  current: {
    temp: 78, // Change temperature
    description: 'Partly Cloudy', // Weather description
    // ... other properties
  },
  // ... forecast data
});
```

### Zones
```typescript
export const getDemoZones = (): SprinklerZone[] => [
  {
    id: 1,
    name: 'Your Zone Name',
    // ... customize zone properties
  },
  // ... more zones
];
```

### AI Suggestions
```typescript
export const getDemoSuggestions = (): DemoSuggestion[] => [
  {
    title: 'Your Suggestion',
    description: 'Description here',
    priority: 'high', // 'high' | 'medium' | 'low'
    category: 'efficiency', // 'efficiency' | 'optimization' | 'maintenance' | 'alert'
  },
  // ... more suggestions
];
```

## Disabling Showcase Mode

Simply remove or set to false:

```bash
# .env or .env.production
VITE_SHOWCASE_MODE=false
```

Or remove the line entirely. The app will revert to normal operation with real API calls and user data.

## Differences from Production Mode

| Feature | Production Mode | Showcase Mode |
|---------|----------------|---------------|
| Weather Data | Real API calls | Pre-loaded demo |
| Zone Control | Real relay control | Disabled/simulated |
| AI Scheduling | Live Gemini API | Blocked (uses demo) |
| User Data | Persistent (localStorage) | Demo data |
| AI Suggestions | None (unless enabled) | Always visible |
| Onboarding | One-time on first visit | Resetable for demos |

## Troubleshooting

### Showcase Mode Not Activating

1. Check environment variable is set:
   ```bash
   echo $VITE_SHOWCASE_MODE  # Linux/Mac
   echo %VITE_SHOWCASE_MODE%  # Windows CMD
   ```

2. Verify in browser console:
   ```javascript
   console.log(import.meta.env.VITE_SHOWCASE_MODE)
   ```

3. Clear build cache:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### Demo Data Not Loading

1. Check browser console for errors
2. Verify `utils/showcaseMode.ts` is properly imported
3. Clear localStorage and refresh
4. Check that zones are being set from `getDemoZones()`

### Onboarding Not Showing

Clear the flag:
```javascript
localStorage.removeItem('hasSeenOnboarding')
```
Then refresh the page.

## Best Practices

1. **Always use Showcase Mode for public demos** - Prevents accidental real system control
2. **Test before presenting** - Verify all demo data loads correctly
3. **Clear onboarding flag** - Reset before each new audience
4. **Customize for audience** - Adjust demo data to match presentation context
5. **Prepare backup** - Have screenshots ready if live demo has issues

## Security Considerations

- Showcase Mode disables real system control
- No actual relay operations are performed
- Weather API calls are bypassed
- Safe for untrusted environments
- Consider using separate API keys for production vs demo

## Summary

Showcase Mode transforms AquaMind into a presentation-ready experience with:
- ✅ Professional polish and animations
- ✅ Pre-loaded realistic demo data
- ✅ Safe, non-destructive operations
- ✅ Enhanced UI with AI suggestions
- ✅ Guided onboarding walkthrough

Perfect for:
- 🎯 Live demonstrations
- 🎯 Client presentations
- 🎯 Trade show displays
- 🎯 Video recordings
- 🎯 Portfolio showcases

---

**Next Steps**: Enable showcase mode, customize demo data to your needs, and create an impressive demonstration of AquaMind's capabilities!
