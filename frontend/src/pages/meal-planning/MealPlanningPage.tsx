import React, { useState, useEffect } from 'react'
import { MealSlot, PlannedMeal, MealPlanFilters, DEFAULT_MEAL_PLAN_FILTERS, MEAL_SLOTS } from '../../types/mealPlan'
import { Recipe } from '../../types/recipe'
import { mealPlanService } from '../../services/mealPlanService'
import { recipeService } from '../../services/recipeService'
import { RecipeForm } from '../../components/recipes/RecipeForm'
import { SmartMealPlannerModal } from '../../components/meal-planning/SmartMealPlannerModal'
import { RecipeViewModal } from '../../components/meal-planning/RecipeViewModal'

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

  useEffect(() => {
    loadFilters()
    loadPlannedMeals()
  }, [currentDate])

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

  const handleMealSlotClick = (date: string, mealSlot: MealSlot) => {
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

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, date: string, mealSlot: MealSlot, meal: PlannedMeal) => {
    setDraggedMeal({ date, mealSlot, meal })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, date: string, mealSlot: MealSlot) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot({ date, mealSlot })
  }

  const handleDragLeave = () => {
    setDragOverSlot(null)
  }

  const handleDrop = (e: React.DragEvent, targetDate: string, targetMealSlot: MealSlot) => {
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }
    }, [
      React.createElement('h1', {
        key: 'title',
        style: { fontSize: '2rem', fontWeight: 'bold', color: '#f1f5f9' }
      }, '📅 Meal Planning'),
      React.createElement('div', {
        key: 'navigation',
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
            cursor: 'pointer'
          }
        }, '← Previous'),
        React.createElement('span', {
          key: 'current-week',
          style: { 
            color: '#f1f5f9', 
            fontWeight: 'bold',
            minWidth: '200px',
            textAlign: 'center'
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
            cursor: 'pointer'
          }
        }, 'Next →'),
        React.createElement('button', {
          key: 'smart-planner',
          onClick: () => setShowSmartPlanner(true),
          style: {
            padding: '0.5rem 1rem',
            background: '#10b981',
            color: 'white',
            border: '1px solid #059669',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 'bold'
          }
        }, '🤖 Smart Meal Plan')
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
      ...weekDates.map(date => 
        React.createElement('div', {
          key: `header-${date.toISOString()}`,
          style: {
            textAlign: 'center',
            padding: '0.5rem',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.375rem',
            color: '#f1f5f9',
            fontWeight: 'bold'
          }
        }, [
          React.createElement('div', { key: 'day' }, date.toLocaleDateString('en-US', { weekday: 'short' })),
          React.createElement('div', { key: 'date', style: { fontSize: '0.875rem', color: '#94a3b8' } }, 
            date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        ])
      ),

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

          const isDragOver = dragOverSlot?.date === dateStr && dragOverSlot?.mealSlot === mealSlot
          const isBeingDragged = draggedMeal?.date === dateStr && draggedMeal?.mealSlot === mealSlot

          return React.createElement('div', {
            key: `${dateStr}-${mealSlot}`,
            onClick: (e: React.MouseEvent) => !isBeingDragged && !plannedMeal && handleMealSlotClick(dateStr, mealSlot, e),
            onDragOver: (e: React.DragEvent) => handleDragOver(e, dateStr, mealSlot),
            onDragLeave: handleDragLeave,
            onDrop: (e: React.DragEvent) => handleDrop(e, dateStr, mealSlot),
            draggable: !!plannedMeal,
            onDragStart: plannedMeal ? (e: React.DragEvent) => handleDragStart(e, dateStr, mealSlot, plannedMeal) : undefined,
            onDragEnd: handleDragEnd,
            style: {
              padding: '0.5rem',
              minHeight: '80px',
              background: isDragOver ? '#1e40af' : (plannedMeal ? '#0f172a' : '#1e293b'),
              border: isDragOver ? '2px dashed #60a5fa' : '1px solid #334155',
              borderRadius: '0.375rem',
              cursor: plannedMeal ? 'move' : 'pointer',
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
                  color: isAIGenerated(plannedMeal.recipe) ? '#60a5fa' : '#f1f5f9',
                  marginBottom: '0.25rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted'
                }
              }, plannedMeal.recipe.name),
              React.createElement('div', {
                key: 'actions',
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }
              }, [
                React.createElement('span', {
                  key: 'change-hint',
                  style: {
                    fontSize: '0.75rem',
                    color: '#64748b',
                    cursor: 'pointer'
                  },
                  onClick: (e: React.MouseEvent) => handleMealCardClick(dateStr, mealSlot, e)
                }, '🔄 Change'),
                React.createElement('button', {
                  key: 'remove',
                  className: 'remove-button',
                  onClick: (e: React.MouseEvent) => {
                    e.stopPropagation()
                    handleRemoveMeal(dateStr, mealSlot)
                  },
                  style: {
                    padding: '0.25rem 0.5rem',
                    background: '#7f1d1d',
                    color: '#fca5a5',
                    border: '1px solid #991b1b',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }
                }, 'Remove')
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
      onReplaceMeal: handleReplaceMeal
    }),
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