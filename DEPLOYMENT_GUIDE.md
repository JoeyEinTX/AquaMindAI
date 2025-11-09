# AquaMind Deployment Guide

Complete guide for deploying AquaMind Irrigation Controller in development, production, and containerized environments.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Mode](#development-mode)
3. [Production Mode](#production-mode)
4. [Docker Deployment](#docker-deployment)
5. [Environment Variables](#environment-variables)
6. [Port Configuration](#port-configuration)
7. [Raspberry Pi Deployment](#raspberry-pi-deployment)
8. [Cloud Deployment](#cloud-deployment)
9. [Verification & Testing](#verification--testing)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- (Optional) Docker for containerized deployment
- (Optional) Raspberry Pi with GPIO for hardware relay control

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/AquaMindAI.git
cd AquaMindAI

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

---

## Development Mode

Development mode runs the frontend (Vite dev server) and backend concurrently with hot-reload enabled.

### Start Development Server

```bash
# Start both frontend and backend
npm run dev

# Or start them separately:
npm run dev:frontend  # Frontend on port 3000
npm run dev:backend   # Backend on port 3001
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: http://localhost:3003
- **Health Check**: http://localhost:3001/health

### Development Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_BASE_URL=http://localhost:3003
RELAY_MODE=mock
```

---

## Production Mode

Production mode serves the built frontend and backend from a single Node.js process.

### Build for Production

```bash
# Build the frontend
npm run build

# This creates an optimized build in /dist folder
```

### Start Production Server

```bash
# Set production environment
NODE_ENV=production npm start

# Backend serves both API and static frontend
```

### Access Points
- **All Services**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Production Environment Variables

Create `.env.production` or update `.env`:

```env
NODE_ENV=production
PORT=3001
WS_PORT=3003
VITE_API_BASE_URL=http://your-server-ip:3001
VITE_WS_BASE_URL=http://your-server-ip:3002
RELAY_MODE=gpio  # or http for remote relay
GPIO_PIN_MAP=1:17,2:18,3:27,4:22
GEMINI_API_KEY=your_api_key_here
```

---

## Docker Deployment

### Build Docker Image

```bash
docker build -t aquamind:latest .
```

### Run with Docker

```bash
# Run standalone container
docker run -d \
  --name aquamind \
  -p 3001:3001 \
  -p 3002:3002 \
  -e GEMINI_API_KEY=your_key \
  -e RELAY_MODE=mock \
  -v $(pwd)/zone-state.json:/app/zone-state.json \
  -v $(pwd)/run-logs.json:/app/run-logs.json \
  aquamind:latest
```

### Run with Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Compose Configuration

Edit `docker-compose.yml` environment variables or create `.env` file:

```env
RELAY_MODE=gpio
GPIO_PIN_MAP=1:17,2:18,3:27,4:22
GEMINI_API_KEY=your_key_here
VITE_API_BASE_URL=http://192.168.1.100:3001
VITE_WS_BASE_URL=http://192.168.1.100:3002
```

### GPIO Access in Docker (Raspberry Pi)

Uncomment these lines in `docker-compose.yml`:

```yaml
devices:
  - /dev/gpiomem:/dev/gpiomem
privileged: true
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features | `your_api_key_here` |

### Frontend Variables (Vite)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:3001` | `http://192.168.1.100:3001` |
| `VITE_WS_BASE_URL` | WebSocket server URL | `http://localhost:3002` | `http://192.168.1.100:3002` |

### Backend Variables

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment mode | `development` | `development`, `production` |
| `PORT` | Backend API port | `3001` | Any valid port |
| `WS_PORT` | WebSocket server port | `3002` | Any valid port |
| `RELAY_MODE` | Relay control mode | `mock` | `mock`, `gpio`, `http` |
| `GPIO_PIN_MAP` | GPIO pin mapping | `1:17,2:18,3:27,4:22` | `zoneId:pin,...` |
| `RELAY_BASE_URL` | HTTP relay controller URL | - | `http://192.168.1.100:8080` |

---

## Port Configuration

### Default Ports

- **3000**: Frontend (dev mode only)
- **3001**: Backend API / Unified service (production)
- **3003**: WebSocket server

### Port Mapping

#### Development
```
Frontend (3000) → Backend API (3001)
Frontend (3000) → WebSocket (3003)
```

#### Production
```
Browser → Single Server (3001)
  ├── Static Frontend
  ├── REST API
  └── WebSocket (3002)
```

### Firewall Rules

Open required ports on your server:

```bash
# For Ubuntu/Debian
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp

# For Raspberry Pi OS
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3002 -j ACCEPT
```

---

## Raspberry Pi Deployment

### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install GPIO libraries
sudo apt install -y python3-gpiozero pigpio
```

### GPIO Configuration

1. **Enable GPIO interface**:
```bash
sudo raspi-config
# Navigate to: Interface Options → GPIO → Enable
```

2. **Set up permissions**:
```bash
sudo usermod -a -G gpio $USER
```

3. **Configure pin mapping** in `.env`:
```env
RELAY_MODE=gpio
GPIO_PIN_MAP=1:17,2:18,3:27,4:22
```

### Wiring Diagram

```
GPIO Pin → Relay Module → Solenoid Valve

Zone 1: GPIO 17 (Pin 11) → Relay 1 → Valve 1
Zone 2: GPIO 18 (Pin 12) → Relay 2 → Valve 2
Zone 3: GPIO 27 (Pin 13) → Relay 3 → Valve 3
Zone 4: GPIO 22 (Pin 15) → Relay 4 → Valve 4
```

### Auto-Start on Boot

Create systemd service:

```bash
sudo nano /etc/systemd/system/aquamind.service
```

```ini
[Unit]
Description=AquaMind Irrigation Controller
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/AquaMindAI
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable aquamind
sudo systemctl start aquamind
sudo systemctl status aquamind
```

### Network Configuration

Configure static IP on Raspberry Pi:

```bash
sudo nano /etc/dhcpcd.conf
```

Add:
```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8
```

Update `.env`:
```env
VITE_API_BASE_URL=http://192.168.1.100:3001
VITE_WS_BASE_URL=http://192.168.1.100:3002
```

---

## Cloud Deployment

### Deployment Options

1. **AWS EC2 / DigitalOcean Droplet**
2. **Heroku / Railway**
3. **Google Cloud Run**
4. **Azure App Service**

### Example: DigitalOcean Deployment

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Clone and setup
git clone https://github.com/your-repo/AquaMindAI.git
cd AquaMindAI
npm install
npm run build

# Configure environment
nano .env
# Set VITE_API_BASE_URL=https://yourdomain.com
# Set VITE_WS_BASE_URL=https://yourdomain.com
# Set RELAY_MODE=http
# Set RELAY_BASE_URL=http://pi-relay-controller:8080

# Start with PM2
npm install -g pm2
pm2 start npm --name aquamind -- start
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Verification & Testing

### Health Check

```bash
# Check backend health
curl http://localhost:3001/health

# Expected response:
{
  "uptimeSec": 3652,
  "cpuPercent": 12,
  "memoryMB": 145,
  "connectedClients": 2,
  "lastError": null,
  "timestamp": "2025-11-07T19:44:00.000Z"
}
```

### Test API Endpoints

```bash
# Get system status
curl http://localhost:3001/status

# Start a zone
curl -X POST http://localhost:3001/zones/1/start \
  -H "Content-Type: application/json" \
  -d '{"duration": 600}'

# Stop a zone
curl -X POST http://localhost:3001/zones/1/stop
```

### WebSocket Connection Test

Open browser console at http://localhost:3001 and check for:
```
[WS] Connected
```

### Frontend Verification

1. Open http://localhost:3001 in browser
2. Check System Status Card shows health metrics
3. Start/stop a zone manually
4. Verify UI updates in realtime (no page refresh)
5. Check browser network tab for WebSocket connection

---

## Troubleshooting

### Common Issues

#### 1. Frontend not loading in production

**Solution**: Ensure build completed successfully
```bash
npm run build
ls -la dist/  # Should show built files
```

#### 2. WebSocket connection fails

**Solution**: Check firewall and CORS settings
```bash
# Verify WebSocket port is open
telnet localhost 3002

# Check server logs
npm start  # Look for [WS] messages
```

#### 3. GPIO permissions denied (Pi)

**Solution**: Add user to GPIO group
```bash
sudo usermod -a -G gpio $USER
sudo reboot
```

#### 4. Module not found errors

**Solution**: Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 5. Port already in use

**Solution**: Kill process or change port
```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3003
```

### Logs and Debugging

```bash
# View server logs
npm start

# View Docker logs
docker-compose logs -f aquamind

# View systemd logs (Pi)
sudo journalctl -u aquamind -f

# Enable debug mode
DEBUG=* npm start
```

### Performance Monitoring

Access health endpoint for diagnostics:
```bash
watch -n 5 curl -s http://localhost:3001/health
```

Monitor system resources:
```bash
# CPU and memory
htop

# Network connections
netstat -tulpn | grep node
```

---

## Support & Resources

- **Documentation**: [README.md](README.md)
- **WebSocket Guide**: [WEBSOCKET_GUIDE.md](WEBSOCKET_GUIDE.md)
- **Integration Guide**: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **Relay Setup**: [RELAY_SETUP.md](RELAY_SETUP.md)

---

## Summary

### Development
```bash
npm install
npm run dev
# Access: http://localhost:3000
```

### Production
```bash
npm install
npm run build
NODE_ENV=production npm start
# Access: http://localhost:3001
```

### Docker
```bash
docker-compose up -d
# Access: http://localhost:3001
```

🎉 **Your AquaMind system is now deployed and ready to use!**
