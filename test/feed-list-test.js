#!/usr/bin/env node

/**
 * Test the improved feed list functionality
 */

const { STMServer } = require('../src/index.js');

async function testFeedList() {
  console.log('🧪 Testing STM Feed List functionality...\n');

  const server = new STMServer();

  // Test local feeds
  console.log('Testing local feeds...');
  try {
    const result = await server.handleFeedList({ source: 'local' });
    console.log('✅ Local feeds result:');
    console.log(result.content[0].text);
    console.log('');
  } catch (error) {
    console.log('❌ Local feeds failed:', error.message);
  }

  // Test both feeds (default)
  console.log('Testing default (both) feeds...');
  try {
    const result = await server.handleFeedList({ source: 'both' });
    console.log('✅ Both feeds result:');
    console.log(result.content[0].text);
    console.log('');
  } catch (error) {
    console.log('❌ Both feeds failed:', error.message);
  }

  // Test empty args (should default to local)
  console.log('Testing empty args (should default to local)...');
  try {
    const result = await server.handleFeedList({});
    console.log('✅ Default args result:');
    console.log(result.content[0].text);
  } catch (error) {
    console.log('❌ Default args failed:', error.message);
  }
}

if (require.main === module) {
  testFeedList().catch(console.error);
}

module.exports = { testFeedList };