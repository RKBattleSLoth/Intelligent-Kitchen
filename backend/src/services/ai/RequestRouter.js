/**
 * Request Router
 * Routes AI requests to appropriate models based on complexity and cost
 */

const OpenRouterClient = require('./OpenRouterClient');

class RequestRouter {
  constructor() {
    this.client = new OpenRouterClient();
    
    // Model tiers with their capabilities
    this.model = {
      name: process.env.OPENROUTER_MODEL,
      maxTokens: 16000,
      capabilities: ['recipe_analysis', 'ingredient_extraction', 'validation', 'meal_plan_generation'],
      costMultiplier: 1.0
    };
  }

  /**
   * Route request to appropriate model based on task type and complexity
   */
  async route(taskType, input, options = {}) {
    const { forceModelName } = options;

    if (forceModelName) {
      return this.executeRequestByName(forceModelName, taskType, input, options);
    }

    console.log(`🎯 Routing ${taskType} to primary model`);
    return this.executeRequest(taskType, input, options);
  }

  async executeRequestByName(modelName, taskType, input, options = {}) {
    if (!modelName) {
      throw new Error('Model name is required for executeRequestByName');
    }

    const messages = this.prepareMessages(taskType, input, options);

    const result = await this.client.chat(messages, {
      model: modelName,
      maxTokens: options.maxTokens || 4000,
      temperature: options.temperature || this.getTemperatureForTask(taskType),
      stream: options.stream || false
    });

    return {
      ...result,
      routing: {
        modelTier: 'custom',
        modelName,
        taskType,
        complexity: this.assessComplexity(taskType, input),
        costMultiplier: null
      }
    };
  }

  /**
   * Select the best model for the given task
   */
  selectModel() {
    return this.model;
  }

  /**
   * Assess the complexity of the input
   */
  assessComplexity(taskType, input) {
    const textLength = typeof input === 'string' ? input.length : JSON.stringify(input).length;
    const hasComplexStructure = typeof input === 'object' && Object.keys(input).length > 5;
    
    if (textLength > 10000 || hasComplexStructure) {
      return 'very_high';
    } else if (textLength > 2000 || taskType.includes('complex')) {
      return 'high';
    } else if (textLength > 500) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Execute the request on the specified model
   */
  async executeRequest(taskType, input, options = {}) {
    const model = this.selectModel();

    // Prepare messages based on task type
    const messages = this.prepareMessages(taskType, input, options);
    
    // Execute with retry logic
    try {
      const result = await this.client.chat(messages, {
        model: model.name,
        maxTokens: Math.min(options.maxTokens || model.maxTokens, model.maxTokens),
        temperature: options.temperature || this.getTemperatureForTask(taskType),
        stream: options.stream || false
      });

      // Add routing metadata
      return {
        ...result,
        routing: {
          modelName: model.name,
          taskType,
          complexity: this.assessComplexity(taskType, input),
          costMultiplier: model.costMultiplier
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Prepare messages for the specific task type
   */
  prepareMessages(taskType, input, options = {}) {
    const systemPrompts = {
      'simple_text': 'You are a helpful assistant. Provide clear and concise responses.',
      'basic_parsing': 'You are a text parsing specialist. Extract and organize information accurately.',
      'ingredient_extraction': 'You are a culinary expert specializing in ingredient analysis. Extract ingredients with precise quantities and units.',
      'recipe_analysis': 'You are a professional chef. Analyze recipes and provide detailed insights.',
      'meal_plan_generation': 'You are a nutritionist and meal planning expert. Create balanced meal plans.',
      'vision_analysis': 'You are a visual analysis expert. Describe images in detail.',
      'complex_reasoning': 'You are an analytical expert. Provide thorough, well-reasoned responses.'
    };

    const systemPrompt = systemPrompts[taskType] || systemPrompts['simple_text'];
    
    let userContent;
    if (options.prompt) {
      userContent = options.prompt;
    } else if (typeof input === 'string') {
      userContent = input;
    } else {
      userContent = JSON.stringify(input, null, 2);
    }

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];
  }

  /**
   * Get appropriate temperature for task type
   */
  getTemperatureForTask(taskType) {
    const temperatures = {
      'simple_text': 0.7,
      'basic_parsing': 0.1,  // Low temperature for consistent parsing
      'ingredient_extraction': 0.2,  // Low temperature for accuracy
      'recipe_analysis': 0.5,
      'meal_plan_generation': 0.6,
      'vision_analysis': 0.3,
      'complex_reasoning': 0.8
    };

    return temperatures[taskType] || 0.7;
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      model: this.model.name
    };
  }

  /**
   * Test all models
   */
  async testModels() {
    const results = {};
    
    try {
      const testResult = await this.client.chat([
        { role: 'user', content: `Test response from ${this.model.name}` }
      ], {
        model: this.model.name,
        maxTokens: 10
      });
      
      results[this.model.name] = {
        status: 'success',
        model: this.model.name,
        response: testResult.content,
        tokens: testResult.usage?.total_tokens || 0
      };
    } catch (error) {
      results[this.model.name] = {
        status: 'error',
        model: this.model.name,
        error: error.message
      };
    }
    
    return results;
  }
}

module.exports = RequestRouter;