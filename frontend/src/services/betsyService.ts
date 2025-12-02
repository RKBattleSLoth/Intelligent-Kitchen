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
          'clear_shopping_list' | 'clear_meals' | 'help' | 'greeting' | 'unknown';
  entities: {
    items?: ShoppingItem[];
    destination?: 'recipes' | 'shopping_list' | 'meal_planning';
    food?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    day?: string;
    itemName?: string;
    timeRange?: 'today' | 'this_week' | 'tomorrow' | 'all';
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

  /**
   * Clear meals for a date range
   */
  async clearMeals(timeRange: string): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const { startDate, endDate } = this.getDateRangeFromTimeRange(timeRange);
      
      console.log('[BetsyService] Clearing meals:', { timeRange, startDate, endDate });
      
      const response = await axios.delete(
        `${API_BASE_URL}/meal-plans/entries/range/${startDate}/${endDate}`
      );

      return {
        success: true,
        deletedCount: response.data.deletedCount || 0
      };
    } catch (error: any) {
      console.error('[BetsyService] Clear meals error:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error.response?.data?.error || error.message
      };
    }
  }

  private getDateRangeFromTimeRange(timeRange: string): { startDate: string; endDate: string } {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    switch (timeRange) {
      case 'today':
        return { startDate: formatDate(today), endDate: formatDate(today) };
      
      case 'tomorrow': {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { startDate: formatDate(tomorrow), endDate: formatDate(tomorrow) };
      }
      
      case 'this_week': {
        // Get start of week (Sunday) and end of week (Saturday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { startDate: formatDate(startOfWeek), endDate: formatDate(endOfWeek) };
      }
      
      case 'all':
      default: {
        // Clear a very wide range (1 year back and forward)
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        const yearFromNow = new Date(today);
        yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
        return { startDate: formatDate(yearAgo), endDate: formatDate(yearFromNow) };
      }
    }
  }
}

export const betsyService = new BetsyService();
export default betsyService;
