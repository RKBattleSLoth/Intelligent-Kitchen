/**
 * Test script for the multi-agent ingredient extraction system
 * Tests various recipe formats to validate system performance
 */

const RecipeAgent = require('./backend/src/services/ai/agents/RecipeAgent');

// Test recipes in different formats
const testRecipes = [
  {
    name: "Structured Recipe",
    format: "structured",
    data: {
      name: "Classic Spaghetti Carbonara",
      ingredients: [
        "1 lb spaghetti",
        "4 large eggs",
        "1 cup grated Parmesan cheese",
        "8 oz pancetta or guanciale, diced",
        "2 cloves garlic, minced",
        "Black pepper to taste",
        "Salt for pasta water"
      ],
      instructions: "Cook pasta. Fry pancetta. Mix eggs and cheese. Combine everything.",
      servings: 4
    }
  },
  {
    name: "Narrative Recipe",
    format: "narrative",
    data: {
      name: "Grandma's Chicken Soup",
      description: "A heartwarming chicken soup that's been in our family for generations. Start with a whole chicken, about three pounds, and simmer it in a large pot with eight cups of water. Add two chopped onions, three carrots sliced into rounds, and two celery stalks. Don't forget the bay leaves and whole black peppercorns. Let it simmer for at least two hours until the chicken is falling off the bone. Remove the chicken, shred it, and return it to the pot. Season with salt and fresh parsley before serving."
    }
  },
  {
    name: "Mixed Format Recipe",
    format: "mixed",
    data: {
      name: "Quick Weeknight Tacos",
      ingredients: [
        "1 lb ground beef",
        "Taco seasoning packet"
      ],
      description: "Brown the ground beef in a large skillet over medium-high heat. Add about 3/4 cup water and the taco seasoning. You'll also need 8 taco shells, 1 cup shredded lettuce, 1 diced tomato, 1/2 cup chopped onions, and 1 cup shredded cheese. Warm the taco shells according to package directions. Fill each shell with the seasoned beef and top with your favorite toppings. Serve with salsa and sour cream on the side."
    }
  },
  {
    name: "Casual Social Media Post",
    format: "casual",
    data: {
      name: "Instagram Avocado Toast",
      description: "Just made the most amazing avocado toast! 🥑 Used 2 ripe avocados mashed with lime juice, a dash of salt and pepper. Toasted 2 slices of sourdough bread until golden. Topped with red pepper flakes, everything bagel seasoning, and a perfect poached egg. So good for breakfast! Maybe add some cherry tomatoes next time. #avocadotoast #breakfastgoals"
    }
  },
  {
    name: "Complex Recipe with Substitutions",
    format: "structured",
    data: {
      name: "Vegan Chocolate Cake",
      ingredients: [
        "1.5 cups all-purpose flour",
        "1 cup sugar",
        "1/4 cup cocoa powder",
        "1 tsp baking soda",
        "1/2 tsp salt",
        "1 cup water",
        "1/3 cup vegetable oil",
        "1 tbsp vinegar",
        "1 tsp vanilla extract"
      ],
      instructions: "Mix dry ingredients. Add wet ingredients. Bake at 350°F for 30 minutes.",
      servings: 8,
      notes: "Can use almond milk instead of water, maple syrup instead of sugar"
    }
  }
];

async function runTests() {
  console.log('🧪 Starting Multi-Agent System Tests\n');
  
  const recipeAgent = new RecipeAgent();
  const results = [];
  
  for (const testRecipe of testRecipes) {
    console.log(`📋 Testing: ${testRecipe.name} (${testRecipe.format} format)`);
    console.log('─'.repeat(50));
    
    try {
      const startTime = Date.now();
      
      // Test with multi-agent system
      const result = await recipeAgent.extractIngredients(testRecipe.data, 'test-user', {
        useMultiAgent: true,
        servings: testRecipe.data.servings || 4
      });
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Success in ${processingTime}ms`);
      console.log(`📊 Confidence: ${result.confidence}`);
      console.log(`🔧 Extraction Method: ${result.metadata.extractionMethod}`);
      console.log(`🤖 Agents Executed: ${result.metadata.agentsExecuted?.join(', ') || 'N/A'}`);
      console.log(`🔄 Fallbacks Used: ${result.metadata.fallbacksUsed?.join(', ') || 'None'}`);
      console.log(`📝 Recipe Format: ${result.metadata.recipeFormat || 'Unknown'}`);
      console.log(`📦 Ingredients Found: ${result.ingredients.length}`);
      
      // Display ingredients
      console.log('\n🥘 Extracted Ingredients:');
      result.ingredients.forEach((ingredient, index) => {
        console.log(`  ${index + 1}. ${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name}`);
        if (ingredient.category) console.log(`     Category: ${ingredient.category}`);
        if (ingredient.confidence) console.log(`     Confidence: ${ingredient.confidence}`);
        if (ingredient.allergens && ingredient.allergens.length > 0) {
          console.log(`     Allergens: ${ingredient.allergens.join(', ')}`);
        }
      });
      
      // Display issues if any
      if (result.issues && result.issues.length > 0) {
        console.log('\n⚠️  Issues Detected:');
        result.issues.forEach(issue => {
          console.log(`  - ${issue.type}: ${issue.description} (${issue.severity})`);
        });
      }
      
      // Display enhancements
      if (result.enhancements && result.enhancements.length > 0) {
        console.log('\n✨ Enhancements Applied:');
        result.enhancements.forEach(enhancement => {
          console.log(`  - ${enhancement.type}: ${enhancement.description}`);
        });
      }
      
      // Store result for summary
      results.push({
        name: testRecipe.name,
        format: testRecipe.format,
        success: result.success,
        confidence: result.confidence,
        processingTime,
        ingredientsCount: result.ingredients.length,
        issuesCount: result.issues?.length || 0,
        enhancementsCount: result.enhancements?.length || 0,
        agentsExecuted: result.metadata.agentsExecuted || [],
        fallbacksUsed: result.metadata.fallbacksUsed || [],
        recipeFormat: result.metadata.recipeFormat
      });
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      results.push({
        name: testRecipe.name,
        format: testRecipe.format,
        success: false,
        error: error.message
      });
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful > 0) {
    const avgConfidence = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.confidence, 0) / successful;
    const avgProcessingTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.processingTime, 0) / successful;
    
    console.log(`📈 Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    console.log(`⏱️  Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`);
    
    console.log('\n📋 Detailed Results:');
    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.name} (${result.format})`);
        console.log(`     Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`     Ingredients: ${result.ingredientsCount}`);
        console.log(`     Issues: ${result.issuesCount}`);
        console.log(`     Enhancements: ${result.enhancementsCount}`);
        console.log(`     Agents: ${result.agentsExecuted.join(', ')}`);
        if (result.fallbacksUsed.length > 0) {
          console.log(`     Fallbacks: ${result.fallbacksUsed.join(', ')}`);
        }
      } else {
        console.log(`  ❌ ${result.name}: ${result.error}`);
      }
    });
  }
  
  console.log('\n🎉 Multi-Agent System Testing Complete!');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testRecipes };