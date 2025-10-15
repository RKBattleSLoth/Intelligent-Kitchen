import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface IngredientExtractionResult {
  success: boolean;
  ingredients: Array<{
    name: string;
    amount: string;        // String representation for UI display
    quantity?: number;     // Numeric value for calculations
    unit: string;
    category?: string;
    preparation?: string;
    notes?: string;
    confidence?: number;
  }>;
  error?: string;
}

export interface ShoppingListGenerationResult {
  success: boolean;
  shoppingList: {
    name: string;
    items: Array<{
      name: string;
      amount: string;
      unit: string;
      category: string;
      checked: boolean;
    }>;
  };
  error?: string;
}

export interface AIHealthStatus {
  status: string;
  services: {
    models: {
      available: {
        small: any;
        medium: any;
        large: any;
      };
      current: {
        small: string;
        medium: string;
        large: string;
      };
    };
    cache: {
      status: string;
    };
    costMonitor: {
      enabled: boolean;
      dailyUsage: {
        cost: number;
        tokens: number;
        date: string;
      };
    };
  };
  timestamp: string;
}

export interface CostUsage {
  dailyUsage: {
    cost: number;
    tokens: number;
    date: string;
  };
  monthlyUsage?: {
    cost: number;
    tokens: number;
    month: string;
  };
}

export interface RecipeUrlExtractionResult {
  success: boolean;
  recipe?: {
    title: string;
    description: string;
    ingredients: string[];
    directions: string[];
    instructionsText: string;
    servings: string | null;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    totalTimeMinutes: number | null;
    sourceUrl: string;
  };
  ingredientExtraction?: any;
  aiMetadata?: any;
  structuredData?: any;
  processingTimeMs?: number;
  error?: string;
}

class AIService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/api/ai`;
  }

  /**
   * Check AI service health status
   */
  async getHealthStatus(): Promise<AIHealthStatus> {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data;
    } catch (error) {
      console.error('Failed to get AI health status:', error);
      throw error;
    }
  }

  /**
   * Extract ingredients from recipe data
   */
  async extractIngredients(recipeData: {
    name: string;
    ingredients: string[];
    instructions?: string;
  }): Promise<IngredientExtractionResult> {
    try {
      const response = await axios.post(`${this.baseURL}/extract-ingredients`, {
        recipeData
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to extract ingredients:', error);
      return {
        success: false,
        ingredients: [],
        error: error.response?.data?.error || 'Failed to extract ingredients'
      };
    }
  }

  /**
   * Extract ingredients from recipe using AI (enhanced version)
   */
  async extractIngredientsFromRecipe(recipe: {
    id: string;
    name: string;
    instructions: string;
  }): Promise<IngredientExtractionResult> {
    try {
      // First, try to extract ingredients from instructions using existing logic
      const basicIngredients = this.extractBasicIngredients(recipe.instructions);
      
      // If we have basic ingredients, enhance them with AI
      if (basicIngredients.length > 0) {
        const response = await axios.post(`${this.baseURL}/extract-ingredients`, {
          recipeData: {
            name: recipe.name,
            ingredients: basicIngredients,
            instructions: recipe.instructions
          }
        });
        return response.data;
      } else {
        // Fallback to AI-only extraction
        const response = await axios.post(`${this.baseURL}/extract-ingredients`, {
          recipeData: {
            name: recipe.name,
            ingredients: [],
            instructions: recipe.instructions
          }
        });
        return response.data;
      }
    } catch (error: any) {
      console.error('Failed to extract ingredients from recipe:', error);
      return {
        success: false,
        ingredients: [],
        error: error.response?.data?.error || 'Failed to extract ingredients from recipe'
      };
    }
  }

  async extractRecipeFromUrl(url: string): Promise<RecipeUrlExtractionResult> {
    try {
      const response = await axios.post(`${this.baseURL}/extract-recipe-from-url`, { url });
      return response.data;
    } catch (error: any) {
      console.error('Failed to extract recipe from URL:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to extract recipe from URL'
      };
    }
  }

  /**
   * Basic ingredient extraction (fallback method)
   */
  private extractBasicIngredients(instructions: string): string[] {
    const lines = instructions.split('\n');
    const ingredients: string[] = [];
    
    let inIngredientsSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().startsWith('ingredients:')) {
        inIngredientsSection = true;
        const ingredientsLine = trimmed.replace(/^ingredients:/i, '').trim();
        if (ingredientsLine) {
          ingredients.push(ingredientsLine);
        }
        continue;
      }
      
      if (trimmed.toLowerCase().startsWith('instructions:')) {
        inIngredientsSection = false;
        continue;
      }
      
      if (inIngredientsSection && trimmed && !trimmed.match(/^\d+\./)) {
        ingredients.push(trimmed);
      }
    }
    
    return ingredients;
  }

  /**
   * Generate shopping list from multiple recipes
   */
  async generateShoppingList(recipes: Array<{
    name: string;
    ingredients: string[];
    instructions?: string;
  }>, options?: {
    includePantryStaples?: boolean;
    dietaryRestrictions?: string[];
    servingSize?: number;
  }): Promise<ShoppingListGenerationResult> {
    try {
      const response = await axios.post(`${this.baseURL}/generate-shopping-list`, {
        recipes,
        options
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to generate shopping list:', error);
      return {
        success: false,
        shoppingList: {
          name: 'AI Generated Shopping List',
          items: []
        },
        error: error.response?.data?.error || 'Failed to generate shopping list'
      };
    }
  }

  /**
   * Get cost usage information
   */
  async getCostUsage(): Promise<CostUsage> {
    try {
      const response = await axios.get(`${this.baseURL}/cost-usage`);
      return response.data;
    } catch (error) {
      console.error('Failed to get cost usage:', error);
      throw error;
    }
  }

  /**
   * Check if AI service is properly configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      const health = await this.getHealthStatus();
      return health.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get AI model information
   */
  getModelInfo() {
    return {
      small: {
        name: 'google/gemma-2-9b-it',
        description: 'Fast model for simple tasks',
        capabilities: ['Simple text processing', 'Quick responses']
      },
      medium: {
        name: 'anthropic/claude-3.5-sonnet',
        description: 'Balanced model for complex tasks',
        capabilities: ['Ingredient extraction', 'Logic reasoning', 'Recipe analysis']
      },
      large: {
        name: 'google/gemini-1.5-pro',
        description: 'Powerful model for advanced tasks',
        capabilities: ['Vision processing', 'Complex analysis', 'Multi-recipe processing']
      }
    };
  }
}

export const aiService = new AIService();
export default aiService;