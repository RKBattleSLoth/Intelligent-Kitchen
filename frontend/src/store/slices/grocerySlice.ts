import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

interface GroceryItem {
  id: string
  name: string
  quantity: number
  unit: string
  aisle: string
  category?: string
  isPurchased: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

interface GroceryList {
  id: string
  name: string
  mealPlanId?: string
  mealPlanName?: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
  totalItems?: number
  purchasedItems?: number
  items?: GroceryItem[]
  itemsByAisle?: Record<string, GroceryItem[]>
}

interface GroceryState {
  groceryLists: GroceryList[]
  currentGroceryList: GroceryList | null
  isLoading: boolean
  error: string | null
}

const initialState: GroceryState = {
  groceryLists: [],
  currentGroceryList: null,
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchGroceryLists = createAsyncThunk(
  'grocery/fetchGroceryLists',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/grocery-lists')
      // Transform backend snake_case to frontend camelCase
      const transformedData = response.data.map((list: any) => ({
        ...list,
        mealPlanId: list.meal_plan_id,
        isCompleted: list.is_completed === 'true' || list.is_completed === true,
        totalItems: parseInt(list.total_items) || 0,
        purchasedItems: parseInt(list.purchased_items) || 0,
        createdAt: list.created_at,
        updatedAt: list.updated_at
      }))
      return transformedData
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch grocery lists')
    }
  }
)

export const fetchGroceryList = createAsyncThunk(
  'grocery/fetchGroceryList',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/grocery-lists/${id}`)
      const data = response.data
      
      // Transform backend snake_case to frontend camelCase
      const transformedData = {
        ...data,
        mealPlanId: data.meal_plan_id,
        mealPlanName: data.meal_plan_name,
        isCompleted: data.is_completed === 'true' || data.is_completed === true,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        items: data.items?.map((item: any) => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          isPurchased: item.is_purchased === 'true' || item.is_purchased === true,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })) || []
      }
      
      return transformedData
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch grocery list')
    }
  }
)

export const createGroceryList = createAsyncThunk(
  'grocery/createGroceryList',
  async (groceryList: Omit<GroceryList, 'id' | 'createdAt' | 'updatedAt' | 'totalItems' | 'purchasedItems' | 'items' | 'itemsByAisle'>, { rejectWithValue }) => {
    try {
      // Transform frontend camelCase to backend snake_case
      const backendData = {
        name: groceryList.name,
        mealPlanId: groceryList.mealPlanId,
        isCompleted: groceryList.isCompleted
      }
      
      const response = await axios.post('/api/grocery-lists', backendData)
      const data = response.data.groceryList
      
      // Transform response back to frontend format
      const transformedData = {
        ...data,
        mealPlanId: data.meal_plan_id,
        isCompleted: data.is_completed,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
      
      return transformedData
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create grocery list')
    }
  }
)

export const generateGroceryList = createAsyncThunk(
  'grocery/generateGroceryList',
  async ({ mealPlanId, name }: { mealPlanId: string; name?: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/grocery-lists/generate/${mealPlanId}`, { name })
      const data = response.data.groceryList
      
      // Transform response to frontend format
      const transformedData = {
        ...data,
        mealPlanId: data.meal_plan_id,
        isCompleted: data.is_completed === 'true' || data.is_completed === true,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
      
      return transformedData
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to generate grocery list')
    }
  }
)

export const updateGroceryList = createAsyncThunk(
  'grocery/updateGroceryList',
  async ({ id, ...groceryList }: Partial<GroceryList> & { id: string }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/grocery-lists/${id}`, groceryList)
      return response.data.groceryList
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update grocery list')
    }
  }
)

export const deleteGroceryList = createAsyncThunk(
  'grocery/deleteGroceryList',
  async (id: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/grocery-lists/${id}`)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete grocery list')
    }
  }
)

