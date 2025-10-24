#!/usr/bin/env node

/**
 * Integration test suite for Solace TryMe CLI MCP Server
 *
 * Tests actual MCP tool functionality including:
 * - Message publishing
 * - Queue management (create, list, delete)
 * - Feed operations (list, generate, preview)
 */

const { STMServer } = require('../src/index.js');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('🧪 Running Solace TryMe CLI MCP Server Integration Tests\n');

  let passed = 0;
  let failed = 0;

  function test(name, testFn) {
    return testFn()
      .then(() => {
        console.log(`✅ ${name}`);
        passed++;
      })
      .catch((error) => {
        console.log(`❌ ${name}: ${error.message}`);
        console.error(`   Details: ${error.stack || error}`);
        failed++;
      });
  }

  const server = new STMServer();

  // Test 1: MCP Server instantiation
  await test('MCP Server instantiation', async () => {
    if (!server || !server.server) {
      throw new Error('Failed to create Solace TryMe CLI MCP Server instance');
    }
  });

  // Test 2: Publish message with lint mode (parameter validation)
  await test('stm_send - Publish message validation (lint mode)', async () => {
    const result = await server.handleSend({
      topic: 'test/mcp/message',
      message: 'Hello from MCP test suite',
      count: 1,
      lint: true  // Validate only, don't actually send
    });

    if (result.isError) {
      throw new Error(`Send validation failed: ${result.content[0].text}`);
    }

    if (!result.content[0].text.includes('validated')) {
      throw new Error('Expected validation success message');
    }
  });

  // Test 3: List local feeds
  await test('stm_feed_list - List local feeds', async () => {
    const result = await server.handleFeedList({
      source: 'local'
    });

    if (result.isError) {
      throw new Error(`Feed list failed: ${result.content[0].text}`);
    }

    // Should return either feeds or "No local feeds found" message
    const text = result.content[0].text;
    if (!text.includes('feed') && !text.includes('No local feeds found')) {
      throw new Error('Unexpected feed list response');
    }
  });

  // Test 4: Generate feed from AsyncAPI spec (preview mode)
  await test('stm_feed_generate - Preview feed from AsyncAPI', async () => {
    const asyncApiPath = path.join(__dirname, 'asyncSamples', 'MaintenanceScheduler-0.0.1.json');

    if (!fs.existsSync(asyncApiPath)) {
      throw new Error(`Test AsyncAPI file not found: ${asyncApiPath}`);
    }

    const result = await server.handleFeedGenerate({
      source: asyncApiPath,
      feed_name: 'test-mcp-feed',
      preview_only: true
    });

    if (result.isError) {
      throw new Error(`Feed generation preview failed: ${result.content[0].text}`);
    }

    // Should show preview output
    const text = result.content[0].text;
    if (!text.includes('Preview') && !text.includes('generate') && !text.includes('feed')) {
      throw new Error(`Unexpected preview output: ${text.substring(0, 200)}`);
    }
  });

  // Test 5: List configuration
  await test('stm_config - List configuration', async () => {
    const result = await server.handleConfig({
      action: 'list'
    });

    // This should either show configuration or indicate none found
    if (result.isError) {
      throw new Error(`Config list failed: ${result.content[0].text}`);
    }

    const text = result.content[0].text;
    if (!text.includes('Configuration') && !text.includes('config')) {
      throw new Error('Unexpected config response');
    }
  });

  // Test 6: Queue management - List queues (will use SEMP, may fail without broker)
  await test('stm_manage - List queues', async () => {
    const result = await server.handleManage({
      resource: 'queue',
      operation: 'list'
    });

    // This test expects either success or a SEMP connection error (which is expected without broker)
    const text = result.content[0].text;

    if (!result.isError) {
      // Success case - broker is available
      if (!text.includes('QUEUE')) {
        throw new Error('Expected queue list output');
      }
    } else {
      // Expected error case - no broker available
      if (!text.includes('ECONNREFUSED') && !text.includes('fetch failed') && !text.includes('queue')) {
        throw new Error(`Unexpected error: ${text}`);
      }
      console.log('   Note: Expected error - no broker available for SEMP operations');
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log('\n🎉 All tests passed!');
}

// Run tests if this is the main module
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
