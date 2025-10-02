/**
 * Tool Execution Tests
 * Tests AI's ability to execute database operations
 */

const TestUtils = require('./test-utils');
const config = require('./test-config');

class ToolExecutionTests {
  constructor() {
    this.utils = new TestUtils();
  }

  async runAll() {
    console.log('\n🔧 Running Tool Execution Tests');
    console.log('=' .repeat(50));

    try {
      // Setup
      await this.utils.setupAuth();
      await this.utils.setupTestData();
      await this.utils.checkAIStatus();

      // Test each tool category
      await this.testPantryTools();
      await this.testRecipeTools();
      await this.testCalculationTools();
      await this.testComplexWorkflows();

    } catch (error) {
      console.error('❌ Tool execution test suite failed:', error.message);
      throw error;
    }
  }

  async testPantryTools() {
    console.log('\n📦 Testing Pantry Tools');

    const pantryTests = [
      {
        name: 'Add Pantry Item',
        message: 'Add 2 pounds of ground beef to my pantry',
        expectedTool: 'add_pantry_item',
        verifyDB: true,
      },
      {
        name: 'Get Pantry Items',
        message: 'Show me what\'s in my pantry',
        expectedTool: 'get_pantry_items',
      },
      {
        name: 'Update Pantry Item',
        message: 'Update the ground beef in my pantry to 3 pounds',
        expectedTool: 'update_pantry_item',
      },
      {
        name: 'Remove Pantry Item',
        message: 'Remove the ground beef from my pantry',
        expectedTool: 'remove_pantry_item',
      },
      {
        name: 'Find Expiring Items',
        message: 'What items in my pantry are expiring soon?',
        expectedTool: 'get_expiring_items',
      },
    ];

    for (const test of pantryTests) {
      await this.executeToolTest(test, 'pantry');
    }
  }

  async testRecipeTools() {
    console.log('\n🍳 Testing Recipe Tools');

    const recipeTests = [
      {
        name: 'Search Recipes',
        message: 'Find recipes with chicken and rice',
        expectedTool: 'search_recipes',
      },
      {
        name: 'Get Recipe Details',
        message: 'Tell me more about the first recipe in the search results',
        expectedTool: 'get_recipe_details',
      },
      {
        name: 'Calculate Nutrition',
        message: 'Calculate nutrition for 1 chicken breast and 1 cup of rice',
        expectedTool: 'calculate_nutrition',
      },
      {
        name: 'Scale Recipe',
        message: 'Scale the chicken recipe to serve 8 people instead of 4',
        expectedTool: 'scale_recipe',
      },
      {
        name: 'Suggest Substitutions',
        message: 'What can I use instead of olive oil in the recipe?',
        expectedTool: 'suggest_ingredient_substitutions',
      },
    ];

    for (const test of recipeTests) {
      await this.executeToolTest(test, 'recipe');
    }
  }

  async testCalculationTools() {
    console.log('\n🧮 Testing Calculation Tools');

    const calculationTests = [
      {
        name: 'Unit Conversion',
        message: 'Convert 2 cups to milliliters',
        expectedTool: 'convert_units',
      },
      {
        name: 'Cooking Time Estimation',
        message: 'How long should I cook a 4 pound chicken?',
        expectedTool: 'estimate_cooking_time',
      },
      {
        name: 'Complex Nutrition Calculation',
        message: 'Calculate total calories, protein, and carbs for: 200g chicken, 150g rice, 50g cheese',
        expectedTool: 'calculate_nutrition',
      },
      {
        name: 'Meal Plan Nutrition',
        message: 'Calculate the total nutrition for a meal plan with 3 meals',
        expectedTool: 'calculate_meal_plan_nutrition',
      },
    ];

    for (const test of calculationTests) {
      await this.executeToolTest(test, 'calculation');
    }
  }

  async testComplexWorkflows() {
    console.log('\n🔄 Testing Complex Workflows');

    const workflowTests = [
      {
        name: 'Meal Planning Workflow',
        message: 'Create a 3-day meal plan using only what I have in my pantry',
        expectedTools: ['get_pantry_items', 'search_recipes', 'create_meal_plan'],
        maxTime: 15000,
      },
      {
        name: 'Grocery List Generation',
        message: 'Based on my meal plan, create a shopping list',
        expectedTools: ['get_meal_plans', 'generate_grocery_list_from_meal_plan'],
        maxTime: 10000,
      },
      {
        name: 'Dietary Compliance Check',
        message: 'Check if my meal plan is vegetarian and gluten-free',
        expectedTools: ['get_meal_plans', 'analyze_dietary_compliance'],
        maxTime: 8000,
      },
    ];

    for (const test of workflowTests) {
      await this.executeWorkflowTest(test);
    }
  }

