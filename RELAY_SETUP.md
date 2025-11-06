# AquaMind Relay Driver Setup Guide

## Overview

The AquaMind backend supports **hardware relay control** through a multi-mode `RelayDriver` that can operate in three different modes:

1. **Mock Mode** - Simulates relay operations (default, safe for desktop testing)
2. **GPIO Mode** - Controls physical relays via Raspberry Pi GPIO pins
3. **HTTP Mode** - Sends HTTP requests to an ESP32 or external relay controller

---

## Supported Relay Modes

### 1. Mock Mode (Default)

**Description**: Logs relay actions to the console without controlling real hardware.

**Use Case**: Local development, testing, and desktop environments without GPIO hardware.

**Configuration**:
```env
RELAY_MODE=mock
```

**Behavior**:
- Simulates zone activation/deactivation
- Logs actions to console: `[RELAY][MOCK] Zone {id} simulated ON/OFF`
- No hardware interaction
- Safe for all environments

---

### 2. GPIO Mode

**Description**: Controls physical relays connected to Raspberry Pi GPIO pins using `onoff` or `rpio` libraries.

**Use Case**: Production deployment on Raspberry Pi with relay board connected to GPIO pins.

**Configuration**:
```env
RELAY_MODE=gpio
GPIO_PIN_MAP=1:17,2:18,3:27,4:22
```

**GPIO Pin Mapping Format**: `zoneId:gpioPin,zoneId:gpioPin,...`

**Default Pin Mapping** (if `GPIO_PIN_MAP` is not set):
| Zone | GPIO Pin | Physical Pin |
|------|----------|--------------|
| 1    | 17       | Pin 11       |
| 2    | 18       | Pin 12       |
| 3    | 27       | Pin 13       |
| 4    | 22       | Pin 15       |

**Library Support**:
- Attempts to use `onoff` first (recommended for modern Node.js)
- Falls back to `rpio` if `onoff` is unavailable
- Automatically falls back to mock mode if GPIO initialization fails

**Console Output**:
```
[RELAY][GPIO] Using 'onoff' library for GPIO control
[RELAY][GPIO] GPIO pin mapping: { '1': 17, '2': 18, '3': 27, '4': 22 }
[RELAY][GPIO] Initialized zone 1 on GPIO pin 17
[RELAY][GPIO] Set GPIO pin 17 to HIGH for zone 1
[RELAY][GPIO] Set GPIO pin 17 to LOW for zone 1
```

**Installation**:
```bash
# Install GPIO library
npm install onoff
# OR
npm install rpio
```

**Hardware Requirements**:
- Raspberry Pi (any model with GPIO)
- Relay board (4-channel recommended)
- Proper wiring from GPIO pins to relay inputs

---

### 3. HTTP Mode

**Description**: Sends HTTP POST requests to an external relay controller (e.g., ESP32, Arduino with WiFi).

**Use Case**: When relays are controlled by a separate microcontroller accessible over the network.

**Configuration**:
```env
RELAY_MODE=http
RELAY_BASE_URL=http://192.168.1.100:8080
```

**API Endpoints Called**:
- **Activate Zone**: `POST {RELAY_BASE_URL}/relay/{zoneId}/on`
- **Deactivate Zone**: `POST {RELAY_BASE_URL}/relay/{zoneId}/off`

**Request Body**:
```json
{
  "zoneId": 1,
  "action": "on"
}
```

**Console Output**:
```
[RELAY][HTTP] Using base URL: http://192.168.1.100:8080
[RELAY][HTTP] Sent ON trigger to http://192.168.1.100:8080/relay/1/on
[RELAY][HTTP] Sent OFF trigger to http://192.168.1.100:8080/relay/1/off
```

**ESP32 Example Server**:
```cpp
// ESP32 Arduino sketch example
#include <WiFi.h>
#include <WebServer.h>

WebServer server(8080);

void handleRelayOn() {
  int zoneId = server.pathArg(0).toInt();
  digitalWrite(getRelayPin(zoneId), HIGH);
  server.send(200, "application/json", "{\"success\":true}");
}

void handleRelayOff() {
  int zoneId = server.pathArg(0).toInt();
  digitalWrite(getRelayPin(zoneId), LOW);
  server.send(200, "application/json", "{\"success\":true}");
}

void setup() {
  server.on("/relay/{zoneId}/on", HTTP_POST, handleRelayOn);
  server.on("/relay/{zoneId}/off", HTTP_POST, handleRelayOff);
  server.begin();
}
```

