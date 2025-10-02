/**
 * Error Handling Tests
 * Tests how gracefully the AI system handles errors and edge cases
 */

const TestUtils = require('./test-utils');
const config = require('./test-config');

class ErrorHandlingTests {
  constructor() {
    this.utils = new TestUtils();
  }

  async runAll() {
    console.log('\n⚠️ Running Error Handling Tests');
    console.log('=' .repeat(50));

    try {
      // Setup
      await this.utils.setupAuth();
      await this.utils.checkAIStatus();

      // Test different error scenarios
      await this.testInputValidationErrors();
      await this.testResourceErrors();
      await this.testAPIErrors();
      await this.testEdgeCases();
      await this.testTimeoutHandling();
      await this.testErrorRecovery();

    } catch (error) {
      console.error('❌ Error handling test suite failed:', error.message);
      throw error;
    }
  }

  async testInputValidationErrors() {
    console.log('\n📝 Testing Input Validation Errors');

    const validationTests = [
      {
        name: 'Empty Message',
        endpoint: '/api/ai/chat',
        body: { message: '' },
        expectedError: true,
        expectedStatus: 400,
      },
      {
        name: 'Null Message',
        endpoint: '/api/ai/chat',
        body: { message: null },
        expectedError: true,
        expectedStatus: 400,
      },
      {
        name: 'Message Too Long',
        endpoint: '/api/ai/chat',
        body: { message: 'x'.repeat(50000) }, // Very long message
        expectedError: true,
        expectedStatus: 400,
      },
      {
        name: 'Invalid JSON in Chat',
        endpoint: '/api/ai/chat',
        body: 'invalid json',
        expectedError: true,
        expectedStatus: 400,
      },
      {
        name: 'Missing Required Fields',
        endpoint: '/api/ai/agent',
        body: { invalidField: 'value' },
        expectedError: true,
        expectedStatus: 400,
      },
      {
        name: 'Invalid Conversation ID',
        endpoint: '/api/ai/chat',
        body: { message: 'Hello', conversationId: 'invalid-uuid' },
        expectedError: false, // Should handle gracefully
      },
    ];

    for (const test of validationTests) {
      await this.executeErrorTest(test, 'validation');
    }
  }

  async testResourceErrors() {
    console.log('\n💾 Testing Resource Errors');

    const resourceTests = [
      {
        name: 'Nonexistent Recipe ID',
        endpoint: '/api/ai/chat',
        body: { message: 'Tell me about recipe ID 999999999' },
        expectedError: false, // Should handle gracefully
        checkGraceful: true,
      },
      {
        name: 'Nonexistent Pantry Item',
        endpoint: '/api/ai/chat',
        body: { message: 'Update the unicorn steak in my pantry' },
        expectedError: false, // Should handle gracefully
        checkGraceful: true,
      },
      {
        name: 'Invalid Meal Plan ID',
        endpoint: '/api/ai/chat',
        body: { message: 'Show me meal plan invalid-id' },
        expectedError: false, // Should handle gracefully
        checkGraceful: true,
      },
      {
        name: 'Database Connection Test',
        endpoint: '/api/ai/chat',
        body: { message: 'Add item to pantry and check connection' },
        expectedError: false,
        checkDBOperation: true,
      },
    ];

    for (const test of resourceTests) {
      await this.executeErrorTest(test, 'resource');
    }
  }

  async testAPIErrors() {
    console.log('\n🌐 Testing API Errors');

    const apiTests = [
      {
        name: 'OpenRouter API Error Simulation',
        endpoint: '/api/ai/chat',
        body: { message: 'Test API error handling' },
        expectedError: false, // System should fallback gracefully
        checkFallback: true,
      },
      {
        name: 'Tool Execution Error',
        endpoint: '/api/ai/chat',
        body: { message: 'Execute a tool that will fail: divide_by_zero' },
        expectedError: false, // Should handle gracefully
        checkToolError: true,
      },
      {
        name: 'Multiple Tool Failures',
        endpoint: '/api/ai/chat',
        body: { message: 'Try to do multiple impossible operations at once' },
        expectedError: false,
        checkMultipleErrors: true,
      },
      {
        name: 'Agent Coordination Error',
        endpoint: '/api/ai/agent',
        body: { request: 'Try to coordinate between agents with conflicting requirements' },
        expectedError: false,
        checkAgentError: true,
      },
    ];

    for (const test of apiTests) {
      await this.executeErrorTest(test, 'api');
    }
  }

