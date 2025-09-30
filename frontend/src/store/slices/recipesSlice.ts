import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

interface RecipeIngredient {
  id: string
  name: string
  quantity: number
  unit: string
  notes?: string
}

interface NutritionInfo {
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
  fiber?: number
  sugar?: number
  sodium?: number
}

interface Recipe {
  id: string
  name: string
  description?: string
  instructions: string
  prepTime?: number
  cookTime?: number
  servings: number
  difficulty?: string
  mealType?: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  authorName?: string
  ingredients: RecipeIngredient[]
  nutrition?: NutritionInfo
}

interface RecipesState {
  recipes: Recipe[]
  userRecipes: Recipe[]
  currentRecipe: Recipe | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const initialState: RecipesState = {
  recipes: [],
  userRecipes: [],
  currentRecipe: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
}

// Async thunks
export const fetchRecipes = createAsyncThunk(
  'recipes/fetchRecipes',
  async (params?: {
    mealType?: string
    difficulty?: string
    search?: string
    page?: number
    limit?: number
  }, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
    try {
      const response = await axios.get('/api/recipes', { params })
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch recipes')
    }
  }
)

export const fetchRecipe = createAsyncThunk(
  'recipes/fetchRecipe',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/recipes/${id}`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch recipe')
    }
  }
)

export const createRecipe = createAsyncThunk(
  'recipes/createRecipe',
  async (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'authorName'>, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/recipes', recipe)
      return response.data.recipe
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create recipe')
    }
  }
)

export const updateRecipe = createAsyncThunk(
  'recipes/updateRecipe',
  async ({ id, ...recipe }: Partial<Recipe> & { id: string }, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
    try {
      const response = await axios.put(`/api/recipes/${id}`, recipe)
      return response.data.recipe
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update recipe')
    }
  }
)

export const deleteRecipe = createAsyncThunk(
  'recipes/deleteRecipe',
  async (id: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/recipes/${id}`)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete recipe')
    }
  }
)

export const fetchUserRecipes = createAsyncThunk(
  'recipes/fetchUserRecipes',
  async (params?: { page?: number; limit?: number }, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
    try {
      const response = await axios.get('/api/recipes/user/my-recipes', { params })
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch user recipes')
    }
  }
)

const recipesSlice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCurrentRecipe: (state, action: PayloadAction<Recipe | null>) => {
      state.currentRecipe = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch recipes
      .addCase(fetchRecipes.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchRecipes.fulfilled, (state, action) => {
        state.isLoading = false
        state.recipes = action.payload.recipes
        state.pagination = action.payload.pagination
        state.error = null
      })
      .addCase(fetchRecipes.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch single recipe
      .addCase(fetchRecipe.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchRecipe.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentRecipe = action.payload
        state.error = null
      })
      .addCase(fetchRecipe.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create recipe
      .addCase(createRecipe.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createRecipe.fulfilled, (state, action) => {
        state.isLoading = false
        state.recipes.unshift(action.payload)
        state.userRecipes.unshift(action.payload)
        state.error = null
      })
      .addCase(createRecipe.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update recipe
      .addCase(updateRecipe.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateRecipe.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.recipes.findIndex(recipe => recipe.id === action.payload.id)
        if (index !== -1) {
          state.recipes[index] = action.payload
        }
        const userIndex = state.userRecipes.findIndex(recipe => recipe.id === action.payload.id)
        if (userIndex !== -1) {
          state.userRecipes[userIndex] = action.payload
        }
        if (state.currentRecipe?.id === action.payload.id) {
          state.currentRecipe = action.payload
        }
        state.error = null
      })
      .addCase(updateRecipe.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Delete recipe
      .addCase(deleteRecipe.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteRecipe.fulfilled, (state, action) => {
        state.isLoading = false
        state.recipes = state.recipes.filter(recipe => recipe.id !== action.payload)
        state.userRecipes = state.userRecipes.filter(recipe => recipe.id !== action.payload)
        if (state.currentRecipe?.id === action.payload) {
          state.currentRecipe = null
        }
        state.error = null
      })
      .addCase(deleteRecipe.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch user recipes
      .addCase(fetchUserRecipes.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUserRecipes.fulfilled, (state, action) => {
        state.isLoading = false
        state.userRecipes = action.payload.recipes
        state.error = null
      })
      .addCase(fetchUserRecipes.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError, setCurrentRecipe } = recipesSlice.actions
export default recipesSlice.reducer