/**
 * AI Routes
 * Endpoints for LLM-powered features
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const CollaborativeInference = require('../services/ai/CollaborativeInference');
const CostMonitor = require('../services/ai/CostMonitor');
const ResponseCache = require('../services/ai/ResponseCache');
const RequestRouter = require('../services/ai/RequestRouter');
const CoordinatorAgent = require('../services/ai/agents/CoordinatorAgent');
const ToolRegistry = require('../services/ai/tools/ToolRegistry');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const aiService = new CollaborativeInference();
const coordinator = new CoordinatorAgent(new ToolRegistry());

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    cb(null, 'ai-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

/**
 * POST /api/ai/chat
 * General conversational endpoint - handles all user interactions
 */
router.post('/chat', authenticateToken, [
  body('message').notEmpty().trim().isLength({ max: 10000 }),
  body('conversationId').optional().isString(),
  handleValidationErrors
], async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, conversationId } = req.body;

    const context = {
      userId: req.user.id,
      conversationId,
    };

    // Check cache first (for common queries)
    const cached = await ResponseCache.get(message, context);
    if (cached) {
      return res.json({
        success: true,
        ...cached,
        cached: true,
        processingTime: Date.now() - startTime
      });
    }

    // Process with AI
    const response = await aiService.process(message, context);

    // Log usage for cost tracking
    if (response.success && response.metadata) {
      await CostMonitor.logUsage({
        userId: req.user.id,
        endpoint: '/api/ai/chat',
        modelTier: response.modelsUsed?.join('+') || 'unknown',
        modelName: 'collaborative',
        promptTokens: Math.round(response.metadata.tokensUsed * 0.4),
        completionTokens: Math.round(response.metadata.tokensUsed * 0.6),
        latencyMs: response.metadata.processingTime,
        success: true
      });
    }

    // Cache if applicable
    if (response.success && response.metadata?.intent) {
      const analysis = { intent: response.metadata.intent };
      if (ResponseCache.shouldCache(analysis)) {
        await ResponseCache.set(message, response, context);
      }
    }

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    
    // Log failed request
    await CostMonitor.logUsage({
      userId: req.user.id,
      endpoint: '/api/ai/chat',
      modelTier: 'small',
      modelName: 'error',
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      errorMessage: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process your message',
      message: "I apologize, but I'm having trouble processing your request right now."
    });
  }
});

/**
 * POST /api/ai/chat/image
 * Chat with image analysis (vision)
 */
router.post('/chat/image', authenticateToken, upload.single('image'), [
  body('message').notEmpty().trim(),
  body('conversationId').optional().isString(),
  handleValidationErrors
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const { message, conversationId } = req.body;

    // Construct image URL (will need proper URL based on your setup)
    const imageUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;

    const context = {
      userId: req.user.id,
      conversationId,
      imageUrl,
    };

    const response = await orchestrator.processRequest(message, context);

    res.json({
      success: true,
      ...response,
      imageUrl
    });

  } catch (error) {
    console.error('AI Vision Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process image',
      message: "I apologize, but I couldn't analyze the image."
    });
  }
});

/**
 * GET /api/ai/status
 * Check AI service status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = aiService.getStatus();
    const cacheStats = await ResponseCache.getStats();
    
    res.json({
      success: true,
      ...status,
      ready: status.openRouterConfigured,
      cache: cacheStats
    });

  } catch (error) {
    console.error('AI Status Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI status'
    });
  }
});

/**
 * GET /api/ai/usage
 * Get user's AI usage statistics
 */
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const stats = await CostMonitor.getUserStats(req.user.id, period);
    const summary = await CostMonitor.getCostSummary(req.user.id);
    
    res.json({
      success: true,
      stats,
      summary
    });

  } catch (error) {
    console.error('AI Usage Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
});

/**
 * GET /api/ai/usage/trend
 * Get cost trend over time
 */
router.get('/usage/trend', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const trend = await CostMonitor.getCostTrend(req.user.id, parseInt(days));
    
    res.json({
      success: true,
      trend
    });

  } catch (error) {
    console.error('AI Trend Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cost trend'
    });
  }
});

/**
 * POST /api/ai/cache/clear
 * Clear user's cache (or all cache for admin)
 */
