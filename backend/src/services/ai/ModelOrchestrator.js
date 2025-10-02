/**
 * Model Orchestrator
 * Coordinates collaborative inference between Small, Medium, and Large models
 * Routes requests to appropriate models and manages data flow
 */

const openRouterService = require('./OpenRouterService');
const InterModelBus = require('./InterModelBus');

class ModelOrchestrator {
  constructor() {
    this.openRouter = openRouterService;
    this.bus = new InterModelBus();
  }

  /**
   * Main entry point for processing user requests
   * @param {String} userMessage - User's input message
   * @param {Object} context - Conversation and user context
   * @returns {Promise<Object>} - Response object
   */
  async processRequest(userMessage, context = {}) {
    const startTime = Date.now();
    
    // Create or get conversation ID
    const conversationId = context.conversationId || this.bus.createConversation(context.userId);
    
    try {
      // PHASE 1: Small model analyzes user input (ALWAYS FIRST)
      const analysis = await this.analyzeUserIntent(userMessage, context);
      
      // PHASE 2: Route based on analysis
      let result;
      
      if (analysis.canHandleDirectly) {
        // Simple query - Small model handles it
        result = await this.handleDirectResponse(userMessage, context);
      } else if (analysis.needsVision) {
        // Vision processing required
        result = await this.handleVisionRequest(userMessage, analysis, context);
      } else if (analysis.needsData && analysis.needsLogic) {
        // Complex request - needs Large for data, Medium for logic
        result = await this.handleDataAndLogic(userMessage, analysis, context);
      } else if (analysis.needsLogic) {
        // Logic only - Medium model
        result = await this.handleLogicRequest(userMessage, analysis, context);
      } else {
        // Fallback to direct response
        result = await this.handleDirectResponse(userMessage, context);
      }

      const processingTime = Date.now() - startTime;

      return {
        message: result.message,
        conversationId,
        models: this.bus.getModelsUsed(conversationId),
        metadata: {
          processingTime,
          intent: analysis.intent,
          complexity: this.calculateComplexity(analysis),
          ...result.metadata,
        },
      };

    } catch (error) {
      console.error('ModelOrchestrator Error:', error);
      return {
        message: "I apologize, but I encountered an error processing your request. Please try again.",
        conversationId,
        error: error.message,
        models: [],
      };
    }
  }

  /**
   * PHASE 1: Small model analyzes user intent
   * @param {String} userMessage
   * @param {Object} context
   * @returns {Promise<Object>} - Analysis object
   */
  async analyzeUserIntent(userMessage, context) {
    const systemPrompt = `You are the conversational interface for a kitchen AI assistant. 
Analyze the user's message and determine the best way to handle it.

Respond with JSON only:
{
  "canHandleDirectly": boolean,  // Can you answer this directly? (greetings, simple facts, clarifications)
  "needsLogic": boolean,          // Needs planning/reasoning? (recipe selection, meal planning, decisions)
  "needsData": boolean,           // Needs large data processing? (search many recipes, analyze full pantry)
  "needsVision": boolean,         // Has image input?
  "intent": "string",             // Primary intent (e.g., "meal_planning", "recipe_search", "pantry_add")
  "parameters": {}                // Extracted parameters
}`;

    try {
      const response = await this.openRouter.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ], { 
        tier: 'small', 
        temperature: 0.3,
        maxTokens: 500,
        responseFormat: { type: 'json_object' }
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      // Add context flags
      analysis.hasImage = !!(context.imageUrl || context.imageUrls);
      if (analysis.hasImage) {
        analysis.needsVision = true;
      }

      return analysis;
    } catch (error) {
      console.error('Intent analysis error:', error);
      // Fallback to direct response on error
      return {
        canHandleDirectly: true,
        needsLogic: false,
        needsData: false,
        needsVision: false,
        intent: 'unknown',
        parameters: {},
      };
    }
  }

