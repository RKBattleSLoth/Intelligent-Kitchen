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

    // Calculate dayCount for both AI and fallback
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const dayCount = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

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

    try {
      const response = await this.client.chat([
        {
          role: 'user',
          content: prompt
        }
      ], {
        model: process.env.OPENROUTER_MEAL_PLANNER_MODEL || 'anthropic/claude-3.5-sonnet',
        temperature: 0.7,
        maxTokens: 4000
      });

      let mealPlanData;
      try {
        mealPlanData = this.parseMealPlanResponse(response, dayCount, mealTypes);
      } catch (parseError) {
        console.error('JSON parsing error, using fallback:', parseError.message);
        // AI responded but JSON parsing failed - use fallback instead
        mealPlanData = null;
      }
      
      // If parsing failed or no meals, use fallback
      if (!mealPlanData || !mealPlanData.meals || mealPlanData.meals.length === 0) {
        console.log('Using fallback due to AI response issues');
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
      
      return {
        success: true,
        mealPlan: mealPlanData,
        rawResponse: response
      };
    } catch (error) {
      console.error('Error generating meal plan via AI:', error.message);
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

    let prompt = `GENERATE A COMPLETE ${dayCount}-DAY MEAL PLAN FROM ${startDate} TO ${endDate} FOR ${peopleCount} PEOPLE. 

🚨 EXTREMELY IMPORTANT: You MUST generate EXACTLY ${dayCount * mealTypes.length} MEALS - ${dayCount} days × ${mealTypes.length} meal types each.
🚨 DO NOT generate partial plans or fewer days - this must be a COMPLETE ${dayCount}-day plan.
🚨 Each day (${startDate} to ${endDate}) MUST include ALL meal types: ${mealTypes.join(', ')}.

REQUIRED FORMAT: For EACH day from ${startDate} to ${endDate}, you MUST provide:
- ${mealTypes.map(type => type.charAt(0).toUpperCase() + type.slice(1))} meal
- ${mealTypes.map(type => type.charAt(0).toUpperCase() + type.slice(1))} meal  
- ${mealTypes.map(type => type.charAt(0).toUpperCase() + type.slice(1))} meal

TOTAL MEALS REQUIRED: ${dayCount * mealTypes.length}. DO NOT PROCEED UNTIL YOU HAVE GENERATED ALL MEALS.

Now generate the complete ${dayCount}-day meal plan:

Meal Types to Include: ${mealTypes.join(', ')}

Preferences:
- Dietary: ${preferences.dietary || 'none'}
- Health Goal: ${preferences.healthGoal || 'maintain'}
- Cuisines: ${preferences.cuisines?.length > 0 ? preferences.cuisines.join(', ') : 'any'}
- Max Cooking Time: ${preferences.maxCookTime ? `${preferences.maxCookTime} minutes` : 'no limit'}
- Budget Level: ${preferences.budget || 'moderate'}

Recipe Source: ${recipeSource}`;

    if (constraints && constraints.length > 0) {
      prompt += '\n\nSpecial Constraints:';
      constraints.forEach(constraint => {
        prompt += `\n- ${constraint.dayOfWeek} ${constraint.mealType}: ${constraint.requirement}`;
      });
    }

    prompt += `\n\nPlease generate a meal plan with detailed recipes. For each meal, include:

1. Specific ingredient quantities (e.g., "2 cups flour" not just "flour")
2. Multi-step, numbered cooking instructions with temperatures and times
3. Realistic measurements for ${peopleCount} people
4. Complete cooking steps that someone can follow exactly

CRITICAL: Each recipe MUST have detailed step-by-step instructions formatted as:

"Step 1: [Action description] (e.g., Preheat oven to 400°F and prepare ingredients)
Step 2: [Action description] (e.g., Heat oil in large skillet over medium-high heat)
Step 3: [Action description] (e.g., Add chicken and cook for 5-7 minutes until golden)
Step 4: [Action description] (e.g., Add vegetables and sauce, simmer for 10 minutes)
Step 5: [Action description] (e.g., Serve immediately with garnish)"

Please generate a meal plan in the following JSON format:
{
  "name": "meal plan name",
  "description": "brief description",
  "meals": [
    {
      "date": "YYYY-MM-DD",
      "mealType": "breakfast|lunch|dinner|snack|dessert",
      "name": "meal name",
      "description": "brief description of the meal",
      "instructions": "Step 1: [First action] Step 2: [Second action] Step 3: [Third action] Step 4: [Fourth action] Step 5: [Fifth action]",
      "ingredients": [
        "2 cups all-purpose flour",
        "1 tbsp olive oil", 
        "2 cloves garlic, minced",
        "1 lb chicken breast, cubed",
        "1 cup chicken broth",
        "2 cups mixed vegetables",
        "1 tsp dried herbs"
      ],
      "cookTime": 30,
      "difficulty": "easy|medium|hard",
      "isUserRecipe": false,
      "userRecipeId": null
    }
  ]
}

REQUIREMENTS:
- Include specific quantities for ALL ingredients
- Each recipe MUST have 3+ numbered steps with clear actions
- Include cooking temperatures (e.g., "Preheat oven to 400°F")
- Include specific cooking times (e.g., "simmer for 10 minutes")
- Consider serving ${peopleCount} people in your measurements
- Use standard cooking measurements (cups, tbsp, tsp, oz, lb, etc.)
- Steps should be actionable and easy to follow
- Include preparation steps, cooking steps, and finishing steps`;

    return prompt;
  }

  parseMealPlanResponse(response, dayCount, mealTypes) {
    try {
      // Extract content from the response
      const content = response.content || response;
      
      // Clean up common JSON issues
      let cleanedContent = content
        // Remove any content before the JSON
        .replace(/^[^{]*\{/, '{')
        // Remove any content after the JSON
        .replace(/\}[^}]*$/, '}')
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
      console.error('Response content sample:', (response.content || response).substring(0, 500) + '...');
      
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

  async generateFallbackMealPlan({ userId, startDate, endDate, mealTypes, preferences, recipeSource, peopleCount }) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    const recipes = await this.fetchRecipes(userId, recipeSource);
    const fallbackMeals = [];
    let recipeIndex = 0;

    // High-quality fallback recipes with detailed ingredients and instructions
    const fallbackRecipes = this.getQualityFallbackRecipes(preferences, peopleCount);

    for (const day of days) {
      const isoDate = day.toISOString().split('T')[0];
      for (const mealType of mealTypes) {
        let recipe;
        
        // Try to use user's recipes first
        if (recipes && recipes.length > 0) {
          recipe = recipes[recipeIndex % recipes.length];
          recipeIndex++;
        }

        // If no user recipes, use our quality fallback recipes
        if (!recipe) {
          const mealTypeIndex = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].indexOf(mealType);
          recipe = fallbackRecipes[mealTypeIndex] || fallbackRecipes[0]; // fallback to first recipe
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

        fallbackMeals.push({
          date: isoDate,
          mealType,
          name: recipe.name,
          description: description,
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
      // Breakfast
      {
        name: "Fluffy Pancakes with Maple Syrup",
        description: "Light and fluffy pancakes served with butter and pure maple syrup, with a side of fresh berries. Mix dry ingredients separately from wet ingredients, then combine until just mixed. Cook on a preheated griddle at 375°F for 2-3 minutes per side until golden brown and bubbles form on the surface.",
        ingredients: [
          `${Math.ceil(2 * scaleFactor)} cups all-purpose flour`,
          `${Math.ceil(2 * scaleFactor)} tbsp sugar`,
          `${Math.ceil(2 * scaleFactor)} tsp baking powder`,
          `${Math.ceil(1 * scaleFactor)} tsp salt`,
          `${Math.ceil(2 * scaleFactor)} eggs`,
          `${Math.ceil(1.5 * scaleFactor)} cups milk`,
          `${Math.ceil(4 * scaleFactor)} tbsp melted butter`,
          `${Math.ceil(1 * scaleFactor)} tsp vanilla extract`,
          `${Math.ceil(1 * scaleFactor)} cups mixed fresh berries`,
          `${Math.ceil(0.5 * scaleFactor)} cup maple syrup`
        ],
        cookTime: 20,
        difficulty: "easy"
      },
      // Lunch
      {
        name: "Grilled Chicken Caesar Salad",
        description: "Crisp romaine lettuce with grilled chicken, parmesan cheese, croutons, and homemade caesar dressing. Season chicken with salt and pepper, grill for 6-7 minutes per side at medium-high heat until internal temperature reaches 165°F. Let rest for 5 minutes before slicing. Toss lettuce with dressing and top with warm chicken.",
        ingredients: [
          `${Math.ceil(2 * scaleFactor)} boneless chicken breasts`,
          `${Math.ceil(2 * scaleFactor)} heads romaine lettuce`,
          `${Math.ceil(1 * scaleFactor)} cup parmesan cheese, shredded`,
          `${Math.ceil(2 * scaleFactor)} cups croutons`,
          `${Math.ceil(0.5 * scaleFactor)} cup caesar dressing`,
          `${Math.ceil(2 * scaleFactor)} cloves garlic`,
          `${Math.ceil(2 * scaleFactor)} tbsp olive oil`,
          `${Math.ceil(1 * scaleFactor)} lemon`,
          `${Math.ceil(1 * scaleFactor)} tsp black pepper`
        ],
        cookTime: 25,
        difficulty: "medium"
      },
      // Dinner
      {
        name: "Herb-Crusted Salmon with Roasted Vegetables",
        description: "Pan-seared salmon with a crispy herb crust, served with roasted seasonal vegetables. Preheat oven to 400°F. Mix breadcrumbs with herbs and garlic. Press onto salmon fillets. Pan-sear for 2 minutes per side, then finish in oven for 8-10 minutes. Roast vegetables at 400°F for 20-25 minutes until tender and lightly caramelized.",
        ingredients: [
          `${Math.ceil(4 * scaleFactor)} salmon fillets (6 oz each)`,
          `${Math.ceil(1 * scaleFactor)} cup panko breadcrumbs`,
          `${Math.ceil(2 * scaleFactor)} tbsp fresh parsley, chopped`,
          `${Math.ceil(1 * scaleFactor)} tbsp fresh dill, chopped`,
          `${Math.ceil(2 * scaleFactor)} cloves garlic, minced`,
          `${Math.ceil(3 * scaleFactor)} tbsp olive oil`,
          `${Math.ceil(2 * scaleFactor)} cups mixed vegetables`,
          `${Math.ceil(1 * scaleFactor)} lemon, cut into wedges`,
          `${Math.ceil(1 * scaleFactor)} tsp salt`,
          `${Math.ceil(0.5 * scaleFactor)} tsp black pepper`
        ],
        cookTime: 35,
        difficulty: "medium"
      },
      // Snack
      {
        name: "Greek Yogurt Parfait",
        description: "Layered Greek yogurt with granola, honey, and fresh fruit for a healthy snack. Layer ingredients in a clear glass: start with yogurt, then granola, then berries, repeating layers. Drizzle with honey and top with a sprinkle of nuts for crunch.",
        ingredients: [
          `${Math.ceil(2 * scaleFactor)} cups Greek yogurt`,
          `${Math.ceil(1 * scaleFactor)} cup granola`,
          `${Math.ceil(1 * scaleFactor)} cup mixed berries`,
          `${Math.ceil(2 * scaleFactor)} tbsp honey`,
          `${Math.ceil(0.5 * scaleFactor)} cup chopped nuts`
        ],
        cookTime: 5,
        difficulty: "easy"
      },
      // Dessert
      {
        name: "Chocolate Avocado Mousse",
        description: "Rich and creamy chocolate mousse made with avocado for a healthy twist. Blend avocados until completely smooth, then add cocoa powder, maple syrup, and vanilla extract. Blend until creamy. Fold in whipped cream for extra lightness. Chill for 30 minutes before serving. Garnish with chocolate shavings.",
        ingredients: [
          `${Math.ceil(2 * scaleFactor)} ripe avocados`,
          `${Math.ceil(0.5 * scaleFactor)} cup cocoa powder`,
          `${Math.ceil(0.5 * scaleFactor)} cup maple syrup`,
          `${Math.ceil(0.25 * scaleFactor)} cup almond milk`,
          `${Math.ceil(1 * scaleFactor)} tsp vanilla extract`,
          `${Math.ceil(0.5 * scaleFactor)} tsp espresso powder`,
          `${Math.ceil(0.25 * scaleFactor)} cup whipped cream`,
          `${Math.ceil(2 * scaleFactor)} tbsp chocolate shavings`
        ],
        cookTime: 10,
        difficulty: "easy"
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
        model: 'anthropic/claude-3.5-sonnet',
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
