#!/usr/bin/env node

/**
 * Test the feed generation functionality
 */

const { STMServer } = require('../src/index.js');
const path = require('path');

async function testFeedGenerate() {
  console.log('🧪 Testing STM Feed Generate functionality...\n');

  const server = new STMServer();
  const sampleAsyncAPIPath = path.join(__dirname, 'sample-asyncapi.yaml');

  // Test 1: Generate feed without feed name
  console.log('Testing feed generation without feed name...');
  try {
    const result = await server.handleFeedGenerate({
      source: sampleAsyncAPIPath
    });
    console.log('✅ Feed generation result:');
    console.log(result.content[0].text);
    console.log('');
  } catch (error) {
    console.log('❌ Feed generation failed:', error.message);
  }

  // Test 2: Generate feed with custom feed name
  console.log('Testing feed generation with custom feed name...');
  try {
    const result = await server.handleFeedGenerate({
      source: sampleAsyncAPIPath,
      feed_name: 'TestOrderProcessing'
    });
    console.log('✅ Feed generation with name result:');
    console.log(result.content[0].text);
    console.log('');
  } catch (error) {
    console.log('❌ Feed generation with name failed:', error.message);
  }

  // Test 3: Generate feed with missing source (error case)
  console.log('Testing feed generation with missing source...');
  try {
    const result = await server.handleFeedGenerate({});
    console.log('✅ Error handling result:');
    console.log(result.content[0].text);
    console.log('');
  } catch (error) {
    console.log('❌ Error handling failed:', error.message);
  }

  // Test 4: Generate feed with non-existent file (error case)
  console.log('Testing feed generation with non-existent file...');
  try {
    const result = await server.handleFeedGenerate({
      source: '/nonexistent/file.yaml'
    });
    console.log('✅ Non-existent file result:');
    console.log(result.content[0].text);
  } catch (error) {
    console.log('❌ Non-existent file test failed:', error.message);
  }
}

if (require.main === module) {
  testFeedGenerate().catch(console.error);
}

module.exports = { testFeedGenerate };