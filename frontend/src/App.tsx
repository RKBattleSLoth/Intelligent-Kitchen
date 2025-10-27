import React, { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Recipe } from './types/recipe'
import { RecipeList } from './components/recipes/RecipeList'
import { RecipeForm } from './components/recipes/RecipeForm'
import { MealPlanningPage } from './pages/meal-planning/MealPlanningPage'
import { ShoppingListPage } from './pages/shopping-lists/ShoppingListPage'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  
  return React.createElement('div', { style: { minHeight: '100vh', background: '#0f172a' } }, [
    // Navigation
    React.createElement('nav', {
      key: 'nav',
      style: {
        background: '#1e293b',
        color: '#f1f5f9',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        borderBottom: '1px solid #334155'
      }
    }, [
      React.createElement('div', {
        key: 'nav-content',
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
      }, [
        React.createElement('div', {
          key: 'logo',
          style: { fontSize: '1.5rem', fontWeight: 'bold' }
        }, '🍳 Intelligent Kitchen'),
        React.createElement('div', {
          key: 'links',
          style: { display: 'flex', gap: '2rem' }
        }, [
          React.createElement(Link, {
            key: 'home',
            to: '/',
            style: {
              color: location.pathname === '/' ? '#60a5fa' : 'white',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              background: location.pathname === '/' ? 'rgba(96, 165, 250, 0.1)' : 'transparent'
            }
          }, 'Dashboard'),
          React.createElement(Link, {
            key: 'recipes',
            to: '/recipes',
            style: {
              color: location.pathname === '/recipes' ? '#60a5fa' : 'white',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              background: location.pathname === '/recipes' ? 'rgba(96, 165, 250, 0.1)' : 'transparent'
            }
          }, 'Recipes'),
          React.createElement(Link, {
            key: 'meal-planning',
            to: '/meal-planning',
            style: {
              color: location.pathname === '/meal-planning' ? '#60a5fa' : 'white',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              background: location.pathname === '/meal-planning' ? 'rgba(96, 165, 250, 0.1)' : 'transparent'
            }
          }, 'Meal Planning'),
          React.createElement(Link, {
            key: 'shopping-lists',
            to: '/shopping-lists',
            style: {
              color: location.pathname === '/shopping-lists' ? '#60a5fa' : 'white',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              background: location.pathname === '/shopping-lists' ? 'rgba(96, 165, 250, 0.1)' : 'transparent'
            }
          }, 'Shopping Lists')
        ])
      ])
    ]),
    
    // Main Content
    React.createElement('main', {
      key: 'main',
      style: { padding: '2rem' }
    }, children)
  ])
}

const Dashboard = () => React.createElement('div', null, [
  React.createElement('h1', {
    key: 'title',
    style: { fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f1f5f9' }
  }, 'Welcome to Intelligent Kitchen! 👋'),
  React.createElement('p', {
    key: 'desc',
    style: { color: '#94a3b8', marginBottom: '2rem' }
  }, 'Your AI-powered kitchen management system is ready to help you plan meals, manage inventory, and discover recipes.'),
  
  React.createElement('div', {
    key: 'stats',
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }
  }, [
    React.createElement('div', {
      key: 'stat2',
      style: {
        background: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        border: '1px solid #334155'
      }
    }, [
      React.createElement('div', { key: 'icon2', style: { fontSize: '2rem', marginBottom: '0.5rem' } }, '📖'),
      React.createElement('h3', { key: 'title2', style: { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#f1f5f9' } }, 'Recipes'),
      React.createElement('p', { key: 'value2', style: { color: '#60a5fa', fontSize: '2rem', fontWeight: 'bold' } }, '12'),
      React.createElement('p', { key: 'change2', style: { color: '#10b981', fontSize: '0.875rem' } }, '+2 new this week')
    ])
  ])
])

const PlaceholderPage = ({ title, description, emoji }: { title: string; description: string; emoji: string }) => 
  React.createElement('div', null, [
    React.createElement('h1', {
      key: 'title',
      style: { fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f1f5f9' }
    }, `${emoji} ${title}`),
    React.createElement('p', {
      key: 'desc',
      style: { color: '#94a3b8', marginBottom: '2rem' }
    }, description),
    React.createElement('div', {
      key: 'placeholder',
      style: {
        background: '#1e293b',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        border: '1px solid #334155',
        textAlign: 'center'
      }
    }, [
      React.createElement('div', { key: 'icon', style: { fontSize: '3rem', marginBottom: '1rem' } }, '🚧'),
      React.createElement('h3', { key: 'subtitle', style: { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#f1f5f9' } }, 'Coming Soon'),
      React.createElement('p', { key: 'text', style: { color: '#94a3b8' } }, 'This feature is under construction. Check back soon!')
    ])
  ])

function App() {
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showRecipeForm, setShowRecipeForm] = useState(false)

  console.log('App: Rendering with createElement')
  
  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setShowRecipeForm(true)
  }

  const handleAddRecipe = () => {
    setEditingRecipe(null)
    setShowRecipeForm(true)
  }

  const handleSaveRecipe = (recipe: Recipe) => {
    setEditingRecipe(null)
    setShowRecipeForm(false)
    // Force a re-render by updating the component
    window.location.reload()
  }

  const handleCancelRecipe = () => {
    setEditingRecipe(null)
    setShowRecipeForm(false)
  }

  const RecipesPage = () => {
    if (showRecipeForm) {
      return React.createElement(RecipeForm, {
        recipe: editingRecipe || undefined,
        onSave: handleSaveRecipe,
        onCancel: handleCancelRecipe
      })
    }

    return React.createElement(RecipeList, {
      onEdit: handleEditRecipe,
      onAdd: handleAddRecipe
    })
  }

  return React.createElement(Routes, null, [
    React.createElement(Route, {
      key: 'home',
      path: '/',
      element: React.createElement(Layout, null, React.createElement(Dashboard))
    }),
    React.createElement(Route, {
      key: 'recipes',
      path: '/recipes',
      element: React.createElement(Layout, null, React.createElement(RecipesPage))
    }),
    React.createElement(Route, {
      key: 'meal-planning',
      path: '/meal-planning',
      element: React.createElement(Layout, null, React.createElement(MealPlanningPage))
    }),
    React.createElement(Route, {
      key: 'shopping-lists',
      path: '/shopping-lists',
      element: React.createElement(Layout, null, React.createElement(ShoppingListPage))
    })
  ])
}

export default App