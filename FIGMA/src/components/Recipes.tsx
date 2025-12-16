import { useState } from 'react';
import { Search, ChefHat, Clock, TrendingUp, Plus } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import frenchToastImage from 'figma:asset/dd81067b1972ebe6c70e4e391274379f6951e472.png';
import shakshukaImage from 'figma:asset/be1b5d2ec06a8b33098d5e698fe06f38844b2de3.png';
import frittataImage from 'figma:asset/ebcb0adf19d3aea9daeee2a12c11c421f811e222.png';

interface Recipe {
  id: number;
  name: string;
  cuisine: string;
  prepTime: string;
  difficulty: string;
  calories: number;
  description: string;
  image?: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert';
}

const sampleRecipes: Recipe[] = [
  { id: 1, name: 'French Toast with Berry Compote', cuisine: 'French', prepTime: '20 min', difficulty: 'Easy', calories: 420, description: 'Classic French toast topped with fresh berry compote and powdered sugar', image: frenchToastImage, mealType: 'Breakfast' },
  { id: 2, name: 'Mediterranean Shakshuka', cuisine: 'Mediterranean', prepTime: '30 min', difficulty: 'Medium', calories: 380, description: 'Eggs poached in spicy tomato sauce with peppers and onions', image: shakshukaImage, mealType: 'Breakfast' },
  { id: 3, name: 'Mexican Breakfast Burrito', cuisine: 'Mexican', prepTime: '25 min', difficulty: 'Easy', calories: 450, description: 'Hearty breakfast burrito with eggs, cheese, salsa, and avocado', image: 'https://images.unsplash.com/photo-1574365361850-8e8aec561723?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZXhpY2FuJTIwYnJlYWtmYXN0JTIwYnVycml0b3xlbnwxfHx8fDE3NjM2ODc3NTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', mealType: 'Breakfast' },
  { id: 4, name: 'Italian Frittata', cuisine: 'Italian', prepTime: '35 min', difficulty: 'Medium', calories: 320, description: 'Fluffy Italian-style omelette with vegetables and herbs', image: frittataImage, mealType: 'Breakfast' },
  { id: 5, name: 'Asian Chicken Salad', cuisine: 'Asian', prepTime: '15 min', difficulty: 'Easy', calories: 350, description: 'Fresh salad with grilled chicken and sesame ginger dressing', image: 'https://images.unsplash.com/photo-1613360734521-adef8a377347?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMGNoaWNrZW4lMjBzYWxhZHxlbnwxfHx8fDE3NjM2ODc3NTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', mealType: 'Lunch' },
  { id: 6, name: 'Greek Souvlaki', cuisine: 'Greek', prepTime: '40 min', difficulty: 'Medium', calories: 480, description: 'Marinated grilled meat skewers with tzatziki sauce', image: 'https://images.unsplash.com/photo-1755613012075-d8c3b5a95cd6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlayUyMHNvdXZsYWtpJTIwc2tld2Vyc3xlbnwxfHx8fDE3NjM2ODc3NTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', mealType: 'Lunch' },
  { id: 7, name: 'Beef Enchiladas', cuisine: 'Mexican', prepTime: '45 min', difficulty: 'Hard', calories: 620, description: 'Rolled tortillas filled with seasoned beef and cheese', image: 'https://images.unsplash.com/photo-1730878423239-0fd430bbac37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWVmJTIwZW5jaGlsYWRhcyUyMG1leGljYW58ZW58MXx8fHwxNzYzNjg3NzUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', mealType: 'Dinner' },
  { id: 8, name: 'Pad Thai', cuisine: 'Thai', prepTime: '30 min', difficulty: 'Medium', calories: 520, description: 'Stir-fried rice noodles with shrimp, peanuts, and tamarind sauce', image: 'https://images.unsplash.com/photo-1718964313403-2db158f67844?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYWQlMjB0aGFpJTIwbm9vZGxlc3xlbnwxfHx8fDE3NjM2ODc3NTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', mealType: 'Dinner' },
  { id: 9, name: 'Chicken Alfredo', cuisine: 'Italian', prepTime: '35 min', difficulty: 'Medium', calories: 680, description: 'Creamy pasta with grilled chicken and parmesan cheese', image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwYWxmcmVkbyUyMHBhc3RhfGVufDF8fHx8MTc2MzY4Nzc1Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', mealType: 'Dinner' },
  { id: 10, name: 'Teriyaki Chicken', cuisine: 'Asian', prepTime: '30 min', difficulty: 'Medium', calories: 520, description: 'Glazed chicken with sweet and savory teriyaki sauce', image: 'https://images.unsplash.com/photo-1636005100120-dd69afa5ebe6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZXJpeWFraSUyMGNoaWNrZW4lMjBhc2lhbnxlbnwxfHx8fDE3NjM2ODc3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', mealType: 'Dinner' },
  { id: 11, name: 'Caprese Salad', cuisine: 'Italian', prepTime: '10 min', difficulty: 'Easy', calories: 260, description: 'Fresh mozzarella, tomatoes, and basil with balsamic glaze', image: 'https://images.unsplash.com/photo-1724154854089-4bbd0e7d09c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXByZXNlJTIwc2FsYWQlMjBtb3p6YXJlbGxhfGVufDF8fHx8MTc2MzY1NjY3Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', mealType: 'Snack' },
  { id: 12, name: 'Vegetable Curry', cuisine: 'Indian', prepTime: '40 min', difficulty: 'Medium', calories: 380, description: 'Aromatic curry with mixed vegetables and coconut milk', image: 'https://images.unsplash.com/photo-1595959524165-0d395008e55b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2ZWdldGFibGUlMjBjdXJyeSUyMGluZGlhbnxlbnwxfHx8fDE3NjM2ODc3NTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', mealType: 'Dessert' },
];

export function Recipes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  const cuisines = ['All', ...Array.from(new Set(sampleRecipes.map(r => r.cuisine)))];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  const filteredRecipes = sampleRecipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuisine = selectedCuisine === 'All' || recipe.cuisine === selectedCuisine;
    const matchesDifficulty = selectedDifficulty === 'All' || recipe.difficulty === selectedDifficulty;
    return matchesSearch && matchesCuisine && matchesDifficulty;
  });

  // Group recipes by meal type
  const mealTypes: Array<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert'> = ['Dinner', 'Lunch', 'Breakfast', 'Snack', 'Dessert'];
  const groupedRecipes = mealTypes.map(mealType => ({
    mealType,
    recipes: filteredRecipes.filter(recipe => recipe.mealType === mealType)
  })).filter(group => group.recipes.length > 0);

  return (
    <div className="space-y-6">
      {/* Header - Mobile Friendly */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-purple-600" />
          <h1 className="text-gray-900 text-2xl">Recipes</h1>
          <span className="text-gray-500 text-sm ml-2">({filteredRecipes.length} recipes)</span>
        </div>
        
        {/* Search and Add Button - Stacked on mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 rounded border border-gray-300 focus:border-blue-500 outline-none shadow-sm"
            />
          </div>
          <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors text-sm shadow-md flex items-center justify-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Add Recipe
          </button>
        </div>
      </div>

      {/* Filters - Mobile Friendly */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-gray-700 text-sm font-semibold">Cuisine:</span>
          <div className="flex gap-2 flex-wrap">
            {cuisines.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                className={`px-3 py-1.5 rounded transition-colors text-sm ${
                  selectedCuisine === cuisine
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-gray-700 text-sm font-semibold">Difficulty:</span>
          <div className="flex gap-2 flex-wrap">
            {difficulties.map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`px-3 py-1.5 rounded transition-colors text-sm ${
                  selectedDifficulty === difficulty
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recipe Grid */}
      {groupedRecipes.map((group, index) => (
        <div key={group.mealType} className="space-y-4">
          {/* Divider line for all sections except the first */}
          {index > 0 && (
            <div className="border-t border-gray-200 opacity-40 pt-6"></div>
          )}
          <h2 className="text-gray-900 text-lg sm:text-xl font-semibold">{group.mealType}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {group.recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all cursor-pointer border border-gray-200 shadow-md group"
              >
                <div className="h-40 sm:h-48 bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center overflow-hidden">
                  <ImageWithFallback
                    src={recipe.image ? recipe.image : `https://source.unsplash.com/400x320/?${encodeURIComponent(recipe.name)}`}
                    alt={recipe.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                  <h3 className="text-gray-900 text-base sm:text-lg leading-snug">{recipe.name}</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{recipe.prepTime}</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{recipe.calories} cal</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm sm:text-base text-blue-600 font-medium">{recipe.cuisine}</span>
                      <span className={`text-xs sm:text-sm px-2.5 py-1 rounded font-medium ${
                        recipe.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                        recipe.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {recipe.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filteredRecipes.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">No recipes found</h3>
          <p className="text-gray-600 text-sm">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}