router.post('/cache/clear', authenticateToken, async (req, res) => {
  try {
    const cleared = await ResponseCache.clearAll();
    
    res.json({
      success: true,
      cleared
    });

  } catch (error) {
    console.error('Cache Clear Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

/**
 * POST /api/ai/analyze-pantry
 * Analyze pantry and suggest recipes
 */
router.post('/analyze-pantry', authenticateToken, async (req, res) => {
  try {
    const { preferences, constraints } = req.body;

    const message = `Analyze my pantry and suggest recipes I can make. ${preferences ? `Preferences: ${preferences}` : ''} ${constraints ? `Constraints: ${constraints}` : ''}`;

    const context = {
      userId: req.user.id,
      intent: 'pantry_analysis',
    };

    const response = await aiService.process(message, context);

    // Log usage
    if (response.success) {
      await CostMonitor.logUsage({
        userId: req.user.id,
        endpoint: '/api/ai/analyze-pantry',
        modelTier: response.modelsUsed?.join('+') || 'medium',
        modelName: 'collaborative',
        promptTokens: Math.round((response.metadata?.tokensUsed || 0) * 0.4),
        completionTokens: Math.round((response.metadata?.tokensUsed || 0) * 0.6),
        latencyMs: response.metadata?.processingTime || 0,
        success: true
      });
    }

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Pantry Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze pantry'
    });
  }
});

/**
 * POST /api/ai/generate-meal-plan
 * Generate meal plan
 */
router.post('/generate-meal-plan', authenticateToken, [
  body('duration').optional().isInt({ min: 1, max: 30 }),
  body('mealsPerDay').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { duration = 7, mealsPerDay = ['breakfast', 'lunch', 'dinner'], constraints } = req.body;

    const message = `Create a ${duration}-day meal plan with ${mealsPerDay.join(', ')}. ${constraints ? `Constraints: ${JSON.stringify(constraints)}` : ''}`;

    const context = {
      userId: req.user.id,
      intent: 'meal_planning',
      duration,
      mealsPerDay,
      constraints,
    };

    const response = await aiService.process(message, context);

    // Log usage
    if (response.success) {
      await CostMonitor.logUsage({
        userId: req.user.id,
        endpoint: '/api/ai/generate-meal-plan',
        modelTier: response.modelsUsed?.join('+') || 'medium+large',
        modelName: 'collaborative',
        promptTokens: Math.round((response.metadata?.tokensUsed || 0) * 0.4),
        completionTokens: Math.round((response.metadata?.tokensUsed || 0) * 0.6),
        latencyMs: response.metadata?.processingTime || 0,
        success: true
      });
    }

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Meal Plan Generation Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate meal plan'
    });
  }
});

/**
 * POST /api/ai/suggest-recipes
 * Get recipe suggestions
 */
router.post('/suggest-recipes', authenticateToken, [
  body('query').optional().isString(),
  body('ingredients').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { query, ingredients, diet, maxTime } = req.body;

    let message = 'Suggest recipes ';
    if (query) message += `for: ${query}`;
    if (ingredients) message += `using ingredients: ${ingredients.join(', ')}`;
    if (diet) message += ` (${diet} diet)`;
    if (maxTime) message += ` (max ${maxTime} minutes)`;

    const context = {
      userId: req.user.id,
      intent: 'recipe_suggestion',
      ingredients,
      diet,
      maxTime,
    };

    const response = await aiService.process(message, context);

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Recipe Suggestion Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suggest recipes'
    });
  }
});

/**
 * POST /api/ai/agent
 * Use specialized agent architecture for complex tasks
 */
router.post('/agent', authenticateToken, [
  body('request').notEmpty().isString(),
  handleValidationErrors
], async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { request } = req.body;

    const context = {
      userId: req.user.id,
    };

    const response = await coordinator.execute(request, context);

    // Log usage
    if (response.success) {
      await CostMonitor.logUsage({
        userId: req.user.id,
        endpoint: '/api/ai/agent',
        modelTier: 'agent-coordinator',
        modelName: 'multi-agent',
        promptTokens: 0, // Will be calculated in coordinator
        completionTokens: 0,
        latencyMs: response.processingTime || (Date.now() - startTime),
        success: true
      });
    }

    res.json(response);

  } catch (error) {
    console.error('Agent Execution Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute agent request',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/suggestions
 * Get proactive suggestions based on user's current state
 */
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const context = {
      userId: req.user.id,
    };

    // Use coordinator to get suggestions
    const response = await coordinator.execute(
      'Based on my pantry, recipes, and meal plans, provide 3-5 helpful proactive suggestions.',
      context
    );

    res.json({
      success: true,
      suggestions: response.message,
      data: response.data,
    });

  } catch (error) {
    console.error('Suggestions Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions'
    });
  }
});

/**
 * POST /api/ai/optimize-grocery-list
 * Optimize grocery list by store layout or other criteria
 */
router.post('/optimize-grocery-list', authenticateToken, [
  body('listId').notEmpty().isString(),
  body('optimizeBy').optional().isIn(['store-layout', 'price', 'category']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { listId, optimizeBy = 'store-layout', storeName } = req.body;

    const message = `Optimize grocery list ${listId} by ${optimizeBy}. ${storeName ? `Store: ${storeName}` : ''}`;

    const context = {
      userId: req.user.id,
      listId,
      optimizeBy,
      storeName,
    };

    const response = await coordinator.execute(message, context);

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Grocery List Optimization Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize grocery list'
    });
  }
});

/**
 * GET /api/ai/agents
 * Get list of available agents and their capabilities
 */
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const agents = coordinator.getAvailableAgents();
    const capabilities = {};

    for (const agentName of agents) {
      capabilities[agentName] = coordinator.getAgentCapabilities(agentName);
    }

    res.json({
      success: true,
      agents,
      capabilities
    });

  } catch (error) {
    console.error('Agent List Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent list'
    });
  }
});

module.exports = router;
