/**
 * Multi-Agent Workflow Tests
 * Tests the specialized agent architecture
 */

const TestUtils = require('./test-utils');
const config = require('./test-config');

class MultiAgentTests {
  constructor() {
    this.utils = new TestUtils();
  }

  async runAll() {
    console.log('\n🤖 Running Multi-Agent Tests');
    console.log('=' .repeat(50));

    try {
      // Setup
      await this.utils.setupAuth();
      await this.utils.setupTestData();
      await this.utils.checkAIStatus();

      // Test agent capabilities
      await this.testAgentCapabilities();
      
      // Test agent workflows
      await this.testAgentWorkflows();
      
      // Test agent coordination
      await this.testAgentCoordination();
      
      // Test specialized endpoints
      await this.testSpecializedEndpoints();

    } catch (error) {
      console.error('❌ Multi-agent test suite failed:', error.message);
      throw error;
    }
  }

  async testAgentCapabilities() {
    console.log('\n📋 Testing Agent Capabilities');

    try {
      // Get list of available agents
      const response = await this.utils.authenticatedRequest('GET', '/api/ai/agents');
      
      const agents = response.data.agents || [];
      const capabilities = response.data.capabilities || {};

      console.log(`  ✓ Available agents: [${agents.join(', ')}]`);

      // Verify expected agents exist
      const expectedAgents = ['pantry', 'recipe', 'meal', 'nutrition'];
      const hasAllAgents = expectedAgents.every(agent => agents.includes(agent));

      console.log(`  ✓ Has all expected agents: ${hasAllAgents}`);

      // Test each agent's capabilities
      for (const [agentName, capability] of Object.entries(capabilities)) {
        console.log(`  ✓ ${agentName}: ${capability.actions.length} actions`);
      }

      this.utils.results.push({
        name: 'Agent Capabilities',
        type: 'multi-agent',
        success: hasAllAgents && agents.length >= 4,
        response: response.data,
        assertions: {
          agentsCount: agents.length,
          expectedAgents,
          hasAllAgents,
        },
      });

    } catch (error) {
      console.log(`  ✗ Agent capabilities test failed: ${error.message}`);
      this.utils.results.push({
        name: 'Agent Capabilities',
        type: 'multi-agent',
        success: false,
        error: error.message,
      });
    }
  }

  async testAgentWorkflows() {
    console.log('\n🔄 Testing Agent Workflows');

    const workflowTests = [
      {
        name: 'Pantry Agent - Inventory Analysis',
        request: 'Analyze my pantry inventory and categorize everything',
        expectedAgents: ['pantry'],
        maxTime: 10000,
      },
      {
        name: 'Recipe Agent - Smart Search',
        request: 'Find healthy recipes that use ingredients I already have',
        expectedAgents: ['pantry', 'recipe'],
        maxTime: 12000,
      },
      {
        name: 'Meal Plan Agent - Weekly Planning',
        request: 'Create a balanced weekly meal plan for a family of 4',
        expectedAgents: ['meal'],
        maxTime: 15000,
      },
      {
        name: 'Nutrition Agent - Health Analysis',
        request: 'Analyze the nutritional content of my favorite recipes and suggest improvements',
        expectedAgents: ['recipe', 'nutrition'],
        maxTime: 12000,
      },
      {
        name: 'Multi-Agent Coordination',
        request: 'Plan my meals for next week using only what\'s in my pantry and optimize for nutrition',
        expectedAgents: ['pantry', 'recipe', 'meal', 'nutrition'],
        maxTime: 20000,
      },
    ];

    for (const test of workflowTests) {
      await this.executeAgentWorkflow(test);
    }
  }

  async executeAgentWorkflow(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();

    try {
      const response = await this.utils.authenticatedRequest('POST', '/api/ai/agent', {
        request: test.request,
      });

      const duration = Date.now() - startTime;
      const steps = response.data.steps || [];
      const agentsUsed = steps.map(s => s.agent);
      const expectedAgentsUsed = test.expectedAgents.every(agent => agentsUsed.includes(agent));

      console.log(`  ✓ Workflow completed in ${duration}ms`);
      console.log(`  ✓ Agents used: [${agentsUsed.join(', ')}]`);
      console.log(`  ✓ Steps executed: ${steps.length}`);
      console.log(`  ✓ Expected agents: [${test.expectedAgents.join(', ')}]`);

      // Show execution steps
      steps.forEach((step, index) => {
        console.log(`    Step ${index + 1}: ${step.agent} - ${step.action}`);
      });

      const assertions = {
        workflowCompleted: response.data.success,
        agentsUsed,
        expectedAgents: test.expectedAgents,
        allExpectedUsed: expectedAgentsUsed,
        stepsCount: steps.length,
        responseTime: { passed: duration < test.maxTime, actual: duration },
      };

      this.utils.results.push({
        name: `Agent Workflow - ${test.name}`,
        type: 'multi-agent',
        success: response.data.success && expectedAgentsUsed && duration < test.maxTime,
        duration,
        response: response.data,
        assertions,
      });

    } catch (error) {
      console.log(`  ✗ ${test.name}: ${error.message}`);
      this.utils.results.push({
        name: `Agent Workflow - ${test.name}`,
        type: 'multi-agent',
        success: false,
        error: error.message,
      });
    }
  }

