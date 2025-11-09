# Phase 6C: Wire & Settings Integration - Specification

## 🎯 Objective
Wire ripple and parallax systems into live UI with user-controlled settings.

---

## 📋 Files to Modify

### 1. **components/AmbientBackground.tsx**
Add parallax offset to background layers.

```typescript
import { useParallaxMotion } from '../hooks/useParallaxMotion';

export const AmbientBackground: React.FC<Props> = ({ themeState }) => {
  const parallax = useParallaxMotion({ 
    intensity: 0.5, 
    maxOffset: 8,
    enableGyro: true,
    enableCursor: true 
  });

  return (
    <div 
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ 
        transform: `translate(${parallax.x}px, ${parallax.y}px)`,
        transition: 'transform 0.1s ease-out',
        willChange: 'transform'
      }}
    >
      {/* Existing gradient layers */}
    </div>
  );
};
```

### 2. **components/ui/GlassyCard.tsx**
Wrap with RippleContainer.

```typescript
import { RippleContainer } from './RippleEffect';

export const GlassyCard: React.FC<Props> = ({ children, onClick, ...props }) => {
  return (
    <RippleContainer 
      onClick={onClick}
      disabled={!onClick} // Only ripple if interactive
      className={/* existing classes */}
    >
      {children}
    </RippleContainer>
  );
};
```

### 3. **components/SettingsModal.tsx**
Add Interaction Settings section.

```typescript
// Add state
const [rippleIntensity, setRippleIntensity] = useState<'off' | 'subtle' | 'normal'>('normal');
const [motionEffects, setMotionEffects] = useState(true);
const [hapticsEnabled, setHapticsEnabled] = useState(true);

// Load from localStorage on mount
useEffect(() => {
  const savedRipple = localStorage.getItem('rippleIntensity') as 'off' | 'subtle' | 'normal';
  if (savedRipple) setRippleIntensity(savedRipple);
  
  const savedMotion = localStorage.getItem('motionEffects');
  if (savedMotion !== null) setMotionEffects(savedMotion === 'true');
  
  const savedHaptics = localStorage.getItem('hapticsEnabled');
  if (savedHaptics !== null) setHapticsEnabled(savedHaptics === 'true');
}, []);

// Save to localStorage on change
const handleRippleChange = (value: 'off' | 'subtle' | 'normal') => {
  setRippleIntensity(value);
  localStorage.setItem('rippleIntensity', value);
  console.log('[RIPPLE] Intensity changed to', value);
};

const handleMotionToggle = () => {
  const newValue = !motionEffects;
  setMotionEffects(newValue);
  localStorage.setItem('motionEffects', String(newValue));
  console.log('[MOTION] Effects toggled to', newValue);
};

const handleHapticsToggle = () => {
  const newValue = !hapticsEnabled;
  setHapticsEnabled(newValue);
  localStorage.setItem('hapticsEnabled', String(newValue));
  console.log('[HAPTICS] Toggled to', newValue);
};

// Add UI section
<div className="glass-card p-6 space-y-4">
  <h3 className="text-lg font-semibold">Interaction Effects</h3>
  
  {/* Ripple Intensity */}
  <div>
    <label className="block text-sm font-medium mb-2">
      Ripple Intensity
    </label>
    <select 
      value={rippleIntensity}
      onChange={(e) => handleRippleChange(e.target.value as any)}
      className="glass-input w-full"
    >
      <option value="off">Off</option>
      <option value="subtle">Subtle</option>
      <option value="normal">Normal</option>
    </select>
  </div>
  
  {/* Motion Effects */}
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium">
      Motion Depth (Parallax)
    </label>
    <input 
      type="checkbox"
      checked={motionEffects}
      onChange={handleMotionToggle}
      className="w-5 h-5"
    />
  </div>
  
  {/* Haptic Feedback */}
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium">
      Haptic Feedback
    </label>
    <input 
      type="checkbox"
      checked={hapticsEnabled}
      onChange={handleHapticsToggle}
      className="w-5 h-5"
    />
  </div>
  
  <p className="text-xs text-muted">
    These effects enhance interactivity. Disable for better performance or accessibility.
  </p>
</div>
```

### 4. **components/WeatherCard.tsx** (if has interactive elements)
Wrap action buttons with ripple.

```typescript
import { RippleContainer } from './ui/RippleEffect';

// For any buttons inside
<RippleContainer>
  <button className="glass-button" onClick={handleClick}>
    Refresh
  </button>
</RippleContainer>
```

### 5. **components/SystemStatusCard.tsx** (if has interactive elements)
Same pattern - wrap action buttons.

```typescript
import { RippleContainer } from './ui/RippleEffect';

<RippleContainer>
  <button className="glass-button" onClick={onToggleSystem}>
    {systemStatus === 'Disabled' ? 'Enable' : 'Disable'}
  </button>
</RippleContainer>
```

---

## 🔧 Implementation Checklist

