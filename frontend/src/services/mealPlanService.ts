import { PlannedMeal, MealPlan, MealPlanFilters, DEFAULT_MEAL_PLAN_FILTERS } from '../types/mealPlan'
import { Recipe } from '../types/recipe'

const STORAGE_KEY = 'intelligent-kitchen-meal-plans'
const FILTERS_KEY = 'intelligent-kitchen-meal-filters'

class MealPlanService {
  private mealPlans: MealPlan[] = []
  private filters: MealPlanFilters = DEFAULT_MEAL_PLAN_FILTERS

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.mealPlans = JSON.parse(stored)
      }

      const storedFilters = localStorage.getItem(FILTERS_KEY)
      if (storedFilters) {
        this.filters = JSON.parse(storedFilters)
      } else {
        this.filters = { ...DEFAULT_MEAL_PLAN_FILTERS }
      }
    } catch (error) {
      console.error('Error loading meal plans from storage:', error)
      this.mealPlans = []
      this.filters = { ...DEFAULT_MEAL_PLAN_FILTERS }
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.mealPlans))
      localStorage.setItem(FILTERS_KEY, JSON.stringify(this.filters))
    } catch (error) {
      console.error('Error saving meal plans to storage:', error)
    }
  }

  // Get meal plan for a specific date
  getMealPlan(date: string): MealPlan | null {
    const plan = this.mealPlans.find(plan => plan.date === date)
    return plan || null
  }

  // Get all meal plans
  getAllMealPlans(): MealPlan[] {
    return [...this.mealPlans]
  }

  // Add or update a planned meal
  addPlannedMeal(date: string, mealSlot: string, recipe: Recipe): PlannedMeal {
    let mealPlan = this.getMealPlan(date)
    
    if (!mealPlan) {
      mealPlan = {
        id: `meal-plan-${date}`,
        date,
        meals: []
      }
      this.mealPlans.push(mealPlan)
    }

    // Remove existing meal for this slot if it exists
    mealPlan.meals = mealPlan.meals.filter(meal => meal.mealSlot !== mealSlot)

    // Add new planned meal
    const plannedMeal: PlannedMeal = {
      id: `planned-meal-${Date.now()}-${Math.random()}`,
      date,
      mealSlot: mealSlot as any,
      recipe
    }

    mealPlan.meals.push(plannedMeal)
    this.saveToStorage()
    return plannedMeal
  }

  // Remove a planned meal
  removePlannedMeal(date: string, mealSlot: string): boolean {
    const mealPlan = this.getMealPlan(date)
    if (!mealPlan) return false

    const initialLength = mealPlan.meals.length
    mealPlan.meals = mealPlan.meals.filter(meal => meal.mealSlot !== mealSlot)

    // If no meals left, remove the entire meal plan
    if (mealPlan.meals.length === 0) {
      this.mealPlans = this.mealPlans.filter(plan => plan.date !== date)
    }

    this.saveToStorage()
    return mealPlan.meals.length < initialLength
  }

  // Get planned meal for specific date and slot
  getPlannedMeal(date: string, mealSlot: string): PlannedMeal | null {
    const mealPlan = this.getMealPlan(date)
    if (!mealPlan) return null

    return mealPlan.meals.find(meal => meal.mealSlot === mealSlot) || null
  }

  // Get meal plan filters
  getFilters(): MealPlanFilters {
    return { ...this.filters }
  }

  // Update meal plan filters
  updateFilters(filters: Partial<MealPlanFilters>): void {
    this.filters = { ...this.filters, ...filters }
    this.saveToStorage()
  }

  // Get meal plans for a date range
  getMealPlansForRange(startDate: string, endDate: string): MealPlan[] {
    return this.mealPlans.filter(plan => 
      plan.date >= startDate && plan.date <= endDate
    )
  }

  // Clear all meal plans
  clearAllMealPlans(): void {
    this.mealPlans = []
    this.saveToStorage()
  }
}

export const mealPlanService = new MealPlanService()