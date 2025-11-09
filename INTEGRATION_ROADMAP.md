# AquaMind Glassmorphic Experience - Integration Roadmap

## 🎯 Overview

This document provides step-by-step integration instructions for connecting the 5 completed phases into a fully functional, immersive experience.

**Phases Completed:**
1. ✅ Theme Foundation (ThemeEngine, AmbientBackground)
2. ✅ Glass Components (GlassyCard, WeatherCard, SystemStatusCard)
3. ✅ Ambient Atmosphere (LightEngine, seasonal particles)
4. ✅ AI-Reactive Interface (aiMoodEngine, mood animations)
5. ✅ Cinematic Transitions & Audio (transitionEngine, audioEngine)

---

## 📋 Integration Checklist

### Phase 1-3: Already Integrated ✅
- [x] ThemeEngine in App.tsx
- [x] AmbientBackground rendering
- [x] LightEngine applying CSS variables
- [x] Seasonal particles conditional rendering
- [x] GlassyCard components in use

### Phase 4: AI Mood Integration (Next Steps)

**Step 1: Initialize Mood Engine in App.tsx**
```typescript
// Add to imports
import { aiMoodEngine, applyMoodLighting } from './services/aiMoodEngine';
import { useAIMood, useAIMoodColors } from './services/aiMoodEngine';

// In App component
useEffect(() => {
  // Apply mood lighting when mood changes
  const moodColors = aiMoodEngine.getMoodColors();
  applyMoodLighting(moodColors);
}, []);

// Subscribe to mood updates
const mood = useAIMood();
const moodColors = useAIMoodColors();

useEffect(() => {
  applyMoodLighting(moodColors);
}, [moodColors]);
```

**Step 2: Connect to System Health**
```typescript
// In App.tsx where system health is available
import { useSystemHealth } from './api';

const { health } = useSystemHealth();

useEffect(() => {
  if (health) {
    aiMoodEngine.onSystemHealth(health.cpuPercent, health.tempC);
  }
}, [health]);
```

**Step 3: Integrate with AssistantPanel**
```typescript
// In components/AssistantPanel.tsx or similar

import { aiMoodEngine } from '../services/aiMoodEngine';
import { useAIMood } from '../services/aiMoodEngine';

// When user starts typing/AI responds
const handleSendMessage = async (message: string) => {
  aiMoodEngine.onAITyping(); // Trigger typing state
  
  const response = await sendToAI(message);
  
  // Analyze sentiment (simple example)
  const sentiment = analyzeSentiment(response); // 'positive' | 'negative' | 'neutral'
  aiMoodEngine.onAIResponse(sentiment);
};

// When AI executes action
const handleAIAction = (actionType: 'command' | 'adjustment' | 'advisory') => {
  aiMoodEngine.onAIAction(actionType);
};

// Use mood in UI
const mood = useAIMood();

return (
  <div className={mood.focus === 'engaged' ? 'ai-typing' : mood.focus === 'idle' ? 'ai-idle-dim' : ''}>
    {/* Assistant content */}
  </div>
);
```

**Step 4: Apply Mood Borders to Cards**
```typescript
// In any GlassyCard usage
import { useAIMoodColors } from '../services/aiMoodEngine';

const moodColors = useAIMoodColors();

<GlassyCard 
  className="mood-border"
  style={{ borderColor: moodColors.accentColor }}
>
  {/* Content */}
</GlassyCard>
```

### Phase 5: Audio & Transitions Integration

**Step 1: Initialize Audio Engine**
```typescript
// In App.tsx
import { audioEngine } from './services/audioEngine';
import { useThemeEngine } from './theme/themeEngine';

useEffect(() => {
  // Initialize audio on mount (requires user interaction)
  const initAudio = async () => {
    await audioEngine.initialize();
    await audioEngine.preloadAmbient();
    await audioEngine.preloadUISounds();
  };
  
  // Call on first user interaction
  const handleFirstInteraction = () => {
    initAudio();
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('touchstart', handleFirstInteraction);
  };
  
  document.addEventListener('click', handleFirstInteraction);
  document.addEventListener('touchstart', handleFirstInteraction);
  
  return () => {
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('touchstart', handleFirstInteraction);
  };
}, []);
```

