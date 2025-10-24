#!/usr/bin/env node

/**
 * Debug both AsyncAPI files
 */

const { STMServer } = require('../src/index.js');
const path = require('path');

async function debugBothFiles() {
  console.log('🔍 Debugging Both AsyncAPI Files\n');

  const server = new STMServer();
  const fraudFile = path.join(__dirname, 'asyncSamples', 'Fraud Detection-0.1.0.json');
  const maintenanceFile = path.join(__dirname, 'asyncSamples', 'MaintenanceScheduler-0.0.1.json');

  const files = [
    { name: 'Fraud Detection', path: fraudFile },
    { name: 'Maintenance', path: maintenanceFile }
  ];

  for (const file of files) {
    console.log(`\\n=== Testing ${file.name} ===`);

    try {
      // Test feed_potential analysis
      console.log('Testing feed_potential analysis...');
      const potentialResult = await server.handleAsyncAPIAnalyze({
        asyncapi_file: file.path,
        analysis_type: 'feed_potential'
      });

      if (potentialResult.isError) {
        console.log('❌ Feed Potential Failed:', potentialResult.content[0].text);

        // Try to manually read and inspect the file
        const fs = require('fs');
        const content = fs.readFileSync(file.path, 'utf8');
        const spec = JSON.parse(content);

        console.log('File info:');
        console.log('  - asyncapi version:', spec.asyncapi);
        console.log('  - channels type:', typeof spec.channels);
        console.log('  - channels is null?', spec.channels === null);
        console.log('  - operations type:', typeof spec.operations);
        console.log('  - operations is null?', spec.operations === null);
      } else {
        console.log('✅ Feed Potential Success');
      }

    } catch (error) {
      console.log('💥 Error:', error.message);
      console.log('Stack trace:', error.stack.split('\\n')[1]);
    }
  }
}

debugBothFiles().catch(console.error);