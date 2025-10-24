#!/usr/bin/env node

/**
 * Test STM CLI directly to see if it preserves curly braces
 */

const { executeSTMCommand } = require('../src/stm-cli.js');

async function testSTMDirectly() {
  console.log('🔧 Testing STM CLI Direct Execution\n');

  // Test with a command that should show us exactly what STM receives
  const testCommand = 'feed run --feed-name "DynamicPricingEngine-0" --community-feed --count 1 --interval 1000 --event-names "subscribe.message      acmeRental/pricingAvailability/pricing/updated/v1/{vehicleType}/{location}"';

  console.log('📋 Test Command:');
  console.log(testCommand);
  console.log();

  try {
    const result = await executeSTMCommand(testCommand);

    console.log('📤 Result:');
    console.log(`Success: ${result.success}`);
    console.log(`Output: ${result.output || 'N/A'}`);
    console.log(`Error: ${result.error || 'N/A'}`);

    // Check if STM's error message shows the parameters
    if (result.error) {
      if (result.error.includes('{vehicleType}') && result.error.includes('{location}')) {
        console.log('\n✅ STM CLI received curly braces correctly');
      } else if (result.error.includes('vehicleType') && result.error.includes('location')) {
        console.log('\n❌ STM CLI stripped curly braces from parameters');
      } else {
        console.log('\n❓ Cannot determine from error message if curly braces were preserved');
      }
    }

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
  }

  console.log('\n🔍 Now let\'s test a simpler case...');

  // Test with a very simple event name containing curly braces
  const simpleCommand = 'feed --help';

  try {
    const helpResult = await executeSTMCommand(simpleCommand);
    console.log('\n📖 STM Feed Help (to verify STM is working):');
    console.log(helpResult.success ? 'Help command successful' : `Help failed: ${helpResult.error}`);
  } catch (error) {
    console.log('💥 Help command error:', error.message);
  }
}

// Run test
if (require.main === module) {
  testSTMDirectly().catch(console.error);
}

module.exports = { testSTMDirectly };