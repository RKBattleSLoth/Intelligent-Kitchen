const OpenRouterClient = require('./OpenRouterClient');
const { query } = require('../../config/database');

class SmartMealPlanner {
  constructor() {
    this.client = new OpenRouterClient();
  }

  async generateMealPlan(options) {
    const {
      userId,
      startDate,
      endDate,
      mealTypes = ['breakfast', 'lunch', 'dinner'],
      preferences = {},
      constraints = [],
      recipeSource = 'mixed',
      peopleCount = 4
    } = options;

    console.log('🍳 [SMART_MEAL_PLANNER] Starting meal plan generation:', {
      userId,
      startDate,
      endDate,
      mealTypes,
      recipeSource,
      peopleCount,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    // Calculate dayCount for both AI and fallback
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const dayCount = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    console.log('📅 [SMART_MEAL_PLANNER] Date calculations:', {
      startDateObj: startDateObj.toISOString(),
      endDateObj: endDateObj.toISOString(),
      dayCount,
      totalMealsExpected: dayCount * mealTypes.length
    });

    // Build the prompt for meal planning
    const prompt = this.buildMealPlanPrompt({
      startDate,
      endDate,
      mealTypes,
      preferences,
      constraints,
      recipeSource,
      peopleCount
    });

    console.log('🤖 [SMART_MEAL_PLANNER] AI Service Check:', {
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
      apiKeyLength: process.env.OPENROUTER_API_KEY?.length || 0,
      model: process.env.OPENROUTER_MEAL_PLANNER_MODEL || 'anthropic/claude-3-5-haiku-20241022',
      promptLength: prompt.length
    });

    // Models to try in order (fast/cheap first, then fallbacks)
    const modelsToTry = [
      process.env.OPENROUTER_MEAL_PLANNER_MODEL || 'anthropic/claude-3-5-haiku-20241022',
      'google/gemini-flash-1.5',  // Fast and cheap fallback
      'openai/gpt-4o-mini'        // Another reliable fallback
    ];
    
    let response = null;
    let usedModel = null;
    
    for (const model of modelsToTry) {
      try {
        console.log(`🔄 [SMART_MEAL_PLANNER] Attempting AI generation with ${model}...`);
        response = await this.client.chat([
          {
            role: 'user',
            content: prompt
          }
        ], {
          model,
          temperature: 0.7,
          maxTokens: 8000
        });
        usedModel = model;
        console.log(`✅ [SMART_MEAL_PLANNER] Success with ${model}`);
        break; // Success - exit the loop
      } catch (modelError) {
        console.log(`⚠️ [SMART_MEAL_PLANNER] ${model} failed: ${modelError.message}`);
        if (model === modelsToTry[modelsToTry.length - 1]) {
          // Last model also failed, throw the error
          throw modelError;
        }
        // Try next model
        continue;
      }
    }
    
    try {

      console.log('✅ [SMART_MEAL_PLANNER] AI response received:', {
        hasContent: !!response?.content,
        contentLength: response?.content?.length || 0,
        usage: response?.usage
      });

      let mealPlanData;
      try {
        mealPlanData = this.parseMealPlanResponse(response, dayCount, mealTypes);
        console.log('✅ [SMART_MEAL_PLANNER] Successfully parsed meal plan:', {
          mealCount: mealPlanData?.meals?.length || 0,
          expectedCount: dayCount * mealTypes.length
        });
      } catch (parseError) {
        console.error('❌ [SMART_MEAL_PLANNER] JSON parsing error, using fallback:', {
          error: parseError.message,
          stack: parseError.stack,
          responseSample: typeof response?.content === 'string' ? response.content.substring(0, 200) : 'N/A'
        });
        // AI responded but JSON parsing failed - use fallback instead
        mealPlanData = null;
      }
      
      // If parsing failed or no meals, use fallback
      if (!mealPlanData || !mealPlanData.meals || mealPlanData.meals.length === 0) {
        console.log('⚠️ [SMART_MEAL_PLANNER] Using fallback due to AI response issues');
        const fallback = await this.generateFallbackMealPlan({
          userId,
          startDate,
          endDate,
          mealTypes,
          preferences,
          recipeSource,
          peopleCount
        });
        
        return {
          success: true,
          mealPlan: fallback,
          rawResponse: response,
          fallback: true,
          message: 'Returned fallback meal plan due to AI parsing issues'
        };
      }
      
      console.log('🎉 [SMART_MEAL_PLANNER] AI generation successful');
      let coverageInfo = null;
      try {
        coverageInfo = await this.ensureCompleteMealCoverage({
          existingMeals: mealPlanData.meals,
          startDate,
          endDate,
          mealTypes,
          userId,
          preferences,
          recipeSource,
          peopleCount
        });

        if (coverageInfo?.meals) {
          mealPlanData.meals = coverageInfo.meals;
        }

        if (coverageInfo) {
          console.log('🧮 [SMART_MEAL_PLANNER] Meal coverage summary:', {
            expectedMeals: dayCount * mealTypes.length,
            actualMeals: mealPlanData.meals.length,
            initialMissingCount: coverageInfo.initialMissingCount,
            missingMealCount: coverageInfo.missingMealCount,
            fallbackMealsAdded: coverageInfo.fallbackMealsAdded,
            removedDuplicates: coverageInfo.removedDuplicates,
            invalidMealsFiltered: coverageInfo.invalidMealsFiltered
          });
        }
      } catch (coverageError) {
        console.error('❌ [SMART_MEAL_PLANNER] Failed to ensure complete meal coverage:', {
          error: coverageError.message,
          stack: coverageError.stack
        });
      }

      const responsePayload = {
        success: true,
        mealPlan: mealPlanData,
        rawResponse: response
      };

      if (coverageInfo?.fallbackMealsAdded > 0 || coverageInfo?.missingMealCount > 0) {
        responsePayload.fallback = true;
        responsePayload.message = 'Supplemented AI meal plan with fallback meals to ensure full coverage';
        responsePayload.fallbackDetails = {
          fallbackMealsAdded: coverageInfo?.fallbackMealsAdded || 0,
          initialMissingCount: coverageInfo?.initialMissingCount || 0,
          missingMealCount: coverageInfo?.missingMealCount || 0,
          removedDuplicates: coverageInfo?.removedDuplicates || 0,
          invalidMealsFiltered: coverageInfo?.invalidMealsFiltered || 0
        };
      }

      return responsePayload;
    } catch (error) {
      console.error('❌ [SMART_MEAL_PLANNER] Error generating meal plan via AI:', {
        error: error.message,
        stack: error.stack,
        hasApiKey: !!process.env.OPENROUTER_API_KEY,
        environment: process.env.NODE_ENV
      });
      
      console.log('🔄 [SMART_MEAL_PLANNER] Generating fallback meal plan...');
      const fallback = await this.generateFallbackMealPlan({
        userId,
        startDate,
        endDate,
        mealTypes,
        preferences,
        recipeSource,
        peopleCount
      });
      
      console.log('✅ [SMART_MEAL_PLANNER] Fallback generation complete:', {
        fallbackMealCount: fallback?.meals?.length || 0
      });
      
      return {
        success: true,
        mealPlan: fallback,
        rawResponse: null,
        fallback: true,
        message: 'Returned fallback meal plan due to AI unavailability'
      };
    }
  }

  buildMealPlanPrompt(options) {
    const {
      startDate,
      endDate,
      mealTypes,
      preferences,
      constraints,
      recipeSource,
      peopleCount
    } = options;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const dayCount = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    let prompt = `Generate ${dayCount * mealTypes.length} meals for ${peopleCount} people from ${startDate} to ${endDate}.

Dietary: ${preferences.dietary || 'none'}
Cuisines: ${preferences.cuisines?.length > 0 ? preferences.cuisines.join(', ') : 'any'}
Budget: ${preferences.budget || 'moderate'}

Meal types: ${mealTypes.join(', ')}

Each meal MUST include:
- Step-by-step instructions (Step 1, Step 2, etc.)
- Specific ingredient quantities
- Cooking times and temperatures

JSON format:
{
  "name": "meal plan name",
  "description": "brief description",
  "meals": [
    {
      "date": "YYYY-MM-DD",
      "mealType": "breakfast|lunch|dinner|snack|dessert",
      "name": "meal name",
      "description": "brief description",
      "instructions": "Step 1: Action Step 2: Action Step 3: Action Step 4: Action Step 5: Action",
      "ingredients": ["2 cups flour", "1 tbsp olive oil", "2 cloves garlic"],
      "cookTime": 30,
      "difficulty": "easy|medium|hard",
      "isUserRecipe": false,
      "userRecipeId": null
    }
  ]
}

Return valid JSON only. No extra text.`;

    return prompt;
  }

  parseMealPlanResponse(response, dayCount, mealTypes) {
    try {
      // Extract content from the response (handle OpenRouter array structure)
      let content = '';
      if (Array.isArray(response?.content)) {
        content = response.content
          .map(part => (typeof part?.text === 'string') ? part.text : '')
          .join('')
          .trim();
      } else if (typeof response?.content === 'string') {
        content = response.content.trim();
      } else if (typeof response === 'string') {
        content = response.trim();
      } else {
        content = JSON.stringify(response ?? '');
      }

      // Clean up common JSON issues
      let cleanedContent = content
        // Remove any content before the JSON
        .replace(/^[^{]*\{/, '{')
        // Remove any content after the JSON
        .replace(/\}\s*[^\}\]]*$/, '}')
        // Fix common escaping issues in instructions
        .replace(/\\n/g, '\\\\n')
        .replace(/\\r/g, '\\\\r')
        .replace(/\\t/g, '\\\\t');
      
      // Try different JSON extraction methods
      let mealPlan = null;
      
      // Method 1: Look for JSON code block
      const codeBlockMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        mealPlan = JSON.parse(codeBlockMatch[1]);
      } else {
        // Method 2: Look for JSON object (more robust)
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            mealPlan = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.warn('JSON parse failed, trying alternative methods');
            // Method 3: Try to fix common JSON issues
            let fixedJson = jsonMatch[0]
              // Fix escaped quotes in instructions
              .replace(/"([^"]*)\\n([^"]*)\\n([^"]*)"/g, '"$1\\\\n$2\\\\n$3"')
              // Fix other escaping issues
              .replace(/\\\\/g, '\\');
            
            mealPlan = JSON.parse(fixedJson);
          }
        } else {
          // Method 4: Try parsing entire content as JSON
          try {
            mealPlan = JSON.parse(cleanedContent.trim());
          } catch (e) {
            throw new Error('No valid JSON found in response');
          }
        }
      }
      
      // Validate the parsed structure
      if (!mealPlan || !mealPlan.meals || !Array.isArray(mealPlan.meals)) {
        console.warn('Invalid meal plan structure:', mealPlan);
        throw new Error('Invalid meal plan structure');
      }

      // Normalize instructions to ensure multi-line, step-by-step formatting
      mealPlan.meals = mealPlan.meals.map((meal) => {
        const formattedInstructions = this.extractInstructions(
          { instructions: meal.instructions },
          meal.description || meal.name || ''
        );

        return {
          ...meal,
          instructions: formattedInstructions
        };
      });

      // Log meal count for debugging
      console.log(`Parsed meal plan with ${mealPlan.meals.length} meals for meal types: ${mealTypes.join(', ')}`);
      
      // Verify we have the expected number of meals
      const expectedMeals = dayCount * mealTypes.length;
      if (mealPlan.meals.length !== expectedMeals) {
        console.warn(`Meal count mismatch: expected ${expectedMeals}, got ${mealPlan.meals.length}`);
        // Don't throw error, just continue with what we have
      }
      
      return mealPlan;
    } catch (error) {
      console.error('Error parsing meal plan response:', error);
      const rawContent = Array.isArray(response?.content)
        ? response.content.map(part => part?.text || '').join('')
        : (response?.content || response || '').toString();
      console.error('Response content sample:', rawContent.substring(0, 500) + '...');
      
      // Return a fallback structure for JSON parsing errors
      // The actual fallback will be used in the catch block of generateMealPlan
      return {
        name: 'AI Generated Meal Plan',
        description: 'AI-generated meal plan (JSON parsing error)',
        meals: [],
        fallback: true,
        parsingError: true
      };
    }
  }

  async ensureCompleteMealCoverage({
    existingMeals = [],
    startDate,
    endDate,
    mealTypes,
    userId,
    preferences,
    recipeSource,
    peopleCount
  }) {
    const mealTypeOrder = (mealTypes || []).map(type => type.toLowerCase());
    const requiredKeys = new Set();

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const current = new Date(cursor);
      const dateKey = current.toISOString().split('T')[0];
      mealTypeOrder.forEach(mealType => {
        requiredKeys.add(`${dateKey}|${mealType}`);
      });
    }

    const uniqueMeals = new Map();
    let removedDuplicates = 0;
    let invalidMealsFiltered = 0;

    for (const meal of Array.isArray(existingMeals) ? existingMeals : []) {
      if (!meal || !meal.date || !meal.mealType) {
        invalidMealsFiltered++;
        continue;
      }

      const mealType = meal.mealType.toLowerCase();
      const key = `${meal.date}|${mealType}`;

      if (!requiredKeys.has(key) || !mealTypeOrder.includes(mealType)) {
        invalidMealsFiltered++;
        continue;
      }

      if (uniqueMeals.has(key)) {
        removedDuplicates++;
        continue;
      }

      uniqueMeals.set(key, { ...meal, mealType });
    }

    let missingKeys = Array.from(requiredKeys).filter(key => !uniqueMeals.has(key));
    const initialMissingCount = missingKeys.length;
    let fallbackMealsAdded = 0;

    if (missingKeys.length > 0) {
      const fallbackPlan = await this.generateFallbackMealPlan({
        userId,
        startDate,
        endDate,
        mealTypes,
        preferences,
        recipeSource,
        peopleCount
      });

      const fallbackMap = new Map(
        (fallbackPlan?.meals || []).map(fallbackMeal => [`${fallbackMeal.date}|${fallbackMeal.mealType}`, fallbackMeal])
      );

      for (const key of missingKeys) {
        if (uniqueMeals.has(key)) continue;
        const fallbackMeal = fallbackMap.get(key);
        if (fallbackMeal) {
          uniqueMeals.set(key, { ...fallbackMeal });
          fallbackMealsAdded++;
        }
      }

      missingKeys = Array.from(requiredKeys).filter(key => !uniqueMeals.has(key));

      for (const key of missingKeys) {
        const [date, mealType] = key.split('|');
        uniqueMeals.set(key, {
          date,
          mealType,
          name: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Chef Selection`,
          description: `Auto-generated ${mealType} meal for ${date}`,
          instructions: this.generateInstructionsFromDescription(
            `Prepare a balanced ${mealType} meal for ${peopleCount} people using pantry staples.`
          ) || 'Step 1: Gather ingredients.\nStep 2: Cook meal according to standard techniques.\nStep 3: Serve immediately.',
          ingredients: [],
          cookTime: 30,
          difficulty: 'easy',
          isUserRecipe: false,
          userRecipeId: null
        });
      }
    }

    const sortedMeals = Array.from(uniqueMeals.values()).sort((a, b) => {
      if (a.date === b.date) {
        return mealTypeOrder.indexOf(a.mealType) - mealTypeOrder.indexOf(b.mealType);
      }
      return a.date < b.date ? -1 : 1;
    });

    return {
      meals: sortedMeals,
      fallbackMealsAdded,
      missingMealCount: Array.from(requiredKeys).filter(key => !uniqueMeals.has(key)).length,
      removedDuplicates,
      invalidMealsFiltered,
      initialMissingCount
    };
  }

  async generateFallbackMealPlan({ userId, startDate, endDate, mealTypes, preferences, recipeSource, peopleCount }) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    const recipes = await this.fetchRecipes(userId, recipeSource);
    console.log('🍳 [FALLBACK_PLAN] Fetched recipes from database:', {
      totalRecipes: recipes.length,
      userRecipes: recipes.filter(r => r.user_id).length,
      publicRecipes: recipes.filter(r => !r.user_id).length,
      recipeSource,
      timestamp: new Date().toISOString()
    });
    
    const fallbackMeals = [];

    // High-quality fallback recipes with detailed ingredients and instructions
    // CRITICAL FIX: When recipes exist, prioritize them over hardcoded fallbacks
    const useFetchedRecipes = recipes && recipes.length > 0;
    console.log('📝 [FALLBACK_PLAN] Decision:', useFetchedRecipes ? 'Using fetched recipes' : 'Using fallback recipes');
    
    // Only use fallback recipes when no user recipes exist
    const fallbackRecipes = useFetchedRecipes ? recipes : this.getQualityFallbackRecipes(preferences, peopleCount);
    
    let recipeIndex = 0;
    
    const fallbackPools = fallbackRecipes.reduce((acc, recipe) => {
      const type = recipe.mealType || 'any';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(recipe);
      return acc;
    }, {});
    const fallbackCounters = {};

    const getNextFallbackRecipe = (mealType) => {
      const lowerType = mealType?.toLowerCase?.() || 'any';
      const pool = (fallbackPools[lowerType] && fallbackPools[lowerType].length > 0)
        ? fallbackPools[lowerType]
        : fallbackPools['any'] || fallbackRecipes;

      if (!pool || pool.length === 0) {
        return null;
      }

      const counter = fallbackCounters[lowerType] || 0;
      fallbackCounters[lowerType] = (counter + 1) % pool.length;

      const selected = pool[counter % pool.length];
      return selected ? { ...selected } : null;
    };

    for (const day of days) {
      const isoDate = day.toISOString().split('T')[0];
      for (const mealType of mealTypes) {
        let recipe;
        const totalMealsNeeded = days.length * mealTypes.length;
        
        // Mix user recipes with fallback recipes for variety
        if (recipes && recipes.length > 0 && recipes.length >= totalMealsNeeded) {
          // If we have enough user recipes, use them
          recipe = recipes[recipeIndex % recipes.length];
          recipeIndex++;
        } else if (recipes && recipes.length > 0) {
          // Mix user and fallback recipes to avoid repetition
          const userRecipeCount = recipes.length;
          if (recipeIndex < userRecipeCount * 2) {
            // Use user recipe for first few meals
            recipe = recipes[recipeIndex % userRecipeCount];
          } else {
            // Use fallback recipe for remaining meals
            recipe = getNextFallbackRecipe(mealType);
          }
          recipeIndex++;
        } else {
          // No user recipes, use our quality fallback recipes
          recipe = getNextFallbackRecipe(mealType);
        }

        if (!recipe) {
          // Absolute fallback if something went wrong
          recipe = {
            name: `${mealType} Chef's Selection`,
            description: `Chef's choice for ${mealType}`,
            ingredients: [],
            cook_time: 30,
            difficulty: 'easy',
            instructions: `Step 1: Gather ingredients for ${mealType}.
Step 2: Prepare according to standard techniques.
Step 3: Plate and serve.`
          };
        }

        let ingredientsList;
        let description;

        if (recipe.user_id || recipe.id) {
          // User's recipe - process ingredients
          ingredientsList = Array.isArray(recipe.ingredients)
            ? recipe.ingredients.map(item => {
                if (typeof item === 'string') return item;
                if (!item || typeof item !== 'object') return null;
                const parts = [];
                if (item.quantity !== null && item.quantity !== undefined) {
                  parts.push(String(item.quantity));
                }
                if (item.unit) {
                  parts.push(item.unit);
                }
                if (item.name) {
                  parts.push(item.name);
                }
                return parts.join(' ').trim() || item.name || null;
              }).filter(Boolean)
            : [];
          description = recipe.description || `${mealType} from saved recipes`;
        } else {
          // Fallback recipe - use predefined ingredients and description
          ingredientsList = recipe.ingredients;
          description = recipe.description;
        }

        const instructions = this.extractInstructions(recipe, description);

        if (!instructions && process.env.NODE_ENV === 'production') {
          console.warn('Fallback instructions missing', {
            recipeName: recipe?.name,
            mealType,
            hasRecipeInstructions: Boolean(recipe?.instructions)
          });
        }

        fallbackMeals.push({
          date: isoDate,
          mealType,
          name: recipe.name,
          description: description,
          instructions,
          ingredients: ingredientsList,
          cookTime: recipe.cook_time || recipe.cookTime || 30,
          difficulty: recipe.difficulty || 'easy',
          isUserRecipe: Boolean(recipe.user_id || recipe.id),
          userRecipeId: recipe.id || null
        });
      }
    }

    return {
      name: `Smart ${preferences?.dietary || 'Balanced'} Meal Plan`,
      description: recipes.length
        ? 'Generated from your saved recipes due to AI unavailability'
        : 'Generated fallback meal suggestions',
      meals: fallbackMeals
    };
  }

  getQualityFallbackRecipes(preferences, peopleCount) {
    // Scale quantities based on people count
    const scaleFactor = peopleCount / 4; // Base recipes are for 4 people
    
    return [
      // Breakfast options
      {
        mealType: 'breakfast',
        name: 'Fluffy Pancakes with Maple Syrup',
        description: 'Light and fluffy pancakes served with fresh berries and maple syrup.',
        instructions: `Step 1: Whisk together ${Math.ceil(2 * scaleFactor)} cups flour, ${Math.ceil(2 * scaleFactor)} tbsp sugar, ${Math.ceil(2 * scaleFactor)} tsp baking powder, and ${Math.ceil(1 * scaleFactor)} tsp salt.
Step 2: Beat ${Math.ceil(2 * scaleFactor)} eggs with ${Math.ceil(1.5 * scaleFactor)} cups milk and ${Math.ceil(4 * scaleFactor)} tbsp melted butter.
Step 3: Fold wet ingredients into dry until just combined; do not overmix.
Step 4: Heat greased griddle over medium heat and pour ${Math.ceil(0.5 * scaleFactor)} cup batter per pancake.
Step 5: Cook 2-3 minutes per side until golden, then serve with berries and syrup.`,
        ingredients: [
          `${Math.ceil(2 * scaleFactor)} cups all-purpose flour`,
          `${Math.ceil(2 * scaleFactor)} tbsp sugar`,
          `${Math.ceil(2 * scaleFactor)} tsp baking powder`,
          `${Math.ceil(1 * scaleFactor)} tsp salt`,
          `${Math.ceil(2 * scaleFactor)} large eggs`,
          `${Math.ceil(1.5 * scaleFactor)} cups milk`,
          `${Math.ceil(4 * scaleFactor)} tbsp melted butter`,
          `${Math.ceil(1 * scaleFactor)} tsp vanilla extract`,
          `${Math.ceil(1 * scaleFactor)} cups mixed berries`,
          `${Math.ceil(0.5 * scaleFactor)} cup maple syrup`
        ],
        cookTime: 20,
        difficulty: 'easy'
      },
      {
        mealType: 'breakfast',
        name: 'Veggie Breakfast Burritos',
        description: 'Soft tortillas filled with scrambled eggs, roasted vegetables, and cheese.',
        instructions: `Step 1: Sauté ${Math.ceil(2 * scaleFactor)} cups diced vegetables in ${Math.ceil(2 * scaleFactor)} tbsp oil for 6 minutes.
Step 2: Scramble ${Math.ceil(8 * scaleFactor)} eggs with salt and pepper until set.
Step 3: Warm ${Math.ceil(6 * scaleFactor)} large tortillas.
Step 4: Layer eggs, vegetables, ${Math.ceil(1.5 * scaleFactor)} cups cheese, and ${Math.ceil(1 * scaleFactor)} cups beans in tortillas.
Step 5: Roll burritos tightly and serve with salsa.`,
        ingredients: [
          `${Math.ceil(6 * scaleFactor)} large tortillas`,
          `${Math.ceil(8 * scaleFactor)} eggs`,
          `${Math.ceil(2 * scaleFactor)} cups mixed vegetables`,
          `${Math.ceil(1.5 * scaleFactor)} cups shredded cheese`,
          `${Math.ceil(1 * scaleFactor)} cups black beans`,
          `${Math.ceil(2 * scaleFactor)} tbsp olive oil`,
          `${Math.ceil(0.5 * scaleFactor)} cup salsa`
        ],
        cookTime: 25,
        difficulty: 'easy'
      },
      // Lunch options
      {
        mealType: 'lunch',
        name: 'Grilled Chicken Caesar Salad',
        description: 'Crisp romaine lettuce topped with grilled chicken, parmesan, and croutons.',
        instructions: `Step 1: Season ${Math.ceil(2 * scaleFactor)} chicken breasts with oil, salt, and pepper.
Step 2: Grill chicken 6-7 minutes per side at 400°F; rest and slice thinly.
Step 3: Chop ${Math.ceil(2 * scaleFactor)} heads romaine and place in bowl.
Step 4: Toss lettuce with ${Math.ceil(0.5 * scaleFactor)} cup dressing, ${Math.ceil(1 * scaleFactor)} cup parmesan, and croutons.
Step 5: Top with sliced chicken and fresh lemon juice.`,
        ingredients: [
          `${Math.ceil(2 * scaleFactor)} chicken breasts`,
          `${Math.ceil(2 * scaleFactor)} heads romaine`,
          `${Math.ceil(1 * scaleFactor)} cup parmesan`,
          `${Math.ceil(2 * scaleFactor)} cups croutons`,
          `${Math.ceil(0.5 * scaleFactor)} cup Caesar dressing`,
          `${Math.ceil(2 * scaleFactor)} tbsp olive oil`,
          `${Math.ceil(1 * scaleFactor)} lemon`
        ],
        cookTime: 25,
        difficulty: 'medium'
      },
      {
        mealType: 'lunch',
        name: 'Roasted Vegetable Quinoa Bowls',
        description: 'Protein-packed quinoa bowls with roasted seasonal vegetables and tahini sauce.',
        instructions: `Step 1: Roast ${Math.ceil(4 * scaleFactor)} cups vegetables at 400°F for 20 minutes.
Step 2: Cook ${Math.ceil(2 * scaleFactor)} cups quinoa in broth until fluffy.
Step 3: Whisk tahini, lemon juice, garlic, and water into a smooth dressing.
Step 4: Divide quinoa into bowls and top with vegetables and ${Math.ceil(1 * scaleFactor)} cups chickpeas.
Step 5: Drizzle with dressing and garnish with herbs.`,
        ingredients: [
          `${Math.ceil(2 * scaleFactor)} cups quinoa`,
          `${Math.ceil(4 * scaleFactor)} cups mixed vegetables`,
          `${Math.ceil(1 * scaleFactor)} cups chickpeas`,
          `${Math.ceil(0.5 * scaleFactor)} cup tahini`,
          `${Math.ceil(0.25 * scaleFactor)} cup lemon juice`,
          `${Math.ceil(2 * scaleFactor)} cloves garlic`,
          `${Math.ceil(0.5 * scaleFactor)} cup fresh herbs`
        ],
        cookTime: 30,
        difficulty: 'easy'
      },
      // Dinner options
      {
        mealType: 'dinner',
        name: 'Herb-Crusted Salmon with Roasted Vegetables',
        description: 'Oven-baked salmon with herb crust and roasted seasonal vegetables.',
        instructions: `Step 1: Preheat oven to 400°F and line a baking sheet.
Step 2: Toss ${Math.ceil(3 * scaleFactor)} cups vegetables with oil, salt, and pepper.
Step 3: Mix breadcrumbs with herbs and press onto ${Math.ceil(4 * scaleFactor)} salmon fillets.
Step 4: Roast vegetables 10 minutes, then add salmon; bake 12-15 minutes more.
Step 5: Finish with lemon wedges and serve hot.`,
        ingredients: [
          `${Math.ceil(4 * scaleFactor)} salmon fillets`,
          `${Math.ceil(1 * scaleFactor)} cup breadcrumbs`,
          `${Math.ceil(2 * scaleFactor)} tbsp parsley`,
          `${Math.ceil(1 * scaleFactor)} tbsp dill`,
          `${Math.ceil(2 * scaleFactor)} cloves garlic`,
          `${Math.ceil(3 * scaleFactor)} tbsp olive oil`,
          `${Math.ceil(3 * scaleFactor)} cups vegetables`,
          `${Math.ceil(1 * scaleFactor)} lemon`
        ],
        cookTime: 35,
        difficulty: 'medium'
      },
      {
        mealType: 'dinner',
        name: 'Tuscan Chicken Pasta',
        description: 'Creamy sun-dried tomato sauce with seared chicken and spinach over pasta.',
        instructions: `Step 1: Cook ${Math.ceil(1.5 * scaleFactor)} lbs pasta until al dente; reserve pasta water.
Step 2: Sear seasoned chicken in ${Math.ceil(2 * scaleFactor)} tbsp oil until golden; slice.
Step 3: Sauté garlic and sun-dried tomatoes, then add cream and broth.
Step 4: Simmer sauce 5 minutes, add spinach to wilt.
Step 5: Toss pasta with sauce and chicken, using reserved water to adjust consistency.`,
        ingredients: [
          `${Math.ceil(1.5 * scaleFactor)} lbs pasta`,
          `${Math.ceil(2 * scaleFactor)} chicken breasts`,
          `${Math.ceil(0.5 * scaleFactor)} cup sun-dried tomatoes`,
          `${Math.ceil(2 * scaleFactor)} cups spinach`,
          `${Math.ceil(2 * scaleFactor)} cloves garlic`,
          `${Math.ceil(1 * scaleFactor)} cup heavy cream`,
          `${Math.ceil(1 * scaleFactor)} cup chicken broth`,
          `${Math.ceil(0.5 * scaleFactor)} cup parmesan`
        ],
        cookTime: 30,
        difficulty: 'medium'
      },
      // Snack options
      {
        mealType: 'snack',
        name: 'Greek Yogurt Parfaits',
        description: 'Layered parfaits with yogurt, granola, seasonal fruit, and honey.',
        instructions: `Step 1: Spoon ${Math.ceil(2 * scaleFactor)} cups yogurt into glasses as the first layer.
Step 2: Add ${Math.ceil(1 * scaleFactor)} cup granola on top.
Step 3: Layer ${Math.ceil(1 * scaleFactor)} cup fresh fruit over granola.
Step 4: Repeat layers until glasses are filled.
Step 5: Drizzle with honey and sprinkle nuts before serving.`,
        ingredients: [
          `${Math.ceil(2 * scaleFactor)} cups Greek yogurt`,
          `${Math.ceil(1 * scaleFactor)} cup granola`,
          `${Math.ceil(1 * scaleFactor)} cup seasonal fruit`,
          `${Math.ceil(0.25 * scaleFactor)} cup chopped nuts`,
          `${Math.ceil(0.25 * scaleFactor)} cup honey`
        ],
        cookTime: 5,
        difficulty: 'easy'
      },
      {
        mealType: 'snack',
        name: 'Mediterranean Snack Platter',
        description: 'Hummus with fresh vegetables, olives, and warm pita wedges.',
        instructions: `Step 1: Warm ${Math.ceil(4 * scaleFactor)} pita rounds in a 350°F oven for 5 minutes.
Step 2: Arrange sliced vegetables, olives, and feta on a platter.
Step 3: Spoon hummus into a bowl and drizzle with olive oil.
Step 4: Sprinkle with paprika and chopped parsley.
Step 5: Serve immediately with warm pita wedges.`,
        ingredients: [
          `${Math.ceil(4 * scaleFactor)} pita rounds`,
          `${Math.ceil(1 * scaleFactor)} cup hummus`,
          `${Math.ceil(2 * scaleFactor)} cups assorted vegetables`,
          `${Math.ceil(0.5 * scaleFactor)} cup olives`,
          `${Math.ceil(0.25 * scaleFactor)} cup feta`,
          `${Math.ceil(2 * scaleFactor)} tbsp olive oil`
        ],
        cookTime: 10,
        difficulty: 'easy'
      },
      // Dessert options
      {
        mealType: 'dessert',
        name: 'Chocolate Avocado Mousse',
        description: 'Silky chocolate mousse made with ripe avocado and cocoa.',
        instructions: `Step 1: Blend ${Math.ceil(2 * scaleFactor)} ripe avocados until smooth.
Step 2: Add cocoa powder, maple syrup, vanilla, and almond milk; blend creamy.
Step 3: Fold in whipped cream for a lighter texture.
Step 4: Chill mousse for at least 30 minutes.
Step 5: Garnish with chocolate shavings before serving.`,
        ingredients: [
          `${Math.ceil(2 * scaleFactor)} ripe avocados`,
          `${Math.ceil(0.5 * scaleFactor)} cup cocoa powder`,
          `${Math.ceil(0.5 * scaleFactor)} cup maple syrup`,
          `${Math.ceil(0.25 * scaleFactor)} cup almond milk`,
          `${Math.ceil(1 * scaleFactor)} tsp vanilla`,
          `${Math.ceil(0.25 * scaleFactor)} cup whipped cream`,
          `${Math.ceil(0.25 * scaleFactor)} cup chocolate shavings`
        ],
        cookTime: 10,
        difficulty: 'easy'
      },
      {
        mealType: 'dessert',
        name: 'Baked Cinnamon Apples',
        description: 'Warm cinnamon-spiced apples topped with crunchy oat crumble.',
        instructions: `Step 1: Preheat oven to 375°F and grease baking dish.
Step 2: Toss sliced apples with lemon juice, sugar, and cinnamon.
Step 3: Combine oats, flour, butter, and brown sugar into a crumble.
Step 4: Layer apples in dish and sprinkle crumble evenly on top.
Step 5: Bake 30 minutes until apples are tender and topping is golden.`,
        ingredients: [
          `${Math.ceil(6 * scaleFactor)} apples`,
          `${Math.ceil(0.5 * scaleFactor)} cup brown sugar`,
          `${Math.ceil(1 * scaleFactor)} tsp cinnamon`,
          `${Math.ceil(1 * scaleFactor)} tbsp lemon juice`,
          `${Math.ceil(1 * scaleFactor)} cup rolled oats`,
          `${Math.ceil(0.5 * scaleFactor)} cup flour`,
          `${Math.ceil(0.5 * scaleFactor)} cup butter`
        ],
        cookTime: 35,
        difficulty: 'easy'
      }
    ];
  }

  async fetchRecipes(userId, recipeSource) {
    const conditions = [];
    const values = [];

    if (recipeSource === 'saved' || recipeSource === 'mixed') {
      conditions.push('(recipes.user_id = $1 OR recipes.is_public = true)');
      values.push(userId);
    } else {
      conditions.push('recipes.is_public = true');
    }

    conditions.push('recipes.instructions IS NOT NULL');
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT recipes.id,
              recipes.name,
              recipes.description,
              recipes.prep_time,
              recipes.cook_time,
              recipes.difficulty,
              recipes.user_id,
              recipes.instructions,
              COALESCE(json_agg(
                json_build_object(
                  'name', ri.name,
                  'quantity', ri.quantity,
                  'unit', ri.unit,
                  'notes', ri.notes
                )
              ) FILTER (WHERE ri.id IS NOT NULL), '[]') AS ingredients
       FROM recipes
       LEFT JOIN recipe_ingredients ri ON ri.recipe_id = recipes.id
       ${whereClause}
       GROUP BY recipes.id
       ORDER BY RANDOM()
       LIMIT 50`,
      values
    );

    if (result.rows.length === 0) {
      return [
        {
          name: 'Grilled Chicken with Veggies',
          description: 'Protein-rich meal with seasonal vegetables',
          ingredients: ['2 chicken breasts', '2 cups mixed vegetables', 'olive oil', 'salt', 'pepper'],
          prep_time: 15,
          cook_time: 25,
          difficulty: 'easy',
          user_id: null
        },
        {
          name: 'Quinoa Veggie Bowl',
          description: 'Quick vegetarian bowl with quinoa and roasted veggies',
          ingredients: ['1 cup quinoa', '2 cups vegetables', '1 cup chickpeas', 'tahini sauce'],
          prep_time: 20,
          cook_time: 25,
          difficulty: 'easy',
          user_id: null
        },
        {
          name: 'Overnight Oats',
          description: 'Fiber-rich breakfast with berries',
          ingredients: ['1 cup oats', '1 cup milk', '1/2 cup berries', '1 tbsp chia seeds'],
          prep_time: 10,
          cook_time: 0,
          difficulty: 'easy',
          user_id: null
        }
      ];
    }

    return result.rows;
  }

  extractInstructions(recipe = {}, fallbackDescription = '') {
    const instructionsSource = recipe.instructions;
    const buildSteps = (stepsArray) => {
      if (!Array.isArray(stepsArray)) return [];
      return stepsArray.map((step, index) => {
        if (!step) return null;
        if (typeof step === 'string') {
          const trimmed = step.trim();
          return trimmed ? `Step ${index + 1}: ${trimmed}` : null;
        }
        if (typeof step === 'object') {
          const text = step.text || step.description || step.instruction || step.step;
          if (text && typeof text === 'string' && text.trim()) {
            return `Step ${index + 1}: ${text.trim()}`;
          }
        }
        return null;
      }).filter(Boolean);
    };

    let formatted = null;

    if (Array.isArray(instructionsSource)) {
      const steps = buildSteps(instructionsSource);
      if (steps.length > 0) {
        formatted = steps.join('\n');
      }
    }

    if (!formatted && instructionsSource && typeof instructionsSource === 'object' && !Array.isArray(instructionsSource)) {
      const candidateArray = Array.isArray(instructionsSource.steps)
        ? instructionsSource.steps
        : Array.isArray(instructionsSource.instructions)
          ? instructionsSource.instructions
          : null;

      if (candidateArray) {
        const steps = buildSteps(candidateArray);
        if (steps.length > 0) {
          formatted = steps.join('\n');
        }
      } else if (typeof instructionsSource.text === 'string') {
        formatted = this.normalizeInstructionText(instructionsSource.text);
      }
    }

    if (!formatted && typeof instructionsSource === 'string') {
      const trimmed = instructionsSource.trim();
      if (trimmed) {
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            const steps = buildSteps(Array.isArray(parsed) ? parsed : parsed?.steps || parsed?.instructions || []);
            if (steps.length > 0) {
              formatted = steps.join('\n');
            }
          } catch (err) {
            // Ignore JSON parse errors and fall back to text normalization
          }
        }

        if (!formatted) {
          formatted = this.normalizeInstructionText(trimmed);
        }
      }
    }

    if (!formatted && typeof fallbackDescription === 'string' && fallbackDescription.trim()) {
      formatted = this.generateInstructionsFromDescription(fallbackDescription.trim());
    }

    if (!formatted) {
      formatted = 'Step 1: Gather all ingredients and prepare your workspace.\nStep 2: Follow the recipe\'s standard preparation and cooking steps.\nStep 3: Plate the meal and serve immediately while hot.';
    }

    return formatted;
  }

  normalizeInstructionText(text = '') {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) return '';

    if (/Step\s*\d+/i.test(normalized)) {
      return normalized
        .replace(/(Step\s*\d+\s*:)/gi, '\n$1')
        .replace(/^\n+/, '')
        .replace(/\n{2,}/g, '\n')
        .trim();
    }

    return this.generateInstructionsFromDescription(normalized);
  }

  generateInstructionsFromDescription(description = '') {
    const cleaned = description.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return '';
    }

    const sentences = cleaned
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map(sentence => sentence.replace(/[.!?]+$/, '').trim())
      .filter(Boolean);

    if (sentences.length === 0) {
      return '';
    }

    return sentences
      .map((sentence, index) => `Step ${index + 1}: ${sentence}`)
      .join('\n');
  }

  async getMealAlternatives(options) {
    const {
      date,
      mealType,
      currentRecipe,
      preferences = {}
    } = options;

    const prompt = `Suggest 3 alternative meals for ${mealType} on ${date} as alternatives to "${currentRecipe}".
Dietary preference: ${preferences.dietary || 'none'}
Budget: ${preferences.budget || 'moderate'}

Respond in JSON format:
{
  "alternatives": [
    {
      "name": "meal name",
      "description": "brief description",
      "cookTime": 30,
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

    try {
      const response = await this.client.chat([
        {
          role: 'user',
          content: prompt
        }
      ], {
        model: 'anthropic/claude-3-5-haiku-20241022',
        temperature: 0.7,
        maxTokens: 1000
      });

      const alternatives = this.parseAlternativesResponse(response);
      return alternatives;
    } catch (error) {
      console.error('Error getting meal alternatives:', error);
      return { alternatives: [] };
    }
  }

  parseAlternativesResponse(response) {
    try {
      const content = response.content || response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { alternatives: [] };
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing alternatives response:', error);
      return { alternatives: [] };
    }
  }
}

module.exports = SmartMealPlanner;
