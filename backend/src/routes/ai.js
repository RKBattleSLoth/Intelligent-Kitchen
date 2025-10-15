/**
 * AI Routes - Simplified for Ingredient Extraction Only
 * API endpoints for AI-powered ingredient extraction from recipes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const RecipeAgent = require('../services/ai/agents/RecipeAgent');
const RequestRouter = require('../services/ai/RequestRouter');
const ResponseCache = require('../services/ai/ResponseCache');

const router = express.Router();

// Initialize only essential services
const recipeAgent = new RecipeAgent();
const requestRouter = new RequestRouter();
const responseCache = new ResponseCache();

// Mock authentication for now (replace with real auth later)
const mockAuth = (req, res, next) => {
  req.user = { id: 'demo-user' }; // Demo user ID
  next();
};

// Apply mock authentication to all routes
router.use(mockAuth);

/**
 * Health check for AI services
 */
router.get('/health', async (req, res) => {
  try {
    const modelInfo = requestRouter.getModelInfo();
    const cacheHealth = await responseCache.healthCheck();
    
    res.json({
      status: 'healthy',
      services: {
        models: modelInfo,
        cache: cacheHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * Extract ingredients from recipe
 */
router.post('/extract-ingredients', [
  body('recipeData').notEmpty().withMessage('Recipe data is required'),
  body('options.targetServings').optional().isInt({ min: 1, max: 20 }),
  body('options.includePreparation').optional().isBoolean()
], async (req, res) => {
  const requestStart = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { recipeData, options = {} } = req.body;
    const userId = req.user.id;

    console.log(`API: Starting ingredient extraction for recipe: ${recipeData.name || 'Unknown'}`);
    console.log(`API: Recipe has ${recipeData.ingredients?.length || 0} input ingredients`);

    const result = await recipeAgent.extractIngredients(recipeData, userId, options);
    
    // Ensure ingredients are properly formatted with quantity and unit
    if (result.success && result.ingredients) {
      console.log(`API: Extraction successful, formatting ${result.ingredients.length} ingredients`);
      
      result.ingredients = result.ingredients.map((ingredient, index) => {
        // Filter out descriptor words that shouldn't be units
        const descriptorUnits = ['large', 'medium', 'small', 'extra', 'jumbo', 'mini'];
        let unit = ingredient.unit || '';
        let name = ingredient.name || '';
        
        // If unit is a descriptor, move it to the name
        if (descriptorUnits.includes(unit.toLowerCase())) {
          name = `${unit} ${name}`.trim();
          unit = '';
        }
        
        const formatted = {
          name: name,
          quantity: ingredient.quantity !== null && ingredient.quantity !== undefined ? ingredient.quantity : null,
          amount: ingredient.quantity !== null && ingredient.quantity !== undefined ? String(ingredient.quantity) : null,  // UI expects 'amount' as string
          unit: unit,
          category: ingredient.category || 'other',
          preparation: ingredient.preparation || null,
          notes: ingredient.notes || '',
          confidence: ingredient.confidence || 0.5
        };
        
        // Log any ingredients with missing quantity/unit for debugging
        if (formatted.quantity === null || !formatted.unit) {
          console.log(`API: Ingredient ${index + 1} "${formatted.name}" has missing data: quantity=${formatted.quantity}, unit=${formatted.unit}`);
        }
        
        return formatted;
      });
      
      const requestTime = Date.now() - requestStart;
      console.log(`API: Request completed in ${requestTime}ms with ${result.ingredients.length} ingredients`);
    } else {
      console.error(`API: Extraction failed: ${result.error || 'Unknown error'}`);
    }
    
    res.json(result);
  } catch (error) {
    const requestTime = Date.now() - requestStart;
    console.error(`Ingredient extraction error after ${requestTime}ms:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;