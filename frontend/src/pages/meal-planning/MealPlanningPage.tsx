import React, { useState, useEffect } from 'react'
import { MealSlot, PlannedMeal, MealPlanFilters, DEFAULT_MEAL_PLAN_FILTERS, MEAL_SLOTS } from '../../types/mealPlan'
import { Recipe } from '../../types/recipe'
import { mealPlanService } from '../../services/mealPlanService'
import { recipeService } from '../../services/recipeService'
import { shoppingListService } from '../../services/shoppingListService'
import { RecipeForm } from '../../components/recipes/RecipeForm'
import { SmartMealPlannerModal } from '../../components/meal-planning/SmartMealPlannerModal'
import { RecipeViewModal, ShoppingListAddResult } from '../../components/meal-planning/RecipeViewModal'

interface RecipeSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectRecipe: (recipe: Recipe) => void
  onAddNewRecipe: () => void
  mealSlot: MealSlot
  date: string
}

const RecipeSelectionModal: React.FC<RecipeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectRecipe,
  onAddNewRecipe,
  mealSlot,
  date
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadRecipes()
    }
  }, [isOpen])

  useEffect(() => {
    filterRecipes()
  }, [recipes, searchTerm])

  const loadRecipes = async () => {
    try {
      const recipeList = await recipeService.getAllRecipes()
      // Filter recipes by category matching the meal slot
      const filteredByCategory = recipeList.filter(recipe => recipe.category === mealSlot)
      setRecipes(filteredByCategory)
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterRecipes = () => {
    let filtered = recipes

    if (searchTerm) {
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.instructions.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredRecipes(filtered)
  }

  if (!isOpen) return null

  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }
  }, [
    React.createElement('div', {
      key: 'modal',
      style: {
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '0.5rem',
        padding: '2rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }
      }, [
        React.createElement('h2', {
          key: 'title',
          style: { fontSize: '1.5rem', fontWeight: 'bold', color: '#f1f5f9' }
        }, `Select ${mealSlot} Recipe`),
        React.createElement('button', {
          key: 'close',
          onClick: onClose,
          style: {
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#94a3b8'
          }
        }, '×')
      ]),

      // Date display
      React.createElement('p', {
        key: 'date',
        style: { color: '#94a3b8', marginBottom: '1rem' }
      }, `Date: ${new Date(date).toLocaleDateString()}`),

      // Search
      React.createElement('input', {
        key: 'search',
        type: 'text',
        placeholder: 'Search recipes...',
        value: searchTerm,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value),
        style: {
          width: '100%',
          padding: '0.75rem',
          border: '1px solid #4b5563',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          background: '#0f172a',
          color: '#f9fafb',
          marginBottom: '1rem'
        }
      }),

      // Add new recipe button
      React.createElement('button', {
        key: 'add-new',
        onClick: onAddNewRecipe,
        style: {
          width: '100%',
          padding: '0.75rem',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          cursor: 'pointer',
          marginBottom: '1rem'
        }
      }, `+ Add New ${mealSlot} Recipe`),

      // Recipe list
      React.createElement('div', {
        key: 'recipe-list',
        style: { maxHeight: '300px', overflow: 'auto' }
      }, 
        loading 
          ? React.createElement('div', {
              style: { textAlign: 'center', padding: '2rem', color: '#94a3b8' }
            }, 'Loading recipes...')
          : filteredRecipes.length === 0
            ? React.createElement('div', {
                style: { textAlign: 'center', padding: '2rem', color: '#94a3b8' }
              }, searchTerm 
                ? 'No recipes found matching your search'
                : `No ${mealSlot} recipes found. Try adding one first!`)
            : filteredRecipes.map(recipe => 
                React.createElement('div', {
                  key: recipe.id,
                  onClick: () => onSelectRecipe(recipe),
                  style: {
                    padding: '1rem',
                    border: '1px solid #334155',
                    borderRadius: '0.375rem',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    background: '#0f172a',
                    transition: 'background 0.2s'
                  }
                }, [
                  React.createElement('h3', {
                    key: 'name',
                    style: {
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem',
                      color: '#f1f5f9'
                    }
                  }, recipe.name),
                  React.createElement('p', {
                    key: 'preview',
                    style: {
                      fontSize: '0.875rem',
                      color: '#94a3b8',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }
                  }, recipe.instructions.substring(0, 100) + (recipe.instructions.length > 100 ? '...' : ''))
                ])
              )
      )
    ])
  ])
}

