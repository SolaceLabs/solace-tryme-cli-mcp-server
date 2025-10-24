#!/usr/bin/env node

/**
 * Reproduce the exact curly brace issue reported by the user
 */

const { STMServer } = require('../src/index.js');

async function reproduceIssue() {
  console.log('🔍 Reproducing Curly Brace Issue\n');

  const server = new STMServer();

  // Exact parameters from user report
  const args = {
    feed_name: "DynamicPricingEngine-0",
    community_feed: true,
    count: 5,
    interval: 1000,
    event_names: ["subscribe.message      acmeRental/pricingAvailability/pricing/updated/v1/{vehicleType}/{location}"]
  };

  console.log('📋 Input Arguments:');
  console.log(JSON.stringify(args, null, 2));
  console.log();

  console.log('🔄 Executing handleFeedRun...');

  try {
    const result = await server.handleFeedRun(args);

    if (result.isError) {
      console.log('❌ Error Result:');
      console.log(result.content[0].text);

      // Check if the error shows that curly braces are preserved
      if (result.content[0].text.includes('{vehicleType}') && result.content[0].text.includes('{location}')) {
        console.log('\n✅ FIXED: Curly braces are now preserved in the command!');
      } else {
        console.log('\n❌ ISSUE PERSISTS: Curly braces are still being stripped');
      }
    } else {
      console.log('✅ Success Result:');
      console.log(result.content[0].text);
    }

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
  }
}

// Run reproduction test
if (require.main === module) {
  reproduceIssue().catch(console.error);
}

module.exports = { reproduceIssue };