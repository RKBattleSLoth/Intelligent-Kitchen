/**
 * Recipe Agent
 * Specialized AI agent for recipe processing and ingredient extraction
 */

const IngredientExtractor = require('../IngredientExtractor');
const RequestRouter = require('../RequestRouter');
const CostMonitor = require('../CostMonitor');
const RecipeOrchestrator = require('./RecipeOrchestrator');
const OpenRouterClient = require('../OpenRouterClient');

class RecipeAgent {
  constructor() {
    this.extractor = new IngredientExtractor();
    this.router = new RequestRouter();
    this.costMonitor = new CostMonitor();
    this.openRouterClient = new OpenRouterClient();
    this.orchestrator = new RecipeOrchestrator(this.openRouterClient);
  }

  /**
   * Extract ingredients from a recipe using multi-agent system
   */
  async extractIngredients(recipeData, userId, options = {}) {
    const { 
      servings = 4, 
      targetServings = 4, 
      includePreparation = true,
      forceModel = null,
      useMultiAgent = true 
    } = options;

    try {
      // Prepare recipe text
      const recipeText = this.prepareRecipeText(recipeData);
      
      let extraction;
      
      if (useMultiAgent) {
        // Use new multi-agent system
        console.log('RecipeAgent: Using multi-agent extraction system');
        extraction = await this.orchestrator.extractIngredients(recipeText, {
          servings,
          targetServings,
          includePreparation,
          forceModel
        });
        
        // Track cost for multi-agent system
        const totalCost = this.estimateMultiAgentCost(extraction);
        const costTracking = await this.costMonitor.trackRequest(userId, {
          model: 'multi-agent-system',
          inputTokens: this.estimateTokens(recipeText),
          outputTokens: this.estimateTokens(JSON.stringify(extraction)),
          taskType: 'recipe_ingredient_extraction_multi_agent',
          routing: { modelName: 'multi-agent-system', method: 'orchestrated' }
        });
        
        if (!costTracking.allowed) {
          throw new Error(costTracking.message);
        }
        
        return {
          success: true,
          ingredients: extraction.ingredients,
          confidence: extraction.orchestrationMetadata?.confidence || 0.5,
          originalServings: servings,
          targetServings,
          cost: costTracking.cost,
          tokens: costTracking.tokens,
          routing: extraction.orchestrationMetadata,
          metadata: {
            recipeName: recipeData.name || 'Unknown Recipe',
            extractionMethod: 'multi-agent',
            timestamp: new Date().toISOString(),
            processingTime: extraction.orchestrationMetadata?.processingTime,
            agentsExecuted: extraction.orchestrationMetadata?.agentsExecuted,
            fallbacksUsed: extraction.orchestrationMetadata?.fallbacksUsed,
            recipeFormat: extraction.orchestrationMetadata?.recipeFormat
          },
          // Additional multi-agent specific data
          issues: extraction.issues,
          enhancements: extraction.enhancements,
          duplicatesResolved: extraction.duplicatesResolved,
          summary: extraction.summary,
          shoppingList: extraction.shoppingList,
          pantryCheck: extraction.pantryCheck
        };
        
      } else {
        // Use legacy extraction system
        console.log('RecipeAgent: Using legacy extraction system');
        extraction = await this.extractor.extractFromRecipe(recipeText, {
          servings,
          targetServings,
          includePreparation
        });

        // Track cost
        const costTracking = await this.costMonitor.trackRequest(userId, {
          model: extraction.routing?.modelName,
          inputTokens: this.estimateTokens(recipeText),
          outputTokens: this.estimateTokens(JSON.stringify(extraction)),
          taskType: 'recipe_ingredient_extraction',
          routing: extraction.routing
        });

        if (!costTracking.allowed) {
          throw new Error(costTracking.message);
        }

        return {
          success: true,
          ingredients: extraction.ingredients,
          confidence: extraction.confidence,
          originalServings: servings,
          targetServings,
          cost: costTracking.cost,
          tokens: costTracking.tokens,
          routing: extraction.routing,
          metadata: {
            recipeName: recipeData.name || 'Unknown Recipe',
            extractionMethod: 'legacy',
            timestamp: new Date().toISOString()
          }
        };
      }

    } catch (error) {
      console.error('Recipe ingredient extraction failed:', error);
      return {
        success: false,
        error: error.message,
        ingredients: []
      };
    }
  }

