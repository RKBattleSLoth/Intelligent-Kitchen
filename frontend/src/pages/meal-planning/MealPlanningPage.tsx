import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../store'
import { fetchMealPlanRange, addMealEntry, createMealPlan, fetchMealPlans, updateMealEntry, deleteMealEntry } from '../../store/slices/mealPlanningSlice'
import { fetchRecipes } from '../../store/slices/recipesSlice'
import { generateGroceryList } from '../../store/slices/grocerySlice'

const MealPlanningPage = () => {
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [showAddMealForm, setShowAddMealForm] = useState(false)
  const [showEditMealForm, setShowEditMealForm] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<string>('breakfast')
  const [selectedRecipe, setSelectedRecipe] = useState<string>('')
  const [editingMeal, setEditingMeal] = useState<any>(null)

  const dispatch = useDispatch()
  const { mealPlanRange, isLoading, error } = useSelector((state: RootState) => state.mealPlanning)
  const { recipes } = useSelector((state: RootState) => state.recipes)

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

  const getWeekDates = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day
    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }

  const weekDates = getWeekDates(selectedWeek)

  // Fetch meal plan data for the current week
  useEffect(() => {
    const startDate = weekDates[0].toLocaleDateString('en-CA')
    const endDate = weekDates[6].toLocaleDateString('en-CA')
    dispatch(fetchMealPlanRange({ startDate, endDate }) as any)
  }, [selectedWeek, dispatch])

  // Fetch recipes for the meal selection
  useEffect(() => {
    dispatch(fetchRecipes() as any)
  }, [dispatch])

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek)
    newDate.setDate(selectedWeek.getDate() + (direction === 'next' ? 7 : -7))
    setSelectedWeek(newDate)
  }

  const handleAddMeal = async () => {
    if (!selectedDay || !selectedRecipe) return

    try {
      // First, get existing meal plans or create a default one
      const mealPlansResult = await dispatch(fetchMealPlans() as any)
      const mealPlans = mealPlansResult.payload
      
      let mealPlanId = mealPlans[0]?.id
      
      // If no meal plan exists, create one
      if (!mealPlanId) {
        const weekStart = weekDates[0].toLocaleDateString('en-CA')
        const weekEnd = weekDates[6].toLocaleDateString('en-CA')
        
        const createResult = await dispatch(createMealPlan({
          name: 'Weekly Meal Plan',
          startDate: weekStart,
          endDate: weekEnd,
          notes: ''
        }) as any)
        
        if (createResult.error) {
          throw new Error(createResult.error)
        }
        
        mealPlanId = createResult.payload.id
      }
      
      // Now add the meal entry
      const addResult = await dispatch(addMealEntry({
        mealPlanId,
        mealDate: selectedDay,
        mealType: selectedMealType,
        recipeId: selectedRecipe,
        notes: ''
      }) as any)
      
      if (addResult.error) {
        throw new Error(addResult.error)
      }
      
      // Reset form and close modal
      setSelectedRecipe('')
      setSelectedMealType('breakfast')
      setShowAddMealForm(false)
      
      // Refresh the meal plan data
      const startDate = weekDates[0].toLocaleDateString('en-CA')
      const endDate = weekDates[6].toLocaleDateString('en-CA')
      dispatch(fetchMealPlanRange({ startDate, endDate }) as any)
    } catch (error) {
      console.error('Failed to add meal:', error)
      // Error will be displayed via Redux state
    }
  }

  const handleCellClick = (date: Date, mealType: string) => {
    setSelectedDay(date.toLocaleDateString('en-CA'))
    setSelectedMealType(mealType.toLowerCase())
    setShowAddMealForm(true)
  }

  const handleEditMeal = (meal: any) => {
    setEditingMeal(meal)
    setSelectedDay(meal.mealDate.split('T')[0])
    setSelectedMealType(meal.mealType)
    setSelectedRecipe(meal.recipeId || '')
    setShowEditMealForm(true)
  }

  const handleUpdateMeal = async () => {
    if (!editingMeal || !selectedDay || !selectedRecipe) return

    try {
      const updateResult = await dispatch(updateMealEntry({
        entryId: editingMeal.id,
        mealDate: selectedDay,
        mealType: selectedMealType,
        recipeId: selectedRecipe,
        notes: ''
      }) as any)
      
      if (updateResult.error) {
        throw new Error(updateResult.error)
      }
      
      // Reset form and close modal
      setEditingMeal(null)
      setSelectedRecipe('')
      setSelectedMealType('breakfast')
      setShowEditMealForm(false)
      
      // Refresh the meal plan data
      const startDate = weekDates[0].toLocaleDateString('en-CA')
      const endDate = weekDates[6].toLocaleDateString('en-CA')
      dispatch(fetchMealPlanRange({ startDate, endDate }) as any)
    } catch (error) {
      console.error('Failed to update meal:', error)
    }
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Are you sure you want to delete this meal?')) return

    try {
      const deleteResult = await dispatch(deleteMealEntry(mealId) as any)
      
      if (deleteResult.error) {
        throw new Error(deleteResult.error)
      }
      
      // Refresh the meal plan data
      const startDate = weekDates[0].toLocaleDateString('en-CA')
      const endDate = weekDates[6].toLocaleDateString('en-CA')
      dispatch(fetchMealPlanRange({ startDate, endDate }) as any)
    } catch (error) {
      console.error('Failed to delete meal:', error)
    }
  }

  const handleGenerateShoppingList = async () => {
    try {
      // First, get the current meal plan for this week
      const mealPlansResult = await dispatch(fetchMealPlans() as any)
      const mealPlans = mealPlansResult.payload
      
      if (!mealPlans || mealPlans.length === 0) {
        alert('No meal plans found. Please create a meal plan first.')
        return
      }
      
      // Use the first meal plan (or you could let user choose)
      const mealPlanId = mealPlans[0].id
      const listName = `Shopping List - ${new Date().toLocaleDateString()}`
      
      const generateResult = await dispatch(generateGroceryList({ 
        mealPlanId, 
        name: listName 
      } as any))
      
      if (generateResult.error) {
        throw new Error(generateResult.error)
      }
      
      alert('Shopping list generated successfully! Check the Grocery Lists page.')
    } catch (error) {
      console.error('Failed to generate shopping list:', error)
      alert('Failed to generate shopping list. Please try again.')
    }
  }

  const getMealsForDay = (date: Date) => {
    const dateStr = date.toLocaleDateString('en-CA')
    return mealPlanRange.filter(meal => {
      // Extract just the date part from the ISO string (YYYY-MM-DD)
      const mealDateStr = meal.mealDate.split('T')[0]
      return mealDateStr === dateStr
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meal Planning</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Plan your meals for the week</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        <button
          onClick={() => setShowAddMealForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Meal
        </button>
      </div>

      <div className="bg-white shadow rounded-lg dark:bg-dark-800 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-dark-700"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Week of {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => navigateWeek('next')}
                  className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-dark-700"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {weekDates.map((date, index) => {
                  const dayMeals = getMealsForDay(date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden dark:border-gray-700">
                      <div className={`p-3 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-dark-700'}`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{weekDays[index]}</h3>
                        <p className={`text-sm ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="p-3 space-y-2">
                        {mealTypes.map(mealType => {
                          const meal = dayMeals.find(m => m.mealType === mealType.toLowerCase())
                          return (
                            <div 
                              key={mealType} 
                              className={`border border-gray-200 rounded p-2 ${!meal ? 'hover:bg-gray-50 cursor-pointer dark:hover:bg-dark-700' : 'cursor-default bg-gray-50 dark:bg-dark-700'} dark:border-gray-600`}
                              onClick={() => !meal && handleCellClick(date, mealType)}
                            >
                              <div className="text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">{mealType}</div>
                              {meal ? (
                                <div className="group relative">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">{meal.recipeName}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{meal.cookTime} min</div>
                                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditMeal(meal)
                                      }}
                                      className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                      title="Edit meal"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteMeal(meal.id)
                                      }}
                                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                      title="Delete meal"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400 italic dark:text-gray-500">Click to add meal</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg dark:bg-dark-800 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 dark:text-white">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Copy Last Week's Plan
              </button>
              <button 
                onClick={handleGenerateShoppingList}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Shopping List
              </button>
              <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Export to Calendar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg dark:bg-dark-800 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 dark:text-white">This Week's Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Meals Planned</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">21</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Unique Recipes</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">$156</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Prep Time Total</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">8.5 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Meal Modal */}
      {showAddMealForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 dark:bg-black dark:bg-opacity-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-dark-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Add Meal</h3>
                <button
                  onClick={() => setShowAddMealForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Date
                  </label>
                  <input
                    type="text"
                    value={selectedDay ? new Date(selectedDay).toLocaleDateString() : ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Meal Type
                  </label>
                  <select
                    value={selectedMealType}
                    onChange={(e) => setSelectedMealType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Recipe
                  </label>
                  <select
                    value={selectedRecipe}
                    onChange={(e) => setSelectedRecipe(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  >
                    <option value="">Select a recipe</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddMealForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMeal}
                    disabled={!selectedRecipe}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    Add Meal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meal Modal */}
      {showEditMealForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 dark:bg-black dark:bg-opacity-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-dark-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Edit Meal</h3>
                <button
                  onClick={() => setShowEditMealForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Date
                  </label>
                  <input
                    type="text"
                    value={selectedDay ? new Date(selectedDay).toLocaleDateString() : ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Meal Type
                  </label>
                  <select
                    value={selectedMealType}
                    onChange={(e) => setSelectedMealType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Recipe
                  </label>
                  <select
                    value={selectedRecipe}
                    onChange={(e) => setSelectedRecipe(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  >
                    <option value="">Select a recipe</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowEditMealForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateMeal}
                    disabled={!selectedRecipe}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    Update Meal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MealPlanningPage