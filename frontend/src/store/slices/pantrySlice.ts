import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

interface PantryItem {
  id: string
  name: string
  quantity: number
  unit: string
  purchaseDate?: string
  expirationDate?: string
  barcode?: string
  category?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface PantryState {
  items: PantryItem[]
  expiringSoon: PantryItem[]
  expired: PantryItem[]
  isLoading: boolean
  error: string | null
  summary: {
    totalItems: number
    expiringSoon: number
    expired: number
  }
}

const initialState: PantryState = {
  items: [],
  expiringSoon: [],
  expired: [],
  isLoading: false,
  error: null,
  summary: {
    totalItems: 0,
    expiringSoon: 0,
    expired: 0,
  },
}

// Async thunks
export const fetchPantryItems = createAsyncThunk(
  'pantry/fetchItems',
  async (params?: { category?: string; sortBy?: string; sortOrder?: string }, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
    try {
      const response = await axios.get('/api/pantry', { params })
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch pantry items')
    }
  }
)

export const addPantryItem = createAsyncThunk(
  'pantry/addItem',
  async (item: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/pantry', item)
      return response.data.item
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add pantry item')
    }
  }
)

export const updatePantryItem = createAsyncThunk(
  'pantry/updateItem',
  async ({ id, ...item }: Partial<PantryItem> & { id: string }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/pantry/${id}`, item)
      return response.data.item
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update pantry item')
    }
  }
)

export const deletePantryItem = createAsyncThunk(
  'pantry/deleteItem',
  async (id: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/pantry/${id}`)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete pantry item')
    }
  }
)

export const fetchExpiringItems = createAsyncThunk(
  'pantry/fetchExpiringItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/pantry/expiring/soon')
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch expiring items')
    }
  }
)

export const fetchExpiredItems = createAsyncThunk(
  'pantry/fetchExpiredItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/pantry/expiring/expired')
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch expired items')
    }
  }
)

export const bulkAddPantryItems = createAsyncThunk(
  'pantry/bulkAddItems',
  async (items: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>[], { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/pantry/bulk', { items })
      return response.data.items
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add pantry items')
    }
  }
)

export const cleanupExpiredItems = createAsyncThunk(
  'pantry/cleanupExpiredItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.delete('/api/pantry/expired/cleanup')
      return response.data.deletedCount
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to cleanup expired items')
    }
  }
)

const pantrySlice = createSlice({
  name: 'pantry',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch pantry items
      .addCase(fetchPantryItems.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPantryItems.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload.items
        state.summary = action.payload.summary
        state.error = null
      })
      .addCase(fetchPantryItems.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Add pantry item
      .addCase(addPantryItem.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(addPantryItem.fulfilled, (state, action) => {
        state.isLoading = false
        state.items.unshift(action.payload)
        state.summary.totalItems += 1
        state.error = null
      })
      .addCase(addPantryItem.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update pantry item
      .addCase(updatePantryItem.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updatePantryItem.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.items.findIndex(item => item.id === action.payload.id)
        if (index !== -1) {
          state.items[index] = action.payload
        }
        state.error = null
      })
      .addCase(updatePantryItem.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Delete pantry item
      .addCase(deletePantryItem.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deletePantryItem.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = state.items.filter(item => item.id !== action.payload)
        state.summary.totalItems -= 1
        state.error = null
      })
      .addCase(deletePantryItem.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch expiring items
      .addCase(fetchExpiringItems.fulfilled, (state, action) => {
        state.expiringSoon = action.payload
      })
      .addCase(fetchExpiringItems.rejected, (state, action) => {
        state.error = action.payload as string
      })
      // Fetch expired items
      .addCase(fetchExpiredItems.fulfilled, (state, action) => {
        state.expired = action.payload
      })
      .addCase(fetchExpiredItems.rejected, (state, action) => {
        state.error = action.payload as string
      })
      // Bulk add items
      .addCase(bulkAddPantryItems.fulfilled, (state, action) => {
        state.items.unshift(...action.payload)
        state.summary.totalItems += action.payload.length
      })
      // Cleanup expired items
      .addCase(cleanupExpiredItems.fulfilled, (state, action) => {
        state.expired = []
        state.summary.expired = 0
      })
  },
})

export const { clearError } = pantrySlice.actions
export default pantrySlice.reducer