#!/usr/bin/env node

/**
 * Test the feed run functionality
 */

const { STMServer } = require('../src/index.js');

async function testFeedRun() {
  console.log('🧪 Testing STM Feed Run functionality...\n');

  const server = new STMServer();

  // Get the available feed names from the list first
  console.log('Getting available feeds...');
  const listResult = await server.handleFeedList({ source: 'local' });
  console.log('Available feeds:', listResult.content[0].text);
  console.log('');

  // Extract a feed name for testing (assuming we have DynamicPricingEngine-0)
  const feedName = 'DynamicPricingEngine-0';

  // Test 1: Basic feed run with minimal parameters
  console.log(`Testing basic feed run with "${feedName}"...`);
  try {
    const result = await server.handleFeedRun({
      feed_name: feedName,
      count: 1
    });
    console.log('✅ Basic feed run result:');
    console.log(result.content[0].text);
    console.log('');
  } catch (error) {
    console.log('❌ Basic feed run failed:', error.message);
  }

  // Test 2: Feed run with custom count and interval
  console.log(`Testing feed run with custom parameters...`);
  try {
    const result = await server.handleFeedRun({
      feed_name: feedName,
      count: 2,
      interval: 500
    });
    console.log('✅ Custom parameters result:');
    console.log(result.content[0].text);
    console.log('');
  } catch (error) {
    console.log('❌ Custom parameters failed:', error.message);
  }

  // Test 3: Missing feed name (error case)
  console.log('Testing missing feed name...');
  try {
    const result = await server.handleFeedRun({});
    console.log('✅ Error handling result:');
    console.log(result.content[0].text);
    console.log('');
  } catch (error) {
    console.log('❌ Error handling failed:', error.message);
  }

  // Test 4: Non-existent feed name (error case)
  console.log('Testing non-existent feed...');
  try {
    const result = await server.handleFeedRun({
      feed_name: 'NonExistentFeed',
      count: 1
    });
    console.log('✅ Non-existent feed result:');
    console.log(result.content[0].text);
  } catch (error) {
    console.log('❌ Non-existent feed test failed:', error.message);
  }
}

if (require.main === module) {
  testFeedRun().catch(console.error);
}

module.exports = { testFeedRun };