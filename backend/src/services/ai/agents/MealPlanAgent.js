/**
 * Meal Plan Agent
 * Specialist for meal planning and scheduling
 */

const OpenRouterService = require('../OpenRouterService');

class MealPlanAgent {
  constructor(tools) {
    this.openRouter = OpenRouterService;
    this.tools = tools;
  }

  async execute(action, params, context) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (action) {
        case 'create_plan':
          result = await this.createPlan(params, context);
          break;
        case 'get_plan':
          result = await this.getPlan(params, context);
          break;
        case 'optimize_plan':
          result = await this.optimizePlan(params, context);
          break;
        case 'add_meal':
          result = await this.addMeal(params, context);
          break;
        case 'remove_meal':
          result = await this.removeMeal(params, context);
          break;
        case 'generate_grocery_list':
          result = await this.generateGroceryList(params, context);
          break;
        case 'general_help':
          result = await this.generalHelp(params, context);
          break;
        default:
          throw new Error(`Unknown meal plan action: ${action}`);
      }

      return {
        ...result,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`MealPlanAgent error (${action}):`, error);
      return {
        success: false,
        message: `Error in meal plan operation: ${error.message}`,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  async createPlan(params, context) {
    const { 
      duration = 7, 
      mealsPerDay = ['breakfast', 'lunch', 'dinner'],
      preferences = {},
      constraints = {}
    } = params;

    // Get user's pantry for context
    const pantryItems = await this.tools.get_pantry_items({}, context);
    
    // Calculate total meals needed
    const totalMeals = duration * mealsPerDay.length;

    // Use Large model for complex meal planning
    const planningPrompt = `
Create a ${duration}-day meal plan with ${mealsPerDay.join(', ')}.

Available Pantry Items (${pantryItems.length}):
${JSON.stringify(pantryItems.slice(0, 20), null, 2)}
${pantryItems.length > 20 ? `\n(showing first 20 of ${pantryItems.length})` : ''}

Preferences: ${JSON.stringify(preferences)}
Constraints: ${JSON.stringify(constraints)}

Create a balanced meal plan that:
1. Maximizes use of pantry items
2. Ensures variety (no repeated meals)
3. Balances nutrition across the week
4. Considers dietary restrictions: ${constraints.dietaryRestrictions || 'none'}
5. Stays within budget: ${constraints.budget ? `$${constraints.budget}` : 'flexible'}
6. Respects time constraints: ${constraints.maxCookTime ? `${constraints.maxCookTime} min max` : 'flexible'}

Return a JSON structure:
{
  "plan": {
    "day1": {
      "breakfast": { "name": "...", "ingredients": [...], "prepTime": 0, "cookTime": 0 },
      "lunch": { ... },
      "dinner": { ... }
    },
    ... for each day
  },
  "summary": {
    "totalCost": 0,
    "avgCaloriesPerDay": 0,
    "pantryUsagePercent": 0,
    "newIngredientsNeeded": []
  }
}
`;

    try {
      const response = await this.openRouter.chat([
        { role: 'system', content: 'You are a meal planning specialist. Always return valid JSON.' },
        { role: 'user', content: planningPrompt },
      ], { tier: 'large', temperature: 0.7, maxTokens: 3000 });

      const content = response.choices[0].message.content.trim();
      
      // Extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in response');
      }

      const mealPlanData = JSON.parse(jsonMatch[0]);

      // Create meal plan in database
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      const mealPlan = await this.tools.create_meal_plan({
        name: `${duration}-Day Meal Plan`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }, context);

      const message = `Created a ${duration}-day meal plan with ${totalMeals} meals! The plan uses ${mealPlanData.summary.pantryUsagePercent || 'many'} of your pantry items and includes a variety of nutritious meals.`;

      return {
        success: true,
        message,
        data: {
          mealPlan,
          plan: mealPlanData.plan,
          summary: mealPlanData.summary,
          duration,
          mealsPerDay,
        },
      };
    } catch (error) {
      console.error('Error creating meal plan:', error);
      
      // Fallback: Create a simple plan
      const simplePlan = await this.createSimplePlan(duration, mealsPerDay, context);
      return {
        success: true,
        message: `Created a basic ${duration}-day meal plan. Use the chat to customize it further!`,
        data: simplePlan,
      };
    }
  }

