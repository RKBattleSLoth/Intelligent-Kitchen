/**
 * Request Router
 * Routes AI requests to appropriate models based on complexity and cost
 */

const OpenRouterClient = require('./OpenRouterClient');

class RequestRouter {
  constructor() {
    this.client = new OpenRouterClient();
    
    // Model tiers with their capabilities
    this.models = {
      small: {
        name: process.env.OPENROUTER_MODEL_SMALL,
        maxTokens: 4000,
        capabilities: ['simple_text', 'basic_parsing', 'quick_responses'],
        costMultiplier: 0.1
      },
      medium: {
        name: process.env.OPENROUTER_MODEL_MEDIUM,
        maxTokens: 8000,
        capabilities: ['complex_parsing', 'ingredient_extraction', 'logic_reasoning'],
        costMultiplier: 1.0
      },
      large: {
        name: process.env.OPENROUTER_MODEL_LARGE,
        maxTokens: 32000,
        capabilities: ['vision', 'complex_analysis', 'multi_recipe_processing', 'advanced_reasoning'],
        costMultiplier: 5.0
      }
    };
  }

  /**
   * Route request to appropriate model based on task type and complexity
   */
  async route(taskType, input, options = {}) {
    const { forceModel, forceModelName, priority = 'normal' } = options;

    if (forceModelName) {
      return this.executeRequestByName(forceModelName, taskType, input, options);
    }
    
    // If forceModel tier is specified, use it directly
    if (forceModel && this.models[forceModel]) {
      return this.executeRequest(forceModel, taskType, input, options);
    }

    // Determine appropriate model based on task type
    const recommendedModel = this.selectModel(taskType, input, priority);
    
    console.log(`🎯 Routing ${taskType} to ${recommendedModel} model`);
    
    return this.executeRequest(recommendedModel, taskType, input, options);
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
  selectModel(taskType, input, priority) {
    const complexity = this.assessComplexity(taskType, input);
    
    // Task type routing
    const taskRouting = {
      'simple_text': 'small',
      'basic_parsing': 'small',
      'ingredient_extraction': 'small',
      'smart_processing': 'small',
      'validation': 'small',
      'recipe_analysis': 'medium',
      'meal_plan_generation': 'large',
      'vision_analysis': 'large',
      'complex_reasoning': 'large'
    };

    let recommendedModel = taskRouting[taskType] || 'medium';

    const stickToSmallTasks = new Set(['ingredient_extraction', 'smart_processing', 'validation']);

    // Adjust based on complexity for tasks that can scale
    if (!stickToSmallTasks.has(taskType)) {
      if (complexity === 'high' && recommendedModel === 'small') {
        recommendedModel = 'medium';
      } else if (complexity === 'very_high' && recommendedModel !== 'large') {
        recommendedModel = 'large';
      }
    }

    // Adjust based on priority
    if (priority === 'cost' && recommendedModel === 'large') {
      recommendedModel = 'medium';
    } else if (priority === 'speed' && recommendedModel === 'large') {
      recommendedModel = 'medium';
    } else if (priority === 'quality' && recommendedModel === 'small') {
      recommendedModel = 'medium';
    }

    return recommendedModel;
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
  async executeRequest(modelTier, taskType, input, options = {}) {
    const model = this.models[modelTier];
    if (!model) {
      throw new Error(`Unknown model tier: ${modelTier}`);
    }

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
          modelTier,
          modelName: model.name,
          taskType,
          complexity: this.assessComplexity(taskType, input),
          costMultiplier: model.costMultiplier
        }
      };

    } catch (error) {
      // Fallback to smaller model on failure
      if (modelTier !== 'small') {
        console.log(`🔄 ${model.name} failed, falling back to smaller model`);
        return this.executeRequest('small', taskType, input, { ...options, fallback: true });
      }
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
      available: this.models,
      current: {
        small: process.env.OPENROUTER_MODEL_SMALL,
        medium: process.env.OPENROUTER_MODEL_MEDIUM,
        large: process.env.OPENROUTER_MODEL_LARGE
      }
    };
  }

  /**
   * Test all models
   */
  async testModels() {
    const results = {};
    
    for (const [tier, config] of Object.entries(this.models)) {
      try {
        const testResult = await this.client.chat([
          { role: 'user', content: `Test response from ${config.name}` }
        ], {
          model: config.name,
          maxTokens: 10
        });
        
        results[tier] = {
          status: 'success',
          model: config.name,
          response: testResult.content,
          tokens: testResult.usage?.total_tokens || 0
        };
      } catch (error) {
        results[tier] = {
          status: 'error',
          model: config.name,
          error: error.message
        };
      }
    }
    
    return results;
  }
}

module.exports = RequestRouter;