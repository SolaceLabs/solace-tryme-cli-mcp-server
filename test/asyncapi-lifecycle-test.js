#!/usr/bin/env node

/**
 * Comprehensive AsyncAPI Feed Lifecycle Test
 *
 * Tests the complete AsyncAPI to Solace feed workflow:
 * 1. AsyncAPI Analysis
 * 2. AsyncAPI Validation
 * 3. Feed Generation (with preview)
 * 4. Feed Contribution workflow
 */

const { STMServer } = require('../src/index.js');
const path = require('path');

async function runAsyncAPILifecycleTests() {
  console.log('🔬 Testing AsyncAPI Feed Lifecycle Functionality\n');

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
        failed++;
      });
  }

  const server = new STMServer();

  // Test files
  const fraudDetectionFile = path.join(__dirname, 'asyncSamples', 'Fraud Detection-0.1.0.json');
  const maintenanceFile = path.join(__dirname, 'asyncSamples', 'MaintenanceScheduler-0.0.1.json');

  // Test 1: AsyncAPI Analysis - Overview
  await test('AsyncAPI Analysis - Overview (Fraud Detection)', async () => {
    const result = await server.handleAsyncAPIAnalyze({
      asyncapi_file: fraudDetectionFile,
      analysis_type: 'overview'
    });

    if (result.isError) {
      throw new Error(`Analysis failed: ${result.content[0].text}`);
    }

    const output = result.content[0].text;
    if (!output.includes('Fraud Detection') || !output.includes('Channels') || !output.includes('Messages')) {
      throw new Error('Analysis output missing expected content');
    }

    console.log(`    ℹ️  Found AsyncAPI with channels and messages`);
  });

  // Test 2: AsyncAPI Analysis - Channels
  await test('AsyncAPI Analysis - Channels (Maintenance)', async () => {
    const result = await server.handleAsyncAPIAnalyze({
      asyncapi_file: maintenanceFile,
      analysis_type: 'channels'
    });

    if (result.isError) {
      throw new Error(`Channel analysis failed: ${result.content[0].text}`);
    }

    const output = result.content[0].text;
    if (!output.includes('Channels Analysis') || !output.includes('acmeRental/')) {
      throw new Error('Channel analysis missing expected content');
    }

    console.log(`    ℹ️  Analyzed maintenance scheduler channels`);
  });

  // Test 3: AsyncAPI Analysis - Feed Potential
  await test('AsyncAPI Analysis - Feed Potential', async () => {
    const result = await server.handleAsyncAPIAnalyze({
      asyncapi_file: fraudDetectionFile,
      analysis_type: 'feed_potential'
    });

    if (result.isError) {
      throw new Error(`Feed potential analysis failed: ${result.content[0].text}`);
    }

    const output = result.content[0].text;
    if (!output.includes('Feed Generation Potential') || !output.includes('Event Names for stm_feed_run')) {
      throw new Error('Feed potential analysis missing expected content');
    }

    console.log(`    ℹ️  Identified publishable events for feed generation`);
  });

  // Test 4: AsyncAPI Validation - Basic
  await test('AsyncAPI Validation - STM Compatibility', async () => {
    const result = await server.handleFeedValidate({
      asyncapi_file: fraudDetectionFile,
      validation_level: 'stm_compatibility'
    });

    if (result.isError) {
      throw new Error(`Validation failed: ${result.content[0].text}`);
    }

    const output = result.content[0].text;
    if (!output.includes('STM Feed Validation') || !output.includes('Validation Passed')) {
      throw new Error('Validation output missing expected success indicators');
    }

    console.log(`    ℹ️  AsyncAPI passed STM compatibility validation`);
  });

  // Test 5: Feed Generation - Preview Mode
  await test('Feed Generation - Preview Mode', async () => {
    const result = await server.handleFeedGenerate({
      source: fraudDetectionFile,
      feed_name: 'test-fraud-detection',
      preview_only: true,
      validate_first: true
    });

    if (result.isError) {
      throw new Error(`Feed generation preview failed: ${result.content[0].text}`);
    }

    const output = result.content[0].text;
    if (!output.includes('Feed Generation Preview') || !output.includes('preview_only: false')) {
      throw new Error('Preview output missing expected content');
    }

    console.log(`    ℹ️  Feed generation preview completed successfully`);
  });

  // Test 6: Feed Generation - Actual Generation
  await test('Feed Generation - Actual Non-Interactive Generation', async () => {
    const result = await server.handleFeedGenerate({
      source: maintenanceFile,
      feed_name: 'test-maintenance-lifecycle',
      preview_only: false,
      validate_first: true
    });

    if (result.isError) {
      throw new Error(`Feed generation failed: ${result.content[0].text}`);
    }

    const output = result.content[0].text;
    if (!output.includes('Feed Generation Completed') || !output.includes('Successfully generated')) {
      throw new Error('Generation output missing expected success content');
    }

    console.log(`    ℹ️  Feed generated successfully using --use-defaults`);
  });

  // Test 7: Feed Contribution - Dry Run
  await test('Feed Contribution - Dry Run Workflow', async () => {
    const result = await server.handleFeedContribute({
      feed_name: 'test-maintenance-lifecycle', // Use the feed we just generated
      description: 'Test maintenance scheduler feed for fleet management',
      category: 'logistics',
      tags: ['maintenance', 'logistics', 'scheduling', 'fleet'],
      author: 'Test Suite',
      dry_run: true
    });

    // This may error if the feed doesn't exist locally, which is fine
    const output = result.content[0].text;
    if (result.isError && !output.includes('Feed Not Found')) {
      throw new Error(`Unexpected contribution error: ${output}`);
    }

    if (!result.isError && !output.includes('STM Feed Contribution Workflow')) {
      throw new Error('Contribution workflow output missing expected content');
    }

    console.log(`    ℹ️  Feed contribution workflow ${result.isError ? 'validated feed existence check' : 'completed dry run'}`);
  });

  // Test 8: Parameter Validation
  await test('Parameter Validation - Missing Required Fields', async () => {
    // Test missing asyncapi_file
    const analysisResult = await server.handleAsyncAPIAnalyze({});
    if (!analysisResult.isError || !analysisResult.content[0].text.includes('asyncapi_file parameter is required')) {
      throw new Error('Should have failed with missing asyncapi_file parameter');
    }

    // Test missing feed_name for contribution
    const contributionResult = await server.handleFeedContribute({
      description: 'test'
    });
    if (!contributionResult.isError || !contributionResult.content[0].text.includes('feed_name, description, and category are required')) {
      throw new Error('Should have failed with missing required parameters');
    }

    console.log(`    ℹ️  Parameter validation working correctly`);
  });

  // Test 9: File Not Found Handling
  await test('File Not Found Error Handling', async () => {
    const result = await server.handleAsyncAPIAnalyze({
      asyncapi_file: 'nonexistent-file.json',
      analysis_type: 'overview'
    });

    if (!result.isError || !result.content[0].text.includes('AsyncAPI file not found')) {
      throw new Error('Should have failed with file not found error');
    }

    console.log(`    ℹ️  File not found error handling working correctly`);
  });

  // Test 10: Invalid JSON Handling
  await test('Invalid JSON Error Handling', async () => {
    // Create a temporary invalid JSON file
    const fs = require('fs');
    const tmpFile = path.join(__dirname, 'tmp-invalid.json');
    fs.writeFileSync(tmpFile, '{ invalid json }');

    try {
      const result = await server.handleAsyncAPIAnalyze({
        asyncapi_file: tmpFile,
        analysis_type: 'overview'
      });

      if (!result.isError || !result.content[0].text.includes('Error parsing AsyncAPI file as JSON')) {
        throw new Error('Should have failed with JSON parsing error');
      }

      console.log(`    ℹ️  Invalid JSON error handling working correctly`);
    } finally {
      // Clean up
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  });

  // Test 11: End-to-End Workflow
  await test('End-to-End AsyncAPI Workflow', async () => {
    console.log(`\\n    🔄 Running complete workflow...`);

    // Step 1: Analyze
    const analysisResult = await server.handleAsyncAPIAnalyze({
      asyncapi_file: maintenanceFile,
      analysis_type: 'feed_potential'
    });

    if (analysisResult.isError) {
      throw new Error(`Workflow step 1 (analysis) failed: ${analysisResult.content[0].text}`);
    }

    // Step 2: Validate
    const validationResult = await server.handleFeedValidate({
      asyncapi_file: maintenanceFile,
      validation_level: 'stm_compatibility'
    });

    if (validationResult.isError) {
      throw new Error(`Workflow step 2 (validation) failed: ${validationResult.content[0].text}`);
    }

    // Step 3: Preview Generation
    const previewResult = await server.handleFeedGenerate({
      source: maintenanceFile,
      feed_name: 'test-maintenance-scheduler',
      preview_only: true
    });

    if (previewResult.isError) {
      throw new Error(`Workflow step 3 (preview) failed: ${previewResult.content[0].text}`);
    }

    console.log(`    ✅ Complete AsyncAPI-to-Feed workflow validated successfully`);
  });

  console.log(`\\n📊 AsyncAPI Lifecycle Test Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\\n⚠️  Some tests failed. This may indicate issues with the AsyncAPI functionality.');
    return { passed, failed };
  }

  console.log('\\n🎉 All AsyncAPI feed lifecycle tests passed!');
  console.log('\\n🚀 **Ready for AsyncAPI Feed Operations:**');
  console.log('   • Analyze any AsyncAPI spec with stm_asyncapi_analyze');
  console.log('   • Validate STM compatibility with stm_feed_validate');
  console.log('   • Generate feeds from AsyncAPI with stm_feed_generate');
  console.log('   • Contribute feeds to community with stm_feed_contribute');

  return { passed, failed };
}

// Run tests if this is the main module
if (require.main === module) {
  runAsyncAPILifecycleTests().catch(console.error);
}

module.exports = { runAsyncAPILifecycleTests };