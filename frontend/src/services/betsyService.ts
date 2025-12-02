import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

export interface ShoppingItem {
  name: string;
  quantity?: string;
  unit?: string;
}

export interface BetsyInterpretation {
  success: boolean;
  intent: 'add_shopping_item' | 'navigate' | 'add_meal' | 'remove_shopping_item' | 
          'clear_shopping_list' | 'help' | 'greeting' | 'unknown';
  entities: {
    items?: ShoppingItem[];
    destination?: 'recipes' | 'shopping_list' | 'meal_planning';
    food?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    day?: string;
    itemName?: string;
  };
  confidence: number;
  response: string;
  metadata?: {
    model?: string;
    processingTimeMs?: number;
    tokensUsed?: number;
    method?: string;
  };
  error?: string;
}

class BetsyService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/ai`;
  }

  /**
   * Interpret user input using LLM
   */
  async interpret(input: string, context?: Record<string, any>): Promise<BetsyInterpretation> {
    try {
      console.log('[BetsyService] Interpreting:', input);
      
      const response = await axios.post(`${this.baseURL}/betsy-interpret`, {
        input,
        context
      });

      console.log('[BetsyService] Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[BetsyService] Error:', error);
      
      // Return a fallback interpretation on error
      return {
        success: false,
        intent: 'unknown',
        entities: {},
        confidence: 0,
        response: "I'm having trouble connecting. Please try again.",
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Format items for display
   */
  formatItemsForDisplay(items: ShoppingItem[]): string {
    return items.map(item => {
      let display = item.name;
      if (item.quantity && item.unit) {
        display = `${item.quantity} ${item.unit} ${item.name}`;
      } else if (item.quantity) {
        display = `${item.quantity} ${item.name}`;
      }
      return display;
    }).join(', ');
  }
}

export const betsyService = new BetsyService();
export default betsyService;