---

## Configuration Examples

### Example 1: Desktop Development (Mock Mode)
```env
# .env.local or environment variables
RELAY_MODE=mock
```

### Example 2: Raspberry Pi with GPIO Relays
```env
RELAY_MODE=gpio
GPIO_PIN_MAP=1:17,2:18,3:27,4:22
```

### Example 3: ESP32 HTTP Controller
```env
RELAY_MODE=http
RELAY_BASE_URL=http://192.168.1.100:8080
```

### Example 4: Cloud Server with HTTP Relay Controller
```env
RELAY_MODE=http
RELAY_BASE_URL=https://relay-controller.local
```

---

## Key Features

### 1. Zone Exclusivity (Mutual Exclusion)
✅ **Only one zone can be active at a time**

When starting a new zone, the system automatically deactivates any currently active zone:

```typescript
// In startZone() method
if (this.state.activeZoneId !== null) {
  await this.stopZone(this.state.activeZoneId);
}
```

**Console Output**:
```
[RELAY][MOCK] Zone 1 simulated ON
[RELAY][MOCK] Zone 1 simulated OFF  // Auto-deactivate when zone 2 starts
[RELAY][MOCK] Zone 2 simulated ON
```

### 2. Error Handling
All relay operations include comprehensive error handling:

```typescript
try {
  await this.relayDriver.activate(zoneId);
} catch (error) {
  console.error(`[RELAY] Failed to activate relay ${relayId}:`, error);
  throw error;
}
```

### 3. Graceful Fallback
If GPIO initialization fails, the system automatically falls back to mock mode:

```typescript
catch (error) {
  console.error(`[RELAY][GPIO] Failed to initialize GPIO mode:`, error);
  console.log(`[RELAY] Falling back to mock mode`);
  this.mode = 'mock';
}
```

### 4. Backward Compatibility
✅ **Desktop testing works without hardware**

- Default mode is `mock` - safe for all environments
- No breaking changes to existing API
- Optional configuration - works out-of-the-box

---

## Test Steps

### Test 1: Verify Mock Mode (Default)
```bash
# Start server without any RELAY_MODE configuration
npm run server

# Expected console output:
# [RELAY] Initializing relay driver in MOCK mode
# [RELAY][MOCK] Using mock mode for development/testing
```

**Manual Test**:
```bash
# Start zone 1
curl -X POST http://localhost:3001/zones/1/start -H "Content-Type: application/json" -d '{"duration":10}'

# Expected output:
# [RELAY][MOCK] Zone 1 simulated ON

# Stop zone 1
curl -X POST http://localhost:3001/zones/1/stop

# Expected output:
# [RELAY][MOCK] Zone 1 simulated OFF
```

---

### Test 2: Verify GPIO Mode (Requires Raspberry Pi)

**Setup**:
```bash
# Install GPIO library
npm install onoff

# Configure environment
export RELAY_MODE=gpio
export GPIO_PIN_MAP=1:17,2:18,3:27,4:22

# Start server
npm run server
```

**Expected Console Output**:
```
[RELAY] Initializing relay driver in GPIO mode
[RELAY][GPIO] Using 'onoff' library for GPIO control
[RELAY][GPIO] GPIO pin mapping: { '1': 17, '2': 18, '3': 27, '4': 22 }
[RELAY][GPIO] Initialized zone 1 on GPIO pin 17
[RELAY][GPIO] Initialized zone 2 on GPIO pin 18
[RELAY][GPIO] Initialized zone 3 on GPIO pin 27
[RELAY][GPIO] Initialized zone 4 on GPIO pin 22
```

**Manual Test**:
```bash
# Start zone 1
curl -X POST http://localhost:3001/zones/1/start -H "Content-Type: application/json" -d '{"duration":10}'

# Expected output:
# [RELAY][GPIO] Set GPIO pin 17 to HIGH for zone 1

# Verify: LED on relay board for zone 1 should light up

# Stop zone 1
curl -X POST http://localhost:3001/zones/1/stop

# Expected output:
# [RELAY][GPIO] Set GPIO pin 17 to LOW for zone 1
```

