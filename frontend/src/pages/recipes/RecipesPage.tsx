import { useState, useEffect, useCallback } from 'react'
import { RecipeViewModal, ShoppingListAddResult } from '../../components/meal-planning/RecipeViewModal'
import { shoppingListService } from '../../services/shoppingListService'
import { recipeService } from '../../services/recipeService'
import { Recipe, RecipeCategory } from '../../types/recipe'

const RecipesPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<any>(null)
  const [showRecipeView, setShowRecipeView] = useState(false)
  const [viewingRecipeDetail, setViewingRecipeDetail] = useState<{ formatted: any; raw: any } | null>(null)
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    instructions: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    difficulty: 'medium',
    mealType: 'dinner',
    isPublic: true,
    ingredients: [{ id: '', name: '', quantity: 1, unit: 'pieces' }]
  })

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadRecipes = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)
      const allRecipes = await recipeService.getAllRecipes()
      setRecipes(allRecipes)
    } catch (error) {
      console.error('Error loading recipes:', error)
      setLoadError('Failed to load recipes. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.description && recipe.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const recipeCategory = (recipe.mealType || recipe.category || 'Dinner').toString().toLowerCase()
    const matchesCategory = selectedCategory === 'all' || recipeCategory === selectedCategory
    return matchesSearch && matchesCategory
  })

  const mapToCategory = (value: string | undefined): RecipeCategory => {
    const normalized = (value || 'Dinner').toLowerCase()
    switch (normalized) {
      case 'breakfast':
        return 'Breakfast'
      case 'lunch':
        return 'Lunch'
      case 'snack':
        return 'Snack'
      case 'dessert':
        return 'Dessert'
      case 'beverage':
        return 'Beverage'
      default:
        return 'Dinner'
    }
  }

  const transformRecipeForModal = (recipeData: any) => {
    const formattedIngredients = Array.isArray(recipeData.ingredients)
      ? recipeData.ingredients.map((ing: any) => {
          const parts = [] as string[]
          if (ing.quantity !== null && ing.quantity !== undefined && ing.quantity !== '') {
            parts.push(String(ing.quantity))
          }
          if (ing.unit) {
            parts.push(ing.unit)
          }
          if (ing.name) {
            parts.push(ing.name)
          }
          return parts.join(' ').trim()
        }).filter((line: string) => line.length > 0)
      : []

    return {
      id: recipeData.id?.toString() || '',
      name: recipeData.name || 'Untitled Recipe',
      category: mapToCategory(recipeData.category || recipeData.mealType || recipeData.meal_type),
      instructions: recipeData.instructions || '',
      ingredients: formattedIngredients,
      prepTime: recipeData.prep_time ?? recipeData.prepTime ?? 30,
      cookTime: recipeData.cook_time ?? recipeData.cookTime ?? 30,
      servings: recipeData.servings ?? 4,
      difficulty: recipeData.difficulty || 'medium',
      description: recipeData.description || '',
      createdAt: recipeData.created_at || new Date().toISOString(),
      updatedAt: recipeData.updated_at || new Date().toISOString()
    }
  }

  const loadRecipeDetails = async (recipeId: string | number) => {
    const id = String(recipeId)
    const recipeData = await recipeService.getRecipeById(id)

    if (!recipeData) {
      throw new Error('Recipe not found')
    }

    return {
      formatted: transformRecipeForModal(recipeData),
      raw: recipeData
    }
  }

  const buildShoppingIngredientsFromRecipe = (recipeData: any) => {
    if (!recipeData) return []

    if (Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0) {
      return recipeData.ingredients
        .map((ing: any) => {
          const quantity = ing.quantity !== null && ing.quantity !== undefined && ing.quantity !== ''
            ? ing.quantity
            : null
          const unit = ing.unit || null
          const name = ing.name || null
          const text = [quantity, unit, name]
            .filter(part => part !== null && part !== undefined && String(part).trim().length > 0)
            .map(part => String(part).trim())
            .join(' ')
            .trim()

          if (!text) {
            return null
          }

          return {
            text,
            quantity: quantity === null ? null : String(quantity),
            unit,
            name
          }
        })
        .filter(Boolean)
    }

    if (typeof recipeData.instructions === 'string' && recipeData.instructions.trim()) {
      const parsed = recipeService.parseInstructions(recipeData.instructions)
      if (parsed.items.length > 0) {
        return parsed.items.map(item => ({
          text: item.text,
          quantity: item.quantity ?? item.quantityValue ?? null,
          unit: item.unit ?? null,
          name: item.name ?? null
        }))
      }
    }

    return []
  }

  const handleViewRecipe = async (recipeId: string | number) => {
    try {
      const details = await loadRecipeDetails(recipeId)
      setViewingRecipeDetail(details)
      setShowRecipeView(true)
    } catch (error) {
      console.error('Error fetching recipe:', error)
      alert('Error loading recipe details')
    }
  }

  const handleAddRecipeIngredientsToShoppingList = async (recipeId: string | number): Promise<ShoppingListAddResult> => {
    try {
      const recipeIdStr = String(recipeId)

      let recipeData = viewingRecipeDetail?.raw && viewingRecipeDetail.raw.id?.toString() === recipeIdStr
        ? viewingRecipeDetail.raw
        : null

      if (!recipeData) {
        const details = await loadRecipeDetails(recipeIdStr)
        recipeData = details.raw
      }

      const ingredients = buildShoppingIngredientsFromRecipe(recipeData)
      if (!ingredients.length) {
        return {
          success: false,
          addedCount: 0,
          error: 'No ingredients found for this recipe.'
        }
      }

      const addedItems = await shoppingListService.addIngredientsToList(ingredients)
      if (!addedItems.length) {
        return {
          success: false,
          addedCount: 0,
          error: 'No ingredients were added to the shopping list.'
        }
      }

      return {
        success: true,
        addedCount: addedItems.length,
        message: `Added ${addedItems.length} ingredient${addedItems.length === 1 ? '' : 's'} to your shopping list.`
      }
    } catch (error) {
      console.error('Error adding recipe ingredients to shopping list:', error)
      return {
        success: false,
        addedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to add ingredients to shopping list.'
      }
    }
  }

  const handleAddIngredient = () => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { id: Date.now().toString(), name: '', quantity: 1, unit: 'pieces' }]
    }))
  }

  const handleRemoveIngredient = (index: number) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const handleIngredientChange = (index: number, field: string, value: string) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => 
        i === index ? { ...ingredient, [field]: field === 'quantity' ? parseFloat(value) || 0 : value } : ingredient
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newRecipe.name.trim() || !newRecipe.instructions.trim()) {
      alert('Recipe name and instructions are required')
      return
    }

    if (newRecipe.ingredients.length === 0 || newRecipe.ingredients.every(ing => !ing.name.trim())) {
      alert('At least one ingredient is required')
      return
    }

    try {
      const recipeData = {
        name: newRecipe.name,
        instructions: newRecipe.instructions,
        category: mapToCategory(newRecipe.mealType),
        description: newRecipe.description,
        prepTime: parseInt(newRecipe.prepTime) || 0,
        cookTime: parseInt(newRecipe.cookTime) || 0,
        servings: parseInt(newRecipe.servings) || 1,
        difficulty: newRecipe.difficulty,
        mealType: newRecipe.mealType,
        isPublic: newRecipe.isPublic,
        ingredients: newRecipe.ingredients
          .filter(ing => ing.name.trim() !== '')
          .map(ing => ({
            name: ing.name,
            quantity: parseFloat(ing.quantity.toString()) || 0,
            unit: ing.unit
          }))
      }

      await recipeService.createRecipe(recipeData)
      await loadRecipes()
      setShowAddForm(false)
      setNewRecipe({
        name: '',
        description: '',
        instructions: '',
        prepTime: '',
        cookTime: '',
        servings: '',
        difficulty: 'medium',
        mealType: 'dinner',
        isPublic: true,
        ingredients: [{ id: '', name: '', quantity: 1, unit: 'pieces' }]
      })
    } catch (error) {
      console.error('Error creating recipe:', error)
      alert('Failed to create recipe. Please check all fields and try again.')
    }
  }

  const handleEditRecipe = (recipe: any) => {
    const transformedRecipe = {
      ...recipe,
      prepTime: recipe.prepTime ?? recipe.prep_time ?? 0,
      cookTime: recipe.cookTime ?? recipe.cook_time ?? 0,
      mealType: (recipe.mealType || recipe.category || 'Dinner').toString().toLowerCase(),
      isPublic: recipe.isPublic ?? recipe.is_public ?? false,
      ingredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
        ? recipe.ingredients
        : [{ id: '', name: '', quantity: 1, unit: 'pieces' }],
      instructions: recipe.instructions || '',
      description: recipe.description || ''
    }
    setEditingRecipe(transformedRecipe)
    setShowEditForm(true)
  }

  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingRecipe) return
    
    // Validation
    if (!editingRecipe.name.trim()) {
      alert('Recipe name is required')
      return
    }
    
    const ingredients = editingRecipe.ingredients || []
    if (ingredients.length === 0 || ingredients.every((ing: any) => !ing.name.trim())) {
      alert('At least one ingredient is required')
      return
    }
    
    try {
      const recipeData = {
        name: editingRecipe.name,
        description: editingRecipe.description || '',
        instructions: editingRecipe.instructions || '',
        category: mapToCategory(editingRecipe.mealType),
        prepTime: parseInt(editingRecipe.prepTime) || 0,
        cookTime: parseInt(editingRecipe.cookTime) || 0,
        servings: parseInt(editingRecipe.servings) || 1,
        difficulty: editingRecipe.difficulty || 'medium',
        mealType: editingRecipe.mealType,
        isPublic: editingRecipe.isPublic || false,
        ingredients: ingredients
          .filter((ing: any) => ing.name.trim() !== '')
          .map((ing: any) => ({
            name: ing.name,
            quantity: parseFloat(ing.quantity.toString()) || 0,
            unit: ing.unit || 'pieces'
          }))
      }

      await recipeService.updateRecipe(editingRecipe.id, recipeData)
      await loadRecipes()
      setShowEditForm(false)
      setEditingRecipe(null)
    } catch (error) {
      console.error('Error updating recipe:', error)
      alert('Failed to update recipe. Please check all fields and try again.')
    }
  }

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return
    
    try {
      await recipeService.deleteRecipe(recipeId)
      await loadRecipes()
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Failed to delete recipe')
    }
  }

  const categories = ['all', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'beverage']
  
  const validUnits = [
    'pieces', 'cups', 'tablespoons', 'teaspoons', 'grams', 'kilograms', 
    'ounces', 'pounds', 'milliliters', 'liters'
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recipe Collection</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Discover and manage your favorite recipes</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Recipe
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6 dark:bg-dark-800 dark:border-gray-700">
        {loadError && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200">
            {loadError}
          </div>
        )}
        {isLoading && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
            Loading recipes...
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-48 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow dark:border-gray-700 dark:bg-dark-800 flex flex-col h-full" style={{ height: '360px' }}>
              <div className="h-48 bg-gray-200 flex items-center justify-center dark:bg-dark-700 flex-shrink-0">
                <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="p-4 flex flex-col" style={{ height: '212px' }}>
                <h3
                  className="text-lg font-semibold text-gray-900 mb-2 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  onClick={() => handleViewRecipe(recipe.id)}
                  style={{ 
                    textDecoration: 'underline', 
                    textDecorationStyle: 'dotted', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap', 
                    display: 'block',
                    maxWidth: '100%',
                    width: '100%'
                  }}
                  title={recipe.name}
                >
                  {recipe.name.length > 100 ? recipe.name.substring(0, 100) + '...' : recipe.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3 dark:text-gray-400" style={{ height: '40px', overflow: 'hidden' }}>{recipe.description || 'No description provided.'}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {recipe.cookTime ?? '—'} min
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {recipe.servings ?? '—'} servings
                  </span>
                </div>
                <div className="flex gap-2 items-center justify-between flex-shrink-0">
                  <button 
                    onClick={async () => {
                      const result = await handleAddRecipeIngredientsToShoppingList(recipe.id)
                      if (result.success && result.message) {
                        alert(result.message)
                      } else if (result.error) {
                        alert(result.error)
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/20 transition-colors"
                    title="Add ingredients to shopping list"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Add to Shopping
                  </button>
                  <div className="flex gap-1 flex-shrink-0">
                    <button 
                      onClick={() => handleEditRecipe(recipe)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-dark-700 transition-colors"
                      title="Edit recipe"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      className="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete recipe"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No recipes found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or add a new recipe.</p>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 dark:bg-black dark:bg-opacity-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-dark-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add New Recipe</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Recipe Name</label>
                    <input
                      type="text"
                      required
                      value={newRecipe.name}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Meal Type</label>
                    <select
                      value={newRecipe.mealType}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, mealType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="dessert">Dessert</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Description</label>
                  <textarea
                    value={newRecipe.description}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Prep Time (minutes)</label>
                    <input
                      type="number"
                      value={newRecipe.prepTime}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, prepTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Cook Time (minutes)</label>
                    <input
                      type="number"
                      value={newRecipe.cookTime}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, cookTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Servings</label>
                    <input
                      type="number"
                      value={newRecipe.servings}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, servings: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Difficulty</label>
                    <select
                      value={newRecipe.difficulty}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={newRecipe.isPublic}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:focus:ring-blue-500"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Make recipe public
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ingredients</label>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="text-blue-600 hover:text-blue-800 text-sm dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      + Add Ingredient
                    </button>
                  </div>
                  {newRecipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Ingredient name"
                          value={ingredient.name}
                          onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={ingredient.quantity}
                          onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={ingredient.unit}
                          onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                        >
                          {validUnits.map(unit => (
                            <option key={unit} value={unit}>
                              {unit.charAt(0).toUpperCase() + unit.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {newRecipe.ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(index)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Instructions</label>
                  <textarea
                    value={newRecipe.instructions}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, instructions: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400"
                    rows={4}
                    placeholder="Enter cooking instructions step by step..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-dark-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    Create Recipe
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Recipe Modal */}
      {showEditForm && editingRecipe && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 dark:bg-black dark:bg-opacity-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-dark-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Recipe</h3>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateRecipe} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Recipe Name</label>
                    <input
                      type="text"
                      required
                      value={editingRecipe.name}
                      onChange={(e) => setEditingRecipe(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Meal Type</label>
                    <select
                      value={editingRecipe.mealType}
                      onChange={(e) => setEditingRecipe(prev => ({ ...prev, mealType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="dessert">Dessert</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Description</label>
                  <textarea
                    value={editingRecipe.description}
                    onChange={(e) => setEditingRecipe(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Prep Time (minutes)</label>
                    <input
                      type="number"
                      value={editingRecipe.prepTime || ''}
                      onChange={(e) => setEditingRecipe(prev => ({ ...prev, prepTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Cook Time (minutes)</label>
                    <input
                      type="number"
                      value={editingRecipe.cookTime || ''}
                      onChange={(e) => setEditingRecipe(prev => ({ ...prev, cookTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Servings</label>
                    <input
                      type="number"
                      value={editingRecipe.servings || ''}
                      onChange={(e) => setEditingRecipe(prev => ({ ...prev, servings: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Difficulty</label>
                    <select
                      value={editingRecipe.difficulty}
                      onChange={(e) => setEditingRecipe(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="editIsPublic"
                      checked={editingRecipe.isPublic}
                      onChange={(e) => setEditingRecipe(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:focus:ring-blue-500"
                    />
                    <label htmlFor="editIsPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Make recipe public
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ingredients</label>
                    <button
                      type="button"
                      onClick={() => setEditingRecipe(prev => ({
                        ...prev,
                        ingredients: [...(prev.ingredients || []), { id: Date.now().toString(), name: '', quantity: 1, unit: 'pieces' }]
                      }))}
                      className="text-blue-600 hover:text-blue-800 text-sm dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      + Add Ingredient
                    </button>
                  </div>
                  {(editingRecipe.ingredients || []).map((ingredient: any, index: number) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Ingredient name"
                          value={ingredient.name}
                          onChange={(e) => setEditingRecipe(prev => ({
                            ...prev,
                            ingredients: prev.ingredients.map((ing: any, i: number) => 
                              i === index ? { ...ing, name: e.target.value } : ing
                            )
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={ingredient.quantity}
                          onChange={(e) => setEditingRecipe(prev => ({
                            ...prev,
                            ingredients: prev.ingredients.map((ing: any, i: number) => 
                              i === index ? { ...ing, quantity: e.target.value } : ing
                            )
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={ingredient.unit}
                          onChange={(e) => setEditingRecipe(prev => ({
                            ...prev,
                            ingredients: prev.ingredients.map((ing: any, i: number) => 
                              i === index ? { ...ing, unit: e.target.value } : ing
                            )
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                        >
                          {validUnits.map(unit => (
                            <option key={unit} value={unit}>
                              {unit.charAt(0).toUpperCase() + unit.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {editingRecipe.ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditingRecipe(prev => ({
                              ...prev,
                              ingredients: (prev.ingredients || []).filter((_: any, i: number) => i !== index)
                            }))}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Instructions</label>
                  <textarea
                    value={editingRecipe.instructions}
                    onChange={(e) => setEditingRecipe(prev => ({ ...prev, instructions: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400"
                    rows={4}
                    placeholder="Enter cooking instructions step by step..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-dark-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    Update Recipe
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add to Grocery List Modal */}
      {showRecipeView && viewingRecipeDetail && (
        <RecipeViewModal
          isOpen={showRecipeView}
          onClose={() => {
            setShowRecipeView(false)
            setViewingRecipeDetail(null)
          }}
          recipe={viewingRecipeDetail.formatted}
          isAIGenerated={false}
          onAddToShoppingList={() => handleAddRecipeIngredientsToShoppingList(viewingRecipeDetail.raw.id)}
        />
      )}
    </div>
  )
}

export default RecipesPage