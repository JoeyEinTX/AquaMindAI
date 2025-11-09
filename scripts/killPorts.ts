import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

// Ports to clean up before startup
const PORTS_TO_FREE = [3000, 3001, 3002, 3003, 3004, 3005];

/**
 * Detects the current operating system
 */
function detectOS(): 'windows' | 'unix' {
  const platform = os.platform();
  return platform === 'win32' ? 'windows' : 'unix';
}

/**
 * Kills process on a specific port for Windows
 */
async function killPortWindows(port: number): Promise<boolean> {
  try {
    // Find the PID using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    
    if (!stdout.trim()) {
      return false; // No process found on this port
    }

    // Extract PID from netstat output (last column)
    const lines = stdout.trim().split('\n');
    const pids = new Set<string>();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && !isNaN(Number(pid))) {
        pids.add(pid);
      }
    }

    // Kill each unique PID
    for (const pid of pids) {
      try {
        await execAsync(`taskkill /PID ${pid} /F`);
      } catch (err) {
        // Process might have already ended, ignore error
      }
    }

    return pids.size > 0;
  } catch (error) {
    // No process found or error occurred, return false
    return false;
  }
}

/**
 * Kills process on a specific port for macOS/Linux
 */
async function killPortUnix(port: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    
    if (!stdout.trim()) {
      return false; // No process found on this port
    }

    // Kill the process(es)
    await execAsync(`lsof -ti:${port} | xargs kill -9`);
    return true;
  } catch (error) {
    // No process found or error occurred, return false
    return false;
  }
}

/**
 * Kills process on a specific port based on OS
 */
async function killPort(port: number): Promise<boolean> {
  const currentOS = detectOS();
  
  if (currentOS === 'windows') {
    return await killPortWindows(port);
  } else {
    return await killPortUnix(port);
  }
}

/**
 * Main function to free all specified ports
 */
async function freeAllPorts(): Promise<void> {
  console.log('\n[PORT-CLEANUP] Checking ports 3000–3005...\n');
  
  const freedPorts: number[] = [];
  const results = await Promise.allSettled(
    PORTS_TO_FREE.map(async (port) => {
      const wasFreed = await killPort(port);
      if (wasFreed) {
        freedPorts.push(port);
      }
      return { port, wasFreed };
    })
  );

  // Display results
  if (freedPorts.length > 0) {
    console.log(`[PORT-CLEANUP] ✓ Freed ports: ${freedPorts.join(', ')}`);
  } else {
    console.log('[PORT-CLEANUP] ✓ All ports were already free');
  }
  
  console.log('[PORT-CLEANUP] Ready to start AquaMind\n');
}

// Execute the cleanup
freeAllPorts().catch((error) => {
  console.error('[PORT-CLEANUP] Error during port cleanup:', error.message);
  // Don't exit with error code - allow the app to try starting anyway
  process.exit(0);
});
