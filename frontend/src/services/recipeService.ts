import { Recipe, RecipeFormData, RecipeCategory } from '../types/recipe'
import { aiService } from './aiService'
import { parseIngredientsFromInstructions } from '../utils/ingredientParser'

const STORAGE_KEY = 'intelligent-kitchen-recipes'

class RecipeService {
  private getRecipes(): Recipe[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : this.getDefaultRecipes()
    } catch {
      return this.getDefaultRecipes()
    }
  }

  private saveRecipes(recipes: Recipe[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }

  private getDefaultRecipes(): Recipe[] {
    return [
      {
        id: '1',
        name: 'Classic Spaghetti Carbonara',
        category: 'Dinner',
        instructions: 'Ingredients: 400g spaghetti, 200g pancetta, 4 eggs, 100g Parmesan cheese, black pepper, salt\n\nInstructions: 1. Cook spaghetti according to package directions. 2. While pasta cooks, crisp pancetta in a large pan. 3. Beat eggs with Parmesan and pepper. 4. Drain pasta, reserve 1 cup pasta water. 5. Mix hot pasta with pancetta, then egg mixture off heat. 6. Add pasta water to achieve creamy consistency. 7. Serve immediately with extra Parmesan.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Avocado Toast',
        category: 'Breakfast',
        instructions: 'Ingredients: 2 slices bread, 1 ripe avocado, lemon juice, salt, pepper, red pepper flakes, optional egg\n\nInstructions: 1. Toast bread until golden. 2. Mash avocado with lemon juice, salt, and pepper. 3. Spread avocado on toast. 4. Sprinkle with red pepper flakes. 5. Top with fried or poached egg if desired.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Greek Salad',
        category: 'Lunch',
        instructions: 'Ingredients: 2 cucumbers, 4 tomatoes, 1 red onion, 200g feta cheese, olives, olive oil, oregano, salt, pepper\n\nInstructions: 1. Chop cucumbers and tomatoes. 2. Slice red onion thinly. 3. Combine vegetables in a bowl. 4. Add crumbled feta and olives. 5. Drizzle with olive oil and sprinkle with oregano. 6. Season with salt and pepper. 7. Toss well and serve.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  async getAllRecipes(): Promise<Recipe[]> {
    return this.getRecipes()
  }

  async getRecipeById(id: string): Promise<Recipe | null> {
    const recipes = this.getRecipes()
    return recipes.find(recipe => recipe.id === id) || null
  }

  async getRecipesByCategory(category: RecipeCategory): Promise<Recipe[]> {
    const recipes = this.getRecipes()
    return recipes.filter(recipe => recipe.category === category)
  }

  async createRecipe(data: RecipeFormData): Promise<Recipe> {
    const recipes = this.getRecipes()
    const newRecipe: Recipe = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    recipes.push(newRecipe)
    this.saveRecipes(recipes)
    return newRecipe
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

    const now = new Date().toISOString()
    const newRecipe: Recipe = {
      id: Date.now().toString(),
      name: recipe.title || 'Imported Recipe',
      category,
      instructions: recipe.sourceUrl ? `${instructions}\n\nSource: ${recipe.sourceUrl}` : instructions,
      createdAt: now,
      updatedAt: now
    }

    const recipes = this.getRecipes()
    recipes.push(newRecipe)
    this.saveRecipes(recipes)

    return newRecipe
  }

  async updateRecipe(id: string, data: Partial<RecipeFormData>): Promise<Recipe | null> {
    const recipes = this.getRecipes()
    const index = recipes.findIndex(recipe => recipe.id === id)
    if (index === -1) return null

    recipes[index] = {
      ...recipes[index],
      ...data,
      updatedAt: new Date().toISOString()
    }
    this.saveRecipes(recipes)
    return recipes[index]
  }

  async deleteRecipe(id: string): Promise<boolean> {
    const recipes = this.getRecipes()
    const filteredRecipes = recipes.filter(recipe => recipe.id !== id)
    if (filteredRecipes.length === recipes.length) return false
    
    this.saveRecipes(filteredRecipes)
    return true
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
        return this.extractBasicIngredients(instructions)
      }
    } catch (error) {
      console.error('AI ingredient extraction failed, using fallback:', error)
      return this.extractBasicIngredients(instructions)
    }
  }

  // Basic ingredient extraction (fallback method)
  private extractBasicIngredients(instructions: string): string[] {
    const { items, confidence } = parseIngredientsFromInstructions(instructions)
    if (items.length === 0 || confidence < 0.25) {
      return []
    }

    return items.map(item => item.text)
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