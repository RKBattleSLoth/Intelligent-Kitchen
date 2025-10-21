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

      const mealPlanData = this.parseMealPlanResponse(response);
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

    let prompt = `Generate a ${dayCount}-day meal plan from ${startDate} to ${endDate} for ${peopleCount} people.

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

    prompt += `\n\nPlease generate a meal plan in the following JSON format:
{
  "name": "meal plan name",
  "description": "brief description",
  "meals": [
    {
      "date": "YYYY-MM-DD",
      "mealType": "breakfast|lunch|dinner|snack|dessert",
      "name": "meal name",
      "description": "brief description",
      "ingredients": ["ingredient1", "ingredient2"],
      "cookTime": 30,
      "difficulty": "easy|medium|hard",
      "isUserRecipe": false,
      "userRecipeId": null
    }
  ]
}`;

    return prompt;
  }

  parseMealPlanResponse(response) {
    try {
      // Extract content from the response
      const content = response.content || response;
      
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const mealPlan = JSON.parse(jsonMatch[0]);
      return mealPlan;
    } catch (error) {
      console.error('Error parsing meal plan response:', error);
      // Return a fallback structure
      return {
        name: 'AI Generated Meal Plan',
        description: 'AI-generated meal plan',
        meals: []
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
    if (!recipes || recipes.length === 0) {
      console.warn('SmartMealPlanner: No recipes available for fallback plan');
      return {
        name: `${preferences?.dietary || 'Balanced'} Meal Plan`,
        description: 'No recipes available to build a plan',
        meals: []
      };
    }
    const fallbackMeals = [];
    let recipeIndex = 0;

    for (const day of days) {
      const isoDate = day.toISOString().split('T')[0];
      for (const mealType of mealTypes) {
        const recipe = recipes.length ? recipes[recipeIndex % recipes.length] : null;
        recipeIndex++;

        if (!recipe) {
          continue;
        }

        const ingredientsList = Array.isArray(recipe.ingredients)
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

        fallbackMeals.push({
          date: isoDate,
          mealType,
          name: recipe.name,
          description: recipe.description || `${mealType} from saved recipes`,
          ingredients: ingredientsList,
          cookTime: recipe.cook_time || recipe.prep_time || 30,
          difficulty: recipe.difficulty || 'easy',
          isUserRecipe: Boolean(recipe.user_id),
          userRecipeId: recipe.id || null
        });
      }
    }

    return {
      name: `${preferences?.dietary || 'Balanced'} Meal Plan`,
      description: recipes.length
        ? 'Generated from your saved recipes due to AI unavailability'
        : 'Generated fallback meal suggestions',
      meals: fallbackMeals
    };
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
