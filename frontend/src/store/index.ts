import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import pantryReducer from './slices/pantrySlice'
import recipesReducer from './slices/recipesSlice'
import mealPlanningReducer from './slices/mealPlanningSlice'
import groceryReducer from './slices/grocerySlice'
import aiReducer from './slices/aiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pantry: pantryReducer,
    recipes: recipesReducer,
    mealPlanning: mealPlanningReducer,
    grocery: groceryReducer,
    ai: aiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch