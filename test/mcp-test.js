#!/usr/bin/env node

/**
 * Test MCP Server startup and basic functionality
 */

const { spawn } = require('child_process');

async function testMCPServer() {
  console.log('🧪 Testing MCP Server startup...\n');

  return new Promise((resolve, reject) => {
    const server = spawn('node', ['src/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let hasStarted = false;

    const timeout = setTimeout(() => {
      server.kill();
      if (hasStarted) {
        console.log('✅ MCP Server started successfully and responded to stderr');
        resolve();
      } else {
        reject(new Error('MCP Server did not start within timeout'));
      }
    }, 3000);

    server.stderr.on('data', (data) => {
      const message = data.toString();
      console.log(`[SERVER] ${message.trim()}`);

      if (message.includes('Solace TryMe CLI MCP Server running')) {
        hasStarted = true;
        clearTimeout(timeout);
        server.kill();
        console.log('✅ MCP Server started successfully');
        resolve();
      }
    });

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    server.on('close', (code) => {
      clearTimeout(timeout);
      if (hasStarted) {
        resolve();
      } else if (code !== 0) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Give the server a moment to start
    setTimeout(() => {
      server.kill();
    }, 2000);
  });
}

if (require.main === module) {
  testMCPServer()
    .then(() => {
      console.log('\n🎉 MCP Server test passed!');
    })
    .catch((error) => {
      console.error(`\n❌ MCP Server test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testMCPServer };