**Step 2: Auto-Play Ambient Based on Theme**
```typescript
// In App.tsx where theme is available
import { useThemeEngine } from './theme/themeEngine';
import { audioEngine } from './services/audioEngine';

const themeState = useThemeEngine();

useEffect(() => {
  if (!themeState) return;
  
  const soundscape = audioEngine.getSoundscapeForConditions(
    themeState.theme,
    themeState.dayPeriod
  );
  
  audioEngine.playAmbient(soundscape);
}, [themeState?.theme, themeState?.dayPeriod]);
```

**Step 3: Connect Audio to Mood**
```typescript
// In App.tsx
const mood = useAIMood();

useEffect(() => {
  audioEngine.applyMood(mood.tone, mood.energy);
}, [mood.tone, mood.energy]);
```

**Step 4: Apply Scene Transitions**
```typescript
// In Dashboard.tsx or main screens
import { useSceneTransition } from '../theme/transitionEngine';

function Dashboard() {
  const ref = useSceneTransition('fade', { duration: 600 });
  
  return (
    <div ref={ref}>
      {/* Dashboard content */}
    </div>
  );
}
```

**Step 5: Add UI Sound Feedback**
```typescript
// In button components
import { audioEngine } from '../services/audioEngine';

<button
  onClick={() => {
    audioEngine.playUISound('button-tap');
    handleClick();
  }}
  className="glass-button hover-sheen"
>
  Click Me
</button>

// For AI messages
const handleAIMessage = () => {
  audioEngine.playUISound('ai-chime');
  // Handle message
};
```

---

## 🎨 Component-Specific Integration

### WeatherCard
Already using GlassyCard ✅. Optional enhancements:
```typescript
import { useAIMoodColors } from '../services/aiMoodEngine';

const moodColors = useAIMoodColors();

// Apply mood accent to weather icon glow
<div 
  className="relative"
  style={{ '--mood-glow': moodColors.glowColor } as any}
>
  {getWeatherIcon()}
  <div className="absolute inset-0 animate-glow -z-10" />
</div>
```

### SystemStatusCard
Already using GlassyCard ✅. Already has dynamic accents ✅.

Add mood integration:
```typescript
import { useAIMood } from '../services/aiMoodEngine';

const mood = useAIMood();

// Add energy brightness to whole card
<GlassyCard className="energy-brightness">
  {/* Content */}
</GlassyCard>
```

### AssistantPanel
```typescript
import { useAIMood } from '../services/aiMoodEngine';
import { audioEngine } from '../services/audioEngine';

const mood = useAIMood();

return (
  <div className="relative">
    {/* Particle ring when engaged */}
    {mood.focus !== 'idle' && (
      <div className="ai-particle-ring" />
    )}
    
    {/* Speaking pulse when processing */}
    <div className={mood.tone === 'processing' ? 'speaking-pulse' : ''}>
      <ChatMessages />
    </div>
    
    {/* Send button with sound */}
    <button
      onClick={() => {
        audioEngine.playUISound('button-tap');
        sendMessage();
      }}
      className="glass-button-primary"
    >
      Send
    </button>
  </div>
);
```

---

## 📂 Required Audio Files

Create these directories and add placeholder audio files:

### `/public/audio/ambient/`
```
rain-loop.mp3         (30-60s rain sound, seamless loop)
wind-loop.mp3         (30-60s wind ambience)
birds-loop.mp3        (30-60s morning birds)
crickets-loop.mp3     (30-60s night crickets)
gentle-wind-loop.mp3  (30-60s soft breeze)
```

**Temporary Solution**: Use silent 1s loops until real audio sourced
```bash
mkdir -p public/audio/ambient
mkdir -p public/audio/ui
```

### `/public/audio/ui/`
```
button-tap.mp3     (<250ms soft tap)
ai-chime.mp3       (<250ms pleasant bell)
scene-whoosh.mp3   (<250ms swish sound)
notification.mp3   (<250ms alert tone)
```

**Audio Sources:**
- Freesound.org (royalty-free)
- Incompetech (Kevin MacLeod)
- Zapsplat
- AI generation (Suno, Mubert)

---

## 🧪 Testing Integration

### Test Mood System
```typescript
// In browser console
import('././services/aiMoodEngine').then(({ aiMoodEngine }) => {
  // Test typing
  aiMoodEngine.onAITyping();
  
  // Wait 2s, test response
  setTimeout(() => {
    aiMoodEngine.onAIResponse('positive');
  }, 2000);
  
  // Wait 2s, test action
  setTimeout(() => {
    aiMoodEngine.onAIAction('command');
  }, 4000);
});
```

