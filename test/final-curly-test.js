#!/usr/bin/env node

/**
 * Final test with correct feed parameters to validate curly brace preservation
 */

const { STMServer } = require('../src/index.js');

async function finalTest() {
  console.log('🎯 Final Curly Brace Test with Correct Feed\n');

  const server = new STMServer();

  // Use correct parameters - DynamicPricingEngine-0 is LOCAL, not community
  const args = {
    feed_name: "DynamicPricingEngine-0",
    community_feed: false,  // This was the issue in the original test!
    count: 1,
    interval: 1000,
    event_names: ["subscribe.message      acmeRental/pricingAvailability/pricing/updated/v1/{vehicleType}/{location}"]
  };

  console.log('📋 Corrected Input Arguments:');
  console.log(JSON.stringify(args, null, 2));
  console.log();

  console.log('🔄 Executing handleFeedRun with local feed...');

  try {
    const result = await server.handleFeedRun(args);

    console.log('📤 Result:');
    console.log(`Is Error: ${result.isError}`);
    console.log(`Content: ${result.content[0].text.substring(0, 500)}...`);

    // The important thing is that the command should be executed with curly braces preserved
    // We can see this in the console log output

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
  }

  console.log('\n🔍 Let\'s also test preview to get the correct event name format:');

  try {
    const previewResult = await server.handleFeedPreview({
      feed_name: "DynamicPricingEngine-0",
      community_feed: false
    });

    if (previewResult.isError) {
      console.log('❌ Preview error:', previewResult.content[0].text);
    } else {
      console.log('✅ Preview successful - checking for event names with curly braces...');
      const previewText = previewResult.content[0].text;

      if (previewText.includes('{') && previewText.includes('}')) {
        console.log('✅ Preview shows event names with curly braces preserved');

        // Extract the actual event name from preview
        const eventNameMatch = previewText.match(/"([^"]*\{[^"]*\})"/);
        if (eventNameMatch) {
          console.log(`📋 Found event name with curly braces: ${eventNameMatch[1]}`);
        }
      } else {
        console.log('❓ No curly braces found in preview output');
      }
    }

  } catch (error) {
    console.log('💥 Preview error:', error.message);
  }
}

// Run final test
if (require.main === module) {
  finalTest().catch(console.error);
}

module.exports = { finalTest };