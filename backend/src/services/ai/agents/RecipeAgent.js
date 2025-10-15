/**
 * Recipe Agent - Simplified for Ingredient Extraction Only
 * Specialized AI agent for recipe processing and ingredient extraction
 */

const RequestRouter = require('../RequestRouter');
const RecipeOrchestrator = require('./RecipeOrchestrator');
const OpenRouterClient = require('../OpenRouterClient');

class RecipeAgent {
  constructor() {
    this.router = new RequestRouter();
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

    const startTime = Date.now();
    console.log(`RecipeAgent: Starting ingredient extraction for "${recipeData.name || 'Unknown Recipe'}"`);

    try {
      // Prepare recipe text
      const recipeText = this.prepareRecipeText(recipeData);
      console.log(`RecipeAgent: Prepared recipe text (${recipeText.length} chars)`);
      
      // Use multi-agent system with performance tracking
      const extraction = await this.orchestrator.extractIngredients(recipeData, recipeText, {
        servings,
        targetServings,
        includePreparation,
        forceModel,
        priority: 'speed'  // Prioritize speed over quality for ingredient extraction
      });
      
      const totalTime = Date.now() - startTime;
      console.log(`RecipeAgent: Extraction completed in ${totalTime}ms with ${extraction.ingredients?.length || 0} ingredients`);
      
      // Format ingredients with proper field mapping for UI compatibility
      const formattedIngredients = extraction.ingredients.map(ingredient => {
        // Filter out descriptor words that shouldn't be units
        const descriptorUnits = ['large', 'medium', 'small', 'extra', 'jumbo', 'mini'];
        let unit = ingredient.unit || '';
        let name = ingredient.name || '';
        
        // If unit is a descriptor, move it to the name
        if (descriptorUnits.includes(unit.toLowerCase())) {
          name = `${unit} ${name}`.trim();
          unit = '';
        }
        
        return {
          ...ingredient,
          name: name,
          unit: unit,
          amount: ingredient.quantity !== null && ingredient.quantity !== undefined 
            ? String(ingredient.quantity) 
            : null  // UI expects 'amount' as string
        };
      });
      
      return {
        success: true,
        ingredients: formattedIngredients,
        confidence: extraction.orchestrationMetadata?.confidence || 0.5,
        originalServings: servings,
        targetServings,
        routing: extraction.orchestrationMetadata,
        metadata: {
          recipeName: recipeData.name || 'Unknown Recipe',
          extractionMethod: 'multi-agent',
          timestamp: new Date().toISOString(),
          processingTime: totalTime,
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

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`Recipe ingredient extraction failed after ${totalTime}ms:`, error);
      return {
        success: false,
        error: error.message,
        ingredients: [],
        metadata: {
          processingTime: totalTime,
          extractionMethod: 'failed'
        }
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
}

module.exports = RecipeAgent;