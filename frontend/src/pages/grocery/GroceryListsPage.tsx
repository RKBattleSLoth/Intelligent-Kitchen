import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../store'
import { fetchGroceryLists, createGroceryList, generateGroceryList, fetchGroceryList, addGroceryItem, updateGroceryItem, deleteGroceryItem } from '../../store/slices/grocerySlice'
import { fetchMealPlans } from '../../store/slices/mealPlanningSlice'
import { fetchRecipes } from '../../store/slices/recipesSlice'

const GroceryListsPage = () => {
  const [activeList, setActiveList] = useState<string | null>(null)
  const [showAddItemForm, setShowAddItemForm] = useState(false)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [showAddRecipesForm, setShowAddRecipesForm] = useState(false)
  const [showNewListForm, setShowNewListForm] = useState(false)
  const [selectedMealPlan, setSelectedMealPlan] = useState('')
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([])
  const [newListName, setNewListName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('pieces')
  const [newItemCategory, setNewItemCategory] = useState('produce')
  const [newItemAisle, setNewItemAisle] = useState('other')
  
  const dispatch = useDispatch()
  const { groceryLists, currentGroceryList, isLoading, error } = useSelector((state: RootState) => state.grocery)
  const { mealPlans } = useSelector((state: RootState) => state.mealPlanning)
  const { recipes } = useSelector((state: RootState) => state.recipes)

  const activeGroceryList = currentGroceryList || (activeList 
    ? groceryLists.find(list => list.id === activeList)
    : null)

  const categories = ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'canned', 'dry_goods', 'beverages', 'snacks', 'household', 'other']
  const units = ['pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds', 'grams', 'kilograms', 'liters', 'milliliters']

  const getItemsByAisle = (items: any[]) => {
    const grouped: Record<string, any[]> = {}
    
    // Group items by aisle, fallback to category if aisle is not set
    items.forEach(item => {
      const key = item.aisle || item.category || 'other'
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(item)
    })
    
    return grouped
  }

  // Fetch data on component mount
  useEffect(() => {
    dispatch(fetchGroceryLists() as any)
    dispatch(fetchMealPlans() as any)
    dispatch(fetchRecipes() as any)
  }, [dispatch])

  // Fetch detailed grocery list when active list changes
  useEffect(() => {
    if (activeList) {
      dispatch(fetchGroceryList(activeList) as any)
    }
  }, [activeList, dispatch])

  // Use the backend's grouping if available, otherwise group manually
  const categorizedItems = activeGroceryList ? 
    (activeGroceryList.itemsByAisle || getItemsByAisle(activeGroceryList.items || [])) : 
    {}

  const handleGenerateFromMealPlan = async () => {
    if (!selectedMealPlan) return
    
    try {
      const listName = newListName || `Grocery List - ${new Date().toLocaleDateString()}`
      const result = await dispatch(generateGroceryList({ mealPlanId: selectedMealPlan, name: listName }) as any)
      
      // Refresh the grocery lists and select the new list
      await dispatch(fetchGroceryLists() as any)
      
      if (result.payload && result.payload.id) {
        setActiveList(result.payload.id)
        await dispatch(fetchGroceryList(result.payload.id) as any)
      }
      
      setShowGenerateForm(false)
      setSelectedMealPlan('')
      setNewListName('')
    } catch (error) {
      console.error('Failed to generate grocery list:', error)
    }
  }

  const handleCreateFromRecipes = async () => {
    if (selectedRecipes.length === 0) return
    
    try {
      const listName = newListName || `Grocery List - ${new Date().toLocaleDateString()}`
      const result = await dispatch(createGroceryList({
        name: listName,
        isCompleted: false
      }) as any)
      
      // Refresh the grocery lists and select the new list
      await dispatch(fetchGroceryLists() as any)
      
      if (result.payload && result.payload.id) {
        setActiveList(result.payload.id)
        await dispatch(fetchGroceryList(result.payload.id) as any)
      }
      
      setShowAddRecipesForm(false)
      setSelectedRecipes([])
      setNewListName('')
    } catch (error) {
      console.error('Failed to create grocery list from recipes:', error)
    }
  }

  const handleSelectList = async (listId: string) => {
    setActiveList(listId)
    await dispatch(fetchGroceryList(listId) as any)
  }

  const handleCreateNewList = async () => {
    if (!newListName.trim()) return
    
    try {
      const result = await dispatch(createGroceryList({
        name: newListName,
        isCompleted: false
      } as any))
      
      // Refresh the grocery lists and select the new list
      await dispatch(fetchGroceryLists() as any)
      
      if (result.payload && result.payload.id) {
        setActiveList(result.payload.id)
        await dispatch(fetchGroceryList(result.payload.id) as any)
      }
      
      setShowNewListForm(false)
      setNewListName('')
    } catch (error) {
      console.error('Failed to create grocery list:', error)
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim() || !activeList) return
    
    try {
      await dispatch(addGroceryItem({
        groceryListId: activeList,
        name: newItemName,
        quantity: parseFloat(newItemQuantity) || 1,
        unit: newItemUnit || 'pieces',
        aisle: newItemAisle || 'other',
        notes: ''
      } as any))
      
      // Refresh the grocery list to show the new item
      await dispatch(fetchGroceryList(activeList) as any)
      
      setShowAddItemForm(false)
      setNewItemName('')
      setNewItemQuantity('')
      setNewItemUnit('')
      setNewItemAisle('')
      setNewItemCategory('produce')
    } catch (error) {
      console.error('Failed to add grocery item:', error)
    }
  }

  const handleToggleItem = async (itemId: string, isPurchased: boolean) => {
    try {
      await dispatch(updateGroceryItem({
        itemId,
        isPurchased: !isPurchased
      } as any))
      
      // Refresh the grocery list to show the updated item
      if (activeList) {
        await dispatch(fetchGroceryList(activeList) as any)
      }
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      await dispatch(deleteGroceryItem(itemId) as any)
      
      // Refresh the grocery list to show the updated items
      if (activeList) {
        await dispatch(fetchGroceryList(activeList) as any)
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Grocery Lists</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your shopping lists</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 dark:bg-blue-900/20 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-400">Loading grocery lists...</p>
          </div>
        )}
        <div className="flex space-x-3">
          <button
            onClick={() => setShowGenerateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Generate from Meal Plan
          </button>
          <button
            onClick={() => setShowAddRecipesForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Create from Recipes
          </button>
          <button
            onClick={() => setShowNewListForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg dark:bg-dark-800 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 dark:text-white">Your Lists</h3>
              <div className="space-y-2">
                {groceryLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => setActiveList(list.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      activeList === list.id
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-dark-700'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{list.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {list.items?.length || 0} items • {list.items?.filter(item => !item.isPurchased).length || 0} remaining
                    </div>
                    <div className="text-xs text-gray-400 mt-1 dark:text-gray-500">
                      {list.createdAt}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeGroceryList ? (
            <div className="bg-white shadow rounded-lg dark:bg-dark-800 dark:border-gray-700">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{activeGroceryList.name}</h2>
                    <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                      {activeGroceryList.items?.filter(item => !item.isPurchased).length || 0} of {activeGroceryList.items?.length || 0} items remaining
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowAddItemForm(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Item
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Share
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {Object.entries(categorizedItems).map(([category, items]) => {
                    if (!items || items.length === 0) return null
                    
                    return (
                      <div key={category}>
                        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-3 dark:text-white">
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </h3>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-600">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={item.isPurchased}
                                  onChange={() => handleToggleItem(item.id, item.isPurchased)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:focus:ring-blue-500"
                                />
                                <div>
                                  <div className={`font-medium ${item.isPurchased ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                    {item.name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {item.quantity} • {item.aisle}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {(!activeGroceryList.items || activeGroceryList.items.length === 0) ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No items in this list</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add some items to get started.</p>
                    
                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left">
                        <p><strong>Debug Info:</strong></p>
                        <p>Active List ID: {activeList}</p>
                        <p>Has activeGroceryList: {!!activeGroceryList}</p>
                        <p>Items count: {activeGroceryList?.items?.length || 0}</p>
                        <p>Categories: {Object.keys(categorizedItems).length}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activeGroceryList.items?.length || 0} items found but not displaying correctly.
                    </p>
                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left max-w-md mx-auto">
                        <p><strong>Debug Info:</strong></p>
                        <p>Items: {JSON.stringify(activeGroceryList.items?.slice(0, 2), null, 2)}</p>
                        <p>Categories: {Object.keys(categorizedItems)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg dark:bg-dark-800 dark:border-gray-700">
              <div className="px-4 py-5 sm:p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No list selected</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a list from the sidebar or create a new one.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate from Meal Plan Modal */}
      {showGenerateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 dark:bg-black dark:bg-opacity-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-dark-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Generate Grocery List</h3>
                <button
                  onClick={() => setShowGenerateForm(false)}
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
                    Meal Plan
                  </label>
                  <select
                    value={selectedMealPlan}
                    onChange={(e) => setSelectedMealPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  >
                    <option value="">Select a meal plan</option>
                    {mealPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    List Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Grocery List - Today's Date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowGenerateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateFromMealPlan}
                    disabled={!selectedMealPlan || isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-600 dark:hover:bg-green-700"
                  >
                    {isLoading ? 'Generating...' : 'Generate List'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create from Recipes Modal */}
      {showAddRecipesForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 dark:bg-black dark:bg-opacity-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-dark-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Create Grocery List from Recipes</h3>
                <button
                  onClick={() => setShowAddRecipesForm(false)}
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
                    List Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Grocery List - Today's Date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Select Recipes
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md dark:border-gray-600">
                    {recipes.map((recipe) => (
                      <label key={recipe.id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecipes.includes(recipe.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecipes([...selectedRecipes, recipe.id])
                            } else {
                              setSelectedRecipes(selectedRecipes.filter(id => id !== recipe.id))
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{recipe.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {recipe.meal_type} • {recipe.cook_time || recipe.prep_time || 0} min
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddRecipesForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFromRecipes}
                    disabled={selectedRecipes.length === 0 || isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-purple-600 dark:hover:bg-purple-700"
                  >
                    {isLoading ? 'Creating...' : `Create List (${selectedRecipes.length} recipes)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New List Modal */}
      {showNewListForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 dark:bg-black dark:bg-opacity-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-dark-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Create New Grocery List</h3>
                <button
                  onClick={() => setShowNewListForm(false)}
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
                    List Name
                  </label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Weekly Groceries"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewListForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNewList}
                    disabled={!newListName.trim() || isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    {isLoading ? 'Creating...' : 'Create List'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 dark:bg-black dark:bg-opacity-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-dark-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Add Grocery Item</h3>
                <button
                  onClick={() => setShowAddItemForm(false)}
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
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., Milk"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                      Quantity
                    </label>
                    <input
                      type="text"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                      Unit
                    </label>
                    <select
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>
                          {unit.charAt(0).toUpperCase() + unit.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                      Category
                    </label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                      Aisle
                    </label>
                    <select
                      value={newItemAisle}
                      onChange={(e) => setNewItemAisle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    >
                      {categories.map(aisle => (
                        <option key={aisle} value={aisle}>
                          {aisle.charAt(0).toUpperCase() + aisle.slice(1).replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddItemForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemName.trim() || !activeList || isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    {isLoading ? 'Adding...' : 'Add Item'}
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

export default GroceryListsPage