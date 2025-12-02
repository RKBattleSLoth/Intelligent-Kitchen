import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';
import { mealPlanService } from './mealPlanService';

export interface ShoppingItem {
  name: string;
  quantity?: string;
  unit?: string;
}

export interface BetsyInterpretation {
  success: boolean;
  intent: 'add_shopping_item' | 'navigate' | 'add_meal' | 'remove_shopping_item' | 
          'clear_shopping_list' | 'clear_meals' | 'generate_meals' | 'import_recipe' |
          'search_recipe' | 'add_recipe_to_shopping_list' | 'consolidate_shopping_list' |
          'move_meal' | 'swap_meals' | 'delete_recipe' | 'search_recipes' |
          'help' | 'greeting' | 'unknown';
  entities: {
    items?: ShoppingItem[];
    destination?: 'recipes' | 'shopping_list' | 'meal_planning';
    food?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    day?: string;
    itemName?: string;
    timeRange?: 'today' | 'this_week' | 'tomorrow';
    url?: string;
    query?: string;
    recipeName?: string;
    category?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    checkedOnly?: boolean;
    fromDay?: string;
    fromMealType?: string;
    toDay?: string;
    toMealType?: string;
    day1?: string;
    mealType1?: string;
    day2?: string;
    mealType2?: string;
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
   * Clear meals for a date range (uses local mealPlanService)
   */
  clearMeals(timeRange: string): { success: boolean; deletedCount: number; error?: string } {
    try {
      const { startDate, endDate } = this.getDateRangeFromTimeRange(timeRange);
      
      console.log('[BetsyService] Clearing meals:', { timeRange, startDate, endDate });
      
      // Count meals before clearing
      const mealsBefore = mealPlanService.getMealPlansForRange(startDate, endDate);
      const countBefore = mealsBefore.reduce((sum, plan) => sum + plan.meals.length, 0);
      
      // Clear from local storage
      if (timeRange === 'all') {
        mealPlanService.clearAllMealPlans();
      } else {
        mealPlanService.clearMealPlansForWeek(startDate, endDate);
      }
      
      console.log('[BetsyService] Cleared', countBefore, 'meals');

      return {
        success: true,
        deletedCount: countBefore
      };
    } catch (error: any) {
      console.error('[BetsyService] Clear meals error:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Generate meals using AI for a date range
   */
  async generateMeals(timeRange: string): Promise<{ success: boolean; mealCount: number; mealPlan?: any; error?: string }> {
    try {
      const { startDate, endDate } = this.getDateRangeFromTimeRange(timeRange);
      
      console.log('[BetsyService] Generating meals:', { timeRange, startDate, endDate });
      
      const response = await axios.post(`${API_BASE_URL}/meal-plans/generate`, {
        startDate,
        endDate,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        peopleCount: 4
      });

      const mealPlan = response.data.mealPlan;
      const mealCount = mealPlan?.meals?.length || 0;
      
      // CRITICAL: Sync the generated meals to local storage so they appear in UI
      if (mealPlan && mealPlan.meals && mealPlan.meals.length > 0) {
        console.log('[BetsyService] Syncing', mealCount, 'meals to local storage...');
        mealPlanService.syncAIMealPlan(mealPlan);
        console.log('[BetsyService] Meals synced successfully!');
      }
      
      return {
        success: response.data.success !== false,
        mealCount,
        mealPlan
      };
    } catch (error: any) {
      console.error('[BetsyService] Generate meals error:', error);
      return {
        success: false,
        mealCount: 0,
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
