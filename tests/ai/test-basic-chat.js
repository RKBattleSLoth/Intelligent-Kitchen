/**
 * Basic Chat Functionality Tests
 */

const TestUtils = require('./test-utils');
const config = require('./test-config');

class BasicChatTests {
  constructor() {
    this.utils = new TestUtils();
  }

  async runAll() {
    console.log('\n🤖 Running Basic Chat Tests');
    console.log('=' .repeat(50));

    try {
      // Setup
      await this.utils.setupAuth();
      // Skip AI status check for now - test will check during actual chat attempts

      // Test basic scenarios
      const scenarios = config.scenarios.simpleChat;
      
      for (const scenario of scenarios) {
        await this.utils.executeTest(scenario, 'basic-chat');
      }

      // Test conversation context
      await this.testConversationContext();
      
      // Test caching
      await this.testCaching();

    } catch (error) {
      console.error('❌ Basic chat test suite failed:', error.message);
      throw error;
    }
  }

  async testConversationContext() {
    console.log('\n🧪 Testing: Conversation Context');

    const startTime = Date.now();
    let contextId = null;

    try {
      // First message
      const response1 = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
        message: 'My name is Alex and I love Italian food',
      });

      contextId = response1.data.conversationId;
      console.log('  ✓ Started conversation');

      // Follow-up message (should remember context)
      const response2 = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
        message: 'What Italian dish would you recommend?',
        conversationId: contextId,
      });

      const duration = Date.now() - startTime;
      
      // Check if response mentions Italian food
      const mentionsItalian = response2.data.message.toLowerCase().includes('italian');
      
      console.log(`  ✓ Context maintained - ${duration}ms`);
      console.log(`  ✓ Response references Italian: ${mentionsItalian}`);

      this.utils.results.push({
        name: 'Conversation Context',
        type: 'basic-chat',
        success: response2.data.success && mentionsItalian,
        duration,
        response: response2.data,
        assertions: {
          contextMaintained: mentionsItalian,
          responseTime: { passed: duration < 3000, actual: duration },
        },
      });

    } catch (error) {
      console.log(`  ✗ Context test failed: ${error.message}`);
      this.utils.results.push({
        name: 'Conversation Context',
        type: 'basic-chat',
        success: false,
        error: error.message,
      });
    }
  }

  async testCaching() {
    console.log('\n🧪 Testing: Response Caching');

    const message = 'What temperature should I bake chicken?';
    
    try {
      // First request (should hit API)
      const startTime1 = Date.now();
      const response1 = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
        message,
      });
      const duration1 = Date.now() - startTime1;

      // Second request (should hit cache)
      const startTime2 = Date.now();
      const response2 = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
        message,
      });
      const duration2 = Date.now() - startTime2;

      // Check if second response was cached
      const wasCached = response2.data.cached === true;
      const cacheSpeedup = duration1 > duration2;

      console.log(`  ✓ First request: ${duration1}ms`);
      console.log(`  ✓ Second request: ${duration2}ms`);
      console.log(`  ✓ Response cached: ${wasCached}`);
      console.log(`  ✓ Cache speedup: ${cacheSpeedup}`);

      this.utils.results.push({
        name: 'Response Caching',
        type: 'basic-chat',
        success: response2.data.success && (wasCached || cacheSpeedup),
        duration: duration2,
        response: response2.data,
        assertions: {
          cached: wasCached,
          speedup: cacheSpeedup,
          firstTime: duration1,
          secondTime: duration2,
        },
      });

    } catch (error) {
      console.log(`  ✗ Caching test failed: ${error.message}`);
      this.utils.results.push({
        name: 'Response Caching',
        type: 'basic-chat',
        success: false,
        error: error.message,
      });
    }
  }

  async testImageUpload() {
    console.log('\n🧪 Testing: Image Upload');

    // Create a simple text file as a mock image for testing
    const fs = require('fs');
    const path = require('path');
    const FormData = require('form-data');

    const tempImagePath = path.join(__dirname, 'temp-test-image.txt');
    fs.writeFileSync(tempImagePath, 'mock image data');

    try {
      const form = new FormData();
      form.append('image', fs.createReadStream(tempImagePath));
      form.append('message', 'What do you see in this image?');

      const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat/image', form.getBuffer());
      
      console.log('  ✓ Image upload processed');
      
      this.utils.results.push({
        name: 'Image Upload',
        type: 'basic-chat',
        success: response.data.success,
        response: response.data,
      });

    } catch (error) {
      console.log(`  ⚠️  Image upload test: ${error.message}`);
      this.utils.results.push({
        name: 'Image Upload',
        type: 'basic-chat',
        success: false,
        error: error.message,
      });
    } finally {
      // Clean up
      fs.unlinkSync(tempImagePath);
    }
  }

  async testModelSelection() {
    console.log('\n🧪 Testing: Model Selection');

    const testCases = [
      {
        message: 'Hello',
        expectedTier: 'small',
        description: 'Simple greeting should use small model',
      },
      {
        message: 'Add milk to my pantry',
        expectedTier: 'medium',
        description: 'Tool operation should use medium model',
      },
      {
        message: 'Plan my meals for the entire next month',
        expectedTier: 'large',
        description: 'Complex planning should use large model',
      },
    ];

    for (const testCase of testCases) {
      try {
        const startTime = Date.now();
        const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
          message: testCase.message,
        });
        const duration = Date.now() - startTime;

        const modelsUsed = response.data.modelsUsed || [];
        const tierUsed = this.inferTierFromModels(modelsUsed);
        const correctTier = tierUsed === testCase.expectedTier;

        console.log(`  ✓ ${testCase.description}`);
        console.log(`    Models: ${modelsUsed.join(', ')}`);
        console.log(`    Tier: ${tierUsed} (expected: ${testCase.expectedTier})`);

        this.utils.results.push({
          name: `Model Selection - ${testCase.expectedTier}`,
          type: 'basic-chat',
          success: response.data.success && correctTier,
          duration,
          response: response.data,
          assertions: {
            correctTier,
            modelsUsed,
            expectedTier: testCase.expectedTier,
          },
        });

      } catch (error) {
        console.log(`  ✗ ${testCase.description}: ${error.message}`);
        this.utils.results.push({
          name: `Model Selection - ${testCase.expectedTier}`,
          type: 'basic-chat',
          success: false,
          error: error.message,
        });
      }
    }
  }

  inferTierFromModels(models) {
    // This is a simple inference - in reality, the models would be named by tier
    if (models.some(m => m.includes('small') || m.includes('haiku') || m.includes('gemma'))) {
      return 'small';
    } else if (models.some(m => m.includes('large') || m.includes('sonnet') || m.includes('maverick'))) {
      return 'large';
    } else {
      return 'medium';
    }
  }
}

module.exports = BasicChatTests;