**Test Zone Exclusivity**:
```bash
# Start zone 1
curl -X POST http://localhost:3001/zones/1/start -H "Content-Type: application/json" -d '{"duration":60}'

# Start zone 2 (should auto-stop zone 1)
curl -X POST http://localhost:3001/zones/2/start -H "Content-Type: application/json" -d '{"duration":60}'

# Expected output:
# [RELAY][GPIO] Set GPIO pin 17 to LOW for zone 1   // Auto-stop
# [RELAY][GPIO] Set GPIO pin 18 to HIGH for zone 2  // New zone starts
```

---

### Test 3: Verify HTTP Mode (ESP32/External Controller)

**Setup ESP32 Mock Server** (for testing):
```bash
# Create simple HTTP server for testing
# (In production, this would be your ESP32)
npm install --save-dev http-server
```

Create `mock-relay-server.js`:
```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/relay/:id/on', (req, res) => {
  console.log(`✓ Zone ${req.params.id} activated`);
  res.json({ success: true, zone: parseInt(req.params.id), state: 'on' });
});

app.post('/relay/:id/off', (req, res) => {
  console.log(`✓ Zone ${req.params.id} deactivated`);
  res.json({ success: true, zone: parseInt(req.params.id), state: 'off' });
});

app.listen(8080, () => console.log('Mock relay server on port 8080'));
```

**Run Test**:
```bash
# Terminal 1: Start mock relay controller
node mock-relay-server.js

# Terminal 2: Configure and start AquaMind server
export RELAY_MODE=http
export RELAY_BASE_URL=http://localhost:8080
npm run server

# Expected output:
# [RELAY] Initializing relay driver in HTTP mode
# [RELAY][HTTP] Using base URL: http://localhost:8080

# Terminal 3: Test zone control
curl -X POST http://localhost:3001/zones/1/start -H "Content-Type: application/json" -d '{"duration":10}'

# Expected output in Terminal 2:
# [RELAY][HTTP] Sent ON trigger to http://localhost:8080/relay/1/on

# Expected output in Terminal 1:
# ✓ Zone 1 activated
```

---

## Troubleshooting

### Issue: GPIO mode falls back to mock mode
**Cause**: GPIO library not installed or not running on Raspberry Pi

**Solution**:
```bash
npm install onoff
# Ensure running on Raspberry Pi with proper permissions
sudo npm run server
```

---

### Issue: HTTP requests timeout
**Cause**: Relay controller not accessible or wrong URL

**Solution**:
1. Verify controller is running: `curl http://192.168.1.100:8080/health`
2. Check network connectivity: `ping 192.168.1.100`
3. Verify `RELAY_BASE_URL` is correct
4. Check ESP32/controller logs for errors

---

### Issue: "Permission denied" on GPIO pins
**Cause**: Insufficient permissions to access GPIO

**Solution**:
```bash
# Add user to gpio group
sudo usermod -a -G gpio $USER

# OR run with sudo
sudo npm run server
```

---

## Production Deployment Checklist

- [ ] Choose appropriate relay mode (GPIO or HTTP)
- [ ] Install necessary dependencies (`onoff` for GPIO)
- [ ] Configure environment variables in `.env` or system environment
- [ ] Test hardware switching with each zone
- [ ] Verify zone exclusivity (only one active at a time)
- [ ] Test scheduled watering with real hardware
- [ ] Set up automatic restart on system boot
- [ ] Monitor console logs for relay errors
- [ ] Test fail-safe behavior (rain delay, manual stop)

---

## Architecture Notes

### Design Decisions

1. **Three-Mode Architecture**: Allows seamless transition from development to production
2. **Automatic Fallback**: System remains operational even if hardware initialization fails
3. **Zone Mutual Exclusion**: Prevents multiple zones from running simultaneously (safety feature)
4. **Async Operations**: HTTP mode uses async/await for network operations
5. **Error Isolation**: Hardware failures don't crash the entire server

### Safety Features

✅ Only one zone active at a time (mutual exclusion)
✅ Automatic zone stop when duration expires
✅ Rain delay prevents accidental watering
✅ Graceful fallback to mock mode on hardware failure
✅ GPIO cleanup on process exit

---

## Support

For issues or questions:
- Review console logs for `[RELAY]` messages
- Check hardware connections (GPIO mode)
- Verify network connectivity (HTTP mode)
- Test with mock mode first to isolate hardware issues
