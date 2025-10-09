import { Recipe } from './recipe'

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert'

export interface PlannedMeal {
  id: string
  date: string // YYYY-MM-DD format
  mealSlot: MealSlot
  recipe: Recipe
}

export interface MealPlan {
  id: string
  date: string
  meals: PlannedMeal[]
}

export interface MealPlanFilters {
  Breakfast: boolean
  Lunch: boolean
  Dinner: boolean
  Snack: boolean
  Dessert: boolean
}

export const DEFAULT_MEAL_PLAN_FILTERS: MealPlanFilters = {
  Breakfast: true,
  Lunch: true,
  Dinner: true,
  Snack: false,
  Dessert: false
}

export const MEAL_SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']