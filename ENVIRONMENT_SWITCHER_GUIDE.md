# Environment Switcher Implementation Guide

## Overview
The Environment Switcher feature allows users to switch between different backend connection modes (Localhost, LAN, and Auto) directly from the Settings modal without needing to manually edit files or use terminal commands.

## Components

### 1. EnvironmentSwitcher Component
**File:** `components/EnvironmentSwitcher.tsx`

A glassmorphic UI component that displays three environment mode options:
- 🖥️ **Localhost** - Solo development (localhost:3001)
- 🌐 **LAN** - Network access for all devices
- 🤖 **Auto** - Automatically detect best mode

**Features:**
- Visual feedback with active mode highlighting (blue glow and pulse indicator)
- Disabled state when switching to prevent multiple rapid switches
- Success notification toast before app reload
- Responsive grid layout (stacks on mobile)

### 2. Backend API Endpoint
**File:** `server.ts`
**Endpoint:** `POST /api/env/switch`

Executes the environment switch script and returns success/error status.

**Request Body:**
```json
{
  "mode": "localhost" | "lan" | "auto"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "localhost",
  "message": "Environment switched to localhost mode. Please reload the application."
}
```

### 3. Settings Modal Integration
**File:** `components/SettingsModal.tsx`

The EnvironmentSwitcher is integrated into the **Network** tab of the Settings modal, appearing at the top before the network info section.

## How It Works

1. **User selects a mode** in the Settings modal (Network tab)
2. **Frontend sends POST request** to `/api/env/switch` with the selected mode
3. **Backend executes** the npm script (`npm run set:localhost`, `npm run set:lan`, or `npm run set:auto`)
4. **Script updates** the `.env` file with the appropriate configuration from `.env.localhost` or `.env.lan`
5. **Success notification** is displayed to the user
6. **App automatically reloads** after 1.5 seconds to apply the new environment settings

## Environment Files

The system uses three environment files:

- **`.env.localhost`** - Configuration for local development
  ```
  VITE_API_BASE_URL=http://localhost:3001
  VITE_WS_BASE_URL=ws://localhost:3001
  ```

- **`.env.lan`** - Configuration for LAN network access
  ```
  VITE_API_BASE_URL=http://10.0.0.35:3001
  VITE_WS_BASE_URL=ws://10.0.0.35:3001
  ```

- **`.env`** - Active configuration (automatically updated by the switcher)

## Usage

### For End Users

1. Open the AquaMind app
2. Click the **Settings** icon in the header
3. Navigate to the **Network** tab
4. Select your desired environment mode:
   - **Localhost** - Use this when developing on a single machine
   - **LAN** - Use this to access from other devices on your network
   - **Auto** - Let the system automatically detect the best mode
5. Wait for the confirmation notification
6. The app will automatically reload with the new settings

### For Developers

The environment switching is powered by the existing `scripts/toggleEnv.ts` script, which:
- Validates the selected mode
- Detects the local IP address for Auto mode
- Copies the appropriate `.env.*` file to `.env`
- Provides detailed console logging

## Benefits

✅ **No Terminal Access Required** - Users can switch environments through the UI

✅ **Visual Feedback** - Clear indication of current mode and switching status

✅ **Safe Operation** - Validation prevents invalid mode selection

✅ **Cross-Platform** - Works on Windows, macOS, and Linux

✅ **Persistent** - Environment settings remain after app reload

✅ **Automatic Reload** - App reloads automatically to apply changes

## Technical Details

### API Security
- Mode validation on the backend prevents invalid inputs
- Only accepts three predefined modes: `localhost`, `lan`, `auto`
- Error handling for script execution failures

### User Experience
- Loading state prevents multiple simultaneous switches
- Current mode detection from environment variables
- Smooth animations and transitions
- Notification system integration

### Console Logging
The backend logs all environment switches:
```
[ENV] Switching to LAN mode...
[ENV] Script output: ...
[ENV] Successfully switched to LAN mode
```

## Testing

To test the environment switcher:

1. Start the development server: `npm run dev`
2. Open the app at http://localhost:3000
3. Open Settings → Network tab
4. Click on different environment modes
5. Verify the app reloads and the backend connects correctly
6. Check the console logs for `[ENV]` messages

## Troubleshooting

**Issue:** Environment doesn't switch
- **Solution:** Check backend console for error messages
- Verify the `.env.*` files exist in the project root

**Issue:** App doesn't reload after switching
- **Solution:** Check browser console for JavaScript errors
- Manually refresh the page if needed

**Issue:** Backend connection fails after switching
- **Solution:** For LAN mode, verify your IP address is correct in `.env.lan`
- Ensure the backend server is running and accessible

## Future Enhancements

Potential improvements for future versions:
- Real-time IP address detection and display
- Network quality indicator
- Custom environment configurations
- Environment presets for different deployment scenarios
- Multi-server support (dev, staging, production)
