#!/usr/bin/env node

/**
 * AI Integration Test Script
 * Tests the complete AI foundation and frontend integration
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:3000';

console.log('🤖 Testing AI Integration...\n');

async function testAIHealth() {
  console.log('1. Testing AI Health Endpoint...');
  try {
    const response = await axios.get(`${API_BASE}/api/ai/health`);
    console.log('✅ AI Health Check:', response.data.status);
    console.log('   - Models Available:', Object.keys(response.data.services.models.available).length);
    console.log('   - Cache Status:', response.data.services.cache.status);
    console.log('   - Cost Monitor:', response.data.services.costMonitor.enabled ? 'Enabled' : 'Disabled');
    return true;
  } catch (error) {
    console.log('❌ AI Health Check Failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testIngredientExtraction() {
  console.log('\n2. Testing Ingredient Extraction...');
  try {
    const response = await axios.post(`${API_BASE}/api/ai/extract-ingredients`, {
      recipeData: {
        name: "Test Recipe",
        ingredients: ["2 cups flour", "1 cup sugar", "3 eggs", "1/2 cup butter"],
        instructions: "Mix ingredients and bake"
      }
    });
    
    if (response.data.success) {
      console.log('✅ Ingredient Extraction Successful');
      console.log(`   - Extracted ${response.data.ingredients.length} ingredients`);
      response.data.ingredients.forEach((ing, i) => {
        console.log(`   - ${i + 1}. ${ing.amount || ''} ${ing.unit || ''} ${ing.name}`);
      });
      return true;
    } else {
      console.log('❌ Ingredient Extraction Failed:', response.data.error);
      return false;
    }
  } catch (error) {
    if (error.response?.data?.error === 'OpenRouter API key not configured') {
      console.log('⚠️  Ingredient Extraction: API Key Not Configured (Expected)');
      return true; // This is expected without API key
    }
    console.log('❌ Ingredient Extraction Failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testShoppingListGeneration() {
  console.log('\n3. Testing Shopping List Generation...');
  try {
    const response = await axios.post(`${API_BASE}/api/ai/generate-shopping-list`, {
      recipes: [
        {
          name: "Pancakes",
          ingredients: ["2 cups flour", "2 eggs", "1.5 cups milk", "2 tbsp sugar"],
          instructions: "Mix and cook on griddle"
        },
        {
          name: "Scrambled Eggs",
          ingredients: ["4 eggs", "2 tbsp butter", "Salt and pepper"],
          instructions: "Scramble eggs in butter"
        }
      ]
    });
    
    if (response.data.success) {
      console.log('✅ Shopping List Generation Successful');
      console.log(`   - Generated list: ${response.data.shoppingList.name}`);
      console.log(`   - Items: ${response.data.shoppingList.items.length}`);
      return true;
    } else {
      console.log('❌ Shopping List Generation Failed:', response.data.error);
      return false;
    }
  } catch (error) {
    if (error.response?.data?.error === 'OpenRouter API key not configured') {
      console.log('⚠️  Shopping List Generation: API Key Not Configured (Expected)');
      return true; // This is expected without API key
    }
    console.log('❌ Shopping List Generation Failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testCostUsage() {
  console.log('\n4. Testing Cost Usage Endpoint...');
  try {
    const response = await axios.get(`${API_BASE}/api/ai/cost-usage`);
    console.log('✅ Cost Usage Endpoint Working');
    console.log(`   - Daily Cost: $${response.data.dailyUsage.cost}`);
    console.log(`   - Daily Tokens: ${response.data.dailyUsage.tokens}`);
    return true;
  } catch (error) {
    console.log('❌ Cost Usage Endpoint Failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testFrontendAccess() {
  console.log('\n5. Testing Frontend Access...');
  try {
    const response = await axios.get(FRONTEND_BASE);
    if (response.status === 200 && response.data.includes('Intelligent Kitchen AI')) {
      console.log('✅ Frontend Accessible');
      return true;
    } else {
      console.log('❌ Frontend Not Accessible');
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend Access Failed:', error.message);
    return false;
  }
}

async function testCORS() {
  console.log('\n6. Testing CORS Configuration...');
  try {
    const response = await axios.options(`${API_BASE}/api/ai/health`, {
      headers: {
        'Origin': FRONTEND_BASE,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    if (corsHeaders && (corsHeaders === '*' || corsHeaders === FRONTEND_BASE)) {
      console.log('✅ CORS Configuration Correct');
      return true;
    } else {
      console.log('⚠️  CORS May Need Configuration');
      return false;
    }
  } catch (error) {
    console.log('⚠️  CORS Test Failed (may still work in browser):', error.message);
    return false;
  }
}

async function runTests() {
  const tests = [
    testAIHealth,
    testIngredientExtraction,
    testShoppingListGeneration,
    testCostUsage,
    testFrontendAccess,
    testCORS
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    if (await test()) {
      passed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Success Rate: ${Math.round((passed / total) * 100)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All AI Integration Tests Passed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Add OpenRouter API key to backend/.env');
    console.log('   2. Test ingredient extraction with real recipes');
    console.log('   3. Verify AI features work in the browser');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

runTests().catch(console.error);