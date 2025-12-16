import { useState } from 'react';
import { MealPlanner } from './components/MealPlanner';
import { Recipes } from './components/Recipes';
import { ShoppingList } from './components/ShoppingList';
import { Settings } from './components/Settings';
import { KitchenIcon } from './components/KitchenIcon';
import { LayoutGrid, Beef, Calendar, ShoppingBag, Settings as SettingsIcon } from 'lucide-react';
import kitchenArtwork from 'figma:asset/22246ed99a2fab284b1e8aa82ad1cd071e78c525.png';
import bannerTexture from 'figma:asset/0889ad84419a5530e2d247ea2e1d1e8f977e1a8a.png';

type TabType = 'meal-planning' | 'recipes' | 'shopping-list' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('meal-planning');

  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundColor: '#f0fdfa',
      backgroundImage: `url(${kitchenArtwork})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundBlendMode: 'soft-light',
      opacity: 1
    }}>
      {/* Decorative corner flourishes */}
      <div className="fixed top-0 left-0 w-32 h-32 pointer-events-none opacity-20" style={{
        background: 'radial-gradient(circle at top left, #d4af37 0%, transparent 70%)'
      }}></div>
      <div className="fixed top-0 right-0 w-32 h-32 pointer-events-none opacity-20" style={{
        background: 'radial-gradient(circle at top right, #d4af37 0%, transparent 70%)'
      }}></div>

      {/* Header Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm relative" style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)),
          url(${kitchenArtwork}),
          linear-gradient(135deg, rgba(245, 245, 245, 0.5) 0%, rgba(232, 232, 232, 0.5) 50%, rgba(245, 245, 245, 0.5) 100%)
        `,
        backgroundSize: 'cover, cover, 100% 100%',
        backgroundPosition: 'center, center, center',
        backgroundBlendMode: 'normal, normal, normal',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div className="max-w-[1600px] mx-auto px-6">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between h-16">
            <div className="flex items-center gap-2" style={{ marginLeft: 'calc(-1.5cm - 6mm)' }}>
              <KitchenIcon />
              <span style={{
                color: '#33789f',
                fontWeight: '400',
                fontSize: '2.5rem',
                fontFamily: 'var(--font-serif-display)',
                fontStyle: 'italic'
              }}>Intelligent Kitchen</span>
            </div>
            
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('meal-planning')}
                className={`px-4 py-2 transition-colors ${
                  activeTab === 'meal-planning' ? 'border-b-2' : ''
                }`}
                style={activeTab === 'meal-planning' ? {
                  color: '#035b49',
                  borderBottomColor: '#d4af37',
                  fontWeight: 'bold'
                } : {
                  color: '#035b49',
                  fontWeight: 'bold'
                }}
              >
                Meal Planning
              </button>
              <button
                onClick={() => setActiveTab('recipes')}
                className={`px-4 py-2 transition-colors ${
                  activeTab === 'recipes' ? 'border-b-2' : ''
                }`}
                style={activeTab === 'recipes' ? {
                  color: '#035b49',
                  borderBottomColor: '#d4af37',
                  fontWeight: 'bold'
                } : {
                  color: '#035b49',
                  fontWeight: 'bold'
                }}
              >
                Recipes
              </button>
              <button
                onClick={() => setActiveTab('shopping-list')}
                className={`px-4 py-2 transition-colors ${
                  activeTab === 'shopping-list' ? 'border-b-2' : ''
                }`}
                style={activeTab === 'shopping-list' ? {
                  color: '#035b49',
                  borderBottomColor: '#d4af37',
                  fontWeight: 'bold'
                } : {
                  color: '#035b49',
                  fontWeight: 'bold'
                }}
              >
                Shopping List
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 transition-colors ${
                  activeTab === 'settings' ? 'border-b-2' : ''
                }`}
                style={activeTab === 'settings' ? {
                  color: '#035b49',
                  borderBottomColor: '#d4af37',
                  fontWeight: 'bold'
                } : {
                  color: '#035b49',
                  fontWeight: 'bold'
                }}
              >
                Settings
              </button>
            </div>
          </div>

          {/* Mobile Header - Title Only */}
          <div className="flex md:hidden items-center justify-center h-16">
            <div className="flex items-center gap-2" style={{ marginLeft: 'calc(-1.5cm - 8mm)' }}>
              <KitchenIcon />
              <span style={{
                color: '#33789f',
                fontWeight: '400',
                fontSize: '1.75rem',
                fontFamily: 'var(--font-serif-display)',
                fontStyle: 'italic'
              }}>Intelligent Kitchen</span>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content with bottom padding for mobile footer */}
      <main className="max-w-[1600px] mx-auto p-6 flex-1 pb-24 md:pb-6">
        {activeTab === 'meal-planning' && <MealPlanner />}
        {activeTab === 'recipes' && <Recipes />}
        {activeTab === 'shopping-list' && <ShoppingList />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Footer */}
      <div style={{
        height: '2mm',
        background: 'linear-gradient(to bottom, #e8d399, #dbc68a)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}></div>
      <footer className="bg-white border-t border-gray-200" style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)),
          url(${kitchenArtwork}),
          linear-gradient(135deg, rgba(245, 245, 245, 0.5) 0%, rgba(232, 232, 232, 0.5) 50%, rgba(245, 245, 245, 0.5) 100%)
        `,
        backgroundSize: 'cover, cover, 100% 100%',
        backgroundPosition: 'center, center, center',
        backgroundBlendMode: 'normal, normal, normal',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="text-center" style={{
            fontFamily: 'var(--font-serif-body)',
            fontStyle: 'italic',
            color: '#2a6f6f',
            fontSize: '0.875rem'
          }}>
            "The secret ingredient is always love" — Est. 2024
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation - Fixed Footer */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="grid grid-cols-5 h-16">
          <button
            onClick={() => setActiveTab('meal-planning')}
            className="flex flex-col items-center justify-center gap-1 transition-colors"
            style={{
              color: activeTab === 'meal-planning' ? '#EA6A47' : '#6b7280'
            }}
          >
            <LayoutGrid className="w-6 h-6" />
            <span className="text-[10px]">Planner</span>
          </button>
          
          <button
            className="flex flex-col items-center justify-center gap-1 transition-colors text-gray-400 cursor-not-allowed"
            disabled
          >
            <Beef className="w-6 h-6" />
            <span className="text-[10px]">Pantry</span>
          </button>
          
          <button
            onClick={() => setActiveTab('recipes')}
            className="flex flex-col items-center justify-center gap-1 transition-colors"
            style={{
              color: activeTab === 'recipes' ? '#EA6A47' : '#6b7280'
            }}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-[10px]">Recipes</span>
          </button>
          
          <button
            onClick={() => setActiveTab('shopping-list')}
            className="flex flex-col items-center justify-center gap-1 transition-colors"
            style={{
              color: activeTab === 'shopping-list' ? '#EA6A47' : '#6b7280'
            }}
          >
            <ShoppingBag className="w-6 h-6" />
            <span className="text-[10px]">Grocery List</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className="flex flex-col items-center justify-center gap-1 transition-colors"
            style={{
              color: activeTab === 'settings' ? '#EA6A47' : '#6b7280'
            }}
          >
            <SettingsIcon className="w-6 h-6" />
            <span className="text-[10px]">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}