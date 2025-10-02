/**
 * Collaborative Inference Service
 * Implements the full collaborative AI pipeline with tool usage
 * Manages data flow between Small, Medium, and Large models
 */

const openRouterService = require('./OpenRouterService');
const InterModelBus = require('./InterModelBus');
const ToolRegistry = require('./tools/ToolRegistry');

class CollaborativeInference {
  constructor() {
    this.openRouter = openRouterService;
    this.bus = new InterModelBus();
    this.tools = new ToolRegistry();
  }

  /**
   * Process user request through collaborative AI pipeline
   * @param {String} userMessage
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async process(userMessage, context = {}) {
    const startTime = Date.now();
    const conversationId = context.conversationId || this.bus.createConversation(context.userId);
    
    try {
      // STEP 1: Small model analyzes intent
      console.log('🤖 [Small Model] Analyzing user intent...');
      const analysis = await this.analyzeIntent(userMessage, context);
      
      console.log('📊 Intent Analysis:', {
        intent: analysis.intent,
        needsLogic: analysis.needsLogic,
        needsData: analysis.needsData,
        needsVision: analysis.needsVision,
        canHandleDirectly: analysis.canHandleDirectly
      });

      let result;

      // STEP 2: Route based on analysis
      if (analysis.canHandleDirectly) {
        // Simple - Small model responds directly
        result = await this.handleSimple(userMessage, context);
      } else if (analysis.needsVision && context.imageUrl) {
        // Vision + logic pipeline
        result = await this.handleVision(userMessage, context, analysis);
      } else if (analysis.needsLogic) {
        // Complex logic with tools (Medium model)
        result = await this.handleWithTools(userMessage, context, analysis);
      } else {
        // Fallback
        result = await this.handleSimple(userMessage, context);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        message: result.message,
        conversationId,
        modelsUsed: this.bus.getModelsUsed(conversationId),
        metadata: {
          processingTime,
          intent: analysis.intent,
          toolsUsed: result.toolsUsed || [],
          tokensUsed: result.tokensUsed || 0,
          ...result.metadata
        }
      };

    } catch (error) {
      console.error('❌ Collaborative Inference Error:', error);
      return {
        success: false,
        message: "I apologize, but I encountered an error. Please try rephrasing your request.",
        conversationId,
        error: error.message
      };
    }
  }

  /**
   * STEP 1: Small model analyzes user intent
   */
  async analyzeIntent(userMessage, context) {
    const systemPrompt = `You are the conversational interface for Intelligent Kitchen AI.
Analyze the user's request and determine how to handle it.

Response format (JSON only):
{
  "canHandleDirectly": boolean,  // Simple fact, greeting, or clarification?
  "needsLogic": boolean,          // Needs planning, reasoning, or database operations?
  "needsData": boolean,           // Needs to process large amounts of data?
  "needsVision": boolean,         // Image analysis required?
  "intent": "string",             // Primary intent
  "parameters": {}                // Extracted parameters
}

Common intents:
- "greeting" - Hello, hi, how are you
- "add_pantry_item" - Add ingredients to pantry
- "search_recipes" - Find recipes
- "check_pantry" - What do I have in pantry
- "meal_planning" - Create meal plan
- "recipe_suggestion" - Suggest what to cook
- "nutrition_info" - Nutritional questions
- "grocery_list" - Create or manage grocery list
- "cooking_help" - How to cook something`;

    try {
      const response = await this.openRouter.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ], { 
        tier: 'small', 
        temperature: 0.2,
        maxTokens: 500
      });

      const content = response.choices[0].message.content;
      
      // Try to parse JSON
      let analysis;
      try {
        analysis = JSON.parse(content);
      } catch {
        // If not JSON, extract with regex or use fallback
        analysis = {
          canHandleDirectly: /greeting|hello|hi|thank/i.test(userMessage),
          needsLogic: /add|create|find|search|suggest|plan/i.test(userMessage),
          needsData: false,
          needsVision: false,
          intent: 'general_query',
          parameters: {}
        };
      }

      // Override if image is present
      if (context.imageUrl) {
        analysis.needsVision = true;
        analysis.canHandleDirectly = false;
      }

