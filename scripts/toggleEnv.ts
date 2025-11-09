#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

type EnvMode = 'localhost' | 'lan' | 'auto';

const ENV_FILES = {
  localhost: '.env.localhost',
  lan: '.env.lan',
};

function getLocalIPAddress(): string | null {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    
    for (const alias of iface) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  
  return null;
}

function detectMode(): EnvMode {
  const ip = getLocalIPAddress();
  
  if (!ip) {
    console.log('[ENV] Could not detect IP address, defaulting to localhost');
    return 'localhost';
  }
  
  // Check if IP is in private LAN range
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    console.log(`[ENV] Auto mode detected LAN network (${ip})`);
    return 'lan';
  }
  
  console.log(`[ENV] Auto mode detected localhost (IP: ${ip})`);
  return 'localhost';
}

function applyEnvFile(mode: EnvMode): void {
  const sourceFile = ENV_FILES[mode];
  const targetFile = '.env';
  const sourcePath = path.join(process.cwd(), sourceFile);
  const targetPath = path.join(process.cwd(), targetFile);
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`[ENV] ❌ Error: ${sourceFile} does not exist`);
    process.exit(1);
  }
  
  try {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    fs.writeFileSync(targetPath, content);
    
    // Parse the content to show what was applied
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    const apiUrl = lines.find(line => line.startsWith('VITE_API_BASE_URL'))?.split('=')[1];
    const wsUrl = lines.find(line => line.startsWith('VITE_WS_BASE_URL'))?.split('=')[1];
    
    console.log(`[ENV] ✓ Switched to ${mode.toUpperCase()} mode`);
    if (apiUrl) console.log(`[ENV]   API: ${apiUrl}`);
    if (wsUrl) console.log(`[ENV]   WebSocket: ${wsUrl}`);
    console.log(`[ENV] Applied ${sourceFile} → .env`);
  } catch (error) {
    console.error(`[ENV] ❌ Error applying environment:`, error);
    process.exit(1);
  }
}

async function promptForMode(): Promise<EnvMode> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log('\n[ENV] Select environment mode:');
    console.log('  1) localhost - Solo development (localhost:3001)');
    console.log('  2) lan       - Network access (10.0.0.35:3001)');
    console.log('  3) auto      - Automatically detect\n');
    
    rl.question('Enter choice (1-3): ', (answer) => {
      rl.close();
      
      switch (answer.trim()) {
        case '1':
          resolve('localhost');
          break;
        case '2':
          resolve('lan');
          break;
        case '3':
          resolve('auto');
          break;
        default:
          console.log('[ENV] Invalid choice, defaulting to auto');
          resolve('auto');
      }
    });
  });
}

async function main() {
  let mode: EnvMode | undefined = process.argv[2] as EnvMode;
  
  // Validate mode
  if (mode && !['localhost', 'lan', 'auto'].includes(mode)) {
    console.error(`[ENV] ❌ Invalid mode: ${mode}`);
    console.error('[ENV] Valid modes: localhost, lan, auto');
    process.exit(1);
  }
  
  // Prompt if no mode provided
  if (!mode) {
    mode = await promptForMode();
  }
  
  // Handle auto mode
  if (mode === 'auto') {
    mode = detectMode();
  }
  
  // Apply the selected environment
  applyEnvFile(mode);
}

main().catch(error => {
  console.error('[ENV] ❌ Fatal error:', error);
  process.exit(1);
});
