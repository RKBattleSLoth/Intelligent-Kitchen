/**
 * AI E2E Test Utilities
 */

const axios = require('axios');
const config = require('./test-config');

class TestUtils {
  constructor() {
    this.baseURL = config.server.baseURL;
    this.token = null;
    this.results = [];
  }

  /**
   * Setup test user and get auth token
   */
  async setupAuth() {
    try {
      // Try to login existing user
      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: config.testUser.email,
        password: config.testUser.password,
      });

      if (loginResponse.data.token) {
        this.token = loginResponse.data.token;
        console.log('✓ Using existing test user');
        return this.token;
      }
    } catch (error) {
      // User doesn't exist, create it
      console.log('Creating test user...');
      
      // Adjust the user data to match backend expectations
      const userData = {
        firstName: config.testUser.name.split(' ')[0] || 'AI',
        lastName: config.testUser.name.split(' ')[1] || 'Test',
        email: config.testUser.email,
        password: config.testUser.password,
      };
      
      await axios.post(`${this.baseURL}/api/auth/register`, userData);
      
      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: config.testUser.email,
        password: config.testUser.password,
      });

      this.token = loginResponse.data.token;
      console.log('✓ Created new test user');
      return this.token;
    }
  }

  /**
   * Make authenticated request
   */
  async authenticatedRequest(method, endpoint, data = {}) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      timeout: config.server.timeout,
    };

    if (method !== 'GET' && Object.keys(data).length > 0) {
      config.data = data;
    }

    return axios(config);
  }

  /**
   * Execute a test scenario
   */
  async executeTest(scenario, scenarioType) {
    const startTime = Date.now();
    let result = {
      name: scenario.name,
      type: scenarioType,
      success: false,
      startTime,
      endTime: null,
      duration: null,
      response: null,
      error: null,
      assertions: {},
    };

    try {
      console.log(`\n🧪 Testing: ${scenario.name}`);
      
      // Execute based on scenario type
      if (scenario.endpoint) {
        result.response = await this.testEndpoint(scenario);
      } else if (scenario.message) {
        result.response = await this.testChat(scenario);
      } else {
        throw new Error('Invalid test scenario');
      }

      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      result.success = true;

      // Run assertions
      result.assertions = await this.runAssertions(scenario, result);

      console.log(`✓ ${scenario.name} - ${result.duration}ms`);

    } catch (error) {
      result.endTime = Date.now();
      result.duration = result.endTime - startTime;
      result.error = error.message;

      if (scenario.expectError) {
        result.success = true;
        console.log(`✓ ${scenario.name} - Expected error: ${error.message}`);
      } else {
        console.log(`✗ ${scenario.name} - ${error.message}`);
      }
    }

    this.results.push(result);
    return result;
  }

  /**
   * Test chat endpoint
   */
  async testChat(scenario) {
    const response = await this.authenticatedRequest('POST', '/api/ai/chat', {
      message: scenario.message,
    });

    return response.data;
  }

  /**
   * Test specialized endpoint
   */
  async testEndpoint(scenario) {
    const method = scenario.method || 'POST';
    const response = await this.authenticatedRequest(method, scenario.endpoint, scenario.body || {});
    return response.data;
  }

  /**
   * Run assertions for test result
   */
  async runAssertions(scenario, result) {
    const assertions = {};

    // Response time assertion
    const timeLimit = scenario.maxTime || config.assertions.responseTime.medium;
    assertions.responseTime = {
      passed: result.duration <= timeLimit,
      actual: result.duration,
      expected: `<= ${timeLimit}ms`,
    };

    if (!assertions.responseTime.passed) {
      console.log(`  ⚠️  Slow response: ${result.duration}ms (> ${timeLimit}ms)`);
    }

    // Success assertion
    if (result.response) {
      assertions.success = {
        passed: result.response.success === true,
        actual: result.response.success,
      };

      // Model usage assertion
      if (scenario.expectedModels) {
        const modelsUsed = result.response.modelsUsed || [];
        assertions.modelsUsed = {
          passed: scenario.expectedModels.some(model => modelsUsed.includes(model)),
          expected: scenario.expectedModels,
          actual: modelsUsed,
        };
      }

      // Tool usage assertion
      if (scenario.expectedTools) {
        const toolsUsed = result.response.metadata?.toolsUsed || [];
        assertions.toolsUsed = {
          passed: scenario.expectedTools.some(tool => toolsUsed.includes(tool)),
          expected: scenario.expectedTools,
          actual: toolsUsed,
        };
      }

      // Agent usage assertion
      if (scenario.expectedAgents) {
        const steps = result.response.steps || [];
        const agentsUsed = steps.map(s => s.agent);
        assertions.agentsUsed = {
          passed: scenario.expectedAgents.some(agent => agentsUsed.includes(agent)),
          expected: scenario.expectedAgents,
          actual: agentsUsed,
        };
      }

      // Has answer assertion
      if (scenario.hasAnswer) {
        const hasContent = result.response.message && result.response.message.length > 10;
        assertions.hasAnswer = {
          passed: hasContent,
          actual: hasContent,
        };
      }
    }

    // Verify steps for complex tests
    if (scenario.verifySteps && result.response.steps) {
      assertions.steps = {
        passed: result.response.steps.length > 1,
        actual: result.response.steps.length,
      };
    }

    return assertions;
  }

  /**
   * Run concurrent requests
   */
  async runConcurrentTest(scenario) {
    const promises = [];
    
    for (let i = 0; i < scenario.requests; i++) {
      promises.push(this.executeTest(scenario, 'concurrent'));
    }

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.value?.success).length;
    const successRate = successful / results.length;

    return {
      totalRequests: scenario.requests,
      successful,
      failed: results.length - successful,
      successRate,
      passed: successRate >= config.assertions.success.minRate,
    };
  }

  /**
   * Setup test data
   */
  async setupTestData() {
    console.log('\n📋 Setting up test data...');

    // Add pantry items
    for (const item of config.testData.pantryItems) {
      try {
        await this.authenticatedRequest('POST', '/api/pantry', item);
      } catch (error) {
        // Item might already exist
      }
    }

    // Add recipes
    for (const recipe of config.testData.recipes) {
      try {
        await this.authenticatedRequest('POST', '/api/recipes', recipe);
      } catch (error) {
        // Recipe might already exist
      }
    }

    console.log('✓ Test data setup complete');
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...');

    try {
      // Get and clear pantry items
      const pantryResponse = await this.authenticatedRequest('GET', '/api/pantry');
      for (const item of pantryResponse.data) {
        await this.authenticatedRequest('DELETE', `/api/pantry/${item.id}`);
      }

      // Clear user's data
      await this.authenticatedRequest('DELETE', '/api/users/me/data');

      console.log('✓ Test data cleanup complete');
    } catch (error) {
      console.log('⚠️  Cleanup error:', error.message);
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;
    const successRate = (passed / total * 100).toFixed(1);

    const avgTime = this.results.reduce((sum, r) => sum + (r.duration || 0), 0) / total;

    const report = {
      summary: {
        total,
        passed,
        failed,
        successRate: `${successRate}%`,
        avgResponseTime: `${Math.round(avgTime)}ms`,
      },
      failed: this.results.filter(r => !r.success),
      slow: this.results.filter(r => r.duration > 8000),
      byType: {},
    };

    // Group results by type
    this.results.forEach(result => {
      if (!report.byType[result.type]) {
        report.byType[result.type] = { total: 0, passed: 0 };
      }
      report.byType[result.type].total++;
      if (result.success) {
        report.byType[result.type].passed++;
      }
    });

    return report;
  }

  /**
   * Check AI service status
   */
  async checkAIStatus() {
    try {
      const response = await this.authenticatedRequest('GET', '/api/ai/status');
      return response.data;
    } catch (error) {
      console.log('⚠️ AI status check failed:', error.message);
      // Try to initialize the service directly
      try {
        const OpenRouterService = require('../backend/src/services/ai/OpenRouterService');
        const openRouter = new OpenRouterService();
        return {
          configured: openRouter.isConfigured(),
          openRouterStatus: openRouter.getStatus(),
          status: 'direct',
        };
      } catch (initError) {
        throw new Error(`AI service not available: ${error.message}`);
      }
    }
  }

  /**
   * Reset for new test suite
   */
  reset() {
    this.results = [];
  }
}

module.exports = TestUtils;
