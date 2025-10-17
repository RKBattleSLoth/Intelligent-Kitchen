/**
 * AI Routes - Simplified for Ingredient Extraction Only
 * API endpoints for AI-powered ingredient extraction from recipes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const RecipeAgent = require('../services/ai/agents/RecipeAgent');
const RecipeUrlExtractor = require('../services/ai/RecipeUrlExtractor');
const RequestRouter = require('../services/ai/RequestRouter');
const { parseIngredientsFromInstructions } = require('../utils/ingredientParser');

const router = express.Router();

// Initialize only essential services
const recipeAgent = new RecipeAgent();
const recipeUrlExtractor = new RecipeUrlExtractor();
const requestRouter = new RequestRouter();

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
    
    res.json({
      status: 'healthy',
      services: {
        models: modelInfo
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

router.post('/extract-recipe-from-url', [
  body('url').isURL({ require_protocol: true }).withMessage('Valid recipe URL is required')
], async (req, res) => {
  const startedAt = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { url } = req.body;
    const userId = req.user.id;

    console.log(`API: Importing recipe from URL ${url}`);

    const result = await recipeUrlExtractor.extract(url, { userId });

    res.json({
      success: true,
      recipe: {
        title: result.title,
        description: result.description,
        ingredients: result.ingredients,
        directions: result.directions,
        instructionsText: result.instructionsText,
        servings: result.servings,
        prepTimeMinutes: result.prepTimeMinutes,
        cookTimeMinutes: result.cookTimeMinutes,
        totalTimeMinutes: result.totalTimeMinutes,
        sourceUrl: result.sourceUrl
      },
      ingredientExtraction: result.ingredientExtraction,
      aiMetadata: result.aiMetadata,
      structuredData: result.structuredData,
      processingTimeMs: Date.now() - startedAt
    });
  } catch (error) {
    console.error('Recipe URL extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract recipe from URL'
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

    const parseConfidence = options.parseConfidence || 0;
    const parsedIngredients = Array.isArray(recipeData.ingredients)
      ? recipeData.ingredients.filter(item => item && item.name)
      : [];
    
    console.log(`API: Parsed ingredient payload contains ${parsedIngredients.length} entries`);

    // If client provided confident structured data, bypass AI entirely
    if (parsedIngredients.length > 0 && parseConfidence >= 0.5) {
      const formatted = parsedIngredients.map(item => ({
        name: item.name,
        unit: item.unit || null,
        quantity: item.quantity ?? item.quantityValue ?? null,
        amount: typeof item.quantity === 'string' ? item.quantity : (item.quantity ?? item.quantityValue ?? null),
        category: item.category || 'other',
        preparation: item.preparation || null,
        notes: item.notes || null,
        confidence: parseConfidence
      }));

      const requestTime = Date.now() - requestStart;
      console.log(`API: Served ${formatted.length} ingredients directly from client payload in ${requestTime}ms`);
      return res.json({
        success: true,
        ingredients: formatted,
        confidence: parseConfidence,
        metadata: {
          extractionMethod: 'client-parser',
          processingTime: requestTime,
          recipeName: recipeData.name || 'Unknown Recipe',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await recipeAgent.extractIngredients(recipeData, userId, {
      ...options,
      priority: parseConfidence >= 0.25 ? 'fresh' : 'speed',
      useMultiAgent: parseConfidence < 0.5
    });

    if (result.success && result.ingredients?.length) {
      const requestTime = Date.now() - requestStart;
      console.log(`API: Request completed in ${requestTime}ms via backend extraction`);
      return res.json(result);
    }

    // Fallback to server-side parsing when AI fails or returns empty
    console.warn('API: Falling back to server-side parser due to empty extraction result');
    const fallback = parseIngredientsFromInstructions(recipeData.instructions || '');
    const fallbackFormatted = fallback.items.map(item => ({
      name: item.name,
      unit: item.unit || null,
      quantity: item.quantityValue ?? item.quantity ?? null,
      amount: item.quantity || null,
      category: 'other',
      preparation: null,
      notes: null,
      confidence: fallback.confidence
    }));

    const requestTime = Date.now() - requestStart;
    console.log(`API: Fallback parser produced ${fallbackFormatted.length} ingredients in ${requestTime}ms`);
    
    res.json({
      success: fallbackFormatted.length > 0,
      ingredients: fallbackFormatted,
      confidence: fallback.confidence,
      error: result.error,
      metadata: {
        extractionMethod: 'server-parser',
        processingTime: requestTime,
        recipeName: recipeData.name || 'Unknown Recipe',
        timestamp: new Date().toISOString()
      }
    });
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