import { PlannedMeal, MealPlan, MealPlanFilters, DEFAULT_MEAL_PLAN_FILTERS } from '../types/mealPlan'
import { Recipe } from '../types/recipe'
import api from './api'
import { recipeService } from './recipeService'

const STORAGE_KEY = 'intelligent-kitchen-meal-plans'
const FILTERS_KEY = 'intelligent-kitchen-meal-filters'
const SERVER_PLAN_KEY = 'intelligent-kitchen-server-meal-plan-id'
const SERVER_ENTRIES_KEY = 'intelligent-kitchen-server-entry-map'

// The plan itself lives in the shared backend database (one long-running
// "Family Meal Plan"), so every browser sees the same week. localStorage is
// kept as a fast cache; every mutation is mirrored to the server in order.
const SERVER_PLAN_NAME = 'Family Meal Plan'
const SERVER_PLAN_START = '2025-01-01'
const SERVER_PLAN_END = '2035-12-31'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const slotKey = (date: string, mealSlot: string) => `${date}|${mealSlot.toLowerCase()}`

type MealPlanChangeListener = () => void

class MealPlanService {
  private mealPlans: MealPlan[] = []
  private filters: MealPlanFilters = DEFAULT_MEAL_PLAN_FILTERS
  private changeListeners: Set<MealPlanChangeListener> = new Set()
  private serverPlanId: string | null = null
  private serverEntryIds: Record<string, string> = {}
  private syncQueue: Promise<void> = Promise.resolve()

  constructor() {
    this.loadFromStorage()
    try {
      this.serverPlanId = localStorage.getItem(SERVER_PLAN_KEY)
      this.serverEntryIds = JSON.parse(localStorage.getItem(SERVER_ENTRIES_KEY) || '{}')
    } catch {
      this.serverEntryIds = {}
    }
    void this.hydrateFromServer()
  }

  // ---- Server sync ----

  private saveServerState(): void {
    try {
      if (this.serverPlanId) localStorage.setItem(SERVER_PLAN_KEY, this.serverPlanId)
      localStorage.setItem(SERVER_ENTRIES_KEY, JSON.stringify(this.serverEntryIds))
    } catch { /* cache only */ }
  }

  private enqueueSync(task: () => Promise<void>): void {
    this.syncQueue = this.syncQueue
      .then(task)
      .catch(error => console.warn('Meal plan server sync failed:', error?.message || error))
  }

  private async ensureServerPlan(): Promise<string> {
    if (this.serverPlanId) return this.serverPlanId
    const response = await api.get('/meal-plans')
    const plans = Array.isArray(response.data) ? response.data : []
    const existing = plans.find((plan: any) => plan.name === SERVER_PLAN_NAME)
    if (existing) {
      this.serverPlanId = existing.id
    } else {
      const created = await api.post('/meal-plans', {
        name: SERVER_PLAN_NAME,
        startDate: SERVER_PLAN_START,
        endDate: SERVER_PLAN_END
      })
      this.serverPlanId = created.data.mealPlan.id
    }
    this.saveServerState()
    return this.serverPlanId!
  }

