import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { MealCard } from './MealCard';
import { SmartPlannerModal, PlanSettings } from './SmartPlannerModal';
import recipeBookImage from 'figma:asset/982e69d5ffb585e1eaef78b7bc4814ff7ba0c55c.png';

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert';

interface Meal {
  name: string;
  hasCheckmark: boolean;
  prepTime?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  calories?: number;
}

interface DayMeals {
  date: string;
  day: string;
  breakfast: Meal | null;
  lunch: Meal | null;
  dinner: Meal | null;
  snack: Meal | null;
  dessert: Meal | null;
}

const initialMeals: DayMeals[] = [
  {
    date: '11/16',
    day: 'Sun',
    breakfast: { name: 'French Toast with Berry Compote', hasCheckmark: true, prepTime: '20m', difficulty: 'Easy', calories: 420 },
    lunch: { name: 'Mediterranean Quinoa Bowl', hasCheckmark: true, prepTime: '25m', difficulty: 'Easy', calories: 380 },
    dinner: { name: 'Spaghetti Carbonara', hasCheckmark: true, prepTime: '30m', difficulty: 'Medium', calories: 650 },
    snack: null,
    dessert: null,
  },
  {
    date: '11/17',
    day: 'Mon',
    breakfast: { name: 'Classic French Toast', hasCheckmark: true, prepTime: '15m', difficulty: 'Easy', calories: 380 },
    lunch: { name: 'Tuna Salad Sandwiches', hasCheckmark: true, prepTime: '10m', difficulty: 'Easy', calories: 320 },
    dinner: { name: 'Baked Chicken Parmesan', hasCheckmark: true, prepTime: '45m', difficulty: 'Medium', calories: 580 },
    snack: { name: 'Apple and Peanut Butter', hasCheckmark: true, prepTime: '5m', difficulty: 'Easy', calories: 180 },
    dessert: { name: 'Berry Parfait', hasCheckmark: true, prepTime: '10m', difficulty: 'Easy', calories: 220 },
  },
  {
    date: '11/18',
    day: 'Tue',
    breakfast: { name: 'Overnight Oats', hasCheckmark: true, prepTime: '5m', difficulty: 'Easy', calories: 310 },
    lunch: { name: 'Greek Salad', hasCheckmark: true, prepTime: '15m', difficulty: 'Easy', calories: 280 },
    dinner: { name: 'Beef Stir Fry', hasCheckmark: true, prepTime: '25m', difficulty: 'Medium', calories: 520 },
    snack: { name: 'Hummus and Vegetables', hasCheckmark: true, prepTime: '5m', difficulty: 'Easy', calories: 150 },
    dessert: { name: 'Apple Crisp', hasCheckmark: true, prepTime: '40m', difficulty: 'Medium', calories: 290 },
  },
  {
    date: '11/19',
    day: 'Wed',
    breakfast: { name: 'Breakfast Burritos', hasCheckmark: true, prepTime: '20m', difficulty: 'Medium', calories: 450 },
    lunch: { name: 'Chicken Caesar Salad', hasCheckmark: true, prepTime: '15m', difficulty: 'Easy', calories: 420 },
    dinner: { name: 'Spaghetti and Meatballs', hasCheckmark: true, prepTime: '50m', difficulty: 'Medium', calories: 680 },
    snack: { name: 'Yogurt and Granola', hasCheckmark: true, prepTime: '5m', difficulty: 'Easy', calories: 200 },
    dessert: { name: 'Rice Pudding', hasCheckmark: true, prepTime: '35m', difficulty: 'Medium', calories: 250 },
  },
  {
    date: '11/20',
    day: 'Thu',
    breakfast: { name: 'Pancakes', hasCheckmark: true, prepTime: '25m', difficulty: 'Easy', calories: 400 },
    lunch: { name: 'Turkey Club Sandwiches', hasCheckmark: true, prepTime: '10m', difficulty: 'Easy', calories: 480 },
    dinner: { name: 'Grilled Salmon', hasCheckmark: true, prepTime: '20m', difficulty: 'Easy', calories: 450 },
    snack: null,
    dessert: { name: 'Brownies', hasCheckmark: true, prepTime: '45m', difficulty: 'Medium', calories: 340 },
  },
  {
    date: '11/21',
    day: 'Fri',
    breakfast: { name: 'Breakfast Sandwich', hasCheckmark: true, prepTime: '15m', difficulty: 'Easy', calories: 390 },
    lunch: { name: 'Quesadillas', hasCheckmark: true, prepTime: '15m', difficulty: 'Easy', calories: 520 },
    dinner: { name: 'Homemade Pizza', hasCheckmark: true, prepTime: '60m', difficulty: 'Hard', calories: 720 },
    snack: { name: 'Trail Mix', hasCheckmark: true, prepTime: '2m', difficulty: 'Easy', calories: 190 },
    dessert: { name: 'Ice Cream Sundaes', hasCheckmark: true, prepTime: '5m', difficulty: 'Easy', calories: 310 },
  },
  {
    date: '11/22',
    day: 'Sat',
    breakfast: { name: 'Yogurt Parfait', hasCheckmark: true, prepTime: '10m', difficulty: 'Easy', calories: 290 },
    lunch: { name: 'Gnocchis', hasCheckmark: true, prepTime: '30m', difficulty: 'Medium', calories: 450 },
    dinner: { name: 'Shepherd\'s Pie', hasCheckmark: true, prepTime: '75m', difficulty: 'Hard', calories: 620 },
    snack: { name: 'Fruit Salad', hasCheckmark: true, prepTime: '15m', difficulty: 'Easy', calories: 120 },
    dessert: null,
  },
];

