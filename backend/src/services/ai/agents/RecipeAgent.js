/**
 * Recipe Agent
 * Specialist for recipe operations and cooking assistance
 */

const OpenRouterService = require('../OpenRouterService');

class RecipeAgent {
  constructor(tools) {
    this.openRouter = OpenRouterService;
    this.tools = tools;
  }

  async execute(action, params, context) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (action) {
        case 'find_recipes':
          result = await this.findRecipes(params, context);
          break;
        case 'get_recipe_details':
          result = await this.getRecipeDetails(params, context);
          break;
        case 'suggest_substitutions':
          result = await this.suggestSubstitutions(params, context);
          break;
        case 'scale_recipe':
          result = await this.scaleRecipe(params, context);
          break;
        case 'analyze_recipe':
          result = await this.analyzeRecipe(params, context);
          break;
        case 'cooking_help':
          result = await this.cookingHelp(params, context);
          break;
        case 'general_help':
          result = await this.generalHelp(params, context);
          break;
        default:
          throw new Error(`Unknown recipe action: ${action}`);
      }

      return {
        ...result,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`RecipeAgent error (${action}):`, error);
      return {
        success: false,
        message: `Error in recipe operation: ${error.message}`,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  async findRecipes(params, context) {
    const { ingredients, diet, maxTime, count = 10, query } = params;
    
    // Search recipes using tools
    const recipes = await this.tools.search_recipes({
      ingredients,
      diet,
      maxTime,
      limit: count,
    }, context);

    if (!recipes || recipes.length === 0) {
      return {
        success: true,
        message: "I couldn't find any recipes matching your criteria. Try adjusting your filters.",
        data: { recipes: [], count: 0 },
      };
    }

    const analysisPrompt = `
Found ${recipes.length} recipes. Help the user understand their options.

Search Criteria:
${ingredients ? `- Ingredients: ${ingredients.join(', ')}` : ''}
${diet ? `- Diet: ${diet}` : ''}
${maxTime ? `- Max time: ${maxTime} minutes` : ''}
${query ? `- Query: ${query}` : ''}

Recipes:
${JSON.stringify(recipes.slice(0, 5).map(r => ({
  name: r.name,
  prep_time: r.prep_time,
  cook_time: r.cook_time,
  servings: r.servings,
  description: r.description,
})), null, 2)}

Provide a helpful summary highlighting the best options and why they're good choices.
Be enthusiastic and helpful. Mention specific recipe names.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a knowledgeable recipe advisor.' },
      { role: 'user', content: analysisPrompt },
    ], { tier: 'small', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: {
        recipes: recipes.slice(0, count),
        count: recipes.length,
        criteria: { ingredients, diet, maxTime },
      },
    };
  }

  async getRecipeDetails(params, context) {
    const { recipeId, recipeName } = params;
    
    if (!recipeId && !recipeName) {
      return {
        success: false,
        message: "Please specify which recipe you'd like details for.",
      };
    }

    const recipe = await this.tools.get_recipe_details({ 
      recipeId: recipeId || recipeName 
    }, context);

    if (!recipe) {
      return {
        success: false,
        message: "Recipe not found.",
      };
    }

    const detailsPrompt = `
Present this recipe in a clear, user-friendly way.

Recipe: ${JSON.stringify(recipe, null, 2)}

Format the response with:
- Recipe name and brief description
- Prep & cook time, servings
- Key ingredients
- Brief overview of cooking method
- Nutritional highlights if available

Be enthusiastic and make it sound delicious!
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a recipe presentation specialist.' },
      { role: 'user', content: detailsPrompt },
    ], { tier: 'small', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: { recipe },
    };
  }

  async suggestSubstitutions(params, context) {
    const { ingredient, recipe, reason } = params;
    
    if (!ingredient) {
      return {
        success: false,
        message: "Please specify which ingredient you need to substitute.",
      };
    }

    const substitutionPrompt = `
Suggest substitutes for: "${ingredient}"

${recipe ? `Context: Recipe - ${recipe}` : ''}
${reason ? `Reason for substitution: ${reason}` : ''}

Provide 3-5 practical substitution options with:
- The substitute ingredient
- Conversion ratio (e.g., "1:1" or "use half the amount")
- How it affects the recipe
- Best use cases

Be practical and consider what people commonly have in their pantry.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a cooking substitution expert.' },
      { role: 'user', content: substitutionPrompt },
    ], { tier: 'small', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: { ingredient, reason },
    };
  }

  async scaleRecipe(params, context) {
    const { recipeId, newServings, scaleFactor } = params;
    
    if (!recipeId) {
      return {
        success: false,
        message: "Please specify which recipe to scale.",
      };
    }

    const scaled = await this.tools.scale_recipe({
      recipeId,
      newServings,
      scaleFactor,
    }, context);

    const message = `Recipe scaled successfully! ${
      newServings ? `Adjusted to ${newServings} servings.` : 
      `Scaled by ${scaleFactor}x.`
    }`;

    return {
      success: true,
      message,
      data: { scaledRecipe: scaled },
    };
  }

  async analyzeRecipe(params, context) {
    const { recipeId, focusAreas } = params;
    
    const recipe = await this.tools.get_recipe_details({ recipeId }, context);
    
    if (!recipe) {
      return {
        success: false,
        message: "Recipe not found.",
      };
    }

    const analysisPrompt = `
Analyze this recipe comprehensively.

Recipe: ${JSON.stringify(recipe, null, 2)}

${focusAreas ? `Focus on: ${focusAreas.join(', ')}` : 'Provide a general analysis'}

Include:
- Nutritional breakdown
- Difficulty level
- Time commitment
- Cost estimate
- Dietary considerations
- Tips for success
- Possible modifications

Be thorough but clear.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a recipe analysis expert.' },
      { role: 'user', content: analysisPrompt },
    ], { tier: 'medium', temperature: 0.6 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: { recipe, focusAreas },
    };
  }

  async cookingHelp(params, context) {
    const { question, topic, recipe } = params;
    
    const helpPrompt = `
User needs cooking help: "${question || topic}"

${recipe ? `Recipe context: ${JSON.stringify(recipe, null, 2)}` : ''}

Provide clear, practical cooking advice. Include:
- Direct answer to the question
- Step-by-step guidance if needed
- Common mistakes to avoid
- Pro tips if relevant

Be concise but thorough. Use a friendly, encouraging tone.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a helpful cooking instructor.' },
      { role: 'user', content: helpPrompt },
    ], { tier: 'small', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
    };
  }

  async generalHelp(params, context) {
    const query = params.query || "recipe help";
    
    const helpPrompt = `
User Question: "${query}"

Provide helpful assistance related to recipes and cooking. Consider:
- Recipe recommendations
- Cooking techniques
- Ingredient questions
- Meal planning
- Dietary considerations

Be conversational, helpful, and encouraging.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a helpful cooking assistant.' },
      { role: 'user', content: helpPrompt },
    ], { tier: 'small', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
    };
  }

  getCapabilities() {
    return {
      name: 'Recipe Agent',
      actions: [
        'find_recipes',
        'get_recipe_details',
        'suggest_substitutions',
        'scale_recipe',
        'analyze_recipe',
        'cooking_help',
        'general_help',
      ],
      description: 'Finds recipes, provides cooking help, and suggests substitutions',
    };
  }
}

module.exports = RecipeAgent;
