/**
 * AI Service
 * Handles all communication with AI backend endpoints
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  conversationId: string;
  modelsUsed?: string[];
  metadata?: {
    processingTime: number;
    intent: string;
    toolsUsed?: any[];
    tokensUsed?: number;
  };
  cached?: boolean;
}

export interface UsageStats {
  today: { requests: number; cost: number; tokens: number };
  week: { requests: number; cost: number; tokens: number };
  month: { requests: number; cost: number; tokens: number };
}

class AIService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  /**
   * Send chat message to AI
   */
  async chat(message: string, conversationId?: string): Promise<ChatResponse> {
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message, conversationId }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  /**
   * Send chat with image
   */
  async chatWithImage(message: string, image: File, conversationId?: string): Promise<ChatResponse> {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('image', image);
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }

    const response = await fetch(`${API_URL}/api/ai/chat/image`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to send image');
    }

    return response.json();
  }

  /**
   * Get AI service status
   */
  async getStatus() {
    const response = await fetch(`${API_URL}/api/ai/status`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get status');
    }

    return response.json();
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(period: string = '30d'): Promise<UsageStats> {
    const response = await fetch(`${API_URL}/api/ai/usage?period=${period}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get usage stats');
    }

    const data = await response.json();
    return data.summary;
  }

  /**
   * Get cost trend
   */
  async getCostTrend(days: number = 30) {
    const response = await fetch(`${API_URL}/api/ai/usage/trend?days=${days}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get cost trend');
    }

    return response.json();
  }

  /**
   * Analyze pantry and suggest recipes
   */
  async analyzePantry(preferences?: string, constraints?: string): Promise<ChatResponse> {
    const response = await fetch(`${API_URL}/api/ai/analyze-pantry`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ preferences, constraints }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze pantry');
    }

    return response.json();
  }

  /**
   * Generate meal plan
   */
  async generateMealPlan(
    duration: number = 7,
    mealsPerDay: string[] = ['breakfast', 'lunch', 'dinner'],
    constraints?: any
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_URL}/api/ai/generate-meal-plan`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ duration, mealsPerDay, constraints }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate meal plan');
    }

    return response.json();
  }

  /**
   * Suggest recipes
   */
  async suggestRecipes(
    query?: string,
    ingredients?: string[],
    diet?: string,
    maxTime?: number
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_URL}/api/ai/suggest-recipes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, ingredients, diet, maxTime }),
    });

    if (!response.ok) {
      throw new Error('Failed to suggest recipes');
    }

    return response.json();
  }

  /**
   * Clear cache
   */
  async clearCache() {
    const response = await fetch(`${API_URL}/api/ai/cache/clear`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to clear cache');
    }

    return response.json();
  }
}

export const aiService = new AIService();
