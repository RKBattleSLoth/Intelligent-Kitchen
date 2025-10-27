export type RecipeCategory = 'Dinner' | 'Lunch' | 'Breakfast' | 'Snack' | 'Dessert' | 'Beverage'

export interface Recipe {
  id: string
  name: string
  category: RecipeCategory
  instructions: string // Combined ingredients and instructions
  createdAt: string
  updatedAt: string
  description?: string
  ingredients?: Array<string | {
    text?: string
    quantity?: string | number | null
    unit?: string | null
    name?: string | null
  }>
  prepTime?: number
  cookTime?: number
  servings?: number
  difficulty?: string
  mealType?: string
  isPublic?: boolean
}

export interface RecipeFormData {
  name: string
  category: RecipeCategory
  instructions: string
  description?: string
  ingredients?: Array<string | {
    text?: string
    quantity?: string | number | null
    unit?: string | null
    name?: string | null
  }>
  prepTime?: number
  cookTime?: number
  servings?: number
  difficulty?: string
  mealType?: string
  isPublic?: boolean
}