export const addGroceryItem = createAsyncThunk(
  'grocery/addGroceryItem',
  async ({ groceryListId, ...item }: Omit<GroceryItem, 'id' | 'createdAt' | 'updatedAt' | 'isPurchased' | 'category'> & { groceryListId: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/grocery-lists/${groceryListId}/items`, item)
      const data = response.data.item
      
      // Transform response to frontend format
      const transformedData = {
        ...data,
        quantity: parseFloat(data.quantity) || 0,
        isPurchased: data.is_purchased === 'true' || data.is_purchased === true,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
      
      return transformedData
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add grocery item')
    }
  }
)

export const updateGroceryItem = createAsyncThunk(
  'grocery/updateGroceryItem',
  async ({ itemId, ...item }: Partial<GroceryItem> & { itemId: string }, { rejectWithValue }) => {
    try {
      // Transform frontend camelCase to backend snake_case
      const backendData = {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        aisle: item.aisle,
        isPurchased: item.isPurchased,
        notes: item.notes
      }
      
      const response = await axios.put(`/api/grocery-lists/items/${itemId}`, backendData)
      const data = response.data.item
      
      // Transform response to frontend format
      const transformedData = {
        ...data,
        quantity: parseFloat(data.quantity) || 0,
        isPurchased: data.is_purchased === 'true' || data.is_purchased === true,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
      
      return transformedData
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update grocery item')
    }
  }
)

export const deleteGroceryItem = createAsyncThunk(
  'grocery/deleteGroceryItem',
  async (itemId: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/grocery-lists/items/${itemId}`)
      return itemId
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete grocery item')
    }
  }
)

const grocerySlice = createSlice({
  name: 'grocery',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCurrentGroceryList: (state, action: PayloadAction<GroceryList | null>) => {
      state.currentGroceryList = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch grocery lists
      .addCase(fetchGroceryLists.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchGroceryLists.fulfilled, (state, action) => {
        state.isLoading = false
        state.groceryLists = action.payload
        state.error = null
      })
      .addCase(fetchGroceryLists.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch single grocery list
      .addCase(fetchGroceryList.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchGroceryList.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentGroceryList = action.payload
        state.error = null
      })
      .addCase(fetchGroceryList.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create grocery list
      .addCase(createGroceryList.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createGroceryList.fulfilled, (state, action) => {
        state.isLoading = false
        state.groceryLists.unshift(action.payload)
        state.error = null
      })
      .addCase(createGroceryList.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Generate grocery list
      .addCase(generateGroceryList.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(generateGroceryList.fulfilled, (state, action) => {
        state.isLoading = false
        state.groceryLists.unshift(action.payload)
        state.currentGroceryList = action.payload
        state.error = null
      })
      .addCase(generateGroceryList.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update grocery list
      .addCase(updateGroceryList.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateGroceryList.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.groceryLists.findIndex(list => list.id === action.payload.id)
        if (index !== -1) {
          state.groceryLists[index] = action.payload
        }
        if (state.currentGroceryList?.id === action.payload.id) {
          state.currentGroceryList = action.payload
        }
        state.error = null
      })
      .addCase(updateGroceryList.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Delete grocery list
      .addCase(deleteGroceryList.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteGroceryList.fulfilled, (state, action) => {
        state.isLoading = false
        state.groceryLists = state.groceryLists.filter(list => list.id !== action.payload)
        if (state.currentGroceryList?.id === action.payload) {
          state.currentGroceryList = null
        }
        state.error = null
      })
      .addCase(deleteGroceryList.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Add grocery item
      .addCase(addGroceryItem.fulfilled, (state, action) => {
        if (state.currentGroceryList) {
          if (!state.currentGroceryList.items) {
            state.currentGroceryList.items = []
          }
          state.currentGroceryList.items.push(action.payload)
        }
      })
      // Update grocery item
      .addCase(updateGroceryItem.fulfilled, (state, action) => {
        if (state.currentGroceryList?.items) {
          const index = state.currentGroceryList.items.findIndex(item => item.id === action.payload.id)
          if (index !== -1) {
            state.currentGroceryList.items[index] = action.payload
          }
        }
      })
      // Delete grocery item
      .addCase(deleteGroceryItem.fulfilled, (state, action) => {
        if (state.currentGroceryList?.items) {
          state.currentGroceryList.items = state.currentGroceryList.items.filter(item => item.id !== action.payload)
        }
      })
  },
})

export const { clearError, setCurrentGroceryList } = grocerySlice.actions
export default grocerySlice.reducer