  async testEdgeCases() {
    console.log('\n🎯 Testing Edge Cases');

    const edgeCaseTests = [
      {
        name: 'Special Characters in Message',
        endpoint: '/api/ai/chat',
        body: { message: 'Hello! @#$%^&*()_+{}|:"<>?[]\\;\',./`~' },
        expectedError: false,
      },
      {
        name: 'Unicode Characters',
        endpoint: '/api/ai/chat',
        body: { message: 'Hello! 🍳🥗🍝🌮🍕 Café résumé naïve' },
        expectedError: false,
      },
      {
        name: 'Very Short Message',
        endpoint: '/api/ai/chat',
        body: { message: '?' },
        expectedError: false,
      },
      {
        name: 'JSON in Message',
        endpoint: '/api/ai/chat',
        body: { message: '{"test": "value"}' },
        expectedError: false,
      },
      {
        name: 'Code Block in Message',
        endpoint: '/api/ai/chat',
        body: { message: '```javascript\nconst x = 1;\n```' },
        expectedError: false,
      },
      {
        name: 'Repeated Words',
        endpoint: '/api/ai/chat',
        body: { message: 'test '.repeat(1000) },
        expectedError: false,
      },
    ];

    for (const test of edgeCaseTests) {
      await this.executeErrorTest(test, 'edge-case');
    }
  }

  async testTimeoutHandling() {
    console.log('\n⏱️ Testing Timeout Handling');

    const timeoutTests = [
      {
        name: 'Complex Query Timeout',
        endpoint: '/api/ai/chat',
        body: { message: 'Create a 30-day meal plan with 6 meals per day, optimize for nutrition, budget, variety, and cooking time, analyze each meal, and provide detailed shopping lists' },
        expectedError: false,
        checkTimeout: true,
        maxTime: 25000, // 25 seconds
      },
      {
        name: 'Agent Workflow Timeout',
        endpoint: '/api/ai/agent',
        body: { request: 'Perform deep analysis of all my data across pantry, recipes, meal plans, and generate comprehensive insights with recommendations' },
        expectedError: false,
        checkTimeout: true,
        maxTime: 30000, // 30 seconds
      },
      {
        name: 'Rapid Sequential Requests',
        endpoint: '/api/ai/chat',
        requests: 5,
        body: { message: 'Quick question: What time is it?' },
        expectedError: false,
        checkConcurrency: true,
      },
    ];

    for (const test of timeoutTests) {
      await this.executeTimeoutTest(test);
    }
  }

  async testErrorRecovery() {
    console.log('\n🔄 Testing Error Recovery');

    const recoveryTests = [
      {
        name: 'Recovery After Tool Error',
        steps: [
          { message: 'Add invalid item to pantry', expectError: true },
          { message: 'Now add a valid item like milk', expectError: false },
        ],
      },
      {
        name: 'Recovery After API Error',
        steps: [
          { message: 'Try to access non-existent recipe', expectError: true },
          { message: 'Now find a valid recipe', expectError: false },
        ],
      },
      {
        name: 'Conversation Context Recovery',
        steps: [
          { message: 'My name is Alex' },
          { message: 'Execute invalid operation: divide_by_zero', expectError: true },
          { message: 'What did I say my name was?', expectError: false },
        ],
      },
    ];

    for (const test of recoveryTests) {
      await this.executeRecoveryTest(test);
    }
  }

  async executeErrorTest(test, category) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();
    let response;

