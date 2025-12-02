import { PlannedMeal, MealPlan, MealPlanFilters, DEFAULT_MEAL_PLAN_FILTERS } from '../types/mealPlan'
import { Recipe } from '../types/recipe'
import api from './api'

const STORAGE_KEY = 'intelligent-kitchen-meal-plans'
const FILTERS_KEY = 'intelligent-kitchen-meal-filters'

type MealPlanChangeListener = () => void

class MealPlanService {
  private mealPlans: MealPlan[] = []
  private filters: MealPlanFilters = DEFAULT_MEAL_PLAN_FILTERS
  private changeListeners: Set<MealPlanChangeListener> = new Set()

  constructor() {
    this.loadFromStorage()
  }

  // Subscribe to meal plan changes
  subscribe(listener: MealPlanChangeListener): () => void {
    this.changeListeners.add(listener)
    return () => this.changeListeners.delete(listener)
  }

  // Notify all listeners of changes
  private notifyChange(): void {
    this.changeListeners.forEach(listener => listener())
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
      this.notifyChange()
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

  // Clear meal plans for a specific date range (week)
  clearMealPlansForWeek(startDate: string, endDate: string): void {
    this.mealPlans = this.mealPlans.filter(plan => 
      plan.date < startDate || plan.date > endDate
    )
    this.saveToStorage()
  }

  // Clear meal plans for a specific date
  clearMealPlansForDate(date: string): void {
    this.mealPlans = this.mealPlans.filter(plan => plan.date !== date)
    this.saveToStorage()
  }

  // Clear all meals of a specific type across all dates
  clearMealsForType(mealSlot: string): void {
    this.mealPlans.forEach(plan => {
      plan.meals = plan.meals.filter(meal => meal.mealSlot !== mealSlot)
    })
    
    // Remove empty meal plans
    this.mealPlans = this.mealPlans.filter(plan => plan.meals.length > 0)
    this.saveToStorage()
  }

  // Clear only AI-generated recipes (keep user recipes)
  clearAIRecipes(): void {
    this.mealPlans.forEach(plan => {
      plan.meals = plan.meals.filter(meal => !meal.recipe.id.startsWith('ai-recipe-'))
    })
    
    // Remove empty meal plans
    this.mealPlans = this.mealPlans.filter(plan => plan.meals.length > 0)
    this.saveToStorage()
  }

  // Get count of AI-generated recipes
  getAIRecipeCount(): number {
    let count = 0
    this.mealPlans.forEach(plan => {
      plan.meals.forEach(meal => {
        if (meal.recipe.id.startsWith('ai-recipe-')) {
          count++
        }
      })
    })
    return count
  }

  // Get count of user recipes
  getUserRecipeCount(): number {
    let count = 0
    this.mealPlans.forEach(plan => {
      plan.meals.forEach(meal => {
        if (!meal.recipe.id.startsWith('ai-recipe-')) {
          count++
        }
      })
    })
    return count
  }

  // Get meal planning preferences
  async getMealPlanningPreferences() {
    try {
      const response = await api.get('/meal-plans/preferences')
      return response.data
    } catch (error) {
      console.error('Error loading preferences:', error)
      return {
        dietary: 'none',
        healthGoal: 'maintain',
        budget: 'moderate'
      }
    }
  }

  // Generate AI meal plan
  async generateAIMealPlan(options: {
    startDate: string
    endDate: string
    mealTypes: string[]
    preferences: any
    constraints: any[]
    recipeSource: 'saved' | 'generated' | 'mixed'
    peopleCount: number
    saveToDatabase?: boolean
    planName?: string
  }) {
    try {
      const response = await api.post('/meal-plans/generate', options)
      return response.data
    } catch (error) {
      console.error('Error generating AI meal plan:', error)
      throw error
    }
  }

  // Get meal alternatives
  async getMealAlternatives(options: {
    date: string
    mealType: string
    currentRecipe: string
    preferences?: any
  }) {
    try {
      const response = await api.post('/meal-plans/alternatives', options)
      return response.data
    } catch (error) {
      console.error('Error getting meal alternatives:', error)
      throw error
    }
  }

  // Helper function to convert mealType from API (lowercase) to frontend format (Title Case)
  private normalizeMealType(mealType: string): string {
    const mealTypeMap: { [key: string]: string } = {
      'breakfast': 'Breakfast',
      'lunch': 'Lunch',
      'dinner': 'Dinner',
      'snack': 'Snack',
      'dessert': 'Dessert'
    }
    return mealTypeMap[mealType] || mealType.charAt(0).toUpperCase() + mealType.slice(1)
  }

  // Sync AI meal plan with local storage
  syncAIMealPlan(mealPlan: any): void {
    if (!mealPlan || !mealPlan.meals) {
      console.warn('syncAIMealPlan: No mealPlan or mealPlan.meals found')
      return
    }

    console.log(`syncAIMealPlan: Processing ${mealPlan.meals.length} meals`)
    let addedCount = 0
    for (const meal of mealPlan.meals) {
      if (meal.date && meal.mealType && meal.name) {
        const normalizedMealType = this.normalizeMealType(meal.mealType)
        const instructionText = typeof meal.instructions === 'string' && meal.instructions.trim().length > 0
          ? meal.instructions.trim()
          : meal.description || meal.name

        const recipe: Recipe = {
          id: `ai-recipe-${meal.date}-${meal.mealType}`,
          name: meal.name,
          category: normalizedMealType as any,
          instructions: instructionText,
          ingredients: meal.ingredients || [],
          prepTime: meal.prepTime || meal.cookTime || 30,
          cookTime: meal.cookTime || 30,
          servings: meal.servings || 4,
          description: meal.description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        console.log(`syncAIMealPlan: Adding meal for ${meal.date} - ${normalizedMealType}: ${meal.name}`)
        this.addPlannedMeal(meal.date, normalizedMealType, recipe)
        addedCount++
      } else {
        console.warn('syncAIMealPlan: Meal missing required fields:', meal)
      }
    }
    console.log(`syncAIMealPlan: Successfully added ${addedCount} meals to the plan`)
  }
}

export const mealPlanService = new MealPlanService()