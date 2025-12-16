import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Recipe } from './types/recipe'
import { RecipeList } from './components/recipes/RecipeList'
import { RecipeForm } from './components/recipes/RecipeForm'
import { MealPlanningPage } from './pages/meal-planning/MealPlanningPage'
import { ShoppingListPage } from './pages/shopping-lists/ShoppingListPage'
import { BetsyPage } from './pages/assistant/BetsyPage'
import { BetsyButton } from './components/BetsyChat'
import { LayoutGrid, BookOpen, Calendar, ShoppingBag, Settings, Menu, X } from 'lucide-react'

// Import background assets
import kitchenArtwork from './assets/22246ed99a2fab284b1e8aa82ad1cd071e78c525.png'

const KitchenIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="#0fc7b9" opacity="0.2"/>
    <path d="M16 18C16 16.8954 16.8954 16 18 16H30C31.1046 16 32 16.8954 32 18V32C32 33.1046 31.1046 34 30 34H18C16.8954 34 16 33.1046 16 32V18Z" stroke="#035b49" strokeWidth="2"/>
    <path d="M20 16V14C20 12.8954 20.8954 12 22 12H26C27.1046 12 28 12.8954 28 14V16" stroke="#035b49" strokeWidth="2"/>
    <circle cx="24" cy="25" r="4" stroke="#d4af37" strokeWidth="2"/>
    <path d="M24 21V29" stroke="#d4af37" strokeWidth="1.5"/>
    <path d="M20 25H28" stroke="#d4af37" strokeWidth="1.5"/>
  </svg>
)

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

  const isActive = (path: string) => location.pathname === path

  const navLinkClass = (path: string) => 
    `px-4 py-2 transition-colors font-bold ${
      isActive(path) 
        ? 'border-b-2 border-[#d4af37] text-[#035b49]' 
        : 'text-[#035b49] hover:text-[#2a6f6f]'
    }`

  const mobileNavLinkClass = (path: string) =>
    `flex items-center gap-3 px-4 py-3 transition-colors ${
      isActive(path)
        ? 'text-[#EA6A47] bg-orange-50'
        : 'text-gray-600 hover:bg-gray-50'
    }`

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: '#f0fdfa',
        backgroundImage: `url(${kitchenArtwork})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'soft-light',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Decorative corner flourishes */}
      <div 
        className="fixed top-0 left-0 w-32 h-32 pointer-events-none opacity-20 z-0"
        style={{ background: 'radial-gradient(circle at top left, #d4af37 0%, transparent 70%)' }}
      />
      <div 
        className="fixed top-0 right-0 w-32 h-32 pointer-events-none opacity-20 z-0"
        style={{ background: 'radial-gradient(circle at top right, #d4af37 0%, transparent 70%)' }}
      />

      {/* Header Navigation */}
      <nav 
        className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm relative z-20"
        style={{ borderBottom: '1px solid #e5e7eb' }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <KitchenIcon />
              <span 
                className="text-2xl"
                style={{
                  color: '#33789f',
                  fontWeight: 400,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic'
                }}
              >
                Intelligent Kitchen
              </span>
            </Link>
            
            <div className="flex gap-6">
              <Link to="/" className={navLinkClass('/')}>
                👩‍🍳 Betsy
              </Link>
              <Link to="/meal-planning" className={navLinkClass('/meal-planning')}>
                Meal Planning
              </Link>
              <Link to="/recipes" className={navLinkClass('/recipes')}>
                Recipes
              </Link>
              <Link to="/shopping-lists" className={navLinkClass('/shopping-lists')}>
                Shopping List
              </Link>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <KitchenIcon />
              <span 
                className="text-xl"
                style={{
                  color: '#33789f',
                  fontWeight: 400,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic'
                }}
              >
                Intelligent Kitchen
              </span>
            </Link>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobile && mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-2 bg-white">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/')}
              >
                <span className="text-xl">👩‍🍳</span>
                <span>Betsy</span>
              </Link>
              <Link 
                to="/meal-planning" 
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/meal-planning')}
              >
                <Calendar className="w-5 h-5" />
                <span>Meal Planning</span>
              </Link>
              <Link 
                to="/recipes" 
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/recipes')}
              >
                <BookOpen className="w-5 h-5" />
                <span>Recipes</span>
              </Link>
              <Link 
                to="/shopping-lists" 
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/shopping-lists')}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Shopping List</span>
              </Link>
            </div>
          )}
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 flex-1 pb-24 md:pb-6 relative z-10">
        {children}
      </main>

      {/* Gold accent bar */}
      <div 
        className="h-1 hidden md:block"
        style={{ background: 'linear-gradient(to bottom, #e8d399, #dbc68a)' }}
      />
      
      {/* Footer - Desktop only */}
      <footer className="hidden md:block bg-white/90 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div 
            className="text-center text-sm"
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontStyle: 'italic',
              color: '#2a6f6f'
            }}
          >
            "The secret ingredient is always love" — Est. 2024
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="grid grid-cols-4 h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive('/') ? 'text-[#EA6A47]' : 'text-gray-500'
            }`}
          >
            <span className="text-lg">👩‍🍳</span>
            <span className="text-[10px]">Betsy</span>
          </Link>
          
          <Link
            to="/meal-planning"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive('/meal-planning') ? 'text-[#EA6A47]' : 'text-gray-500'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Planner</span>
          </Link>
          
          <Link
            to="/recipes"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive('/recipes') ? 'text-[#EA6A47]' : 'text-gray-500'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px]">Recipes</span>
          </Link>
          
          <Link
            to="/shopping-lists"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive('/shopping-lists') ? 'text-[#EA6A47]' : 'text-gray-500'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px]">Shopping</span>
          </Link>
        </div>
      </nav>
      
      {/* Floating Betsy Button (only show on pages other than Betsy's dedicated page) */}
      {location.pathname !== '/' && <BetsyButton />}
    </div>
  )
}

function App() {
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showRecipeForm, setShowRecipeForm] = useState(false)

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
    window.location.reload()
  }

  const handleCancelRecipe = () => {
    setEditingRecipe(null)
    setShowRecipeForm(false)
  }

  const RecipesPage = () => {
    if (showRecipeForm) {
      return <RecipeForm 
        recipe={editingRecipe || undefined}
        onSave={handleSaveRecipe}
        onCancel={handleCancelRecipe}
      />
    }

    return <RecipeList 
      onEdit={handleEditRecipe}
      onAdd={handleAddRecipe}
    />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout><BetsyPage /></Layout>} />
      <Route path="/recipes" element={<Layout><RecipesPage /></Layout>} />
      <Route path="/meal-planning" element={<Layout><MealPlanningPage /></Layout>} />
      <Route path="/shopping-lists" element={<Layout><ShoppingListPage /></Layout>} />
    </Routes>
  )
}

export default App
