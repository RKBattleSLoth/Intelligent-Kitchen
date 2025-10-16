/**
 * OpenRouter API Client
 * Handles communication with OpenRouter AI models
 */

class OpenRouterClient {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.appTitle = process.env.OPENROUTER_APP_TITLE || 'Intelligent Kitchen AI';
    this.timeout = parseInt(process.env.AI_TIMEOUT) || 30000;
    this.maxRetries = parseInt(process.env.AI_MAX_RETRIES) || 3;
    
    if (!this.apiKey || this.apiKey === 'your-openrouter-api-key') {
      console.warn('⚠️ OpenRouter API key not configured. AI features will be limited.');
    } else {
      console.log('✅ OpenRouter API key loaded:', this.apiKey.substring(0, 20) + '...');
    }
  }

  /**
   * Make a request to OpenRouter API
   */
  async chat(messages, options = {}) {
    const {
      model = process.env.OPENROUTER_MODEL_MEDIUM,
      temperature = 0.7,
      maxTokens = 4000,
      stream = false
    } = options;

    if (!this.apiKey || this.apiKey === 'your-openrouter-api-key') {
      throw new Error('OpenRouter API key not configured');
    }

    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream
    };

    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🤖 OpenRouter Request (Attempt ${attempt}/${this.maxRetries}): ${model}`);
        console.log(`   API Key: ${this.apiKey ? this.apiKey.substring(0, 20) + '...' + this.apiKey.slice(-4) : 'NOT SET'}`);
        console.log(`   Request body:`, JSON.stringify(requestBody).substring(0, 200) + '...');
        
        const fetchOptions = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'X-Title': this.appTitle
          },
          body: JSON.stringify(requestBody)
        };
        
        console.log(`   Headers:`, {
          Authorization: fetchOptions.headers.Authorization ? fetchOptions.headers.Authorization.substring(0, 20) + '...' : 'NOT SET',
          'Content-Type': fetchOptions.headers['Content-Type'],
          'HTTP-Referer': fetchOptions.headers['HTTP-Referer'],
          'X-Title': fetchOptions.headers['X-Title']
        });
        
        const response = await fetch(`${this.baseURL}/chat/completions`, fetchOptions);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenRouter API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0]) {
          throw new Error('Invalid response from OpenRouter API');
        }

        const result = {
          content: data.choices[0].message.content,
          usage: data.usage,
          model: data.model,
          id: data.id
        };

        console.log(`✅ OpenRouter Response: ${result.usage?.total_tokens || 0} tokens used`);
        return result;

      } catch (error) {
        lastError = error;
        console.error(`❌ OpenRouter Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`OpenRouter API failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Get available models
   */
  async getModels() {
    if (!this.apiKey || this.apiKey === 'your-openrouter-api-key') {
      return [];
    }

    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return [];
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    if (!this.apiKey || this.apiKey === 'your-openrouter-api-key') {
      return { status: 'error', message: 'API key not configured' };
    }

    try {
      const result = await this.chat([
        { role: 'user', content: 'Respond with "OK" if you can read this.' }
      ], {
        model: process.env.OPENROUTER_MODEL_SMALL,
        maxTokens: 10
      });

      return { 
        status: 'success', 
        message: 'Connection successful',
        model: result.model,
        tokens: result.usage?.total_tokens || 0
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message 
      };
    }
  }

  /**
   * Get model pricing information
   */
  getModelPricing() {
    return {
      [process.env.OPENROUTER_MODEL_SMALL]: {
        input: 0.05,  // $0.05 per 1M tokens
        output: 0.15  // $0.15 per 1M tokens
      },
      [process.env.OPENROUTER_MODEL_MEDIUM]: {
        input: 0.50,  // $0.50 per 1M tokens  
        output: 1.50  // $1.50 per 1M tokens
      },
      [process.env.OPENROUTER_MODEL_LARGE]: {
        input: 2.50,  // $2.50 per 1M tokens
        output: 7.50  // $7.50 per 1M tokens
      }
    };
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(model, inputTokens, outputTokens) {
    const pricing = this.getModelPricing()[model];
    if (!pricing) return 0;

    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    
    return inputCost + outputCost;
  }
}

module.exports = OpenRouterClient;