  /**
   * Analyze recipe for nutritional information
   */
  async analyzeNutrition(recipeData, userId, options = {}) {
    try {
      const recipeText = this.prepareRecipeText(recipeData);
      
      const prompt = `Analyze the nutritional information for this recipe. Provide estimates for:
- Calories per serving
- Protein (g)
- Carbohydrates (g) 
- Fat (g)
- Fiber (g)
- Sugar (g)
- Sodium (mg)

Return as JSON:
{
  "calories": number,
  "protein": number,
  "carbohydrates": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "confidence": number
}

Recipe:
${recipeText}`;

      const response = await this.router.route('recipe_analysis', recipeText, {
        prompt,
        maxTokens: 1000,
        temperature: 0.3,
        forceModel: options.forceModel
      });

      const nutrition = this.parseNutritionResponse(response.content);
      
      // Track cost
      const costTracking = await this.costMonitor.trackRequest(userId, {
        model: response.routing?.modelName,
        inputTokens: this.estimateTokens(recipeText),
        outputTokens: this.estimateTokens(response.content),
        taskType: 'recipe_nutrition_analysis',
        routing: response.routing
      });

      return {
        success: true,
        nutrition,
        cost: costTracking.cost,
        tokens: costTracking.tokens,
        routing: response.routing
      };

    } catch (error) {
      console.error('Recipe nutrition analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Suggest substitutions for ingredients
   */
  async suggestSubstitutions(ingredients, dietaryRestrictions = [], userId) {
    try {
      const ingredientList = ingredients.map(ing => ing.name).join(', ');
      const restrictionsText = dietaryRestrictions.length > 0 
        ? `Consider these dietary restrictions: ${dietaryRestrictions.join(', ')}`
        : '';

      const prompt = `Suggest substitutions for these ingredients: ${ingredientList}. ${restrictionsText}

Return as JSON array:
{
  "substitutions": [
    {
      "original": "ingredient name",
      "substitutes": [
        {
          "name": "substitute name",
          "ratio": "conversion ratio",
          "notes": "usage notes"
        }
      ]
    }
  ]
}

Focus on common, accessible substitutes.`;

      const response = await this.router.route('complex_reasoning', ingredientList, {
        prompt,
        maxTokens: 1500,
        temperature: 0.5
      });

      const substitutions = this.parseSubstitutionsResponse(response.content);
      
      // Track cost
      const costTracking = await this.costMonitor.trackRequest(userId, {
        model: response.routing?.modelName,
        inputTokens: this.estimateTokens(ingredientList),
        outputTokens: this.estimateTokens(response.content),
        taskType: 'ingredient_substitutions',
        routing: response.routing
      });

      return {
        success: true,
        substitutions,
        cost: costTracking.cost,
        tokens: costTracking.tokens,
        routing: response.routing
      };

    } catch (error) {
      console.error('Ingredient substitution failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prepare recipe text for AI processing
   */
  prepareRecipeText(recipeData) {
    let text = '';
    
    if (recipeData.name) {
      text += `Recipe: ${recipeData.name}\n\n`;
    }
    
    if (recipeData.description) {
      text += `Description: ${recipeData.description}\n\n`;
    }
    
    if (recipeData.ingredients) {
      if (Array.isArray(recipeData.ingredients)) {
        text += 'Ingredients:\n';
        recipeData.ingredients.forEach(ing => {
          if (typeof ing === 'string') {
            text += `- ${ing}\n`;
          } else if (ing.name) {
            text += `- ${ing.quantity || ''} ${ing.unit || ''} ${ing.name}\n`;
          }
        });
      } else {
        text += `Ingredients: ${recipeData.ingredients}\n`;
      }
      text += '\n';
    }
    
    if (recipeData.instructions) {
      text += 'Instructions:\n';
      text += recipeData.instructions;
      text += '\n\n';
    }
    
    if (recipeData.servings) {
      text += `Servings: ${recipeData.servings}\n`;
    }
    
    if (recipeData.prepTime) {
      text += `Prep time: ${recipeData.prepTime} minutes\n`;
    }
    
    if (recipeData.cookTime) {
      text += `Cook time: ${recipeData.cookTime} minutes\n`;
    }
    
    return text;
  }

  /**
   * Parse nutrition response
   */
  parseNutritionResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in nutrition response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse nutrition response:', error);
      return {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        confidence: 0
      };
    }
  }

  /**
   * Parse substitutions response
   */
  parseSubstitutionsResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in substitutions response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.substitutions || [];
    } catch (error) {
      console.error('Failed to parse substitutions response:', error);
      return [];
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text) {
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost for multi-agent system
   */
  estimateMultiAgentCost(extraction) {
    // Rough cost estimation for multi-agent processing
    const agents = extraction.orchestrationMetadata?.agentsExecuted || [];
    const baseCost = 0.001; // Base cost per agent
    return agents.length * baseCost;
  }

  /**
   * Get multi-agent system statistics
   */
  getMultiAgentStats() {
    return this.orchestrator.getExtractionStats();
  }

  /**
   * Batch process multiple recipes
   */
  async batchExtractIngredients(recipes, userId, options = {}) {
    const results = [];
    
    for (const recipe of recipes) {
      const result = await this.extractIngredients(recipe, userId, options);
      results.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        ...result
      });
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Get recipe processing statistics
   */
  getProcessingStats(userId) {
    return this.costMonitor.getUserStats(userId);
  }
}

module.exports = RecipeAgent;