  async testAgentCoordination() {
    console.log('\n🤝 Testing Agent Coordination');

    const coordinationTests = [
      {
        name: 'Sequential Agent Execution',
        request: 'First check my pantry, then find recipes using those ingredients, then plan meals',
        expectedSequence: ['pantry', 'recipe', 'meal'],
      },
      {
        name: 'Data Passing Between Agents',
        request: 'Check my pantry and use that information to find suitable recipes',
        verifyDataPassing: true,
      },
      {
        name: 'Error Recovery in Agent Chain',
        request: 'Try to create a meal plan with impossible constraints and see how agents handle it',
        expectGracefulError: true,
      },
    ];

    for (const test of coordinationTests) {
      await this.executeCoordinationTest(test);
    }
  }

  async executeCoordinationTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();

    try {
      const response = await this.utils.authenticatedRequest('POST', '/api/ai/agent', {
        request: test.request,
      });

      const duration = Date.now() - startTime;
      const steps = response.data.steps || [];
      const agentsUsed = steps.map(s => s.agent);

      let coordinationSuccess = true;
      const assertions = {
        coordinationSuccess: true,
        agentsUsed,
        stepsCount: steps.length,
      };

      if (test.expectedSequence) {
        const actualSequence = agentsUsed;
        const followsSequence = this.checkSequence(actualSequence, test.expectedSequence);
        assertions.sequenceFollowed = followsSequence;
        coordinationSuccess = coordinationSuccess && followsSequence;
        console.log(`  ✓ Sequence: [${actualSequence.join(' → ')}]`);
      }

      if (test.verifyDataPassing) {
        const hasDataPassing = steps.length > 1 && response.data.data;
        assertions.dataPassing = hasDataPassing;
        coordinationSuccess = coordinationSuccess && hasDataPassing;
        console.log(`  ✓ Data passed between agents: ${hasDataPassing}`);
      }

      if (test.expectGracefulError) {
        const gracefulError = !response.data.success && response.data.message;
        assertions.gracefulError = gracefulError;
        coordinationSuccess = gracefulError;
        console.log(`  ✓ Graceful error handling: ${gracefulError}`);
      }

      console.log(`  ✓ Coordination test completed in ${duration}ms`);

      this.utils.results.push({
        name: `Coordination - ${test.name}`,
        type: 'multi-agent',
        success: coordinationSuccess,
        duration,
        response: response.data,
        assertions,
      });

    } catch (error) {
      console.log(`  ✗ ${test.name}: ${error.message}`);
      this.utils.results.push({
        name: `Coordination - ${test.name}`,
        type: 'multi-agent',
        success: false,
        error: error.message,
      });
    }
  }

  checkSequence(actual, expected) {
    // Check if actual sequence contains expected sequence in order
    let expectedIndex = 0;
    for (const agent of actual) {
      if (agent === expected[expectedIndex]) {
        expectedIndex++;
        if (expectedIndex === expected.length) {
          return true;
        }
      }
    }
    return false;
  }

  async testSpecializedEndpoints() {
    console.log('\n🎯 Testing Specialized Endpoints');

    const endpointTests = [
      {
        name: 'Proactive Suggestions',
        endpoint: '/api/ai/suggestions',
        method: 'GET',
        maxTime: 8000,
      },
      {
        name: 'Analyze Pantry',
        endpoint: '/api/ai/analyze-pantry',
        method: 'POST',
        body: { preferences: 'quick meals', constraints: 'vegetarian' },
        maxTime: 10000,
      },
      {
        name: 'Generate Meal Plan',
        endpoint: '/api/ai/generate-meal-plan',
        method: 'POST',
        body: { 
          duration: 5, 
          mealsPerDay: ['breakfast', 'lunch', 'dinner'],
          constraints: { budget: 100, dietaryRestrictions: ['vegetarian'] }
        },
        maxTime: 15000,
      },
      {
        name: 'Optimize Grocery List',
        endpoint: '/api/ai/optimize-grocery-list',
        method: 'POST',
        body: { 
          listId: 'test-list', 
          optimizeBy: 'store-layout',
          storeName: 'Whole Foods'
        },
        maxTime: 8000,
        expectError: true, // List likely doesn't exist
      },
    ];

    for (const test of endpointTests) {
      await this.executeEndpointTest(test);
    }
  }

  async executeEndpointTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();

    try {
      const response = await this.utils.authenticatedRequest(test.method || 'POST', test.endpoint, test.body || {});
      const duration = Date.now() - startTime;

      console.log(`  ✓ ${test.name} completed in ${duration}ms`);
      
      if (response.data.suggestions) {
        console.log(`  ✓ Suggestions provided: ${response.data.suggestions.length > 0}`);
      }
      if (response.data.data) {
        console.log(`  ✓ Data returned: ${Object.keys(response.data.data).length} fields`);
      }

      const success = response.data.success !== false;
      const withinTimeLimit = duration < test.maxTime;

      this.utils.results.push({
        name: `Endpoint - ${test.name}`,
        type: 'multi-agent',
        success: test.expectError ? (!success && duration < test.maxTime) : (success && withinTimeLimit),
        duration,
        response: response.data,
        assertions: {
          success,
          withinTimeLimit,
          endpoint: test.endpoint,
        },
      });

    } catch (error) {
      const expectedError = test.expectError;
      const duration = Date.now() - startTime;
      
      console.log(`  ✓ ${expectedError ? 'Expected error' : 'Error'}: ${error.message}`);
      
      this.utils.results.push({
        name: `Endpoint - ${test.name}`,
        type: 'multi-agent',
        success: expectedError,
        duration,
        error: error.message,
        assertions: {
          expectedError,
          duration,
        },
      });
    }
  }

  async testAgentPerformance() {
    console.log('\n⚡ Testing Agent Performance');

    const performanceTests = [
      {
        name: 'Concurrent Agent Requests',
        requests: 3,
        request: 'Check my pantry inventory',
        maxTime: 15000,
      },
      {
        name: 'Large Dataset Processing',
        request: 'Analyze all 50 recipes and find the healthiest ones',
        maxTime: 20000,
      },
      {
        name: 'Memory Usage in Multi-Step Workflow',
        request: 'Create a complex meal plan, then optimize it, then analyze nutrition',
        maxTime: 25000,
      },
    ];

    for (const test of performanceTests) {
      await this.executePerformanceTest(test);
    }
  }

  async executePerformanceTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();

    try {
      if (test.requests) {
        // Concurrent test
        const promises = [];
        for (let i = 0; i < test.requests; i++) {
          promises.push(
            this.utils.authenticatedRequest('POST', '/api/ai/agent', {
              request: test.request,
            })
          );
        }
        
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.value?.data?.success).length;
        const duration = Date.now() - startTime;

        console.log(`  ✓ ${successful}/${test.requests} requests successful in ${duration}ms`);
        console.log(`  ✓ Average per request: ${Math.round(duration/test.requests)}ms`);

        const successRate = successful / test.requests;
        const passed = successRate >= 0.8 && duration < test.maxTime;

        this.utils.results.push({
          name: `Performance - ${test.name}`,
          type: 'multi-agent',
          success: passed,
          duration,
          assertions: {
            successRate,
            successful,
            total: test.requests,
            averageTime: Math.round(duration/test.requests),
          },
        });

      } else {
        // Single complex request
        const response = await this.utils.authenticatedRequest('POST', '/api/ai/agent', {
          request: test.request,
        });
        const duration = Date.now() - startTime;

        console.log(`  ✓ Complex request completed in ${duration}ms`);
        console.log(`  ✓ Steps executed: ${(response.data.steps || []).length}`);

        this.utils.results.push({
          name: `Performance - ${test.name}`,
          type: 'multi-agent',
          success: response.data.success && duration < test.maxTime,
          duration,
          response: response.data,
          assertions: {
            responseTime: { passed: duration < test.maxTime, actual: duration },
            stepsCount: (response.data.steps || []).length,
          },
        });
      }

    } catch (error) {
      console.log(`  ✗ ${test.name}: ${error.message}`);
      this.utils.results.push({
        name: `Performance - ${test.name}`,
        type: 'multi-agent',
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = MultiAgentTests;
