<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AquaMind AI - Smart Irrigation Controller

An intelligent irrigation system with AI-powered scheduling and multi-mode relay control.

View your app in AI Studio: https://ai.studio/apps/drive/1fGVWfjbTV6KrqEawkgvEG89b3FnL14CO

## Features

- 🌱 **Smart Scheduling**: AI-powered watering schedules
- 💧 **Zone Control**: Multi-zone irrigation management
- 🔌 **Hardware Integration**: Support for GPIO, HTTP, and mock relay modes
- 🌦️ **Weather Integration**: Rain delay and weather-based adjustments
- 📊 **Dashboard**: Real-time monitoring and control

## Run Locally

**Prerequisites:** Node.js (v16 or higher)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Copy example environment file
   cp .env.example .env.local
   
   # Edit .env.local and set your API key
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run the application:**
   ```bash
   # Start the frontend (React + Vite)
   npm run dev
   
   # Start the backend server (in a separate terminal)
   npm run server
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Hardware Control

AquaMind supports three relay control modes:

- **Mock Mode** (default): Simulates relay operations for testing
- **GPIO Mode**: Controls physical relays via Raspberry Pi GPIO pins
- **HTTP Mode**: Sends HTTP requests to ESP32 or external relay controllers

For detailed hardware setup instructions, see [RELAY_SETUP.md](RELAY_SETUP.md).

### Quick Start Examples

**Desktop Development (Mock Mode):**
```env
RELAY_MODE=mock
```

**Raspberry Pi with GPIO:**
```env
RELAY_MODE=gpio
GPIO_PIN_MAP=1:17,2:18,3:27,4:22
```

**ESP32 HTTP Controller:**
```env
RELAY_MODE=http
RELAY_BASE_URL=http://192.168.1.100:8080
```

## Project Structure

```
AquaMindAI/
├── components/          # React UI components
├── services/           # API services (weather, AI, etc.)
├── server.ts           # Express backend with relay control
├── .env.example        # Environment configuration template
└── RELAY_SETUP.md     # Hardware setup documentation
```

## Documentation

- [Relay Driver Setup Guide](RELAY_SETUP.md) - Complete hardware integration guide
- [.env.example](.env.example) - Environment configuration examples

## License

This project is part of the AI Studio ecosystem.
