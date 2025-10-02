/**
 * OpenRouter Service
 * Handles all communication with OpenRouter API for LLM inference
 * Supports three model tiers: Small (128K), Medium (200K), Large (1M)
 */

// Ensure dotenv is loaded
if (!process.env.OPENROUTER_API_KEY) {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv might already be loaded
  }
}

class OpenRouterService {
  constructor() {
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
    this.appTitle = process.env.OPENROUTER_APP_TITLE || 'Intelligent Kitchen AI';
    
    // Model configurations - to be set by user
    this.models = {
      small: process.env.OPENROUTER_MODEL_SMALL,
      medium: process.env.OPENROUTER_MODEL_MEDIUM,
      large: process.env.OPENROUTER_MODEL_LARGE,
    };

    // Validate configuration
    if (!this.apiKey) {
      console.warn('⚠️  OPENROUTER_API_KEY not set. AI features will not work.');
    }
  }

  /**
   * Standard chat completion
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} - API response
   */
  async chat(messages, options = {}) {
    const {
      tier = 'medium',
      temperature = 0.7,
      maxTokens = 2000,
      stream = false,
      tools = null,
      responseFormat = null,
    } = options;

    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    if (!this.models[tier]) {
      throw new Error(`Model not configured for tier: ${tier}`);
    }

    const requestBody = {
      model: this.models[tier],
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    };

    // Add tools if provided (for function calling)
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    // Add response format if provided (for JSON mode)
    if (responseFormat) {
      requestBody.response_format = responseFormat;
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.appUrl,
          'X-Title': this.appTitle,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      if (stream) {
        return response.body; // Return stream for streaming responses
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('OpenRouter API Error:', error.message);
      throw error;
    }
  }

  /**
   * Chat with image (vision capabilities)
   * Forces use of Large model tier for vision tasks
   * @param {Array} messages - Array of message objects
   * @param {String|Array} imageUrls - Single image URL or array of URLs
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} - API response
   */
  async chatWithImage(messages, imageUrls, options = {}) {
    // Force large tier for vision
    const visionOptions = { ...options, tier: 'large' };
    
    // Convert single URL to array
    const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

    // Build vision message with images
    const visionMessages = messages.map((msg, idx) => {
      // Add images to the last user message
      if (idx === messages.length - 1 && msg.role === 'user') {
        const content = [
          { type: 'text', text: msg.content }
        ];
        
        // Add all images
        urls.forEach(url => {
          content.push({
            type: 'image_url',
            image_url: { url }
          });
        });

        return {
          role: 'user',
          content
        };
      }
      return msg;
    });

    return this.chat(visionMessages, visionOptions);
  }

  /**
   * Get available models from OpenRouter
   * @returns {Promise<Array>} - List of available models
   */
  async getAvailableModels() {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error.message);
      throw error;
    }
  }

  /**
   * Get model info for a specific model
   * @param {String} modelId - Model identifier
   * @returns {Object} - Model information
   */
  async getModelInfo(modelId) {
    const models = await this.getAvailableModels();
    return models.find(m => m.id === modelId);
  }

  /**
   * Check if service is configured and ready
   * @returns {Boolean}
   */
  isConfigured() {
    return !!(this.apiKey && this.models.small && this.models.medium && this.models.large);
  }

  /**
   * Get configuration status
   * @returns {Object}
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      hasApiKey: !!this.apiKey,
      models: {
        small: this.models.small || 'not configured',
        medium: this.models.medium || 'not configured',
        large: this.models.large || 'not configured',
      }
    };
  }
}

// Export singleton instance
module.exports = new OpenRouterService();
