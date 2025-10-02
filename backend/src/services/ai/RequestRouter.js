/**
 * Request Router
 * Analyzes requests and routes to appropriate model tier
 */

const OpenRouterService = require('./OpenRouterService');

class RequestRouter {
  constructor() {
    this.openRouter = OpenRouterService;
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  async route(userInput, context = {}) {
    const requestAnalysis = this.analyzeRequest(userInput, context);
    const tier = this.selectTier(requestAnalysis);
    
    // Check cache for similar requests
    const cacheKey = this.generateCacheKey(userInput, tier);
    if (this.cache.has(cacheKey)) {
      return { ...this.cache.get(cacheKey), cached: true };
    }

    // Build context-aware prompt
    const messages = this.buildMessages(userInput, context, tier);

    // Execute inference
    const response = await this.openRouter.chat(messages, {
      tier,
      temperature: requestAnalysis.temperature,
      maxTokens: requestAnalysis.maxTokens,
    });

    // Process and cache response
    const processed = this.processResponse(response, requestAnalysis, tier);
    this.cacheResponse(cacheKey, processed);

    return processed;
  }

  analyzeRequest(userInput, context) {
    return {
      hasImage: !!context.imageUrl,
      complexity: this.calculateComplexity(userInput, context),
      intents: this.extractIntents(userInput),
      requiresData: this.needsContextData(userInput),
      temperature: this.determineTemperature(userInput),
      maxTokens: this.estimateTokens(userInput, context),
      needsTools: this.requiresTools(userInput),
    };
  }

  selectTier(analysis) {
    // Force large model for images
    if (analysis.hasImage) return 'large';
    
    // High complexity needs large model
    if (analysis.complexity > 0.7) return 'large';
    
    // Simple queries use small model
    if (analysis.complexity < 0.3 && !analysis.needsTools) return 'small';
    
    // Default to medium for most operations
    return 'medium';
  }

  calculateComplexity(input, context) {
    let score = 0;
    
    // Multi-step reasoning indicators
    if (/plan|schedule|generate|create|design|organize/i.test(input)) {
      score += 0.3;
    }
    
    // Large data processing
    if (context.pantryItems?.length > 20) score += 0.2;
    if (context.recipes?.length > 10) score += 0.2;
    
    // Multiple constraints
    const constraints = input.match(/and|but|with|without|except/gi);
    score += Math.min((constraints?.length || 0) * 0.1, 0.3);
    
    // Temporal reasoning
    if (/week|month|tomorrow|next|schedule|calendar/i.test(input)) {
      score += 0.2;
    }
    
    // Optimization requests
    if (/optimize|best|most|least|minimize|maximize/i.test(input)) {
      score += 0.25;
    }
    
    // Multiple entities
    const entities = input.match(/\d+\s+(recipe|meal|day|week|item)/gi);
    if (entities && entities.length > 3) score += 0.2;
    
    return Math.min(score, 1);
  }

  extractIntents(input) {
    const intentPatterns = {
      meal_plan: /meal plan|weekly menu|plan.*week|plan.*meals/i,
      recipe_search: /recipe|how to cook|how to make|find.*recipe/i,
      pantry_add: /add to pantry|bought|purchased|got|have|stock/i,
      pantry_check: /what.*in.*pantry|check pantry|pantry inventory/i,
      grocery_list: /grocery list|shopping list|need to buy/i,
      nutrition: /nutrition|calories|protein|healthy|diet|macros/i,
      substitution: /substitute|replace|instead of|alternative/i,
      cooking_help: /how to|what temperature|how long|when to/i,
      expiring_soon: /expiring|expire|going bad|use.*soon/i,
      suggestions: /suggest|recommend|what can|what should/i,
    };

    return Object.entries(intentPatterns)
      .filter(([_, pattern]) => pattern.test(input))
      .map(([intent]) => intent);
  }

  needsContextData(input) {
    // Check if request needs pantry/recipe/preference data
    return /pantry|inventory|have|own|my recipes|my meals|my preferences/i.test(input);
  }

  determineTemperature(input) {
    // Lower temperature for factual/calculation tasks
    if (/calculate|convert|how many|what is|temperature|time/i.test(input)) {
      return 0.3;
    }
    
    // Higher temperature for creative tasks
    if (/creative|unique|different|unusual|fun|interesting/i.test(input)) {
      return 0.9;
    }
    
    // Medium temperature for most tasks
    return 0.7;
  }

  estimateTokens(input, context) {
    let baseTokens = Math.ceil(input.length / 4); // Rough estimate
    
    // Add tokens for context
    if (context.pantryItems) baseTokens += context.pantryItems.length * 20;
    if (context.recipes) baseTokens += context.recipes.length * 50;
    if (context.preferences) baseTokens += 100;
    
    // Set max tokens for response (input + response)
    const responseTokens = Math.min(baseTokens * 3, 2000);
    
    return responseTokens;
  }

  requiresTools(input) {
    const toolIndicators = [
      /add|create|update|delete|remove/i,
      /search|find|look for|get/i,
      /calculate|convert|compute/i,
      /generate|plan|schedule/i,
    ];
    
    return toolIndicators.some(pattern => pattern.test(input));
  }

  buildMessages(userInput, context, tier) {
    const systemPrompt = this.buildSystemPrompt(context, tier);
    const enrichedInput = this.enrichWithContext(userInput, context);

    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if available
    if (context.conversationHistory) {
      messages.push(...context.conversationHistory);
    }

    messages.push({ role: 'user', content: enrichedInput });

    return messages;
  }

  buildSystemPrompt(context, tier) {
    const basePrompt = `You are an intelligent kitchen assistant helping users with meal planning, recipes, pantry management, and grocery shopping.`;

    const tierPrompts = {
      small: `Provide concise, factual responses. Focus on speed and accuracy. Keep responses brief and to the point.`,
      medium: `Provide helpful, conversational responses. You can suggest recipes, analyze pantry items, and offer cooking advice. Be thorough but concise.`,
      large: `You can perform complex meal planning, analyze large amounts of data, and provide comprehensive dietary guidance. Think through multi-step problems carefully and provide detailed analysis.`,
    };

    let contextInfo = '';
    
    if (context.pantryItems && context.pantryItems.length > 0) {
      contextInfo += `\n\nUser's Pantry (${context.pantryItems.length} items): ${JSON.stringify(context.pantryItems.slice(0, 50))}`;
      if (context.pantryItems.length > 50) {
        contextInfo += ` (showing first 50)`;
      }
    }
    
    if (context.preferences) {
      contextInfo += `\n\nUser Preferences: ${JSON.stringify(context.preferences)}`;
    }
    
    if (context.dietaryRestrictions && context.dietaryRestrictions.length > 0) {
      contextInfo += `\n\nDietary Restrictions: ${context.dietaryRestrictions.join(', ')}`;
    }
    
    if (context.userProfile) {
      contextInfo += `\n\nUser Profile: ${JSON.stringify(context.userProfile)}`;
    }

    return `${basePrompt}\n\n${tierPrompts[tier]}${contextInfo}`;
  }

  enrichWithContext(input, context) {
    // For now, return input as-is
    // Context is already in system prompt
    // Could add inline context markers if needed
    return input;
  }

  processResponse(response, analysis, tier) {
    const content = response.choices[0].message.content;
    
    return {
      content,
      tier,
      usage: response.usage,
      model: response.model,
      analysis: {
        complexity: analysis.complexity,
        intents: analysis.intents,
        needsTools: analysis.needsTools,
      },
      timestamp: new Date().toISOString(),
    };
  }

  generateCacheKey(input, tier) {
    // Create a simple cache key (first 100 chars + tier)
    const normalized = input.toLowerCase().trim().slice(0, 100);
    return `${tier}:${normalized}`;
  }

  cacheResponse(key, response) {
    // Implement simple LRU cache
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      ...response,
      cachedAt: new Date().toISOString(),
    });
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

module.exports = new RequestRouter();