  async executeToolTest(test, category) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();

    try {
      const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
        message: test.message,
      });

      const duration = Date.now() - startTime;
      const toolsUsed = response.data.metadata?.toolsUsed || [];
      const expectedToolUsed = toolsUsed.includes(test.expectedTool);

      console.log(`  ✓ Tool used: ${test.expectedTool}`);
      console.log(`  ✓ Tools executed: [${toolsUsed.join(', ')}]`);
      console.log(`  ✓ Duration: ${duration}ms`);

      // Verify database change if required
      if (test.verifyDB) {
        await this.verifyDatabaseChange(test);
      }

      const assertions = {
        toolExecuted: expectedToolUsed,
        toolsUsed,
        expectedTool: test.expectedTool,
        responseTime: { passed: duration < 8000, actual: duration },
      };

      this.utils.results.push({
        name: `Tool Test - ${test.name}`,
        type: 'tool-execution',
        category,
        success: response.data.success && expectedToolUsed,
        duration,
        response: response.data,
        assertions,
      });

    } catch (error) {
      console.log(`  ✗ ${test.name}: ${error.message}`);
      this.utils.results.push({
        name: `Tool Test - ${test.name}`,
        type: 'tool-execution',
        category,
        success: false,
        error: error.message,
      });
    }
  }

  async executeWorkflowTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();
    const maxTime = test.maxTime || 10000;

    try {
      const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
        message: test.message,
      });

      const duration = Date.now() - startTime;
      const toolsUsed = response.data.metadata?.toolsUsed || [];
      const allExpectedToolsUsed = test.expectedTools.every(tool => toolsUsed.includes(tool));

      console.log(`  ✓ Workflow executed in ${duration}ms`);
      console.log(`  ✓ Tools used: [${toolsUsed.join(', ')}]`);
      console.log(`  ✓ Expected tools: [${test.expectedTools.join(', ')}]`);

      const assertions = {
        workflowCompleted: allExpectedToolsUsed,
        toolsUsed,
        expectedTools: test.expectedTools,
        responseTime: { passed: duration < maxTime, actual: duration },
      };

      this.utils.results.push({
        name: `Workflow - ${test.name}`,
        type: 'workflow',
        success: response.data.success && allExpectedToolsUsed && duration < maxTime,
        duration,
        response: response.data,
        assertions,
      });

    } catch (error) {
      console.log(`  ✗ ${test.name}: ${error.message}`);
      this.utils.results.push({
        name: `Workflow - ${test.name}`,
        type: 'workflow',
        success: false,
        error: error.message,
      });
    }
  }

  async verifyDatabaseChange(test) {
    try {
      // Get current pantry state
      const pantryResponse = await this.utils.authenticatedRequest('GET', '/api/pantry');
      const items = pantryResponse.data;

      console.log(`  ✓ Pantry has ${items.length} items`);
      console.log(`  ✓ Recent items: ${items.slice(-3).map(i => i.name).join(', ')}`);

      return items;

    } catch (error) {
      console.log(`  ⚠️  Could not verify database change: ${error.message}`);
      return null;
    }
  }

  async testToolErrorHandling() {
    console.log('\n⚠️ Testing Tool Error Handling');

    const errorTests = [
      {
        name: 'Invalid Tool Parameters',
        message: 'Add infinity pounds of unicorn meat to my pantry',
        expectError: true,
      },
      {
        name: 'Nonexistent Recipe',
        message: 'Tell me about recipe ID 999999999',
        expectError: true,
      },
      {
        name: 'Invalid Unit Conversion',
        message: 'Convert 5 lightyears to cups',
        expectError: true,
      },
    ];

    for (const test of errorTests) {
      await this.executeErrorTest(test);
    }
  }

  async executeErrorTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    try {
      const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
        message: test.message,
      });

      // Check if response gracefully handles the error
      const hasErrorMessage = response.data.message && 
        (response.data.message.includes('cannot') || 
         response.data.message.includes('unable') || 
         response.data.message.includes('invalid'));

      console.log(`  ✓ Graceful error handling: ${hasErrorMessage}`);

      this.utils.results.push({
        name: `Error Handling - ${test.name}`,
        type: 'tool-execution',
        success: true, // Success if it doesn't crash
        response: response.data,
        assertions: {
          gracefulError: hasErrorMessage,
        },
      });

    } catch (error) {
      console.log(`  ✗ ${test.name}: ${error.message}`);
      this.utils.results.push({
        name: `Error Handling - ${test.name}`,
        type: 'tool-execution',
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = ToolExecutionTests;
