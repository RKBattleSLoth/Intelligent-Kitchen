/**
 * Nutrition Agent
 * Specialist for nutritional analysis and dietary guidance
 */

const OpenRouterService = require('../OpenRouterService');

class NutritionAgent {
  constructor(tools) {
    this.openRouter = OpenRouterService;
    this.tools = tools;
  }

  async execute(action, params, context) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (action) {
        case 'analyze_nutrition':
          result = await this.analyzeNutrition(params, context);
          break;
        case 'check_dietary_compliance':
          result = await this.checkDietaryCompliance(params, context);
          break;
        case 'calculate_totals':
          result = await this.calculateTotals(params, context);
          break;
        case 'compare_options':
          result = await this.compareOptions(params, context);
          break;
        case 'suggest_improvements':
          result = await this.suggestImprovements(params, context);
          break;
        case 'general_help':
          result = await this.generalHelp(params, context);
          break;
        default:
          throw new Error(`Unknown nutrition action: ${action}`);
      }

      return {
        ...result,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`NutritionAgent error (${action}):`, error);
      return {
        success: false,
        message: `Error in nutrition operation: ${error.message}`,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  async analyzeNutrition(params, context) {
    const { recipeId, ingredients, mealPlanId } = params;
    
    let nutritionData;
    
    if (recipeId) {
      const recipe = await this.tools.get_recipe_details({ recipeId }, context);
      nutritionData = recipe.nutrition || await this.tools.calculate_nutrition({
        ingredients: recipe.ingredients,
      }, context);
    } else if (ingredients) {
      nutritionData = await this.tools.calculate_nutrition({ ingredients }, context);
    } else {
      return {
        success: false,
        message: "Please specify a recipe, ingredients, or meal plan to analyze.",
      };
    }

    const analysisPrompt = `
Analyze this nutritional information and provide insights.

Nutrition Data:
${JSON.stringify(nutritionData, null, 2)}

Provide:
1. Overview of nutritional profile
2. Highlights (what's particularly good)
3. Areas of concern (if any)
4. How this fits into daily needs
5. Suggestions for balance

Be informative but not preachy. Focus on practical guidance.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a nutrition analyst.' },
      { role: 'user', content: analysisPrompt },
    ], { tier: 'medium', temperature: 0.6 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: { nutrition: nutritionData },
    };
  }

  async checkDietaryCompliance(params, context) {
    const { recipeId, diet, restrictions = [] } = params;
    
    const recipe = await this.tools.get_recipe_details({ recipeId }, context);
    
    if (!recipe) {
      return {
        success: false,
        message: "Recipe not found.",
      };
    }

    const complianceCheck = await this.tools.check_dietary_compliance({
      recipeId,
      restrictions: restrictions.concat(diet ? [diet] : []),
    }, context);

    const message = complianceCheck.compliant
      ? `✓ This recipe is ${diet || restrictions.join(', ')} compliant!`
      : `✗ This recipe is NOT compliant. Issues: ${complianceCheck.issues.join(', ')}`;

    return {
      success: true,
      message,
      data: { 
        compliance: complianceCheck,
        recipe: recipe.name,
        diet,
        restrictions,
      },
    };
  }

  async calculateTotals(params, context) {
    const { ingredients, meals, mealPlanId } = params;
    
    let nutritionData;
    
    if (ingredients) {
      nutritionData = await this.tools.calculate_nutrition({ ingredients }, context);
    } else if (meals) {
      // Calculate totals across multiple meals
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      
      for (const meal of meals) {
        const mealNutrition = await this.tools.calculate_nutrition({
          ingredients: meal.ingredients,
        }, context);
        
        totals.calories += mealNutrition.calories || 0;
        totals.protein += mealNutrition.protein || 0;
        totals.carbs += mealNutrition.carbs || 0;
        totals.fat += mealNutrition.fat || 0;
        totals.fiber += mealNutrition.fiber || 0;
      }
      
      nutritionData = totals;
    }

    const message = `Nutritional Totals:\n` +
      `• Calories: ${nutritionData.calories} kcal\n` +
      `• Protein: ${nutritionData.protein}g\n` +
      `• Carbs: ${nutritionData.carbs}g\n` +
      `• Fat: ${nutritionData.fat}g\n` +
      `• Fiber: ${nutritionData.fiber}g`;

    return {
      success: true,
      message,
      data: { nutrition: nutritionData },
    };
  }

  async compareOptions(params, context) {
    const { option1, option2, compareBy = 'overall' } = params;
    
    // Get nutrition data for both options
    const nutrition1 = await this.tools.calculate_nutrition({
      ingredients: option1.ingredients,
    }, context);
    
    const nutrition2 = await this.tools.calculate_nutrition({
      ingredients: option2.ingredients,
    }, context);

    const comparisonPrompt = `
Compare these two options nutritionally:

Option 1 - ${option1.name}:
${JSON.stringify(nutrition1, null, 2)}

Option 2 - ${option2.name}:
${JSON.stringify(nutrition2, null, 2)}

Focus on: ${compareBy}

Provide:
1. Which option is better and why
2. Key differences
3. Trade-offs to consider
4. Recommendations based on goals

Be balanced and practical in your assessment.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a nutrition comparison specialist.' },
      { role: 'user', content: comparisonPrompt },
    ], { tier: 'small', temperature: 0.6 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: {
        option1: { name: option1.name, nutrition: nutrition1 },
        option2: { name: option2.name, nutrition: nutrition2 },
      },
    };
  }

  async suggestImprovements(params, context) {
    const { recipeId, currentNutrition, goals = {} } = params;
    
    let recipe;
    let nutrition;
    
    if (recipeId) {
      recipe = await this.tools.get_recipe_details({ recipeId }, context);
      nutrition = recipe.nutrition;
    } else if (currentNutrition) {
      nutrition = currentNutrition;
    }

    const improvementPrompt = `
Suggest nutritional improvements.

Current Nutrition:
${JSON.stringify(nutrition, null, 2)}

Goals:
${JSON.stringify(goals, null, 2)}

Provide specific, actionable suggestions to:
1. Meet nutritional goals
2. Improve overall balance
3. Add beneficial nutrients
4. Reduce less healthy components

Give 3-5 practical suggestions with specific ingredient swaps or additions.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a nutrition improvement advisor.' },
      { role: 'user', content: improvementPrompt },
    ], { tier: 'medium', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: { currentNutrition: nutrition, goals },
    };
  }

  async generalHelp(params, context) {
    const query = params.query || "nutrition help";
    
    const helpPrompt = `
User Question: "${query}"

Provide helpful nutritional guidance. Topics might include:
- Understanding nutrition labels
- Daily nutritional needs
- Balanced diet principles
- Specific nutrient information
- Dietary restrictions
- Meal nutrition optimization

Be informative, accurate, and practical. Avoid medical advice.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a knowledgeable nutrition educator.' },
      { role: 'user', content: helpPrompt },
    ], { tier: 'small', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
    };
  }

  getCapabilities() {
    return {
      name: 'Nutrition Agent',
      actions: [
        'analyze_nutrition',
        'check_dietary_compliance',
        'calculate_totals',
        'compare_options',
        'suggest_improvements',
        'general_help',
      ],
      description: 'Analyzes nutrition, checks dietary compliance, and provides nutritional guidance',
    };
  }
}

module.exports = NutritionAgent;
