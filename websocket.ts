import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface SystemStatus {
  activeZoneId: number | null;
  activeZoneName: string | null;
  elapsedSec: number;
  remainingSec: number;
  rainDelay: {
    isActive: boolean;
    expiresAt?: string;
    hoursRemaining: number;
  };
  lastRun: {
    zoneId: number;
    zoneName: string;
    startedAt: string;
    durationSec: number;
  } | null;
  heartbeat: string;
}

interface RunLogEntry {
  id: string;
  zoneId: number;
  zoneName: string;
  source: 'manual' | 'schedule';
  startedAt: string;
  stoppedAt: string;
  durationSec: number;
  success: boolean;
}

class WebSocketService {
  private io: Server | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(httpServer: HTTPServer, wsPort?: number): void {
    const port = wsPort || parseInt(process.env.WS_PORT || '3002');
    
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      // Use specified port for WebSocket
      path: '/socket.io'
    });

    // Listen on the WebSocket port
    const wsServer = this.io.listen(port);

    this.io.on('connection', (socket) => {
      console.log(`[WS] Client connected: ${socket.id}`);

      // Emit initial status on connection
      this.emitInitialStatus(socket.id);

      socket.on('disconnect', () => {
        console.log(`[WS] Client disconnected: ${socket.id}`);
      });
    });

    // Start heartbeat mechanism (every 30 seconds)
    this.startHeartbeat();

    console.log(`[WS] WebSocket server initialized on port ${port}`);
  }

  private emitInitialStatus(socketId?: string): void {
    // This will be called with current system state
    // We'll need to pass status data from the main server
    const event = 'status';
    const payload = {
      message: 'Connected to AquaMind WebSocket',
      timestamp: new Date().toISOString()
    };

    if (socketId) {
      this.io?.to(socketId).emit(event, payload);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.io) {
        this.io.emit('heartbeat', {
          timestamp: new Date().toISOString(),
          connectedClients: this.io.engine.clientsCount
        });
      }
    }, 30000); // 30 seconds
  }

  // Event emission methods
  emitZoneStarted(data: {
    zoneId: number;
    zoneName: string;
    durationSec: number;
    source: 'manual' | 'schedule';
  }): void {
    if (!this.io) return;
    
    console.log(`[WS] Broadcasting zoneStarted: Zone ${data.zoneId}`);
    this.io.emit('zoneStarted', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  emitZoneStopped(data: {
    zoneId: number;
    zoneName: string;
    success: boolean;
  }): void {
    if (!this.io) return;
    
    console.log(`[WS] Broadcasting zoneStopped: Zone ${data.zoneId}`);
    this.io.emit('zoneStopped', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  emitRainDelayChanged(data: {
    isActive: boolean;
    expiresAt?: string;
    hoursRemaining: number;
  }): void {
    if (!this.io) return;
    
    console.log(`[WS] Broadcasting rainDelayChanged: ${data.isActive ? 'activated' : 'cleared'}`);
    this.io.emit('rainDelayChanged', {
      rainDelay: data,
      timestamp: new Date().toISOString()
    });
  }

  emitScheduleTriggered(data: {
    scheduleId: string;
    zoneId: number;
    zoneName: string;
    durationSec: number;
    startTime: string;
  }): void {
    if (!this.io) return;
    
    console.log(`[WS] Broadcasting scheduleTriggered: Schedule ${data.scheduleId} for Zone ${data.zoneId}`);
    this.io.emit('scheduleTriggered', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  emitLogUpdated(logEntry: RunLogEntry): void {
    if (!this.io) return;
    
    console.log(`[WS] Broadcasting logUpdated: Zone ${logEntry.zoneId}, ${logEntry.durationSec}s`);
    this.io.emit('logUpdated', {
      log: logEntry,
      timestamp: new Date().toISOString()
    });
  }

  emitStatus(status: SystemStatus): void {
    if (!this.io) return;
    this.io.emit('status', status);
  }

  getConnectedClients(): number {
    return this.io?.engine.clientsCount || 0;
  }

  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.io) {
      this.io.close();
      this.io = null;
      console.log('[WS] WebSocket server closed');
    }
  }
}

export const wsService = new WebSocketService();
