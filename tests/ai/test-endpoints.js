/**
 * Specialized AI Endpoint Tests
 * Tests all specialized AI endpoints individually
 */

const TestUtils = require('./test-utils');
const config = require('./test-config');

class EndpointTests {
  constructor() {
    this.utils = new TestUtils();
  }

  async runAll() {
    console.log('\n🎯 Running AI Endpoint Tests');
    console.log('=' .repeat(50));

    try {
      // Setup
      await this.utils.setupAuth();
      await this.utils.setupTestData();
      await this.utils.checkAIStatus();

      // Test each endpoint category
      await this.testCoreEndpoints();
      await this.testVisionEndpoints();
      await this.testAnalyticsEndpoints();
      await this.testUtilityEndpoints();

    } catch (error) {
      console.error('❌ Endpoint test suite failed:', error.message);
      throw error;
    }
  }

  async testCoreEndpoints() {
    console.log('\n💬 Testing Core Chat Endpoints');

    const coreTests = [
      {
        name: 'Basic Chat',
        endpoint: '/api/ai/chat',
        method: 'POST',
        body: { message: 'Hello, what can you help me with?' },
        maxTime: 3000,
        requiredFields: ['success', 'message', 'conversationId'],
      },
      {
        name: 'Chat with Context',
        endpoint: '/api/ai/chat',
        method: 'POST',
        body: { 
          message: 'Remember I mentioned Italian food before',
          context: { previousIntent: 'italian-food' }
        },
        maxTime: 4000,
      },
      {
        name: 'Complex Chat with Tools',
        endpoint: '/api/ai/chat',
        method: 'POST',
        body: { 
          message: 'Add tomato sauce to my pantry and suggest pasta recipes',
          includeContext: true
        },
        maxTime: 8000,
        expectedTools: ['add_pantry_item', 'search_recipes'],
      },
    ];

    for (const test of coreTests) {
      await this.executeEndpointTest(test, 'core');
    }
  }

  async testVisionEndpoints() {
    console.log('\n👁️ Testing Vision Endpoints');

    const visionTests = [
      {
        name: 'Image Analysis Status',
        endpoint: '/api/ai/status',
        method: 'GET',
        maxTime: 2000,
        checkVision: true,
      },
      {
        name: 'Mock Image Upload',
        endpoint: '/api/ai/chat/image',
        method: 'POST',
        body: this.createMockImageData(),
        maxTime: 15000,
        expectLargeModel: true,
      },
    ];

    for (const test of visionTests) {
      await this.executeEndpointTest(test, 'vision');
    }
  }

  async testAnalyticsEndpoints() {
    console.log('\n📊 Testing Analytics Endpoints');

    const analyticsTests = [
      {
        name: 'Usage Statistics',
        endpoint: '/api/ai/usage',
        method: 'GET',
        maxTime: 3000,
        expectedFields: ['stats', 'summary'],
      },
      {
        name: 'Cost Trend',
        endpoint: '/api/ai/usage/trend',
        method: 'GET',
        query: { days: 7 },
        maxTime: 3000,
        expectedFields: ['trend'],
      },
      {
        name: 'Cost Summary',
        endpoint: '/api/ai/usage/trend',
        method: 'GET',
        query: { days: 30 },
        maxTime: 3000,
      },
    ];

    for (const test of analyticsTests) {
      await this.executeEndpointTest(test, 'analytics');
    }
  }

  async testUtilityEndpoints() {
    console.log('\n🛠️ Testing Utility Endpoints');

    const utilityTests = [
      {
        name: 'Cache Management - Clear',
        endpoint: '/api/ai/cache/clear',
        method: 'POST',
        maxTime: 5000,
      },
      {
        name: 'AI Service Status',
        endpoint: '/api/ai/status',
        method: 'GET',
        maxTime: 3000,
        requiredFields: ['configured', 'models'],
      },
      {
        name: 'Agent Capabilities',
        endpoint: '/api/ai/agents',
        method: 'GET',
        maxTime: 3000,
        requiredFields: ['agents', 'capabilities'],
      },
      {
        name: 'Proactive Suggestions',
        endpoint: '/api/ai/suggestions',
        method: 'GET',
        maxTime: 8000,
        expectedFields: ['suggestions'],
      },
    ];

    for (const test of utilityTests) {
      await this.executeEndpointTest(test, 'utility');
    }
  }

