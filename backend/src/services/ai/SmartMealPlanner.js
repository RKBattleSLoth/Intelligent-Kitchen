const OpenRouterClient = require('./OpenRouterClient');
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
      // Call OpenRouter to generate meal plan
      const response = await this.client.chat([
        {
          role: 'user',
          content: prompt
        }
      ], {
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.7,
        maxTokens: 4000
      });

      // Parse the response
      const mealPlanData = this.parseMealPlanResponse(response);
      
      return {
        success: true,
        mealPlan: mealPlanData,
        rawResponse: response
      };
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw new Error(`Failed to generate meal plan: ${error.message}`);
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
