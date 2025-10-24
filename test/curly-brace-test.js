#!/usr/bin/env node

/**
 * Test for curly brace preservation in command sanitization
 */

const { sanitizeCommand } = require('../src/stm-cli.js');
const { STMServer } = require('../src/index.js');

async function testCurlyBraces() {
  console.log('🧪 Testing Curly Brace Preservation\n');

  let passed = 0;
  let failed = 0;

  function test(name, testFn) {
    try {
      testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  // Test 1: Basic curly brace preservation in sanitization
  test('Sanitization preserves curly braces', () => {
    const input = 'feed run --event-names "subscribe.message      acme/pricing/{vehicleType}/{location}"';
    const sanitized = sanitizeCommand(input);

    if (!sanitized.includes('{vehicleType}')) {
      throw new Error('vehicleType parameter lost in sanitization');
    }

    if (!sanitized.includes('{location}')) {
      throw new Error('location parameter lost in sanitization');
    }

    console.log(`    Input:    ${input}`);
    console.log(`    Sanitized: ${sanitized}`);
  });

  // Test 2: Still removes dangerous characters
  test('Sanitization still removes dangerous characters', () => {
    const input = 'feed run; rm -rf /; --event-names "test{param}"';
    const sanitized = sanitizeCommand(input);

    if (sanitized.includes(';')) {
      throw new Error('Semicolon not removed');
    }

    if (!sanitized.includes('{param}')) {
      throw new Error('Legitimate curly braces were removed');
    }

    console.log(`    Input:    ${input}`);
    console.log(`    Sanitized: ${sanitized}`);
  });

  // Test 3: Event name format validation with curly braces
  test('Event name validation accepts curly braces', async () => {
    const server = new STMServer();

    // This should NOT fail due to format validation
    const result = await server.handleFeedRun({
      feed_name: 'test-feed',
      event_names: ['subscribe.message      acmeRental/pricing/updated/v1/{vehicleType}/{location}'],
      count: 1
    });

    // It may fail due to STM not finding the feed, but should NOT fail due to event name format
    if (result.isError && result.content[0].text.includes('Invalid Event Name Format')) {
      throw new Error('Valid event name with curly braces was rejected');
    }

    console.log(`    Event name validation passed for curly brace format`);
  });

  // Test 4: Multiple parameters in topic template
  test('Multiple curly brace parameters preserved', () => {
    const input = 'feed run --event-names "msg      topic/{param1}/{param2}/test/{param3}"';
    const sanitized = sanitizeCommand(input);

    const expectedParams = ['{param1}', '{param2}', '{param3}'];

    for (const param of expectedParams) {
      if (!sanitized.includes(param)) {
        throw new Error(`Parameter ${param} was lost in sanitization`);
      }
    }

    console.log(`    All parameters preserved: ${expectedParams.join(', ')}`);
  });

  console.log(`\n📊 Curly Brace Test Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\n❌ Some curly brace tests failed!');
    process.exit(1);
  }

  console.log('\n🎉 All curly brace tests passed!');
  return { passed, failed };
}

// Run tests if this is the main module
if (require.main === module) {
  testCurlyBraces().catch(console.error);
}

module.exports = { testCurlyBraces };