import { Recipe, RecipeFormData, RecipeCategory } from '../types/recipe'
import { aiService } from './aiService'
import { parseIngredientsFromInstructions, IngredientParseResult } from '../utils/ingredientParser'
import api from './api'

// Recipes live in the shared backend database so every browser (and the
// Skylight push tooling) sees the same book. localStorage is no longer used.

const CATEGORY_TO_MEAL_TYPE: Record<string, string> = {
  Breakfast: 'breakfast',
  Lunch: 'lunch',
  Dinner: 'dinner',
  Snack: 'snack',
  Dessert: 'dessert'
  // 'Beverage' has no backend meal_type; it is sent as null
}

const MEAL_TYPE_TO_CATEGORY: Record<string, RecipeCategory> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  dessert: 'Dessert'
}

class RecipeService {
  private mapFromServer(row: any): Recipe {
    return {
      id: row.id,
      name: row.name,
      category: MEAL_TYPE_TO_CATEGORY[row.meal_type] || 'Dinner',
      instructions: row.instructions || '',
      description: row.description || undefined,
      prepTime: row.prep_time ?? undefined,
      cookTime: row.cook_time ?? undefined,
      servings: row.servings ?? undefined,
      difficulty: row.difficulty ?? undefined,
      mealType: row.meal_type ?? undefined,
      isPublic: row.is_public ?? undefined,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString()
    }
  }

  private mapToServer(data: Partial<RecipeFormData>): any {
    const body: any = {}
    if (data.name !== undefined) body.name = data.name
    if (data.description !== undefined) body.description = data.description
    if (data.instructions !== undefined) body.instructions = data.instructions
    if (data.prepTime !== undefined) body.prepTime = data.prepTime
    if (data.cookTime !== undefined) body.cookTime = data.cookTime
    if (data.category !== undefined) {
      const mealType = CATEGORY_TO_MEAL_TYPE[data.category]
      if (mealType) body.mealType = mealType
    }
    return body
  }

  async getAllRecipes(): Promise<Recipe[]> {
    const pageSize = 100
    let page = 1
    const all: Recipe[] = []
    for (;;) {
      const response = await api.get('/recipes', { params: { page, limit: pageSize } })
      const rows = response.data.recipes || []
      all.push(...rows.map((row: any) => this.mapFromServer(row)))
      const total = response.data.pagination?.total ?? all.length
      if (all.length >= total || rows.length === 0) break
      page++
    }
    return all
  }

  async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const response = await api.get(`/recipes/${id}`)
      return this.mapFromServer(response.data)
    } catch (error: any) {
      if (error?.response?.status === 404) return null
      throw error
    }
  }

  async getRecipesByCategory(category: RecipeCategory): Promise<Recipe[]> {
    const recipes = await this.getAllRecipes()
    return recipes.filter(recipe => recipe.category === category)
  }

  async createRecipe(data: RecipeFormData): Promise<Recipe> {
    const body = this.mapToServer(data)
    body.servings = data.servings || 4
    body.isPublic = true
    const response = await api.post('/recipes', body)
    return this.mapFromServer(response.data.recipe)
  }

  async importRecipeFromUrl(url: string, category: RecipeCategory = 'Dinner'): Promise<Recipe> {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      throw new Error('Recipe URL is required')
    }

    const result = await aiService.extractRecipeFromUrl(trimmedUrl)
    if (!result.success || !result.recipe) {
      throw new Error(result.error || 'Failed to import recipe from URL')
    }

    const { recipe } = result
    const instructions = (recipe.instructionsText && recipe.instructionsText.trim().length > 0)
      ? recipe.instructionsText.trim()
      : RecipeService.composeInstructions(recipe.ingredients || [], recipe.directions || [])

    return this.createRecipe({
      name: recipe.title || 'Imported Recipe',
      category,
      instructions: recipe.sourceUrl ? `${instructions}\n\nSource: ${recipe.sourceUrl}` : instructions
    })
  }

  async updateRecipe(id: string, data: Partial<RecipeFormData>): Promise<Recipe | null> {
    try {
      const response = await api.put(`/recipes/${id}`, this.mapToServer(data))
      return this.mapFromServer(response.data.recipe)
    } catch (error: any) {
      if (error?.response?.status === 404) return null
      throw error
    }
  }

  async deleteRecipe(id: string): Promise<boolean> {
    try {
      await api.delete(`/recipes/${id}`)
      return true
    } catch (error: any) {
      if (error?.response?.status === 404) return false
      throw error
    }
  }

  // Extract ingredients from instructions text using AI
  async extractIngredients(instructions: string, recipeName: string = 'Unknown Recipe'): Promise<string[]> {
    try {
      const result = await aiService.extractIngredientsFromRecipe({
        id: Date.now().toString(),
        name: recipeName,
        instructions: instructions
      })
      
      if (result.success && result.ingredients.length > 0) {
        // Convert structured ingredients to string array preserving all information
        return result.ingredients.map(ingredient => {
          const parts = []
          
          // Handle both 'amount' and 'quantity' fields for backend compatibility
          const quantity = ingredient.amount || ingredient.quantity
          if (quantity) {
            // Convert numeric quantities to string with reasonable precision
            if (typeof quantity === 'number') {
              parts.push(quantity.toString())
            } else {
              parts.push(quantity)
            }
          }
          
          if (ingredient.unit) parts.push(ingredient.unit)
          if (ingredient.name) parts.push(ingredient.name)
          
          // Add preparation notes if present
          if (ingredient.preparation) parts.push(`(${ingredient.preparation})`)
          else if (ingredient.notes) parts.push(`(${ingredient.notes})`)
          
          return parts.join(' ')
        })
      } else {
        // Fallback to basic extraction if AI fails
        const fallback = parseIngredientsFromInstructions(instructions)
        return fallback.items.map(item => item.text)
      }
    } catch (error) {
      console.error('AI ingredient extraction failed, using fallback:', error)
      const fallback = parseIngredientsFromInstructions(instructions)
      return fallback.items.map(item => item.text)
    }
  }

  parseInstructions(instructions: string): IngredientParseResult {
    return parseIngredientsFromInstructions(instructions)
  }

  private static composeInstructions(ingredients: string[], directions: string[]): string {
    const lines: string[] = []
    const trimmedIngredients = ingredients.map(item => item.trim()).filter(Boolean)
    const trimmedDirections = directions.map(item => item.trim()).filter(Boolean)

    if (trimmedIngredients.length) {
      lines.push('Ingredients:')
      trimmedIngredients.forEach((item, index) => {
        lines.push(`${index + 1}. ${item}`)
      })
      lines.push('')
    }

    if (trimmedDirections.length) {
      lines.push('Directions:')
      trimmedDirections.forEach((item, index) => {
        lines.push(`${index + 1}. ${item}`)
      })
    }

    return lines.join('\n').trim()
  }
}

export const recipeService = new RecipeService()