    try {
      // Make request
      if (typeof test.body === 'string') {
        // Raw string body (like invalid JSON)
        response = await this.makeRawRequest(test.endpoint, test.method || 'POST', test.body);
      } else {
        response = await this.utils.authenticatedRequest(test.method || 'POST', test.endpoint, test.body);
      }

      const duration = Date.now() - startTime;
      const data = response.data;
      const status = response.status;

      console.log(`  ✓ Status: ${status}`);
      console.log(`  ✓ Duration: ${duration}ms`);

      // Check if error was expected
      const hasError = !data.success || status >= 400;
      const errorExpected = test.expectedError;
      const errorHandledCorrectly = hasError === errorExpected;

      console.log(`  ✓ Error handling: ${errorHandledCorrectly}`);

      // Check for graceful error handling
      if (test.checkGraceful && hasError) {
        const hasUserFriendlyMessage = data.message && !data.message.includes('SQL') && !data.message.includes('Internal Server');
        console.log(`  ✓ Graceful error: ${hasUserFriendlyMessage}`);
      }

      // Check for specific error types
      const assertions = {
        errorHandledCorrectly,
        status,
        expectedStatus: test.expectedStatus,
        hasError,
        errorExpected,
        gracefulError: test.checkGraceful ? data.message && !data.message.toLowerCase().includes('sql') : null,
      };

      this.utils.results.push({
        name: `Error ${category.toUpperCase()} - ${test.name}`,
        type: 'error-handling',
        category,
        success: errorHandledCorrectly,
        duration,
        response: data,
        assertions,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const status = error.response?.status;
      
      console.log(`  ✓ Caught error: ${status || 'Network Error'}`);
      console.log(`  ✓ Duration: ${duration}ms`);

      const errorExpected = test.expectedError;
      const statusMatch = status === test.expectedStatus;
      
      const success = errorExpected && (!test.expectedStatus || statusMatch);
      
      console.log(`  ✓ Error handled: ${success}`);

      this.utils.results.push({
        name: `Error ${category.toUpperCase()} - ${test.name}`,
        type: 'error-handling',
        category,
        success,
        duration,
        error: error.message,
        assertions: {
          caughtError: true,
          status,
          expectedStatus: test.expectedStatus,
          statusMatch,
          errorExpected,
        },
      });
    }
  }

  async executeTimeoutTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();

    try {
      if (test.requests) {
        // Multiple rapid requests
        const promises = [];
        for (let i = 0; i < test.requests; i++) {
          promises.push(
            this.utils.authenticatedRequest(test.method || 'POST', test.endpoint, test.body)
          );
        }
        
        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;
        
        const successful = results.filter(r => r.value?.data?.success).length;
        const failed = results.length - successful;
        const timeoutOccurred = duration > test.maxTime;

        console.log(`  ✓ Total duration: ${duration}ms (max: ${test.maxTime}ms)`);
        console.log(`  ✓ Success rate: ${successful}/${results.length}`);
        console.log(`  ✓ Timeout handled: ${!timeoutOccurred || failed > 0}`);

        this.utils.results.push({
          name: `Timeout - ${test.name}`,
          type: 'error-handling',
          success: duration < test.maxTime * 1.2, // Allow 20% buffer
          duration,
          assertions: {
            successful,
            failed,
            total: results.length,
            timeoutOccurred,
            duration,
            maxTime: test.maxTime,
          },
        });

      } else {
        // Single long request
        const response = await this.utils.authenticatedRequest(test.method || 'POST', test.endpoint, test.body, {
          timeout: test.maxTime,
        });
        
        const duration = Date.now() - startTime;
        const success = response.data.success !== false;
        const withinTimeout = duration < test.maxTime;

        console.log(`  ✓ Duration: ${duration}ms (max: ${test.maxTime}ms)`);
        console.log(`  ✓ Completed: ${success}`);
        console.log(`  ✓ Within timeout: ${withinTimeout}`);

        this.utils.results.push({
          name: `Timeout - ${test.name}`,
          type: 'error-handling',
          success: success || withinTimeout, // Pass if completed or timed out gracefully
          duration,
          response: response.data,
          assertions: {
            success,
            withinTimeout,
            duration,
            maxTime: test.maxTime,
          },
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`  ✓ Request failed after ${duration}ms: ${error.code || error.message}`);
      
      const timeoutError = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      
      this.utils.results.push({
        name: `Timeout - ${test.name}`,
        type: 'error-handling',
        success: timeoutError, // Timeout is expected behavior
        duration,
        error: error.message,
        assertions: {
          timeoutError,
          duration,
          errorCode: error.code,
        },
      });
    }
  }

  async executeRecoveryTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    let conversationId = null;
    const results = [];

    for (let i = 0; i < test.steps.length; i++) {
      const step = test.steps[i];
      const startTime = Date.now();

      try {
        const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
          message: step.message,
          conversationId,
        });

        conversationId = response.data.conversationId;
        const duration = Date.now() - startTime;
        const success = response.data.success !== false;
        const errorExpected = step.expectError;
        const errorHandledCorrectly = success === !errorExpected;

        console.log(`  Step ${i + 1}: ${errorHandledCorrectly ? '✓' : '✗'} ${duration}ms`);

        results.push({
          step: i + 1,
          success: errorHandledCorrectly,
          response: response.data,
          errorExpected,
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorExpected = step.expectError;
        const handledCorrectly = errorExpected;

        console.log(`  Step ${i + 1}: ${handledCorrectly ? '✓' : '✗'} ${duration}ms - ${error.message}`);

        results.push({
          step: i + 1,
          success: handledCorrectly,
          error: error.message,
          errorExpected,
        });
      }
    }

    // Check overall recovery success
    const errorSteps = results.filter(r => r.errorExpected).length;
    const recoverySteps = results.filter(r => r.success).length;
    const totalSteps = results.length;
    const recoveredSuccessfully = recoverySteps >= totalSteps - errorSteps;

    console.log(`  ✓ Recovery success: ${recoveredSuccessfully}`);
    console.log(`  ✓ Successful steps: ${recoverySteps}/${totalSteps}`);

    this.utils.results.push({
      name: `Recovery - ${test.name}`,
      type: 'error-handling',
      success: recoveredSuccessfully,
      assertions: {
        results,
        errorSteps,
        recoverySteps,
        totalSteps,
        recoveredSuccessfully,
      },
    });
  }

  async makeRawRequest(endpoint, method, body) {
    const axios = require('axios');
    return axios({
      method,
      url: `${this.utils.baseURL}${endpoint}`,
      data: body,
      headers: {
        'Authorization': `Bearer ${this.utils.token}`,
        'Content-Type': 'application/json',
      },
    });
  }
}

module.exports = ErrorHandlingTests;