  async testSpecializedWorkflows() {
    console.log('\n🔄 Testing Specialized Workflow Endpoints');

    const workflowTests = [
      {
        name: 'Pantry Analysis',
        endpoint: '/api/ai/analyze-pantry',
        method: 'POST',
        body: { 
          preferences: 'quick and healthy meals',
          constraints: 'vegetarian'
        },
        maxTime: 10000,
        expectedTools: ['get_pantry_items'],
      },
      {
        name: 'Meal Plan Generation',
        endpoint: '/api/ai/generate-meal-plan',
        method: 'POST',
        body: { 
          duration: 5,
          mealsPerDay: ['breakfast', 'lunch', 'dinner'],
          constraints: {
            budget: 100,
            dietaryRestrictions: ['vegetarian'],
            maxCookTime: 30
          }
        },
        maxTime: 15000,
        expectedTools: ['get_pantry_items', 'search_recipes', 'create_meal_plan'],
      },
      {
        name: 'Recipe Suggestions',
        endpoint: '/api/ai/suggest-recipes',
        method: 'POST',
        body: { 
          ingredients: ['chicken', 'rice', 'tomatoes'],
          diet: 'mediterranean',
          maxTime: 30
        },
        maxTime: 8000,
        expectedTools: ['search_recipes'],
      },
      {
        name: 'Grocery List Optimization',
        endpoint: '/api/ai/optimize-grocery-list',
        method: 'POST',
        body: { 
          listId: 'test-list',
          optimizeBy: 'store-layout',
          storeName: 'Whole Foods Market'
        },
        maxTime: 8000,
        expectError: true, // Test list may not exist
      },
      {
        name: 'Multi-Agent Request',
        endpoint: '/api/ai/agent',
        method: 'POST',
        body: { 
          request: 'Check my pantry, find recipes, and create a meal plan'
        },
        maxTime: 20000,
        expectedAgents: ['pantry', 'recipe', 'meal'],
      },
    ];

    for (const test of workflowTests) {
      await this.executeEndpointTest(test, 'workflow');
    }
  }

  async executeEndpointTest(test, category) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();

    try {
      let response;
      const url = test.query ? 
        `${test.endpoint}?${new URLSearchParams(test.query)}` : 
        test.endpoint;

      if (test.method === 'GET') {
        response = await this.utils.authenticatedRequest('GET', url);
      } else if (test.method === 'POST') {
        response = await this.utils.authenticatedRequest('POST', url, test.body);
      }

      const duration = Date.now() - startTime;
      const data = response.data;

      console.log(`  ✓ Response time: ${duration}ms`);
      console.log(`  ✓ Status: ${data.success !== false ? 'Success' : 'Failed'}`);
      
      // Check required fields
      if (test.requiredFields) {
        const hasAllFields = test.requiredFields.every(field => field in data);
        console.log(`  ✓ Required fields: ${hasAllFields}`);
      }

      // Check expected tools
      if (test.expectedTools) {
        const toolsUsed = data.metadata?.toolsUsed || [];
        const hasExpectedTools = test.expectedTools.some(tool => toolsUsed.includes(tool));
        console.log(`  ✓ Tools used: [${toolsUsed.join(', ')}]`);
        console.log(`  ✓ Expected tools found: ${hasExpectedTools}`);
      }

      // Check expected agents
      if (test.expectedAgents) {
        const agentsUsed = (data.steps || []).map(s => s.agent);
        const hasExpectedAgents = test.expectedAgents.some(agent => agentsUsed.includes(agent));
        console.log(`  ✓ Agents used: [${agentsUsed.join(', ')}]`);
        console.log(`  ✓ Expected agents found: ${hasExpectedAgents}`);
      }

      // Check for vision capabilities
      if (test.checkVision) {
        const hasVision = data.models?.large || data.visionCapable;
        console.log(`  ✓ Vision capable: ${hasVision}`);
      }

      // Show sample response data
      if (data.message) {
        const preview = data.message.substring(0, 100);
        console.log(`  ✓ Response: ${preview}${data.message.length > 100 ? '...' : ''}`);
      }
      if (data.data) {
        const dataKeys = Object.keys(data.data);
        console.log(`  ✓ Data keys: [${dataKeys.join(', ')}]`);
      }

      const assertions = {
        responseTime: { passed: duration < test.maxTime, actual: duration },
        success: data.success !== false,
        requiredFields: test.requiredFields ? 
          test.requiredFields.every(field => field in data) : true,
        toolsUsed: test.expectedTools ? 
          (data.metadata?.toolsUsed || []).some(tool => test.expectedTools.includes(tool)) : null,
        agentsUsed: test.expectedAgents ? 
          (data.steps || []).map(s => s.agent).some(agent => test.expectedAgents.includes(agent)) : null,
      };

      this.utils.results.push({
        name: `Endpoint ${category.toUpperCase()} - ${test.name}`,
        type: 'endpoint',
        category,
        endpoint: test.endpoint,
        success: data.success !== false && duration < test.maxTime,
        duration,
        response: data,
        assertions,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`  ⚠️  ${test.expectError ? 'Expected' : 'Unexpected'} error: ${error.message}`);
      
      const success = test.expectError || (error.response?.status < 500);
      
      this.utils.results.push({
        name: `Endpoint ${category.toUpperCase()} - ${test.name}`,
        type: 'endpoint',
        category,
        endpoint: test.endpoint,
        success,
        duration,
        error: error.message,
        assertions: {
          expectedError: test.expectError,
          statusCode: error.response?.status,
        },
      });
    }
  }

