import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Recipe } from './types/recipe'
import { RecipeList } from './components/recipes/RecipeList'
import { RecipeForm } from './components/recipes/RecipeForm'
import { MealPlanningPage } from './pages/meal-planning/MealPlanningPage'
import { ShoppingListPage } from './pages/shopping-lists/ShoppingListPage'
import { voiceService, VoiceCommand } from './services/voiceService'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    voiceService.onCommand((command: VoiceCommand) => {
      setVoiceError(null)
      setIsProcessing(true)
      handleGlobalVoiceCommand(command)
      setTimeout(() => setIsProcessing(false), 500)
    })

    voiceService.onResult((result) => {
      // Show transcript in real-time (interim results)
      setVoiceTranscript(result.transcript)
      if (result.isFinal) {
        setIsListening(false)
        // Keep final transcript visible longer
        setTimeout(() => setVoiceTranscript(''), 4000)
      }
    })

    voiceService.onError((msg) => {
      setVoiceError(msg)
      setIsListening(false)
      setIsProcessing(false)
    })

    return () => {
      voiceService.stopListening()
    }
  }, [])

  const handleGlobalVoiceCommand = (command: VoiceCommand) => {
    switch (command.command) {
      case 'plan_meals':
        navigate('/meal-planning')
        break
      case 'view_recipes':
        navigate('/recipes')
        break
      case 'view_shopping_list':
        navigate('/shopping-lists')
        break
      case 'add_meal':
        // Extract parameters: [food, mealType, dateStr]
        const [food, mealType, dateStr] = command.parameters || []
        if (food && mealType) {
          // Store in sessionStorage for the meal planning page to pick up
          sessionStorage.setItem('pendingMeal', JSON.stringify({ food, mealType, dateStr }))
          voiceService.speak(`Adding ${food} for ${mealType}`)
          navigate('/meal-planning')
        }
        break
      case 'help':
        voiceService.speak('You can say: Add cereal for breakfast Friday, Go to recipes, Go to shopping list, or Help')
        break
      case 'unrecognized':
        voiceService.speak('Sorry, I did not understand that command. Say Help for options.')
        break
      default:
        break
    }
  }

  const toggleVoiceListening = () => {
    if (isListening) {
      voiceService.stopListening()
      setIsListening(false)
      setVoiceTranscript('')
      return
    }

    const started = voiceService.startListening()
    if (started) {
      setIsListening(true)
      setVoiceTranscript('')
      setVoiceError(null)
    } else {
      setVoiceError('Speech recognition not supported')
    }
  }

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
          React.createElement('div', {
            key: 'logo',
            style: { fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold' }
          }, '🍳 Intelligent Kitchen'),
          // Mobile controls (hamburger + voice)
          isMobile && React.createElement('div', {
            key: 'mobile-controls',
            style: { display: 'flex', gap: '0.5rem', alignItems: 'center' }
          }, [
            // Voice button (prominent on mobile)
            React.createElement('button', {
              key: 'voice-btn-mobile',
              onClick: toggleVoiceListening,
              style: {
                background: isListening ? '#f97316' : '#6366f1',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1.25rem',
                minWidth: '48px',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }
            }, isListening ? '🛑' : '🎙️'),
            // Hamburger menu button
            React.createElement('button', {
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
          ])
        ]),
        // Desktop navigation links
        !isMobile && React.createElement('div', {
          key: 'links',
          style: { display: 'flex', gap: '1rem', alignItems: 'center' }
        }, [
          React.createElement(Link, {
            key: 'meal-planning',
            to: '/',
            style: navLinkStyle(location.pathname === '/' || location.pathname === '/meal-planning')
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
          }, 'Shopping List'),
          React.createElement('button', {
            key: 'voice-btn',
            onClick: toggleVoiceListening,
            style: {
              background: isListening ? '#f97316' : '#6366f1',
              color: 'white',
              border: 'none',
              padding: '0.625rem 1rem',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              minHeight: '44px'
            }
          }, [isListening ? '🛑 Stop' : '🎙️ Voice'])
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
            key: 'meal-planning-m',
            to: '/',
            onClick: () => setMobileMenuOpen(false),
            style: navLinkStyle(location.pathname === '/' || location.pathname === '/meal-planning')
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
    
    // Voice status bar (shown when listening, processing, has transcript, or error)
    (isListening || isProcessing || voiceTranscript || voiceError) && React.createElement('div', {
      key: 'voice-status-bar',
      style: {
        background: isListening ? '#1e3a5f' : (isProcessing ? '#1e3a2f' : '#1e293b'),
        borderBottom: `3px solid ${isListening ? '#f97316' : (isProcessing ? '#10b981' : '#334155')}`,
        padding: isMobile ? '1rem' : '0.75rem 2rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        fontSize: isMobile ? '1rem' : '1rem',
        flexWrap: 'wrap',
        animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none'
      }
    }, [
      // Listening indicator with animated mic and live transcript
      isListening && React.createElement('div', {
        key: 'voice-indicator',
        style: { 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          color: '#f97316',
          fontWeight: 'bold',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }
      }, [
        React.createElement('span', {
          key: 'mic-icon',
          style: { 
            fontSize: '1.75rem',
            animation: 'pulse 0.8s ease-in-out infinite'
          }
        }, '🎤'),
        React.createElement('span', { 
          key: 'listening-text',
          style: { color: '#f1f5f9' }
        }, voiceTranscript ? '' : 'Listening... speak now'),
        // Show live transcript while listening
        voiceTranscript && React.createElement('span', {
          key: 'live-transcript',
          style: { 
            color: '#fbbf24',
            background: 'rgba(251, 191, 36, 0.15)',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            fontStyle: 'italic'
          }
        }, `"${voiceTranscript}"`)
      ]),
      // Processing indicator
      isProcessing && !isListening && React.createElement('div', {
        key: 'processing-indicator',
        style: { 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: '#10b981',
          fontWeight: 'bold'
        }
      }, [
        React.createElement('span', {
          key: 'process-icon',
          style: { fontSize: '1.25rem' }
        }, '⚡'),
        React.createElement('span', { key: 'process-text' }, 'Processing command...')
      ]),
      // Transcript display
      voiceTranscript && !isListening && React.createElement('div', {
        key: 'voice-transcript',
        style: { 
          color: '#cbd5e1', 
          wordBreak: 'break-word', 
          textAlign: 'center',
          background: '#334155',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem'
        }
      }, [
        React.createElement('span', { key: 'heard-label', style: { color: '#94a3b8' } }, 'Heard: '),
        React.createElement('span', { key: 'heard-text', style: { fontWeight: 'bold' } }, `"${voiceTranscript}"`)
      ]),
      // Error display
      voiceError && React.createElement('div', {
        key: 'voice-error',
        style: { 
          color: '#fca5a5',
          background: '#7f1d1d',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem'
        }
      }, voiceError)
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
      element: React.createElement(Layout, null, React.createElement(MealPlanningPage))
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