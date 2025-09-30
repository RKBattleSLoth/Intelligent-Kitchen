import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect } from 'react'
import { autoLogin } from './store/slices/authSlice'
import { RootState } from './store'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import PantryPage from './pages/pantry/PantryPage'
import RecipesPage from './pages/recipes/RecipesPage'
import MealPlanningPage from './pages/meal-planning/MealPlanningPage'
import GroceryListsPage from './pages/grocery/GroceryListsPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  const dispatch = useDispatch()
  const { isLoading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    dispatch(autoLogin())
  }, [dispatch])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-950">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={
        <Layout>
          <DashboardPage />
        </Layout>
      } />
      <Route path="/pantry" element={
        <Layout>
          <PantryPage />
        </Layout>
      } />
      <Route path="/recipes" element={
        <Layout>
          <RecipesPage />
        </Layout>
      } />
      <Route path="/meal-planning" element={
        <Layout>
          <MealPlanningPage />
        </Layout>
      } />
      <Route path="/grocery-lists" element={
        <Layout>
          <GroceryListsPage />
        </Layout>
      } />
      <Route path="/profile" element={
        <Layout>
          <ProfilePage />
        </Layout>
      } />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App