export const MealPlanningPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filters, setFilters] = useState<MealPlanFilters>(DEFAULT_MEAL_PLAN_FILTERS)
  const [plannedMeals, setPlannedMeals] = useState<Record<string, PlannedMeal>>({})
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; mealSlot: MealSlot } | null>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [draggedMeal, setDraggedMeal] = useState<{ date: string; mealSlot: MealSlot; meal: PlannedMeal } | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ date: string; mealSlot: MealSlot } | null>(null)
  const [showSmartPlanner, setShowSmartPlanner] = useState(false)
  const [showRecipeView, setShowRecipeView] = useState(false)
  const [viewingRecipe, setViewingRecipe] = useState<{ recipe: Recipe; date: string; mealSlot: MealSlot } | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearAction, setClearAction] = useState<string | null>(null)
  const [isSelectingDays, setIsSelectingDays] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())

  const toggleDaySelection = (date: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  const resetDaySelection = () => {
    setSelectedDates(new Set())
    setIsSelectingDays(false)
  }

  const extractIngredientsForShopping = (recipe: any): Array<string | {
    text?: string
    quantity?: string | number | null
    unit?: string | null
    name?: string | null
  }> => {
    if (!recipe) return []

    if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
      return recipe.ingredients
    }

    if (typeof recipe.instructions === 'string' && recipe.instructions.trim()) {
      const parsed = recipeService.parseInstructions(recipe.instructions)
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

  const addIngredientsGroupToShoppingList = async (
    ingredients: Array<string | { text?: string; quantity?: string | number | null; unit?: string | null; name?: string | null }> | undefined,
    contextLabel: string
  ): Promise<ShoppingListAddResult> => {
    if (!ingredients || ingredients.length === 0) {
      return {
        success: false,
        addedCount: 0,
        error: `No ingredients found ${contextLabel}.`
      }
    }

    try {
      const addedItems = await shoppingListService.addIngredientsToList(ingredients)
      if (!addedItems || addedItems.length === 0) {
        return {
          success: false,
          addedCount: 0,
          error: `No ingredients were added ${contextLabel}.`
        }
      }

      return {
        success: true,
        addedCount: addedItems.length,
        message: `Added ${addedItems.length} item${addedItems.length === 1 ? '' : 's'} to your shopping list ${contextLabel}.`
      }
    } catch (error) {
      console.error('Error adding ingredients to shopping list:', error)
      return {
        success: false,
        addedCount: 0,
        error: 'Failed to add ingredients to shopping list. Please try again.'
      }
    }
  }

  const handleAddRecipeIngredientsToShoppingList = async (recipe: Recipe): Promise<ShoppingListAddResult> => {
    const ingredients = extractIngredientsForShopping(recipe as any)
    return addIngredientsGroupToShoppingList(ingredients, `from "${recipe.name}"`)
  }

  const handleAddDayToShoppingList = async (date: string): Promise<ShoppingListAddResult> => {
    const mealsForDate = Object.values(plannedMeals).filter(meal => meal.date === date)
    if (mealsForDate.length === 0) {
      return {
        success: false,
        addedCount: 0,
        error: 'No meals planned for this day.'
      }
    }

    const ingredients: Array<string | { text?: string; quantity?: string | number | null; unit?: string | null; name?: string | null }> = []
    mealsForDate.forEach(meal => {
      ingredients.push(...extractIngredientsForShopping(meal.recipe as any))
    })

    const friendlyDate = new Date(`${date}T00:00:00`).toLocaleDateString()
    return addIngredientsGroupToShoppingList(ingredients, `for ${friendlyDate}`)
  }

  const handleAddWeekToShoppingList = async (): Promise<ShoppingListAddResult> => {
    const weekDateKeys = getWeekDates().map(date => date.toISOString().split('T')[0])
    const weekDateSet = new Set(weekDateKeys)
    const weekMeals = Object.values(plannedMeals).filter(meal => weekDateSet.has(meal.date))

    if (weekMeals.length === 0) {
      return {
        success: false,
        addedCount: 0,
        error: 'No meals planned for this week.'
      }
    }

    const ingredients: Array<string | { text?: string; quantity?: string | number | null; unit?: string | null; name?: string | null }> = []
    weekMeals.forEach(meal => {
      ingredients.push(...extractIngredientsForShopping(meal.recipe as any))
    })

    return addIngredientsGroupToShoppingList(ingredients, 'for this week')
  }

  const handleAddSelectedDaysToShoppingList = async (): Promise<ShoppingListAddResult> => {
    if (selectedDates.size === 0) {
      return {
        success: false,
        addedCount: 0,
        error: 'No days selected.'
      }
    }

    const sortedDates = Array.from(selectedDates).sort()
    const selectedMeals = Object.values(plannedMeals).filter(meal => selectedDates.has(meal.date))

    if (selectedMeals.length === 0) {
      return {
        success: false,
        addedCount: 0,
        error: 'No meals planned for the selected days.'
      }
    }

    const ingredients: Array<string | { text?: string; quantity?: string | number | null; unit?: string | null; name?: string | null }> = []
    selectedMeals.forEach(meal => {
      ingredients.push(...extractIngredientsForShopping(meal.recipe as any))
    })

    const friendlyLabel = sortedDates
      .map(date => new Date(`${date}T00:00:00`).toLocaleDateString())
      .join(', ')

    const result = await addIngredientsGroupToShoppingList(ingredients, `for ${friendlyLabel}`)
    if (result.success) {
      resetDaySelection()
    }
    return result
  }

  useEffect(() => {
    loadFilters()
    loadPlannedMeals()
  }, [currentDate])

  // Subscribe to mealPlanService changes (for Betsy updates)
  useEffect(() => {
    const unsubscribe = mealPlanService.subscribe(() => {
      console.log('[MealPlanningPage] Meal plan changed, reloading...')
      loadPlannedMeals()
    })
    return unsubscribe
  }, [])

  const loadFilters = () => {
    const savedFilters = mealPlanService.getFilters()
    setFilters(savedFilters)
  }

  const loadPlannedMeals = () => {
    const meals: Record<string, PlannedMeal> = {}
    const startDate = new Date(currentDate)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start of week
    startDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      MEAL_SLOTS.forEach(mealSlot => {
        const plannedMeal = mealPlanService.getPlannedMeal(dateStr, mealSlot)
        if (plannedMeal) {
          meals[`${dateStr}-${mealSlot}`] = plannedMeal
        }
      })
    }

    setPlannedMeals(meals)
  }

  const handleFilterToggle = (mealSlot: keyof MealPlanFilters) => {
    const newFilters = { ...filters, [mealSlot]: !filters[mealSlot] }
    setFilters(newFilters)
    mealPlanService.updateFilters(newFilters)
  }

  const handleMealSlotClick = (date: string, mealSlot: MealSlot, e?: React.MouseEvent) => {
    if (isSelectingDays) {
      e?.preventDefault()
      return
    }
    setSelectedSlot({ date, mealSlot })
    setShowRecipeModal(true)
  }

  const handleRecipeSelect = (recipe: Recipe) => {
    if (selectedSlot) {
      mealPlanService.addPlannedMeal(selectedSlot.date, selectedSlot.mealSlot, recipe)
      loadPlannedMeals()
    }
    setShowRecipeModal(false)
    setSelectedSlot(null)
  }

  const handleAddNewRecipe = () => {
    setShowRecipeModal(false)
    setShowRecipeForm(true)
  }

  const handleRemoveMeal = (date: string, mealSlot: MealSlot) => {
    mealPlanService.removePlannedMeal(date, mealSlot)
    loadPlannedMeals()
  }

  const handleRecipeFormSave = () => {
    setShowRecipeForm(false)
    // Re-open the recipe modal to select the newly added recipe
    setShowRecipeModal(true)
  }

  const handleSmartMealPlanGenerated = (result: any) => {
    console.log('MealPlanningPage: Smart meal plan generated successfully')
    if (result.mealPlan) {
      mealPlanService.syncAIMealPlan(result.mealPlan)
      loadPlannedMeals()
      console.log('MealPlanningPage: Meal plan synced and UI reloaded')
    } else {
      console.warn('MealPlanningPage: No mealPlan in result')
    }
  }

  // Helper function to check if a recipe is AI-generated
  const isAIGenerated = (recipe: Recipe): boolean => {
    return recipe.id.startsWith('ai-recipe-')
  }

  // Handle clicking on recipe name (view recipe)
  const handleRecipeNameClick = (date: string, mealSlot: MealSlot, recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the meal slot click
    setViewingRecipe({ recipe, date, mealSlot })
    setShowRecipeView(true)
  }

  // Handle clicking on meal card area (change recipe)
  const handleMealCardClick = (date: string, mealSlot: MealSlot, e: React.MouseEvent) => {
    if (isSelectingDays) return
    // Check if the click was on the recipe name or remove button
    if ((e.target as HTMLElement).closest('.recipe-name') || 
        (e.target as HTMLElement).closest('.remove-button')) {
      return
    }
    setSelectedSlot({ date, mealSlot })
    setShowRecipeModal(true)
  }

  // Handle saving an edited recipe
  const handleSaveEditedRecipe = (editedRecipe: Recipe) => {
    if (viewingRecipe) {
      // Update the meal with the edited recipe
      mealPlanService.addPlannedMeal(viewingRecipe.date, viewingRecipe.mealSlot, editedRecipe)
      loadPlannedMeals()
    }
  }

  // Handle replacing the current recipe
  const handleReplaceMeal = () => {
    if (viewingRecipe) {
      setShowRecipeView(false)
      setSelectedSlot({ date: viewingRecipe.date, mealSlot: viewingRecipe.mealSlot })
      setShowRecipeModal(true)
      setViewingRecipe(null)
    }
  }

  // Clear action handlers
  const handleClearWeek = () => {
    const startDate = new Date(currentDate)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start of week
    const start = startDate.toISOString().split('T')[0]
    
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    const end = endDate.toISOString().split('T')[0]
    
    mealPlanService.clearMealPlansForWeek(start, end)
    loadPlannedMeals()
    setShowClearConfirm(false)
    setClearAction(null)
  }

  const handleClearAll = () => {
    mealPlanService.clearAllMealPlans()
    loadPlannedMeals()
    setShowClearConfirm(false)
    setClearAction(null)
  }

  const handleClearDay = (date: string) => {
    mealPlanService.clearMealPlansForDate(date)
    loadPlannedMeals()
    setShowClearConfirm(false)
    setClearAction(null)
  }

  const handleClearMealType = (mealSlot: string) => {
    mealPlanService.clearMealsForType(mealSlot)
    loadPlannedMeals()
    setShowClearConfirm(false)
    setClearAction(null)
  }

  const handleClearAIRecipes = () => {
    const aiCount = mealPlanService.getAIRecipeCount()
    if (aiCount === 0) {
      alert('No AI-generated recipes found to clear.')
      setShowClearConfirm(false)
      setClearAction(null)
      return
    }
    
    if (confirm(`This will remove ${aiCount} AI-generated recipe(s) from your meal plan. Continue?`)) {
      mealPlanService.clearAIRecipes()
      loadPlannedMeals()
      setShowClearConfirm(false)
      setClearAction(null)
    }
  }

  const handleClearSelectedDates = () => {
    if (selectedDates.size === 0) {
      alert('No days selected.')
      return
    }
    handleClearConfirm('selected')
  }

  const handleClearConfirm = (action: string) => {
    setClearAction(action)
    setShowClearConfirm(true)
  }

  const executeClearAction = () => {
    switch (clearAction) {
      case 'week':
        handleClearWeek()
        break
      case 'all':
        handleClearAll()
        break
      case 'breakfast':
      case 'lunch':
      case 'dinner':
      case 'snack':
      case 'dessert':
        handleClearMealType(clearAction)
        break
      case 'ai':
        handleClearAIRecipes()
        break
      case 'selected':
        selectedDates.forEach(date => handleClearDay(date))
        setShowClearConfirm(false)
        setClearAction(null)
        resetDaySelection()
        break
      default:
        break
    }
  }

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, date: string, mealSlot: MealSlot, meal: PlannedMeal) => {
    if (isSelectingDays) {
      e.preventDefault()
      return
    }
    setDraggedMeal({ date, mealSlot, meal })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, date: string, mealSlot: MealSlot) => {
    if (isSelectingDays) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot({ date, mealSlot })
  }

  const handleDragLeave = () => {
    setDragOverSlot(null)
  }

  const handleDrop = (e: React.DragEvent, targetDate: string, targetMealSlot: MealSlot) => {
    if (isSelectingDays) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    setDragOverSlot(null)

    if (!draggedMeal) return

    const { date: sourceDate, mealSlot: sourceMealSlot, meal } = draggedMeal

    // Don't do anything if dropping on the same slot
    if (sourceDate === targetDate && sourceMealSlot === targetMealSlot) {
      setDraggedMeal(null)
      return
    }

    // Get the meal that's currently in the target slot (if any)
    const targetMeal = mealPlanService.getPlannedMeal(targetDate, targetMealSlot)

    // Remove the meal from the source slot
    mealPlanService.removePlannedMeal(sourceDate, sourceMealSlot)

    // Add the dragged meal to the target slot
    mealPlanService.addPlannedMeal(targetDate, targetMealSlot, meal.recipe)

    // If there was a meal in the target slot, move it to the source slot
    if (targetMeal) {
      mealPlanService.addPlannedMeal(sourceDate, sourceMealSlot, targetMeal.recipe)
    }

    // Reload the planned meals to reflect the changes
    loadPlannedMeals()
    setDraggedMeal(null)
  }

  const handleDragEnd = () => {
    setDraggedMeal(null)
    setDragOverSlot(null)
  }

  const getWeekDates = () => {
    const dates = []
    const startDate = new Date(currentDate)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start of week
    startDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(date)
    }

    return dates
  }

  const weekDates = getWeekDates()
  const activeMealSlots = MEAL_SLOTS.filter(slot => filters[slot as keyof MealPlanFilters])

  if (showRecipeForm && selectedSlot) {
    return React.createElement('div', {
      style: { padding: '2rem' }
    }, [
      React.createElement('div', {
        key: 'header',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }
      }, [
        React.createElement('h2', {
          key: 'title',
          style: { fontSize: '1.5rem', fontWeight: 'bold', color: '#f1f5f9' }
        }, `Add New ${selectedSlot.mealSlot} Recipe`),
        React.createElement('button', {
          key: 'back',
          onClick: () => setShowRecipeForm(false),
          style: {
            padding: '0.5rem 1rem',
            background: '#374151',
            color: '#f1f5f9',
            border: '1px solid #4b5563',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }
        }, '← Back to Meal Planning')
      ]),
      React.createElement(RecipeForm, {
        key: 'recipe-form',
        defaultCategory: selectedSlot.mealSlot,
        onSave: (recipe: Recipe) => {
          setShowRecipeForm(false)
          // Re-open the recipe modal to select the newly added recipe
          setShowRecipeModal(true)
        },
        onCancel: () => setShowRecipeForm(false)
      })
    ])
  }

  return React.createElement('div', null, [
    // Header
    React.createElement('div', {
      key: 'header',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        marginBottom: '2rem'
      }
    }, [
      // Top row: Title and navigation
      React.createElement('div', {
        key: 'header-top',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }
      }, [
        React.createElement('h1', {
          key: 'title',
          style: { fontSize: '2rem', fontWeight: 'bold', color: '#f1f5f9' }
        }, '📅 Meal Planning'),
        
        // Week navigation
        React.createElement('div', {
          key: 'week-navigation',
          style: { display: 'flex', gap: '1rem', alignItems: 'center' }
        }, [
          React.createElement('button', {
            key: 'prev',
            onClick: () => {
              const newDate = new Date(currentDate)
              newDate.setDate(newDate.getDate() - 7)
              setCurrentDate(newDate)
            },
            style: {
              padding: '0.5rem 1rem',
              background: '#374151',
              color: '#f1f5f9',
              border: '1px solid #4b5563',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }
          }, '← Previous'),
          React.createElement('span', {
            key: 'current-week',
            style: { 
              color: '#f1f5f9', 
              fontWeight: 'bold',
              minWidth: '180px',
              textAlign: 'center',
              fontSize: '0.95rem'
            }
          }, `Week of ${weekDates[0].toLocaleDateString()}`),
          React.createElement('button', {
            key: 'next',
            onClick: () => {
              const newDate = new Date(currentDate)
              newDate.setDate(newDate.getDate() + 7)
              setCurrentDate(newDate)
            },
            style: {
              padding: '0.5rem 1rem',
              background: '#374151',
              color: '#f1f5f9',
              border: '1px solid #4b5563',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }
          }, 'Next →')
        ])
      ]),
      
      // Bottom row: All action buttons
      React.createElement('div', {
        key: 'header-bottom',
        style: {
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }
      }, [
        React.createElement('button', {
          key: 'smart-planner',
          onClick: () => setShowSmartPlanner(true),
          style: {
            padding: '0.6rem 1.25rem',
            background: '#10b981',
            color: 'white',
            border: '1px solid #059669',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap'
          }
        }, '🤖 Smart Meal Plan'),
        React.createElement('button', {
          key: 'add-week-shopping',
          onClick: async () => {
            const result = await handleAddWeekToShoppingList()
            if (result.success && result.message) {
              alert(result.message)
            } else if (result.error) {
              alert(result.error)
            }
          },
          style: {
            padding: '0.6rem 1.25rem',
            background: '#3b82f6',
            color: 'white',
            border: '1px solid #2563eb',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap'
          }
        }, '🛒 Add Week to Shopping'),
        React.createElement('button', {
          key: 'toggle-day-selection',
          onClick: () => {
            if (isSelectingDays) {
              resetDaySelection()
            } else {
              setIsSelectingDays(true)
            }
          },
          style: {
            padding: '0.6rem 1.25rem',
            background: isSelectingDays ? '#f97316' : '#0ea5e9',
            color: 'white',
            border: `1px solid ${isSelectingDays ? '#ea580c' : '#0284c7'}`,
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap'
          }
        }, isSelectingDays ? '✅ Done' : '🗓️ Select Days'),
        isSelectingDays && React.createElement('button', {
          key: 'add-selected-days',
          onClick: async () => {
            const result = await handleAddSelectedDaysToShoppingList()
            if (result.success && result.message) {
              alert(result.message)
            } else if (result.error) {
              alert(result.error)
            }
          },
          disabled: selectedDates.size === 0,
          style: {
            padding: '0.6rem 1.25rem',
            background: selectedDates.size === 0 ? '#475569' : '#6366f1',
            color: 'white',
            border: '1px solid #4c51bf',
            borderRadius: '0.375rem',
            cursor: selectedDates.size === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            opacity: selectedDates.size === 0 ? 0.7 : 1,
            whiteSpace: 'nowrap'
          }
        }, `🛒 Add to Shopping (${selectedDates.size})`),
        isSelectingDays && React.createElement('button', {
          key: 'clear-selected-days',
          onClick: handleClearSelectedDates,
          disabled: selectedDates.size === 0,
          style: {
            padding: '0.6rem 1.25rem',
            background: selectedDates.size === 0 ? '#475569' : '#dc2626',
            color: 'white',
            border: `1px solid ${selectedDates.size === 0 ? '#4b5563' : '#b91c1c'}`,
            borderRadius: '0.375rem',
            cursor: selectedDates.size === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            opacity: selectedDates.size === 0 ? 0.7 : 1,
            whiteSpace: 'nowrap'
          }
        }, `Clear (${selectedDates.size})`),
        React.createElement('button', {
          key: 'clear-main',
          onClick: () => handleClearConfirm('week'),
          style: {
            padding: '0.6rem 1.25rem',
            background: '#dc2626',
            color: 'white',
            border: '1px solid #b91c1c',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap'
          }
        }, '🗑️ Clear Week')
      ])
    ]),

    // Filters
    React.createElement('div', {
      key: 'filters',
      style: {
        background: '#1e293b',
        padding: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        marginBottom: '2rem'
      }
    }, [
      React.createElement('h3', {
        key: 'filters-title',
        style: { fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f1f5f9' }
      }, 'Meal Slots to Display:'),
      React.createElement('div', {
        key: 'filter-buttons',
        style: {
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap'
        }
      }, MEAL_SLOTS.map(mealSlot => 
        React.createElement('button', {
          key: mealSlot,
          onClick: () => handleFilterToggle(mealSlot as keyof MealPlanFilters),
          style: {
            padding: '0.5rem 1rem',
            background: filters[mealSlot as keyof MealPlanFilters] ? '#3b82f6' : '#374151',
            color: '#f1f5f9',
            border: '1px solid #4b5563',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }
        }, mealSlot)
      ))
    ]),

    // Meal Planning Grid
    React.createElement('div', {
      key: 'grid',
      style: {
        display: 'grid',
        gridTemplateColumns: '120px repeat(7, 1fr)',
        gap: '0.5rem',
        overflow: 'auto'
      }
    }, [
      // Empty corner cell
      React.createElement('div', { key: 'corner' }),

      // Day headers
      ...weekDates.map(date => {
        const dateStr = date.toISOString().split('T')[0]
        const isSelected = selectedDates.has(dateStr)
        return React.createElement('div', {
          key: `header-${date.toISOString()}`,
          onClick: isSelectingDays ? () => toggleDaySelection(dateStr) : undefined,
          style: {
            textAlign: 'center',
            padding: '0.75rem 0.5rem 0.5rem',
            background: isSelected ? 'rgba(251, 191, 36, 0.18)' : '#1e293b',
            border: `2px solid ${isSelected ? '#f59e0b' : '#334155'}`,
            borderRadius: '0.375rem',
            color: '#f1f5f9',
            fontWeight: 'bold',
            position: 'relative',
            cursor: isSelectingDays ? 'pointer' : 'default',
            transition: 'all 0.2s ease'
          }
        }, [
          isSelectingDays && React.createElement('div', {
            key: 'selection-indicator',
            style: {
              position: 'absolute',
              top: '0.35rem',
              left: '0.35rem',
              width: '1rem',
              height: '1rem',
              borderRadius: '0.25rem',
              border: `2px solid ${isSelected ? '#f59e0b' : '#cbd5f5'}`,
              background: isSelected ? '#f59e0b' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e293b',
              fontSize: '0.75rem',
              fontWeight: 700
            }
          }, isSelected ? '✓' : ''),
          React.createElement('div', { key: 'day' }, date.toLocaleDateString('en-US', { weekday: 'short' })),
          React.createElement('div', { key: 'date', style: { fontSize: '0.875rem', color: '#94a3b8' } }, 
            date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
          React.createElement('button', {
            key: 'add-day-shopping',
            onClick: async (e: React.MouseEvent) => {
              e.stopPropagation()
              const result = await handleAddDayToShoppingList(dateStr)
              if (result.success && result.message) {
                alert(result.message)
              } else if (result.error) {
                alert(result.error)
              }
            },
            disabled: isSelectingDays,
            style: {
              position: 'absolute',
              top: '0.25rem',
              right: '0.25rem',
              background: isSelectingDays ? '#475569' : '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: isSelectingDays ? 'not-allowed' : 'pointer',
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              opacity: isSelectingDays ? 0.6 : 1
            }
          }, '🛒')
        ])
      }),

      // Meal rows
      ...activeMealSlots.map(mealSlot => [
        // Meal slot label
        React.createElement('div', {
          key: `label-${mealSlot}`,
          style: {
            padding: '0.5rem',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.375rem',
            color: '#f1f5f9',
            fontWeight: 'bold',
            textAlign: 'center'
          }
        }, mealSlot),

        // Meal slots for each day
        ...weekDates.map(date => {
          const dateStr = date.toISOString().split('T')[0]
          const plannedMeal = plannedMeals[`${dateStr}-${mealSlot}`]
          const dayIsSelected = selectedDates.has(dateStr)

          const isDragOver = dragOverSlot?.date === dateStr && dragOverSlot?.mealSlot === mealSlot
          const isBeingDragged = draggedMeal?.date === dateStr && draggedMeal?.mealSlot === mealSlot

          return React.createElement('div', {
            key: `${dateStr}-${mealSlot}`,
            onClick: (e: React.MouseEvent) => !isBeingDragged && !plannedMeal && handleMealSlotClick(dateStr, mealSlot, e),
            onDragOver: (e: React.DragEvent) => handleDragOver(e, dateStr, mealSlot),
            onDragLeave: handleDragLeave,
            onDrop: (e: React.DragEvent) => handleDrop(e, dateStr, mealSlot),
            draggable: !isSelectingDays && !!plannedMeal,
            onDragStart: plannedMeal && !isSelectingDays ? (e: React.DragEvent) => handleDragStart(e, dateStr, mealSlot, plannedMeal) : undefined,
            onDragEnd: handleDragEnd,
            style: {
              padding: '0.5rem',
              minHeight: '80px',
              background: isDragOver ? '#1e40af' : dayIsSelected ? 'rgba(251, 191, 36, 0.1)' : (plannedMeal ? '#0f172a' : '#1e293b'),
              border: isDragOver ? '2px dashed #60a5fa' : dayIsSelected ? '2px solid #f59e0b' : '1px solid #334155',
              borderRadius: '0.375rem',
              cursor: isSelectingDays ? 'default' : plannedMeal ? 'move' : 'pointer',
              transition: 'all 0.2s',
              opacity: isBeingDragged ? 0.5 : 1,
              transform: isBeingDragged ? 'scale(0.95)' : 'scale(1)',
              position: 'relative'
            }
          }, [
            plannedMeal ? [
              // AI/Recipe indicator
              isAIGenerated(plannedMeal.recipe) && React.createElement('div', {
                key: 'ai-indicator',
                style: {
                  position: 'absolute',
                  top: '0.25rem',
                  right: '0.25rem',
                  background: '#10b981',
                  color: 'white',
                  fontSize: '0.625rem',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '0.25rem',
                  fontWeight: 'bold'
                }
              }, 'AI'),
              React.createElement('div', {
                key: 'drag-indicator',
                style: {
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginBottom: '0.25rem',
                  textAlign: 'center'
                }
              }, '⋮⋮'),
              React.createElement('div', {
                key: 'recipe-name',
                className: 'recipe-name',
                onClick: (e: React.MouseEvent) => handleRecipeNameClick(dateStr, mealSlot, plannedMeal.recipe, e),
                style: {
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  color: '#60a5fa',
                  marginBottom: '0.25rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                },
                title: plannedMeal.recipe.name
              }, plannedMeal.recipe.name.length > 100 ? plannedMeal.recipe.name.substring(0, 100) + '...' : plannedMeal.recipe.name),
              React.createElement('div', {
                key: 'actions',
                style: {
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginTop: '0.5rem'
                }
              }, [
                React.createElement('button', {
                  key: 'change-btn',
                  onClick: (e: React.MouseEvent) => handleMealCardClick(dateStr, mealSlot, e),
                  style: {
                    flex: '1',
                    minWidth: '50px',
                    padding: '0.35rem 0.6rem',
                    background: '#991b1b',
                    color: '#fecaca',
                    border: '1px solid #7f1d1d',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  },
                  onMouseEnter: (e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#7f1d1d'
                  },
                  onMouseLeave: (e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#991b1b'
                  }
                }, '🔄 Change'),
                React.createElement('button', {
                  key: 'add-shopping',
                  onClick: async (e: React.MouseEvent) => {
                    e.stopPropagation()
                    const result = await handleAddRecipeIngredientsToShoppingList(plannedMeal.recipe)
                    if (result.success && result.message) {
                      alert(result.message)
                    } else if (result.error) {
                      alert(result.error)
                    }
                  },
                  style: {
                    flex: '1',
                    minWidth: '50px',
                    padding: '0.35rem 0.6rem',
                    background: '#991b1b',
                    color: '#fecaca',
                    border: '1px solid #7f1d1d',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  },
                  onMouseEnter: (e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#7f1d1d'
                  },
                  onMouseLeave: (e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#991b1b'
                  }
                }, '🛒 Add'),
                React.createElement('button', {
                  key: 'remove',
                  className: 'remove-button',
                  onClick: (e: React.MouseEvent) => {
                    e.stopPropagation()
                    handleRemoveMeal(dateStr, mealSlot)
                  },
                  style: {
                    flex: '1',
                    minWidth: '50px',
                    padding: '0.35rem 0.6rem',
                    background: '#991b1b',
                    color: '#fecaca',
                    border: '1px solid #7f1d1d',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  },
                  onMouseEnter: (e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#7f1d1d'
                  },
                  onMouseLeave: (e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#991b1b'
                  }
                }, '🗑️ Remove')
              ])
            ] : [
              React.createElement('div', {
                key: 'empty',
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }
              }, '+ Add meal')
            ]
          ])
        })
      ]).flat()
    ]),

    // Recipe Selection Modal
    React.createElement(RecipeSelectionModal, {
      key: 'recipe-modal',
      isOpen: showRecipeModal,
      onClose: () => setShowRecipeModal(false),
      onSelectRecipe: handleRecipeSelect,
      onAddNewRecipe: handleAddNewRecipe,
      mealSlot: selectedSlot?.mealSlot || 'Breakfast',
      date: selectedSlot?.date || ''
    }),
    // Recipe View Modal
    React.createElement(RecipeViewModal, {
      key: 'recipe-view-modal',
      isOpen: showRecipeView,
      onClose: () => {
        setShowRecipeView(false)
        setViewingRecipe(null)
      },
      recipe: viewingRecipe?.recipe || null,
      isAIGenerated: viewingRecipe ? isAIGenerated(viewingRecipe.recipe) : false,
      onSaveRecipe: handleSaveEditedRecipe,
      onReplaceMeal: handleReplaceMeal,
      onAddToShoppingList: viewingRecipe ? () => handleAddRecipeIngredientsToShoppingList(viewingRecipe.recipe) : undefined
    }),
    // Clear Confirmation Modal
    showClearConfirm && React.createElement('div', {
      key: 'clear-confirm-modal',
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }
    }, [
      React.createElement('div', {
        key: 'modal',
        style: {
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '0.5rem',
          padding: '2rem',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center'
        }
      }, [
        React.createElement('h3', {
          key: 'title',
          style: { fontSize: '1.5rem', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '1rem' }
        }, 'Confirm Clear Action'),
        
        React.createElement('p', {
          key: 'message',
          style: { color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.5' }
        }, 
          clearAction === 'week' ? 'Are you sure you want to clear all meals for the current week? This action cannot be undone.' :
          clearAction === 'all' ? 'Are you sure you want to clear ALL meal plans? This will delete all your saved meal planning data and cannot be undone.' :
          clearAction === 'selected' ? `Are you sure you want to clear all meals for the ${selectedDates.size} selected day${selectedDates.size === 1 ? '' : 's'}? This action cannot be undone.` :
          `Are you sure you want to clear all ${clearAction} meals? This action cannot be undone.`
        ),
        
        React.createElement('div', {
          key: 'actions',
          style: {
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem'
          }
        }, [
          React.createElement('button', {
            key: 'cancel',
            onClick: () => {
              setShowClearConfirm(false)
              setClearAction(null)
            },
            style: {
              padding: '0.75rem 1.5rem',
              background: '#374151',
              color: '#f1f5f9',
              border: '1px solid #4b5563',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }
          }, 'Cancel'),
          React.createElement('button', {
            key: 'confirm',
            onClick: executeClearAction,
            style: {
              padding: '0.75rem 1.5rem',
              background: '#dc2626',
              color: 'white',
              border: '1px solid #b91c1c',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }
          }, 'Clear')
        ])
      ])
    ]),
    
    // Smart Meal Planner Modal
    React.createElement(SmartMealPlannerModal, {
      key: 'smart-planner-modal',
      isOpen: showSmartPlanner,
      onClose: () => setShowSmartPlanner(false),
      onMealPlanGenerated: handleSmartMealPlanGenerated,
      currentDate: currentDate
    })
  ])
}