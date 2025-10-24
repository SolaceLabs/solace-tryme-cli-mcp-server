#!/usr/bin/env node

/**
 * Debug AsyncAPI analysis
 */

const { STMServer } = require('../src/index.js');
const path = require('path');

async function debugAsyncAPI() {
  console.log('🔍 Debugging AsyncAPI Analysis\n');

  const server = new STMServer();
  const maintenanceFile = path.join(__dirname, 'asyncSamples', 'MaintenanceScheduler-0.0.1.json');

  console.log('Testing with:', maintenanceFile);

  try {
    // First try overview - this works
    console.log('\\n1. Testing Overview Analysis...');
    const overviewResult = await server.handleAsyncAPIAnalyze({
      asyncapi_file: maintenanceFile,
      analysis_type: 'overview'
    });
    console.log('Overview Success:', !overviewResult.isError);

    // Now try feed_potential - this fails
    console.log('\\n2. Testing Feed Potential Analysis...');
    const potentialResult = await server.handleAsyncAPIAnalyze({
      asyncapi_file: maintenanceFile,
      analysis_type: 'feed_potential'
    });

    if (potentialResult.isError) {
      console.log('❌ Feed Potential Failed:', potentialResult.content[0].text);
    } else {
      console.log('✅ Feed Potential Success');
    }

  } catch (error) {
    console.log('💥 Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

debugAsyncAPI().catch(console.error);