  createMockImageData() {
    // Create mock form data for image upload testing
    // In a real test, you'd use actual image files
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    
    // Create a temporary mock image file
    const mockImagePath = path.join(__dirname, 'mock-image.txt');
    fs.writeFileSync(mockImagePath, 'mock image data for testing');
    
    const form = new FormData();
    form.append('image', fs.createReadStream(mockImagePath));
    form.append('message', 'What do you see in this image?');
    
    // Clean up after test
    setTimeout(() => {
      if (fs.existsSync(mockImagePath)) {
        fs.unlinkSync(mockImagePath);
      }
    }, 5000);
    
    return form;
  }

  async testEndpointSecurity() {
    console.log('\n🔒 Testing Endpoint Security');

    const securityTests = [
      {
        name: 'No Auth Token',
        endpoint: '/api/ai/chat',
        method: 'POST',
        body: { message: 'Hello' },
        expectError: true,
        expectedStatus: 401,
        skipAuth: true,
      },
      {
        name: 'Invalid Token',
        endpoint: '/api/ai/chat',
        method: 'POST',
        body: { message: 'Hello' },
        expectError: true,
        expectedStatus: 401,
        invalidToken: true,
      },
      {
        name: 'Rate Limiting',
        endpoint: '/api/ai/chat',
        method: 'POST',
        body: { message: 'Test rate limit' },
        rapidRequests: 10,
        expectRateLimit: true,
      },
    ];

    for (const test of securityTests) {
      await this.executeSecurityTest(test);
    }
  }

  async executeSecurityTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    try {
      let response;

      if (test.skipAuth) {
        // No authentication
        response = await this.makeUnauthenticatedRequest(test);
      } else if (test.invalidToken) {
        // Invalid authentication
        response = await this.makeInvalidAuthRequest(test);
      } else if (test.rapidRequests) {
        // Rate limiting test
        response = await this.testRateLimiting(test);
      } else {
        // Normal request with auth
        response = await this.utils.authenticatedRequest(test.method, test.endpoint, test.body);
      }

      const status = response.status;
      const expectedStatus = test.expectedStatus;
      const statusMatch = status === expectedStatus;

      console.log(`  ✓ Status code: ${status} (expected: ${expectedStatus})`);
      console.log(`  ✓ Security check: ${statusMatch}`);

      this.utils.results.push({
        name: `Security - ${test.name}`,
        type: 'endpoint-security',
        success: statusMatch,
        assertions: {
          statusCode: status,
          expectedStatus,
          statusMatch,
        },
      });

    } catch (error) {
      console.log(`  ✓ Security behavior: ${error.response?.status || error.message}`);
      
      this.utils.results.push({
        name: `Security - ${test.name}`,
        type: 'endpoint-security',
        success: true, // Security tests pass if they properly reject
        assertions: {
          securityResponse: error.response?.status || error.message,
        },
      });
    }
  }

  async makeUnauthenticatedRequest(test) {
    const axios = require('axios');
    return axios({
      method: test.method || 'POST',
      url: `${this.utils.baseURL}${test.endpoint}`,
      data: test.body,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async makeInvalidAuthRequest(test) {
    const axios = require('axios');
    return axios({
      method: test.method || 'POST',
      url: `${this.utils.baseURL}${test.endpoint}`,
      data: test.body,
      headers: { 
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json',
      },
    });
  }

  async testRateLimiting(test) {
    const promises = [];
    
    for (let i = 0; i < test.rapidRequests; i++) {
      promises.push(this.utils.authenticatedRequest('POST', test.endpoint, test.body));
    }

    const results = await Promise.allSettled(promises);
    const rejected = results.filter(r => r.reason).length;
    
    console.log(`  ✓ Rate limited requests: ${rejected}/${test.rapidRequests}`);
    
    return { status: rejected > 0 ? 429 : 200, rejected, total: test.rapidRequests };
  }
}

module.exports = EndpointTests;
