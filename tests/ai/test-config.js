/**
 * AI E2E Test Configuration
 */

// Load environment variables from backend
const path = require('path');
const fs = require('fs');

// Try different paths for the .env file
const possibleEnvPaths = [
  path.join(__dirname, '../backend/.env'),
  path.join(__dirname, '../backend/.env.production'),
  path.join(__dirname, '../../backend/.env'),
  path.join(__dirname, '../backend/.env.local'),
  path.join(__dirname, '../backend/.env.example'),
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const config = {
  // Server Configuration
  server: {
    baseURL: process.env.TEST_API_URL || 'http://localhost:3001',
    timeout: 30000, // 30 seconds timeout for AI responses
  },

  // Test Data
  testUser: {
    email: 'ai-test@example.com',
    password: 'testpassword123',
    name: 'AI Test User',
    firstName: 'AI',
    lastName: 'Test',
  },

  // Test Scenarios
  scenarios: {
    // Simple chat tests
    simpleChat: [
      {
        name: 'Greeting',
        message: 'Hello, how are you?',
        expectedModels: ['small'],
        maxTime: 2000,
      },
      {
        name: 'Simple question',
        message: 'What temperature should I bake chicken?',
        expectedModels: ['small'],
        maxTime: 2000,
        hasAnswer: true,
      },
      {
        name: 'Recipe question',
        message: 'How do I make scrambled eggs?',
        expectedModels: ['small'],
        maxTime: 3000,
      },
    ],

    // Tool execution tests
    toolTests: [
      {
        name: 'Pantry Management - Add Item',
        message: 'Add chicken breast to my pantry',
        expectedModels: ['small', 'medium'],
        expectedTools: ['add_pantry_item'],
        maxTime: 5000,
        verifyDB: true,
      },
      {
        name: 'Recipe Search',
        message: 'Find vegetarian recipes',
        expectedModels: ['small', 'medium'],
        expectedTools: ['search_recipes'],
        maxTime: 5000,
      },
      {
        name: 'Nutrition Calculation',
        message: 'Calculate nutrition for 2 eggs, 1 cup milk, 2 slices bread',
        expectedModels: ['small', 'medium'],
        expectedTools: ['calculate_nutrition'],
        maxTime: 5000,
      },
    ],

    // Complex workflow tests
    workflowTests: [
      {
        name: 'Complete Meal Planning',
        message: 'Plan my meals for 3 days',
        expectedModels: ['small', 'medium', 'large'],
        expectedTools: ['get_pantry_items', 'search_recipes', 'create_meal_plan'],
        maxTime: 15000,
        complex: true,
        verifySteps: true,
      },
      {
        name: 'Pantry Analysis + Recipe Suggestion',
        message: 'Analyze my pantry and suggest recipes I can make',
        expectedModels: ['small', 'medium'],
        expectedTools: ['get_pantry_items', 'search_recipes'],
        maxTime: 8000,
        verifySteps: true,
      },
      {
        name: 'Grocery List Generation',
        message: 'Generate a grocery list for my meal plan',
        expectedModels: ['small', 'medium'],
        expectedTools: ['generate_grocery_list_from_meal_plan'],
        maxTime: 8000,
      },
    ],

    // Multi-agent tests
    agentTests: [
      {
        name: 'Agent - Pantry Check',
        endpoint: '/api/ai/agent',
        request: 'Check my pantry inventory and suggest what I can make',
        expectedAgents: ['pantry', 'recipe'],
        maxTime: 10000,
      },
      {
        name: 'Agent - Meal Planning',
        endpoint: '/api/ai/agent',
        request: 'Create a weekly meal plan using my pantry items',
        expectedAgents: ['pantry', 'recipe', 'meal'],
        maxTime: 15000,
      },
      {
        name: 'Agent - Nutrition Analysis',
        endpoint: '/api/ai/agent',
        request: 'Analyze the nutrition of my favorite recipes',
        expectedAgents: ['recipe', 'nutrition'],
        maxTime: 12000,
      },
    ],

    // Specialized endpoint tests
    endpointTests: [
      {
        name: 'Analyze Pantry',
        endpoint: '/api/ai/analyze-pantry',
        body: { preferences: 'quick meals', constraints: 'vegetarian' },
        maxTime: 8000,
      },
      {
        name: 'Generate Meal Plan',
        endpoint: '/api/ai/generate-meal-plan',
        body: { duration: 5, mealsPerDay: ['breakfast', 'lunch', 'dinner'] },
        maxTime: 12000,
      },
      {
        name: 'Proactive Suggestions',
        endpoint: '/api/ai/suggestions',
        maxTime: 8000,
      },
      {
        name: 'Agent Capabilities',
        endpoint: '/api/ai/agents',
        maxTime: 3000,
      },
    ],

    // Error handling tests
    errorTests: [
      {
        name: 'Empty Message',
        message: '',
        expectError: true,
        maxTime: 2000,
      },
      {
        name: 'Very Long Message',
        message: 'What can I make for dinner? '.repeat(1000),
        expectError: true,
        maxTime: 5000,
      },
      {
        name: 'Invalid Request Format',
        endpoint: '/api/ai/agent',
        body: { invalid: 'format' },
        expectError: true,
        maxTime: 3000,
      },
    ],

    // Performance tests
    performanceTests: [
      {
        name: 'Concurrent Requests',
        requests: 5,
        message: 'What can I make for dinner?',
        maxTime: 10000,
        concurrent: true,
      },
      {
        name: 'Memory Usage Test',
        iterations: 10,
        message: 'Add item to pantry',
        maxTime: 15000,
      },
    ],
  },

  // Test Assertions
  assertions: {
    responseTime: {
      fast: 2000,    // < 2s for simple queries
      medium: 8000,  // < 8s for complex queries
      slow: 20000,    // < 20s for very complex
    },
    cost: {
      maxPerRequest: 0.05, // $0.05 max per request
      dailyLimit: 1.0,      // $1.00 daily limit for testing
    },
    success: {
      minRate: 0.95, // 95% minimum success rate
    },
  },

  // Test Data Setup
  testData: {
    pantryItems: [
      { name: 'Chicken Breast', quantity: 2, unit: 'lbs', category: 'Meat' },
      { name: 'Rice', quantity: 5, unit: 'cups', category: 'Grains' },
      { name: 'Tomatoes', quantity: 4, unit: 'pieces', category: 'Vegetables' },
      { name: 'Onion', quantity: 2, unit: 'pieces', category: 'Vegetables' },
      { name: 'Olive Oil', quantity: 1, unit: 'bottle', category: 'Oils' },
    ],
    recipes: [
      {
        name: 'Grilled Chicken',
        ingredients: ['Chicken Breast', 'Olive Oil', 'Salt', 'Pepper'],
        prepTime: 10,
        cookTime: 20,
        servings: 4,
      },
      {
        name: 'Fried Rice',
        ingredients: ['Rice', 'Eggs', 'Vegetables', 'Soy Sauce'],
        prepTime: 15,
        cookTime: 10,
        servings: 4,
      },
    ],
  },
};

module.exports = config;