      return analysis;
    } catch (error) {
      console.error('Intent analysis error:', error);
      return {
        canHandleDirectly: true,
        needsLogic: false,
        needsData: false,
        needsVision: false,
        intent: 'unknown',
        parameters: {}
      };
    }
  }

  /**
   * Handle simple queries (Small model only)
   */
  async handleSimple(userMessage, context) {
    console.log('🤖 [Small Model] Handling directly...');
    
    const systemPrompt = `You are a friendly kitchen assistant. 
Provide helpful, concise responses.
Be conversational and warm.`;

    const response = await this.openRouter.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], { tier: 'small', temperature: 0.7, maxTokens: 500 });

    return {
      message: response.choices[0].message.content,
      tokensUsed: response.usage?.total_tokens || 0,
      metadata: { tier: 'small' }
    };
  }

  /**
   * Handle requests with tools (Medium model)
   */
  async handleWithTools(userMessage, context, analysis) {
    console.log('🧠 [Medium Model] Processing with tools...');

    // Build context with available data
    const enrichedContext = await this.enrichContext(context, analysis);

    const systemPrompt = `You are a planning and reasoning specialist for Intelligent Kitchen AI.
You have access to tools to interact with the user's pantry, recipes, meal plans, and grocery lists.

User's request: ${userMessage}
Intent: ${analysis.intent}
Parameters: ${JSON.stringify(analysis.parameters)}

Use the available tools to help the user. Think through what tools you need to call.
After using tools, provide a clear response to the user.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    // First call - Medium model decides which tools to use
    const response = await this.openRouter.chat(messages, {
      tier: 'medium',
      temperature: 0.7,
      maxTokens: 2000,
      tools: this.tools.getToolDefinitions()
    });

    const assistantMessage = response.choices[0].message;
    let toolsUsed = [];
    let totalTokens = response.usage?.total_tokens || 0;

    // Handle tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`🔧 Executing ${assistantMessage.tool_calls.length} tool(s)...`);
      
      messages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolParams = JSON.parse(toolCall.function.arguments);
        
        console.log(`  └─ ${toolName}:`, toolParams);
        
        const toolResult = await this.tools.execute(toolName, toolParams, context);
        toolsUsed.push({ name: toolName, params: toolParams, success: toolResult.success });

        // Add tool result to conversation
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Second call - Medium model processes tool results
      const finalResponse = await this.openRouter.chat(messages, {
        tier: 'medium',
        temperature: 0.7,
        maxTokens: 2000
      });

      totalTokens += finalResponse.usage?.total_tokens || 0;

      // Small model formats final response for user
      const userResponse = await this.formatResponse(
        userMessage,
        finalResponse.choices[0].message.content,
        context
      );

      return {
        message: userResponse.message,
        toolsUsed,
        tokensUsed: totalTokens + userResponse.tokensUsed,
        metadata: {
          tier: 'small+medium',
          toolCount: toolsUsed.length
        }
      };
    }

    // No tools needed - format response
    const userResponse = await this.formatResponse(
      userMessage,
      assistantMessage.content,
      context
    );

    return {
      message: userResponse.message,
      toolsUsed,
      tokensUsed: totalTokens + userResponse.tokensUsed,
      metadata: { tier: 'small+medium' }
    };
  }

  /**
   * Handle vision requests
   */
  async handleVision(userMessage, context, analysis) {
    console.log('👁️ [Large Model] Processing image...');

    const visionPrompt = `Analyze this image and identify food items.
For each item provide:
- Name
- Estimated quantity
- Category (produce, dairy, meat, etc.)

Return as JSON array.`;

    const visionResponse = await this.openRouter.chatWithImage([
      { role: 'user', content: visionPrompt }
    ], context.imageUrl, { tier: 'large', maxTokens: 2000 });

    let identifiedItems = [];
    try {
      const content = visionResponse.choices[0].message.content;
      identifiedItems = JSON.parse(content);
    } catch {
      identifiedItems = [{
        name: 'Items detected',
        quantity: 'See description',
        category: 'various'
      }];
    }

    // Small model formats response
    const formatPrompt = `User sent an image and asked: "${userMessage}"

Identified items: ${JSON.stringify(identifiedItems)}

Provide a friendly response about what you see and offer to help.`;

    const finalResponse = await this.openRouter.chat([
      { role: 'system', content: 'You are a helpful kitchen assistant.' },
      { role: 'user', content: formatPrompt }
    ], { tier: 'small', maxTokens: 500 });

    return {
      message: finalResponse.choices[0].message.content,
      tokensUsed: (visionResponse.usage?.total_tokens || 0) + (finalResponse.usage?.total_tokens || 0),
      metadata: {
        tier: 'small+large',
        identifiedItems
      }
    };
  }

  /**
   * Format Medium model output for user (Small model)
   */
  async formatResponse(originalRequest, mediumModelResponse, context) {
    const formatPrompt = `The user asked: "${originalRequest}"

Here's the analysis and results: ${mediumModelResponse}

Format this into a friendly, conversational response for the user.
Be helpful and clear.`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a friendly kitchen assistant. Present information clearly.' },
      { role: 'user', content: formatPrompt }
    ], { tier: 'small', temperature: 0.7, maxTokens: 1000 });

    return {
      message: response.choices[0].message.content,
      tokensUsed: response.usage?.total_tokens || 0
    };
  }

  /**
   * Enrich context with user data
   */
  async enrichContext(context, analysis) {
    const enriched = { ...context };

    // Add pantry summary if relevant
    if (analysis.intent && /pantry|ingredient|recipe|cook/.test(analysis.intent)) {
      try {
        const pantryResult = await this.tools.execute('get_pantry_items', {}, context);
        if (pantryResult.success) {
          enriched.pantryItemCount = pantryResult.data.length;
          enriched.hasPantryData = true;
        }
      } catch (error) {
        console.warn('Could not load pantry data:', error.message);
      }
    }

    return enriched;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      openRouterConfigured: this.openRouter.isConfigured(),
      toolsAvailable: Object.keys(this.tools.tools).length,
      busStats: this.bus.getStats ? this.bus.getStats() : { conversations: 0, messages: 0 }
    };
  }
}

module.exports = CollaborativeInference;