  private async hydrateFromServer(): Promise<void> {
    try {
      await this.ensureServerPlan()
      const [recipes, entriesResponse] = await Promise.all([
        recipeService.getAllRecipes(),
        api.get(`/meal-plans/range/${SERVER_PLAN_START}/${SERVER_PLAN_END}`)
      ])
      const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]))
      const entries = Array.isArray(entriesResponse.data) ? entriesResponse.data : []

      const plans = new Map<string, MealPlan>()
      const entryIds: Record<string, string> = {}
      for (const entry of entries) {
        const date = String(entry.meal_date).slice(0, 10)
        const mealSlot = this.normalizeMealType(entry.meal_type) as PlannedMeal['mealSlot']
        const recipe: Recipe = recipesById.get(entry.recipe_id) || {
          id: entry.recipe_id || `note-${entry.id}`,
          name: entry.recipe_name || entry.notes || 'Planned meal',
          category: mealSlot as any,
          instructions: entry.recipe_description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        let plan = plans.get(date)
        if (!plan) {
          plan = { id: `meal-plan-${date}`, date, meals: [] }
          plans.set(date, plan)
        }
        plan.meals = plan.meals.filter(meal => meal.mealSlot !== mealSlot)
        plan.meals.push({ id: entry.id, date, mealSlot, recipe })
        entryIds[slotKey(date, mealSlot)] = entry.id
      }

      this.mealPlans = Array.from(plans.values())
      this.serverEntryIds = entryIds
      this.saveServerState()
      this.saveToStorage()
    } catch (error: any) {
      console.warn('Meal plan hydration from server failed; using local cache:', error?.message || error)
    }
  }

  private async deleteServerEntry(key: string): Promise<void> {
    const entryId = this.serverEntryIds[key]
    if (!entryId) return
    try {
      await api.delete(`/meal-plans/entries/${entryId}`)
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error
    }
    delete this.serverEntryIds[key]
    this.saveServerState()
  }

  private async upsertServerEntry(date: string, mealSlot: string, recipe: Recipe): Promise<void> {
    const planId = await this.ensureServerPlan()
    const key = slotKey(date, mealSlot)
    await this.deleteServerEntry(key)

    let recipeId: string | null = UUID_RE.test(recipe.id) ? recipe.id : null
    if (!recipeId && !recipe.id.startsWith('note-')) {
      // Materialize locally generated (e.g. AI) recipes in the shared book
      try {
        const created = await recipeService.createRecipe({
          name: recipe.name,
          category: recipe.category,
          instructions: recipe.instructions || recipe.description || recipe.name,
          servings: recipe.servings,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime
        } as any)
        recipeId = created.id
      } catch (error: any) {
        console.warn('Could not create recipe on server; planning by name only:', error?.message || error)
      }
    }

    const response = await api.post(`/meal-plans/${planId}/entries`, {
      mealDate: date,
      mealType: mealSlot.toLowerCase(),
      recipeId: recipeId || undefined,
      notes: recipeId ? undefined : recipe.name
    })
    this.serverEntryIds[key] = response.data.entry.id
    this.saveServerState()
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
    this.enqueueSync(() => this.upsertServerEntry(date, mealSlot, recipe))
    return plannedMeal
  }

  // Remove a planned meal
  removePlannedMeal(date: string, mealSlot: string): boolean {
    this.enqueueSync(() => this.deleteServerEntry(slotKey(date, mealSlot)))
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
    const keys = Object.keys(this.serverEntryIds)
    this.enqueueSync(async () => {
      for (const key of keys) await this.deleteServerEntry(key)
    })
    this.mealPlans = []
    this.saveToStorage()
  }

  // Clear meal plans for a specific date range (week)
  clearMealPlansForWeek(startDate: string, endDate: string): void {
    const keys = Object.keys(this.serverEntryIds).filter(key => {
      const date = key.split('|')[0]
      return date >= startDate && date <= endDate
    })
    this.enqueueSync(async () => {
      for (const key of keys) await this.deleteServerEntry(key)
    })
    this.mealPlans = this.mealPlans.filter(plan => 
      plan.date < startDate || plan.date > endDate
    )
    this.saveToStorage()
  }

  // Clear meal plans for a specific date
  clearMealPlansForDate(date: string): void {
    const keys = Object.keys(this.serverEntryIds).filter(key => key.split('|')[0] === date)
    this.enqueueSync(async () => {
      for (const key of keys) await this.deleteServerEntry(key)
    })
    this.mealPlans = this.mealPlans.filter(plan => plan.date !== date)
    this.saveToStorage()
  }

  // Clear all meals of a specific type across all dates
  clearMealsForType(mealSlot: string): void {
    const suffix = `|${mealSlot.toLowerCase()}`
    const keys = Object.keys(this.serverEntryIds).filter(key => key.endsWith(suffix))
    this.enqueueSync(async () => {
      for (const key of keys) await this.deleteServerEntry(key)
    })
    this.mealPlans.forEach(plan => {
      plan.meals = plan.meals.filter(meal => meal.mealSlot !== mealSlot)
    })
    
    // Remove empty meal plans
    this.mealPlans = this.mealPlans.filter(plan => plan.meals.length > 0)
    this.saveToStorage()
  }

  // Clear only AI-generated recipes (keep user recipes)
  clearAIRecipes(): void {
    const keys: string[] = []
    this.mealPlans.forEach(plan => {
      plan.meals.forEach(meal => {
        if (meal.recipe.id.startsWith('ai-recipe-')) keys.push(slotKey(meal.date, meal.mealSlot))
      })
    })
    this.enqueueSync(async () => {
      for (const key of keys) await this.deleteServerEntry(key)
    })
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