  async createSimplePlan(duration, mealsPerDay, context) {
    // Simple fallback plan
    const plan = {};
    
    for (let day = 1; day <= duration; day++) {
      plan[`day${day}`] = {};
      for (const mealType of mealsPerDay) {
        plan[`day${day}`][mealType] = {
          name: `${mealType} option`,
          note: 'To be customized',
        };
      }
    }

    return {
      plan,
      summary: { note: 'Basic plan created - customize via chat' },
    };
  }

  async getPlan(params, context) {
    const { planId } = params;
    
    const mealPlan = await this.tools.get_meal_plan({ id: planId }, context);
    
    if (!mealPlan) {
      return {
        success: false,
        message: "Meal plan not found.",
      };
    }

    return {
      success: true,
      message: `Here's your meal plan: ${mealPlan.name}`,
      data: { mealPlan },
    };
  }

  async optimizePlan(params, context) {
    const { planId, optimizeFor = 'cost' } = params;
    
    const mealPlan = await this.tools.get_meal_plan({ id: planId }, context);
    
    if (!mealPlan) {
      return {
        success: false,
        message: "Meal plan not found.",
      };
    }

    const optimizationPrompt = `
Optimize this meal plan for: ${optimizeFor}

Current Plan: ${JSON.stringify(mealPlan, null, 2)}

Optimization goals:
- ${optimizeFor === 'cost' ? 'Minimize cost while maintaining nutrition' : ''}
- ${optimizeFor === 'time' ? 'Minimize prep/cook time' : ''}
- ${optimizeFor === 'health' ? 'Maximize nutritional value' : ''}
- ${optimizeFor === 'pantry' ? 'Maximize use of pantry items' : ''}

Suggest specific changes to improve the plan.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a meal plan optimization expert.' },
      { role: 'user', content: optimizationPrompt },
    ], { tier: 'medium', temperature: 0.6 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: { originalPlan: mealPlan, optimizeFor },
    };
  }

  async addMeal(params, context) {
    const { planId, recipeId, mealDate, mealType } = params;
    
    const result = await this.tools.add_meal_to_plan({
      mealPlanId: planId,
      recipeId,
      mealDate,
      mealType,
    }, context);

    return {
      success: true,
      message: `Added meal to your plan for ${mealDate} (${mealType}).`,
      data: { meal: result },
    };
  }

  async removeMeal(params, context) {
    const { mealId } = params;
    
    await this.tools.remove_meal_from_plan({ id: mealId }, context);

    return {
      success: true,
      message: "Meal removed from plan.",
    };
  }

  async generateGroceryList(params, context) {
    const { planId } = params;
    
    const groceryList = await this.tools.generate_grocery_list_from_meal_plan({
      mealPlanId: planId,
    }, context);

    return {
      success: true,
      message: `Generated grocery list with ${groceryList.items.length} items.`,
      data: { groceryList },
    };
  }

  async generalHelp(params, context) {
    const query = params.query || "meal planning help";
    
    const helpPrompt = `
User Question: "${query}"

Provide helpful assistance related to meal planning. Topics might include:
- Creating meal plans
- Balancing nutrition
- Meal prep strategies
- Budget-friendly planning
- Time-saving tips

Be practical, encouraging, and specific.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a meal planning expert.' },
      { role: 'user', content: helpPrompt },
    ], { tier: 'small', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
    };
  }

  getCapabilities() {
    return {
      name: 'Meal Plan Agent',
      actions: [
        'create_plan',
        'get_plan',
        'optimize_plan',
        'add_meal',
        'remove_meal',
        'generate_grocery_list',
        'general_help',
      ],
      description: 'Creates and manages meal plans, generates grocery lists',
    };
  }
}

module.exports = MealPlanAgent;
