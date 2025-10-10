/**
 * AI Routes
 * API endpoints for AI-powered features
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const RecipeAgent = require('../services/ai/agents/RecipeAgent');
const ShoppingListAgent = require('../services/ai/agents/ShoppingListAgent');
const RequestRouter = require('../services/ai/RequestRouter');
const CostMonitor = require('../services/ai/CostMonitor');
const ResponseCache = require('../services/ai/ResponseCache');

const router = express.Router();

// Initialize services
const recipeAgent = new RecipeAgent();
const shoppingListAgent = new ShoppingListAgent();
const requestRouter = new RequestRouter();
const costMonitor = new CostMonitor();
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
    const globalStats = costMonitor.getGlobalStats();
    
    res.json({
      status: 'healthy',
      services: {
        models: modelInfo,
        cache: cacheHealth,
        costMonitor: {
          enabled: globalStats.enabled,
          dailyUsage: globalStats.daily
        }
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
 * Test AI connection and models
 */
router.get('/test', async (req, res) => {
  try {
    const testResults = await requestRouter.testModels();
    
    res.json({
      success: true,
      results: testResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
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

    const result = await recipeAgent.extractIngredients(recipeData, userId, options);
    
    res.json(result);
  } catch (error) {
    console.error('Ingredient extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate shopping list from recipe
 */
router.post('/generate-shopping-list/recipe', [
  body('recipeData').notEmpty().withMessage('Recipe data is required'),
  body('options.targetServings').optional().isInt({ min: 1, max: 20 }),
  body('options.includePantryStaples').optional().isBoolean(),
  body('options.categorize').optional().isBoolean()
], async (req, res) => {
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

    const result = await shoppingListAgent.generateFromRecipe(recipeData, userId, options);
    
    res.json(result);
  } catch (error) {
    console.error('Shopping list generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate shopping list from meal plan (multiple recipes)
 */
router.post('/generate-shopping-list/meal-plan', [
  body('recipes').isArray({ min: 1 }).withMessage('Recipes array is required'),
  body('recipes.*.name').notEmpty().withMessage('Recipe name is required'),
  body('options.targetServings').optional().isInt({ min: 1, max: 20 }),
  body('options.includePantryStaples').optional().isBoolean(),
  body('options.mergeDuplicates').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { recipes, options = {} } = req.body;
    const userId = req.user.id;

    const result = await shoppingListAgent.generateFromMealPlan(recipes, userId, options);
    
    res.json(result);
  } catch (error) {
    console.error('Meal plan shopping list generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Optimize shopping list for store layout
 */
router.post('/optimize-shopping-list', [
  body('shoppingList').notEmpty().withMessage('Shopping list is required'),
  body('shoppingList.items').isArray().withMessage('Shopping list items are required'),
  body('storeLayout').optional().isIn(['grocery', 'supermarket', 'warehouse'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { shoppingList, storeLayout = 'grocery' } = req.body;
    const userId = req.user.id;

    const result = await shoppingListAgent.optimizeForStore(shoppingList, storeLayout, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Shopping list optimization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Analyze recipe nutrition
 */
router.post('/analyze-nutrition', [
  body('recipeData').notEmpty().withMessage('Recipe data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { recipeData } = req.body;
    const userId = req.user.id;

    const result = await recipeAgent.analyzeNutrition(recipeData, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Nutrition analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get ingredient substitutions
 */
router.post('/suggest-substitutions', [
  body('ingredients').isArray().withMessage('Ingredients array is required'),
  body('dietaryRestrictions').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { ingredients, dietaryRestrictions = [] } = req.body;
    const userId = req.user.id;

    const result = await recipeAgent.suggestSubstitutions(ingredients, dietaryRestrictions, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Substitution suggestion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's AI usage statistics
 */
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = costMonitor.getUserStats(userId);
    const costBreakdown = costMonitor.getCostBreakdown(userId);
    
    res.json({
      success: true,
      stats,
      costBreakdown,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get global AI usage statistics (admin)
 */
router.get('/admin/global-usage', async (req, res) => {
  try {
    const globalStats = costMonitor.getGlobalStats();
    const cacheStats = await responseCache.getStats();
    
    res.json({
      success: true,
      globalStats,
      cacheStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Global usage stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Clear AI cache (admin)
 */
router.post('/admin/clear-cache', async (req, res) => {
  try {
    const { taskType } = req.body;
    
    if (taskType) {
      await responseCache.invalidate(taskType);
    } else {
      await responseCache.clear();
    }
    
    res.json({
      success: true,
      message: taskType ? `Cache cleared for ${taskType}` : 'All AI cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Reset user usage (admin/testing)
 */
router.post('/admin/reset-usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    costMonitor.resetUserUsage(userId);
    
    res.json({
      success: true,
      message: `Usage reset for user ${userId}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Usage reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * General AI chat endpoint
 */
router.post('/chat', [
  body('message').notEmpty().withMessage('Message is required'),
  body('options.model').optional().isIn(['small', 'medium', 'large']),
  body('options.temperature').optional().isFloat({ min: 0, max: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { message, options = {} } = req.body;
    const userId = req.user.id;

    const response = await requestRouter.route('simple_text', message, options);
    
    // Track cost
    const costTracking = await costMonitor.trackRequest(userId, {
      model: response.routing?.modelName,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      taskType: 'chat',
      routing: response.routing
    });

    res.json({
      success: true,
      response: response.content,
      usage: response.usage,
      cost: costTracking.cost,
      tokens: costTracking.tokens,
      routing: response.routing
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;