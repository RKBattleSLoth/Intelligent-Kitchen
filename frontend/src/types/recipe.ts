export type RecipeCategory = 'Dinner' | 'Lunch' | 'Breakfast' | 'Snack' | 'Dessert' | 'Beverage'

export interface Recipe {
  id: string
  name: string
  category: RecipeCategory
  instructions: string // Combined ingredients and instructions
  createdAt: string
  updatedAt: string
}

export interface RecipeFormData {
  name: string
  category: RecipeCategory
  instructions: string
}