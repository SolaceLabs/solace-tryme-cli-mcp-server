#!/usr/bin/env node

/**
 * Test messaging tools (send, receive, request, reply)
 * These tests run in lint mode by default for parameter validation
 */

const { STMServer } = require('../src/index.js');

async function testMessagingTools() {
  console.log('🧪 Testing Messaging Tools\n');

  const server = new STMServer();
  let passed = 0;
  let failed = 0;

  // Test 1: stm_send with topic (lint mode)
  console.log('Test 1: stm_send with topic (lint validation)...');
  try {
    const result = await server.handleSend({
      topic: 'test/topic',
      message: 'Hello Solace',
      count: 1,
      lint: true
    });

    if (!result.isError && result.content[0].text.includes('validated')) {
      console.log('✅ PASS: Send validation successful\n');
      passed++;
    } else {
      console.log('❌ FAIL: Send validation failed\n');
      console.log(result.content[0].text);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message, '\n');
    failed++;
  }

  // Test 2: stm_send validation - topic/queue exclusivity
  console.log('Test 2: stm_send validation - both topic and queue (should fail)...');
  try {
    const result = await server.handleSend({
      topic: 'test/topic',
      queue: 'test.queue',
      message: 'Hello'
    });

    if (result.isError && result.content[0].text.includes('Cannot specify both')) {
      console.log('✅ PASS: Correctly rejected both topic and queue\n');
      passed++;
    } else {
      console.log('❌ FAIL: Should have rejected both topic and queue\n');
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message, '\n');
    failed++;
  }

  // Test 3: stm_send validation - missing topic/queue
  console.log('Test 3: stm_send validation - neither topic nor queue (should fail)...');
  try {
    const result = await server.handleSend({
      message: 'Hello'
    });

    if (result.isError && result.content[0].text.includes('Must specify either')) {
      console.log('✅ PASS: Correctly rejected missing topic/queue\n');
      passed++;
    } else {
      console.log('❌ FAIL: Should have rejected missing topic/queue\n');
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message, '\n');
    failed++;
  }

  // Test 4: stm_receive with queue (lint mode)
  console.log('Test 4: stm_receive with queue (lint validation)...');
  try {
    const result = await server.handleReceive({
      queue: 'test.queue',
      count: 5,
      timeout: 30000,
      lint: true
    });

    if (!result.isError && result.content[0].text.includes('validated')) {
      console.log('✅ PASS: Receive validation successful\n');
      passed++;
    } else {
      console.log('❌ FAIL: Receive validation failed\n');
      console.log(result.content[0].text);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message, '\n');
    failed++;
  }

  // Test 5: stm_request with required topic (lint mode)
  console.log('Test 5: stm_request with topic (lint validation)...');
  try {
    const result = await server.handleRequest({
      topic: 'request/topic',
      message: 'Request payload',
      count: 1,
      timeout: 5000,
      lint: true
    });

    if (!result.isError && result.content[0].text.includes('validated')) {
      console.log('✅ PASS: Request validation successful\n');
      passed++;
    } else {
      console.log('❌ FAIL: Request validation failed\n');
      console.log(result.content[0].text);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message, '\n');
    failed++;
  }

  // Test 6: stm_reply with required topic (lint mode)
  console.log('Test 6: stm_reply with topic (lint validation)...');
  try {
    const result = await server.handleReply({
      topic: 'request/topic',
      message: 'Reply payload',
      count: 0,
      lint: true
    });

    if (!result.isError && result.content[0].text.includes('validated')) {
      console.log('✅ PASS: Reply validation successful\n');
      passed++;
    } else {
      console.log('❌ FAIL: Reply validation failed\n');
      console.log(result.content[0].text);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message, '\n');
    failed++;
  }

  // Test 7: stm_send with connection parameters
  console.log('Test 7: stm_send with connection parameters (lint validation)...');
  try {
    const result = await server.handleSend({
      topic: 'test/topic',
      message: 'Hello',
      url: 'ws://localhost:8008',
      vpn: 'default',
      username: 'test-user',
      password: 'test-pass',
      delivery_mode: 'PERSISTENT',
      time_to_live: 60000,
      output_mode: 'FULL',
      lint: true
    });

    if (!result.isError && result.content[0].text.includes('validated')) {
      console.log('✅ PASS: Send with full parameters validated\n');
      passed++;
    } else {
      console.log('❌ FAIL: Send with parameters validation failed\n');
      console.log(result.content[0].text);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message, '\n');
    failed++;
  }

  // Summary
  console.log('='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n⚠️  Note: Some tests may fail if STM CLI is not available or does not support --lint flag');
    console.log('These tools are designed to work with STM CLI v0.0.82 or later');
  }

  process.exit(failed > 0 ? 1 : 0);
}

testMessagingTools().catch(error => {
  console.error('💥 Test suite error:', error);
  process.exit(1);
});
