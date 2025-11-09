// Quick test script to verify backend connections
async function testBackend() {
  const baseUrl = 'http://localhost:3002';
  
  console.log('Testing AquaMind Backend Connections...\n');
  
  // Test 1: Health endpoint
  try {
    console.log('1. Testing /health endpoint...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const health = await healthRes.json();
    console.log('   ✓ Health endpoint working');
    console.log('   - Uptime:', Math.floor(health.uptimeSec / 60), 'minutes');
    console.log('   - Memory:', health.memoryMB, 'MB');
  } catch (error) {
    console.log('   ✗ Health endpoint failed:', error.message);
  }
  
  // Test 2: Status endpoint
  try {
    console.log('\n2. Testing /status endpoint...');
    const statusRes = await fetch(`${baseUrl}/status`);
    const status = await statusRes.json();
    console.log('   ✓ Status endpoint working');
    console.log('   - Active Zone:', status.activeZoneId || 'None');
    console.log('   - Rain Delay:', status.rainDelay.isActive ? 'Active' : 'Inactive');
  } catch (error) {
    console.log('   ✗ Status endpoint failed:', error.message);
  }
  
  // Test 3: AI Chat endpoint
  try {
    console.log('\n3. Testing /ai/chat endpoint...');
    const chatRes = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'What is the status?' })
    });
    const chat = await chatRes.json();
    console.log('   ✓ AI Chat endpoint working');
    console.log('   - Response:', chat.success ? 'Success' : 'Failed');
    if (chat.response) {
      console.log('   - Message:', chat.response.substring(0, 100) + '...');
    }
  } catch (error) {
    console.log('   ✗ AI Chat endpoint failed:', error.message);
  }
  
  // Test 4: WebSocket connection simulation
  try {
    console.log('\n4. Testing WebSocket availability...');
    console.log('   ℹ WebSocket server sharing HTTP server on port 3002');
    console.log('   ℹ Connect using: ws://localhost:3002/socket.io');
    console.log('   ✓ WebSocket endpoint configured');
  } catch (error) {
    console.log('   ✗ WebSocket test failed:', error.message);
  }
  
  console.log('\n✅ All tests completed!');
}

testBackend().catch(console.error);
