import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Recipe } from './types/recipe'
import { RecipeList } from './components/recipes/RecipeList'
import { RecipeForm } from './components/recipes/RecipeForm'
import { MealPlanningPage } from './pages/meal-planning/MealPlanningPage'
import { ShoppingListPage } from './pages/shopping-lists/ShoppingListPage'
import { BetsyPage } from './pages/assistant/BetsyPage'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const navLinkStyle = (isActive: boolean) => ({
    color: isActive ? '#60a5fa' : 'white',
    textDecoration: 'none',
    padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
    borderRadius: '0.25rem',
    background: isActive ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
    display: 'block',
    minHeight: '44px',
    lineHeight: isMobile ? '1.5rem' : 'normal'
  })
  
  return React.createElement('div', { style: { minHeight: '100vh', background: '#0f172a' } }, [
    // Navigation
    React.createElement('nav', {
      key: 'nav',
      style: {
        background: '#1e293b',
        color: '#f1f5f9',
        padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        borderBottom: '1px solid #334155'
      }
    }, [
      React.createElement('div', {
        key: 'nav-content',
        style: { 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }
      }, [
        // Logo and hamburger row
        React.createElement('div', {
          key: 'logo-row',
          style: { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            width: isMobile ? '100%' : 'auto',
            gap: '0.5rem'
          }
        }, [
          React.createElement(Link, {
            key: 'logo',
            to: '/',
            style: { 
              fontSize: isMobile ? '1.25rem' : '1.5rem', 
              fontWeight: 'bold',
              color: '#f1f5f9',
              textDecoration: 'none'
            }
          }, '🍳 Intelligent Kitchen'),
          // Mobile hamburger
          isMobile && React.createElement('button', {
            key: 'hamburger',
            onClick: () => setMobileMenuOpen(!mobileMenuOpen),
            style: {
              background: 'transparent',
              color: 'white',
              border: '1px solid #475569',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '1.5rem',
              minWidth: '48px',
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          }, mobileMenuOpen ? '✕' : '☰')
        ]),
        // Desktop navigation links
        !isMobile && React.createElement('div', {
          key: 'links',
          style: { display: 'flex', gap: '1rem', alignItems: 'center' }
        }, [
          React.createElement(Link, {
            key: 'betsy',
            to: '/',
            style: navLinkStyle(location.pathname === '/')
          }, '👩‍🍳 Betsy'),
          React.createElement(Link, {
            key: 'meal-planning',
            to: '/meal-planning',
            style: navLinkStyle(location.pathname === '/meal-planning')
          }, 'Meal Planning'),
          React.createElement(Link, {
            key: 'recipes',
            to: '/recipes',
            style: navLinkStyle(location.pathname === '/recipes')
          }, 'Recipes'),
          React.createElement(Link, {
            key: 'shopping-lists',
            to: '/shopping-lists',
            style: navLinkStyle(location.pathname === '/shopping-lists')
          }, 'Shopping List')
        ]),
        // Mobile dropdown menu
        isMobile && mobileMenuOpen && React.createElement('div', {
          key: 'mobile-menu',
          style: {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #334155',
            marginTop: '0.5rem'
          }
        }, [
          React.createElement(Link, {
            key: 'betsy-m',
            to: '/',
            onClick: () => setMobileMenuOpen(false),
            style: navLinkStyle(location.pathname === '/')
          }, '👩‍🍳 Betsy'),
          React.createElement(Link, {
            key: 'meal-planning-m',
            to: '/meal-planning',
            onClick: () => setMobileMenuOpen(false),
            style: navLinkStyle(location.pathname === '/meal-planning')
          }, '📅 Meal Planning'),
          React.createElement(Link, {
            key: 'recipes-m',
            to: '/recipes',
            onClick: () => setMobileMenuOpen(false),
            style: navLinkStyle(location.pathname === '/recipes')
          }, '📖 Recipes'),
          React.createElement(Link, {
            key: 'shopping-lists-m',
            to: '/shopping-lists',
            onClick: () => setMobileMenuOpen(false),
            style: navLinkStyle(location.pathname === '/shopping-lists')
          }, '🛒 Shopping List')
        ])
      ])
    ]),
    
    // Main Content
    React.createElement('main', {
      key: 'main',
      style: { padding: isMobile ? '1rem' : '2rem' }
    }, children)
  ])
}

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
      element: React.createElement(Layout, null, React.createElement(BetsyPage))
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