const mealDatabase = [
  { name: 'Avocado Toast', prepTime: '10m', difficulty: 'Easy' as const, calories: 350 },
  { name: 'Greek Yogurt Bowl', prepTime: '5m', difficulty: 'Easy' as const, calories: 280 },
  { name: 'Veggie Omelette', prepTime: '15m', difficulty: 'Easy' as const, calories: 320 },
  { name: 'Chicken Tacos', prepTime: '25m', difficulty: 'Medium' as const, calories: 490 },
  { name: 'Caprese Salad', prepTime: '10m', difficulty: 'Easy' as const, calories: 260 },
  { name: 'Beef Lasagna', prepTime: '90m', difficulty: 'Hard' as const, calories: 750 },
  { name: 'Teriyaki Chicken', prepTime: '30m', difficulty: 'Medium' as const, calories: 520 },
  { name: 'Vegetable Curry', prepTime: '40m', difficulty: 'Medium' as const, calories: 380 },
  { name: 'Fish Tacos', prepTime: '20m', difficulty: 'Easy' as const, calories: 420 },
  { name: 'Chicken Alfredo', prepTime: '35m', difficulty: 'Medium' as const, calories: 680 },
];

export function MealPlanner() {
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']);
  const [meals, setMeals] = useState<DayMeals[]>(initialMeals);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [planSettings, setPlanSettings] = useState<PlanSettings>({
    diet: 'Balanced',
    goal: 'Maintain Weight',
    mealCount: 3,
    includeSnacks: true,
    includeDesserts: true,
  });

  const toggleMealType = (type: MealType) => {
    if (selectedMealTypes.includes(type)) {
      setSelectedMealTypes(selectedMealTypes.filter(t => t !== type));
    } else {
      setSelectedMealTypes([...selectedMealTypes, type]);
    }
  };

  const handleChange = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert') => {
    const randomMeal = mealDatabase[Math.floor(Math.random() * mealDatabase.length)];
    setMeals(meals.map((day, idx) => 
      idx === dayIndex ? { ...day, [mealType]: { ...randomMeal, hasCheckmark: true } } : day
    ));
  };

  const handleAdd = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert') => {
    const randomMeal = mealDatabase[Math.floor(Math.random() * mealDatabase.length)];
    setMeals(meals.map((day, idx) => 
      idx === dayIndex ? { ...day, [mealType]: { ...randomMeal, hasCheckmark: true } } : day
    ));
  };

  const handleRemove = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert') => {
    setMeals(meals.map((day, idx) => 
      idx === dayIndex ? { ...day, [mealType]: null } : day
    ));
  };

  const generateWeeklyPlan = () => {
    const newMeals = meals.map(day => ({
      ...day,
      breakfast: { ...mealDatabase[Math.floor(Math.random() * mealDatabase.length)], hasCheckmark: true },
      lunch: { ...mealDatabase[Math.floor(Math.random() * mealDatabase.length)], hasCheckmark: true },
      dinner: { ...mealDatabase[Math.floor(Math.random() * mealDatabase.length)], hasCheckmark: true },
      snack: Math.random() > 0.3 ? { ...mealDatabase[Math.floor(Math.random() * mealDatabase.length)], hasCheckmark: true } : null,
      dessert: Math.random() > 0.5 ? { ...mealDatabase[Math.floor(Math.random() * mealDatabase.length)], hasCheckmark: true } : null,
    }));
    setMeals(newMeals);
  };

  const clearWeek = () => {
    setMeals(meals.map(day => ({
      ...day,
      breakfast: null,
      lunch: null,
      dinner: null,
      snack: null,
      dessert: null,
    })));
  };

  // Calculate stats
  const totalMeals = meals.reduce((acc, day) => {
    return acc + 
      (day.breakfast ? 1 : 0) + 
      (day.lunch ? 1 : 0) + 
      (day.dinner ? 1 : 0) + 
      (day.snack ? 1 : 0) + 
      (day.dessert ? 1 : 0);
  }, 0);

  const totalCalories = meals.reduce((acc, day) => {
    return acc + 
      (day.breakfast?.calories || 0) + 
      (day.lunch?.calories || 0) + 
      (day.dinner?.calories || 0) + 
      (day.snack?.calories || 0) + 
      (day.dessert?.calories || 0);
  }, 0);

  const avgCaloriesPerDay = Math.round(totalCalories / 7);

  return (
    <div className="space-y-6 relative">
      {/* Cookbook Background Watermark */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 250, 240, 0.85), rgba(255, 250, 240, 0.85)),
            url(${recipeBookImage})
          `,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center center, center center',
          backgroundRepeat: 'no-repeat, no-repeat',
          opacity: 0.15,
          filter: 'sepia(0.3) brightness(1.1)',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1200px',
          height: '700px',
          maxWidth: '95vw',
          maxHeight: '80vh'
        }}
      />
      
      {/* Header with Title and Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-purple-600" />
          <h1 className="text-gray-900 text-2xl">Meal Planning</h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <button 
            onClick={() => setCurrentWeek(currentWeek - 1)}
            className="flex-1 md:flex-none px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded transition-colors text-sm shadow-sm border border-gray-200 flex items-center justify-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <span className="text-gray-900 text-xs sm:text-sm whitespace-nowrap">Week of 11/16/2024</span>
          <button 
            onClick={() => setCurrentWeek(currentWeek + 1)}
            className="flex-1 md:flex-none px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded transition-colors text-sm shadow-sm border border-gray-200 flex items-center justify-center gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row items-center gap-2 lg:gap-3">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[rgb(15,199,185)] hover:bg-teal-600 text-white rounded transition-colors text-sm shadow-md flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generate Smart Plan
        </button>
        <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors text-sm shadow-md">
          ➕ Add Week to Shopping
        </button>
        <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors text-sm shadow-md">
          📅 Select Days
        </button>
        <button 
          onClick={clearWeek}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors text-sm shadow-md"
        >
          🗑️ Clear Week
        </button>
      </div>

      {/* Meal Type Filter */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <span className="text-gray-700 text-sm whitespace-nowrap">Meal Slots to Display:</span>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'] as MealType[]).map((type) => (
              <button
                key={type}
                onClick={() => toggleMealType(type)}
                className={`px-3 sm:px-4 py-2 rounded transition-colors text-xs sm:text-sm ${
                  selectedMealTypes.includes(type)
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Meal Grid - Desktop View */}
      <div className="hidden lg:block space-y-4">
        {/* Breakfast Row */}
        {selectedMealTypes.includes('Breakfast') && (
          <div className="flex gap-3">
            <div className="w-24 flex items-center justify-end pr-4">
              <span className="text-gray-900">Breakfast</span>
            </div>
            <div className="flex-1 grid grid-cols-7 gap-3">
              {meals.map((day, idx) => (
                <div key={idx} className="space-y-2">
                  {idx === 0 && (
                    <div className="flex items-center justify-between bg-white rounded px-3 py-2 shadow-md border border-gray-200">
                      <div className="text-center flex-1">
                        <div className="text-gray-900 text-sm">{day.day}</div>
                        <div className="text-gray-500 text-xs">{day.date}</div>
                      </div>
                      <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {idx !== 0 && (
                    <div className="flex items-center justify-between bg-white rounded px-3 py-2 shadow-md border border-gray-200">
                      <div className="text-center flex-1">
                        <div className="text-gray-900 text-sm">{day.day}</div>
                        <div className="text-gray-500 text-xs">{day.date}</div>
                      </div>
                      <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <MealCard
                    meal={day.breakfast}
                    onChange={() => handleChange(idx, 'breakfast')}
                    onAdd={() => handleAdd(idx, 'breakfast')}
                    onRemove={() => handleRemove(idx, 'breakfast')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lunch Row */}
        {selectedMealTypes.includes('Lunch') && (
          <div className="flex gap-3">
            <div className="w-24 flex items-center justify-end pr-4">
              <span className="text-gray-900">Lunch</span>
            </div>
            <div className="flex-1 grid grid-cols-7 gap-3">
              {meals.map((day, idx) => (
                <div key={idx}>
                  <MealCard
                    meal={day.lunch}
                    onChange={() => handleChange(idx, 'lunch')}
                    onAdd={() => handleAdd(idx, 'lunch')}
                    onRemove={() => handleRemove(idx, 'lunch')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dinner Row */}
        {selectedMealTypes.includes('Dinner') && (
          <div className="flex gap-3">
            <div className="w-24 flex items-center justify-end pr-4">
              <span className="text-gray-900">Dinner</span>
            </div>
            <div className="flex-1 grid grid-cols-7 gap-3">
              {meals.map((day, idx) => (
                <div key={idx}>
                  <MealCard
                    meal={day.dinner}
                    onChange={() => handleChange(idx, 'dinner')}
                    onAdd={() => handleAdd(idx, 'dinner')}
                    onRemove={() => handleRemove(idx, 'dinner')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Snack Row */}
        {selectedMealTypes.includes('Snack') && (
          <div className="flex gap-3">
            <div className="w-24 flex items-center justify-end pr-4">
              <span className="text-gray-900">Snack</span>
            </div>
            <div className="flex-1 grid grid-cols-7 gap-3">
              {meals.map((day, idx) => (
                <div key={idx}>
                  <MealCard
                    meal={day.snack}
                    onChange={() => handleChange(idx, 'snack')}
                    onAdd={() => handleAdd(idx, 'snack')}
                    onRemove={() => handleRemove(idx, 'snack')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dessert Row */}
        {selectedMealTypes.includes('Dessert') && (
          <div className="flex gap-3">
            <div className="w-24 flex items-center justify-end pr-4">
              <span className="text-gray-900">Dessert</span>
            </div>
            <div className="flex-1 grid grid-cols-7 gap-3">
              {meals.map((day, idx) => (
                <div key={idx}>
                  <MealCard
                    meal={day.dessert}
                    onChange={() => handleChange(idx, 'dessert')}
                    onAdd={() => handleAdd(idx, 'dessert')}
                    onRemove={() => handleRemove(idx, 'dessert')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Meal Grid - Mobile/Tablet View (Day-by-day) */}
      <div className="lg:hidden space-y-6">
        {meals.map((day, dayIdx) => (
          <div key={dayIdx} className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
            {/* Day Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="text-gray-900">{day.day}</div>
                  <div className="text-gray-500 text-sm">{day.date}</div>
                </div>
              </div>
            </div>

            {/* Meals for this day */}
            <div className="space-y-4">
              {selectedMealTypes.includes('Breakfast') && (
                <div>
                  <div className="text-gray-700 text-sm mb-2">Breakfast</div>
                  <MealCard
                    meal={day.breakfast}
                    onChange={() => handleChange(dayIdx, 'breakfast')}
                    onAdd={() => handleAdd(dayIdx, 'breakfast')}
                    onRemove={() => handleRemove(dayIdx, 'breakfast')}
                  />
                </div>
              )}

              {selectedMealTypes.includes('Lunch') && (
                <div>
                  <div className="text-gray-700 text-sm mb-2">Lunch</div>
                  <MealCard
                    meal={day.lunch}
                    onChange={() => handleChange(dayIdx, 'lunch')}
                    onAdd={() => handleAdd(dayIdx, 'lunch')}
                    onRemove={() => handleRemove(dayIdx, 'lunch')}
                  />
                </div>
              )}

              {selectedMealTypes.includes('Dinner') && (
                <div>
                  <div className="text-gray-700 text-sm mb-2">Dinner</div>
                  <MealCard
                    meal={day.dinner}
                    onChange={() => handleChange(dayIdx, 'dinner')}
                    onAdd={() => handleAdd(dayIdx, 'dinner')}
                    onRemove={() => handleRemove(dayIdx, 'dinner')}
                  />
                </div>
              )}

              {selectedMealTypes.includes('Snack') && (
                <div>
                  <div className="text-gray-700 text-sm mb-2">Snack</div>
                  <MealCard
                    meal={day.snack}
                    onChange={() => handleChange(dayIdx, 'snack')}
                    onAdd={() => handleAdd(dayIdx, 'snack')}
                    onRemove={() => handleRemove(dayIdx, 'snack')}
                  />
                </div>
              )}

              {selectedMealTypes.includes('Dessert') && (
                <div>
                  <div className="text-gray-700 text-sm mb-2">Dessert</div>
                  <MealCard
                    meal={day.dessert}
                    onChange={() => handleChange(dayIdx, 'dessert')}
                    onAdd={() => handleAdd(dayIdx, 'dessert')}
                    onRemove={() => handleRemove(dayIdx, 'dessert')}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Smart Planner Modal */}
      <SmartPlannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={(settings) => {
          console.log('Generating plan with settings:', settings);
          generateWeeklyPlan();
        }}
      />
    </div>
  );
}