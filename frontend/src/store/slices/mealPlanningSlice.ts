import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

interface MealPlanEntry {
  id: string
  mealDate: string
  mealType: string
  notes?: string
  createdAt: string
  updatedAt: string
  recipeId?: string
  recipeName?: string
  recipeDescription?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  difficulty?: string
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
}

interface MealPlan {
  id: string
  name: string
  startDate: string
  endDate: string
  notes?: string
  createdAt: string
  updatedAt: string
  totalMeals?: number
  entries?: MealPlanEntry[]
}

interface MealPlanningState {
  mealPlans: MealPlan[]
  currentMealPlan: MealPlan | null
  mealPlanRange: MealPlanEntry[]
  isLoading: boolean
  error: string | null
}

const initialState: MealPlanningState = {
  mealPlans: [],
  currentMealPlan: null,
  mealPlanRange: [],
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchMealPlans = createAsyncThunk(
  'mealPlanning/fetchMealPlans',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/meal-plans')
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch meal plans')
    }
  }
)

export const fetchMealPlan = createAsyncThunk(
  'mealPlanning/fetchMealPlan',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/meal-plans/${id}`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch meal plan')
    }
  }
)

export const createMealPlan = createAsyncThunk(
  'mealPlanning/createMealPlan',
  async (mealPlan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt' | 'totalMeals' | 'entries'>, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/meal-plans', mealPlan)
      return response.data.mealPlan
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create meal plan')
    }
  }
)

export const updateMealPlan = createAsyncThunk(
  'mealPlanning/updateMealPlan',
  async ({ id, ...mealPlan }: Partial<MealPlan> & { id: string }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/meal-plans/${id}`, mealPlan)
      return response.data.mealPlan
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update meal plan')
    }
  }
)

export const deleteMealPlan = createAsyncThunk(
  'mealPlanning/deleteMealPlan',
  async (id: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/meal-plans/${id}`)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete meal plan')
    }
  }
)

export const addMealEntry = createAsyncThunk(
  'mealPlanning/addMealEntry',
  async ({ mealPlanId, ...entry }: Omit<MealPlanEntry, 'id' | 'createdAt' | 'updatedAt'> & { mealPlanId: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/meal-plans/${mealPlanId}/entries`, entry)
      const entryData = response.data.entry
      // Transform the API response to match the interface
      return {
        id: entryData.id,
        mealDate: entryData.meal_date,
        mealType: entryData.meal_type,
        notes: entryData.notes,
        createdAt: entryData.created_at,
        updatedAt: entryData.updated_at,
        recipeId: entryData.recipe_id,
        recipeName: entryData.recipe_name,
        recipeDescription: entryData.recipe_description,
        prepTime: entryData.prep_time,
        cookTime: entryData.cook_time,
        servings: entryData.servings,
        difficulty: entryData.difficulty,
        calories: entryData.calories,
        protein: entryData.protein,
        carbohydrates: entryData.carbohydrates,
        fat: entryData.fat
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add meal entry')
    }
  }
)

export const updateMealEntry = createAsyncThunk(
  'mealPlanning/updateMealEntry',
  async ({ entryId, ...entry }: Partial<MealPlanEntry> & { entryId: string }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/meal-plans/entries/${entryId}`, entry)
      return response.data.entry
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update meal entry')
    }
  }
)

export const deleteMealEntry = createAsyncThunk(
  'mealPlanning/deleteMealEntry',
  async (entryId: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/meal-plans/entries/${entryId}`)
      return entryId
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete meal entry')
    }
  }
)

export const fetchMealPlanRange = createAsyncThunk(
  'mealPlanning/fetchMealPlanRange',
  async ({ startDate, endDate }: { startDate: string; endDate: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/meal-plans/range/${startDate}/${endDate}`)
      // Transform the API response to match the interface
      const transformedData = response.data.map((meal: any) => ({
        id: meal.id,
        mealDate: meal.meal_date, // Keep the full date string from backend
        mealType: meal.meal_type,
        notes: meal.notes,
        createdAt: meal.created_at,
        updatedAt: meal.updated_at,
        recipeId: meal.recipe_id,
        recipeName: meal.recipe_name,
        recipeDescription: meal.recipe_description,
        prepTime: meal.prep_time,
        cookTime: meal.cook_time,
        servings: meal.servings,
        difficulty: meal.difficulty,
        calories: meal.calories,
        protein: meal.protein,
        carbohydrates: meal.carbohydrates,
        fat: meal.fat
      }))
      return transformedData
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch meal plan range')
    }
  }
)

const mealPlanningSlice = createSlice({
  name: 'mealPlanning',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCurrentMealPlan: (state, action: PayloadAction<MealPlan | null>) => {
      state.currentMealPlan = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch meal plans
      .addCase(fetchMealPlans.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMealPlans.fulfilled, (state, action) => {
        state.isLoading = false
        state.mealPlans = action.payload
        state.error = null
      })
      .addCase(fetchMealPlans.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch single meal plan
      .addCase(fetchMealPlan.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMealPlan.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentMealPlan = action.payload
        state.error = null
      })
      .addCase(fetchMealPlan.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create meal plan
      .addCase(createMealPlan.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createMealPlan.fulfilled, (state, action) => {
        state.isLoading = false
        state.mealPlans.unshift(action.payload)
        state.error = null
      })
      .addCase(createMealPlan.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update meal plan
      .addCase(updateMealPlan.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateMealPlan.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.mealPlans.findIndex(plan => plan.id === action.payload.id)
        if (index !== -1) {
          state.mealPlans[index] = action.payload
        }
        if (state.currentMealPlan?.id === action.payload.id) {
          state.currentMealPlan = action.payload
        }
        state.error = null
      })
      .addCase(updateMealPlan.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Delete meal plan
      .addCase(deleteMealPlan.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteMealPlan.fulfilled, (state, action) => {
        state.isLoading = false
        state.mealPlans = state.mealPlans.filter(plan => plan.id !== action.payload)
        if (state.currentMealPlan?.id === action.payload) {
          state.currentMealPlan = null
        }
        state.error = null
      })
      .addCase(deleteMealPlan.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Add meal entry
      .addCase(addMealEntry.fulfilled, (state, action) => {
        if (state.currentMealPlan) {
          if (!state.currentMealPlan.entries) {
            state.currentMealPlan.entries = []
          }
          state.currentMealPlan.entries.push(action.payload)
        }
        // Also add to mealPlanRange for UI display
        state.mealPlanRange.push(action.payload)
      })
      .addCase(addMealEntry.rejected, (state, action) => {
        state.error = action.payload as string
      })
      // Update meal entry
      .addCase(updateMealEntry.fulfilled, (state, action) => {
        if (state.currentMealPlan?.entries) {
          const index = state.currentMealPlan.entries.findIndex(entry => entry.id === action.payload.id)
          if (index !== -1) {
            state.currentMealPlan.entries[index] = action.payload
          }
        }
      })
      // Delete meal entry
      .addCase(deleteMealEntry.fulfilled, (state, action) => {
        if (state.currentMealPlan?.entries) {
          state.currentMealPlan.entries = state.currentMealPlan.entries.filter(entry => entry.id !== action.payload)
        }
      })
      // Fetch meal plan range
      .addCase(fetchMealPlanRange.fulfilled, (state, action) => {
        state.mealPlanRange = action.payload
      })
  },
})

export const { clearError, setCurrentMealPlan } = mealPlanningSlice.actions
export default mealPlanningSlice.reducer