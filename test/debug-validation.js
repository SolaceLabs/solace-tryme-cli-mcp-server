#!/usr/bin/env node

/**
 * Debug AsyncAPI validation issue
 */

const { STMServer } = require('../src/index.js');
const path = require('path');

async function debugValidation() {
  console.log('🔍 Debugging AsyncAPI Validation\n');

  const server = new STMServer();
  const fraudFile = path.join(__dirname, 'asyncSamples', 'Fraud Detection-0.1.0.json');

  console.log('Testing with:', fraudFile);

  try {
    // Test validation directly
    console.log('\\n1. Testing Validation...');
    const validationResult = await server.handleFeedValidate({
      asyncapi_file: fraudFile,
      validation_level: 'stm_compatibility'
    });

    if (validationResult.isError) {
      console.log('❌ Validation Failed:', validationResult.content[0].text);
    } else {
      console.log('✅ Validation Success');
      console.log('First 200 chars:', validationResult.content[0].text.substring(0, 200));
    }

  } catch (error) {
    console.log('💥 Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

debugValidation().catch(console.error);