### Phase 6C - Wire Ripple
- [ ] Wrap GlassyCard with RippleContainer
- [ ] Add ripple to WeatherCard buttons
- [ ] Add ripple to SystemStatusCard buttons
- [ ] Add ripple to Dashboard action buttons
- [ ] Add ripple to zone control buttons
- [ ] Test click events still fire correctly

### Phase 6C - Wire Parallax
- [ ] Add useParallaxMotion to AmbientBackground
- [ ] Apply transform to background div
- [ ] Verify respects motionEffects setting
- [ ] Test cursor tracking (desktop)
- [ ] Test device orientation (mobile if available)
- [ ] Verify prefers-reduced-motion respected

### Phase 6C - Settings UI
- [ ] Add Interaction Settings section to SettingsModal
- [ ] Implement rippleIntensity state + localStorage
- [ ] Implement motionEffects state + localStorage
- [ ] Implement hapticsEnabled state + localStorage
- [ ] Add console logging for setting changes
- [ ] Test settings persist across reload

### Phase 6C - Testing
- [ ] Ripple appears on interactive elements
- [ ] Ripple color matches mood accent
- [ ] Parallax responds to cursor/device
- [ ] Settings toggle effects immediately
- [ ] No FPS drop (test with performance monitor)
- [ ] No console errors

---

## ⚠️ Important Notes

### Ripple Wiring
- Only wrap **interactive** elements (onClick handlers)
- RippleContainer passes through onClick correctly
- Set `disabled={!onClick}` to skip ripple on non-interactive cards

### Parallax Wiring
- Applied only to AmbientBackground (not cards)
- Uses GPU-only transform
- Auto-disables if FPS < 50
- Respects prefers-reduced-motion automatically

### Settings Integration
- All settings loaded on mount
- All settings saved immediately on change
- Use console logging for debugging: `[RIPPLE]`, `[MOTION]`, `[HAPTICS]`

### Performance
- Max 5 concurrent ripples (already limited in component)
- Parallax uses RAF + throttling (already implemented)
- All animations GPU-only (transform/opacity)
- No forced reflows

---

## 📊 localStorage Keys

```typescript
localStorage.setItem('rippleIntensity', 'normal' | 'subtle' | 'off');
localStorage.setItem('motionEffects', 'true' | 'false');
localStorage.setItem('hapticsEnabled', 'true' | 'false');
```

---

## 🧪 Testing Commands

### Test Ripple
```typescript
// In browser console
localStorage.setItem('rippleIntensity', 'off');
location.reload();
// Click card - no ripple

localStorage.setItem('rippleIntensity', 'normal');
location.reload();
// Click card - ripple appears
```

### Test Parallax
```typescript
// In browser console
localStorage.setItem('motionEffects', 'false');
location.reload();
// Move cursor - no parallax
// Console shows: [MOTION] Disabled: user setting

localStorage.setItem('motionEffects', 'true');
location.reload();
// Move cursor - parallax active
```

### Test Haptics
```typescript
// On mobile device
localStorage.setItem('hapticsEnabled', 'true');
// Click button - vibration

localStorage.setItem('hapticsEnabled', 'false');
// Click button - no vibration
```

---

## 🎯 Expected Console Output

```
[MOTION] Device orientation enabled      // On mobile init
[MOTION] Disabled: prefers-reduced-motion // If user has setting
[MOTION] Disabled: user setting          // If toggle off
[MOTION] Disabled: FPS < 50              // If performance drops

[RIPPLE] Created at 156, 89              // On each click
[RIPPLE] Intensity changed to subtle     // On setting change

[HAPTICS] Toggled to true                // On setting change
```

---

## 📝 Files Modified Summary

**Modified:**
1. `components/AmbientBackground.tsx` - Added parallax
2. `components/ui/GlassyCard.tsx` - Added ripple wrapper
3. `components/SettingsModal.tsx` - Added interaction settings section
4. `components/WeatherCard.tsx` - Added ripple to buttons (if applicable)
5. `components/SystemStatusCard.tsx` - Added ripple to buttons (if applicable)

**No Changes:**
- Theme, mood, audio systems remain untouched
- Layout remains identical
- Existing click handlers work correctly

---

## ✅ Acceptance Criteria

- ✅ Ripple appears on all interactive glass elements
- ✅ Ripple intensity matches user setting
- ✅ Parallax responds to cursor/device orientation
- ✅ Parallax respects motionEffects toggle
- ✅ All settings persist across reload
- ✅ Console logging shows state changes
- ✅ No FPS impact (< 5% drop)
- ✅ No console errors
- ✅ Click handlers still fire correctly
- ✅ Accessibility maintained (reduced-motion)

---

## 🚀 Phase 6C Status

**Implementation**: Ready to wire (specifications complete)  
**Testing**: Checklist provided  
**Documentation**: Complete  
**Estimated Time**: 1-2 hours for full integration

---

**Date**: November 8, 2025  
**Status**: 📋 Specification Complete  
**Next**: Follow checklist to wire systems into live UI