  /**
   * Handle direct response (Small model only)
   * @param {String} userMessage
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async handleDirectResponse(userMessage, context) {
    const systemPrompt = `You are a friendly, helpful kitchen assistant. 
Provide clear, concise responses. Be conversational and warm.
If you don't know something specific, acknowledge it and offer to help in another way.`;

    const response = await this.openRouter.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], { tier: 'small', temperature: 0.7 });

    return {
      message: response.choices[0].message.content,
      metadata: {
        tier: 'small',
        tokensUsed: response.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Handle vision request (Small -> Large -> Small)
   * @param {String} userMessage
   * @param {Object} analysis
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async handleVisionRequest(userMessage, analysis, context) {
    // Large model processes image
    const imageUrls = Array.isArray(context.imageUrls) 
      ? context.imageUrls 
      : [context.imageUrl];

    const visionPrompt = `Identify all food items in this image. 
For each item, provide:
- Name
- Estimated quantity
- Confidence level
Return as JSON array.`;

    const visionResponse = await this.openRouter.chatWithImage([
      { role: 'user', content: visionPrompt }
    ], imageUrls);

    let identifiedItems = [];
    try {
      identifiedItems = JSON.parse(visionResponse.choices[0].message.content);
    } catch {
      identifiedItems = [{ name: 'Items detected', quantity: 'See description', confidence: 0.8 }];
    }

    // Small model formats response
    const formatPrompt = `The user sent an image and asked: "${userMessage}"

Identified items from image: ${JSON.stringify(identifiedItems)}

Provide a friendly, helpful response about what you see and how you can help.`;

    const finalResponse = await this.openRouter.chat([
      { role: 'system', content: 'You are a helpful kitchen assistant analyzing food images.' },
      { role: 'user', content: formatPrompt }
    ], { tier: 'small' });

    return {
      message: finalResponse.choices[0].message.content,
      metadata: {
        tier: 'small+large',
        identifiedItems,
        tokensUsed: (visionResponse.usage?.total_tokens || 0) + (finalResponse.usage?.total_tokens || 0),
      },
    };
  }

  /**
   * Handle logic request (Small -> Medium -> Small)
   * @param {String} userMessage
   * @param {Object} analysis
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async handleLogicRequest(userMessage, analysis, context) {
    // Medium model handles reasoning
    const logicPrompt = `User request: ${userMessage}

Intent: ${analysis.intent}
Parameters: ${JSON.stringify(analysis.parameters)}
User context: ${JSON.stringify(context)}

Analyze this request and provide a reasoned response or action plan.
If you need to search recipes, analyze pantry, or make decisions, explain your reasoning.`;

    const logicResponse = await this.openRouter.chat([
      { role: 'system', content: 'You are a planning and reasoning specialist for a kitchen AI.' },
      { role: 'user', content: logicPrompt }
    ], { tier: 'medium', temperature: 0.7 });

    const logicResult = logicResponse.choices[0].message.content;

    // Small model formats for user
    const formatPrompt = `User asked: "${userMessage}"

Analysis and reasoning: ${logicResult}

Present this to the user in a friendly, conversational way.`;

    const finalResponse = await this.openRouter.chat([
      { role: 'system', content: 'You are a friendly kitchen assistant.' },
      { role: 'user', content: formatPrompt }
    ], { tier: 'small' });

    return {
      message: finalResponse.choices[0].message.content,
      metadata: {
        tier: 'small+medium',
        reasoning: logicResult,
        tokensUsed: (logicResponse.usage?.total_tokens || 0) + (finalResponse.usage?.total_tokens || 0),
      },
    };
  }

  /**
   * Handle data-heavy request (Small -> Medium -> Large -> Medium -> Small)
   * @param {String} userMessage
   * @param {Object} analysis
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async handleDataAndLogic(userMessage, analysis, context) {
    // For now, delegate to logic request
    // Full implementation will include Large model data processing
    // TODO: Implement full data pipeline in Phase 2
    return this.handleLogicRequest(userMessage, analysis, context);
  }

  /**
   * Calculate complexity score
   * @param {Object} analysis
   * @returns {String}
   */
  calculateComplexity(analysis) {
    if (analysis.needsData && analysis.needsLogic) return 'high';
    if (analysis.needsLogic || analysis.needsVision) return 'medium';
    return 'low';
  }

  /**
   * Get orchestrator status
   * @returns {Object}
   */
  getStatus() {
    return {
      openRouterConfigured: this.openRouter.isConfigured(),
      busStats: this.bus.getStats(),
      modelsAvailable: this.openRouter.getStatus(),
    };
  }
}

module.exports = ModelOrchestrator;