### Test Audio System
```typescript
// In browser console
import('./services/audioEngine').then(({ audioEngine }) => {
  audioEngine.initialize();
  audioEngine.preloadAmbient();
  audioEngine.playAmbient('rain');
  
  // Wait 3s, test cross-fade
  setTimeout(() => {
    audioEngine.playAmbient('birds');
  }, 3000);
});
```

### Test Transitions
```typescript
// In browser console
import('./theme/transitionEngine').then(({ fadeInScene }) => {
  const el = document.querySelector('.dashboard');
  fadeInScene(el, { duration: 600 });
});
```

---

## 🔧 Troubleshooting

### Audio Not Playing
- Ensure user has interacted with page (click/touch required)
- Check browser console for AudioContext errors
- Verify audio files exist in `/public/audio/`
- Check if muted in settings

### Mood Not Updating
- Verify aiMoodEngine.onX() calls are being made
- Check React DevTools for mood hook updates
- Ensure applyMoodLighting() is called in useEffect

### Transitions Jerky
- Check CPU usage (should be <65%)
- Reduce particle count if needed
- Disable blur filters on low-end devices

### CSS Variables Not Applying
- Verify lightEngine and moodEngine are calling apply functions
- Check browser DevTools → Styles → :root for variables
- Ensure transitions have proper duration set

---

## 📊 Performance Monitoring

Add performance tracking:
```typescript
// In App.tsx
useEffect(() => {
  let frameCount = 0;
  let lastTime = performance.now();
  
  const measureFPS = () => {
    frameCount++;
    const now = performance.now();
    
    if (now >= lastTime + 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastTime));
      console.log(`FPS: ${fps}`);
      
      if (fps < 55) {
        console.warn('Performance below target!');
      }
      
      frameCount = 0;
      lastTime = now;
    }
    
    requestAnimationFrame(measureFPS);
  };
  
  measureFPS();
}, []);
```

---

## 🎯 Integration Priority

**Immediate (High Impact):**
1. ✅ Initialize mood engine in App.tsx
2. ✅ Connect mood to system health
3. ✅ Apply mood borders to cards
4. ✅ Initialize audio engine on first interaction
5. ✅ Auto-play ambient based on theme

**Short Term (Enhanced UX):**
6. ⏳ Connect mood to Assistant typing/responses
7. ⏳ Add UI sound feedback to buttons
8. ⏳ Apply scene transitions to navigation
9. ⏳ Source and add real audio files

**Medium Term (Polish):**
10. ⏳ Create AudioControlWidget component
11. ⏳ Add mood-reactive particle effects
12. ⏳ Fine-tune transition timing
13. ⏳ Optimize for Raspberry Pi performance

---

## 🚀 Quick Start Integration

**Minimal viable integration (5 minutes):**

```typescript
// App.tsx - Add these imports and effects

import { aiMoodEngine, useAIMood, useAIMoodColors } from './services/aiMoodEngine';
import { applyMoodLighting } from './theme/lightEngine';
import { audioEngine } from './services/audioEngine';

function App() {
  const mood = useAIMood();
  const moodColors = useAIMoodColors();
  
  // Apply mood lighting
  useEffect(() => {
    applyMoodLighting(moodColors);
  }, [moodColors]);
  
  // Initialize audio on first click
  useEffect(() => {
    const init = async () => {
      await audioEngine.initialize();
      await audioEngine.preloadAmbient();
    };
    
    document.addEventListener('click', init, { once: true });
  }, []);
  
  // Auto-play ambient
  const themeState = useThemeEngine();
  useEffect(() => {
    if (!themeState) return;
    const soundscape = audioEngine.getSoundscapeForConditions(
      themeState.theme,
      themeState.dayPeriod
    );
    audioEngine.playAmbient(soundscape);
  }, [themeState?.theme]);
  
  // Rest of App component...
}
```

**Result**: Mood system active, ambient audio playing, ready for action!

---

## 📝 Next Steps After Integration

Once phases 1-5 are integrated:
1. Test on actual Raspberry Pi 5 hardware
2. Profile performance (CPU, memory, FPS)
3. Source/create audio files
4. Fine-tune animation timings
5. User acceptance testing
6. **Then**: Move to Phase 6 (Touch & Motion Dynamics)

---

**Status**: Ready for Integration  
**Estimated Time**: 1-2 hours for basic integration  
**Complexity**: Medium (mostly wiring existing systems)  
**Impact**: Complete transformation of user experience
