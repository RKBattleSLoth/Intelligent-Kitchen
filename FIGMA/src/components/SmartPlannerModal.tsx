import { useState } from 'react';
import { X } from 'lucide-react';
import bannerTexture from 'figma:asset/0889ad84419a5530e2d247ea2e1d1e8f977e1a8a.png';
import mustardPattern from 'figma:asset/dbefa8d6d5e8b033cdd21148af9463cb4c2f291e.png';
import mustardSpoon from 'figma:asset/20bc1443935e0c2ef3fb703115433f0100aa7eb3.png';

interface SmartPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (settings: PlanSettings) => void;
}

export interface PlanSettings {
  duration: '1day' | '3days' | '1week' | '2weeks' | '1month';
  startDate: string;
  endDate: string;
  mealTypes: string[];
  recipeSource: 'saved' | 'ai' | 'mix';
  numPeople: number;
  planName: string;
}

export function SmartPlannerModal({ isOpen, onClose, onGenerate }: SmartPlannerModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'preferences' | 'constraints'>('basic');
  const [duration, setDuration] = useState<'1day' | '3days' | '1week' | '2weeks' | '1month'>('1week');
  const [startDate, setStartDate] = useState('2025-11-17');
  const [endDate, setEndDate] = useState('2025-11-23');
  const [mealTypes, setMealTypes] = useState(['Breakfast', 'Lunch', 'Dinner']);
  const [recipeSource, setRecipeSource] = useState<'saved' | 'ai' | 'mix'>('mix');
  const [numPeople, setNumPeople] = useState(4);
  const [planName, setPlanName] = useState('');

  if (!isOpen) return null;

  const toggleMealType = (type: string) => {
    if (mealTypes.includes(type)) {
      setMealTypes(mealTypes.filter(t => t !== type));
    } else {
      setMealTypes([...mealTypes, type]);
    }
  };

  const handleGenerate = () => {
    onGenerate({
      duration,
      startDate,
      endDate,
      mealTypes,
      recipeSource,
      numPeople,
      planName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border-4 border-gray-800"
        style={{
          background: '#14393d'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-5 border-b-2 border-gray-700"
          style={{
            background: `linear-gradient(rgba(20, 57, 61, 0.9), rgba(20, 57, 61, 0.9)), url(${mustardPattern})`,
            backgroundSize: 'cover, contain',
            backgroundPosition: 'center, center',
            backgroundRepeat: 'no-repeat, repeat'
          }}
        >
          <h2 
            className="text-white text-2xl"
            style={{
              fontFamily: 'var(--font-bree-serif)'
            }}
          >
            Smart Meal Planner
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-gray-700" style={{ background: '#0f2020' }}>
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 text-sm transition-colors relative ${
              activeTab === 'basic'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Basic Settings
            {activeTab === 'basic' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-6 py-3 text-sm transition-colors relative ${
              activeTab === 'preferences'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Preferences
            {activeTab === 'preferences' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('constraints')}
            className={`px-6 py-3 text-sm transition-colors relative ${
              activeTab === 'constraints'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Constraints
            {activeTab === 'constraints' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] relative">
          {/* Decorative Mustard Spoon - positioned in middle right open space */}
          <div className="absolute right-[-84px] bottom-[-221px] opacity-50 pointer-events-none z-0" style={{ transform: 'translateY(-1in)' }}>
            <img src={mustardSpoon} alt="" className="w-[432px] h-auto" style={{ mixBlendMode: 'soft-light', transform: 'rotate(10deg)' }} />
          </div>

          <div className="relative z-10">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Plan Duration */}
              <div>
                <label className="block text-gray-200 mb-3">Plan Duration</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '1day', label: '1 Day' },
                    { value: '3days', label: '3 Days' },
                    { value: '1week', label: '1 Week' },
                    { value: '2weeks', label: '2 Weeks' },
                    { value: '1month', label: '1 Month' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDuration(option.value as any)}
                      className={`px-4 py-2 rounded border-2 transition-colors text-sm ${
                        duration === option.value
                          ? 'bg-teal-500 text-white border-teal-600'
                          : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start and End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-200 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded focus:outline-none focus:border-teal-500 text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-200 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded focus:outline-none focus:border-teal-500 text-gray-200"
                  />
                </div>
              </div>

              {/* Meal Types */}
              <div>
                <label className="block text-gray-200 mb-3">Meal Types</label>
                <div className="flex gap-2 flex-wrap">
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'].map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleMealType(type)}
                      className={`px-4 py-2 rounded border-2 transition-colors text-sm ${
                        mealTypes.includes(type)
                          ? 'bg-teal-500 text-white border-teal-600'
                          : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipe Source */}
              <div>
                <label className="block text-gray-200 mb-3">Recipe Source</label>
                <div className="space-y-2">
                  {[
                    { value: 'saved', label: 'My Saved Recipes Only' },
                    { value: 'ai', label: 'AI Generated Recipes Only' },
                    { value: 'mix', label: 'Mix of Saved and Generated' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="recipeSource"
                        value={option.value}
                        checked={recipeSource === option.value}
                        onChange={() => setRecipeSource(option.value as any)}
                        className="w-4 h-4 text-teal-500 cursor-pointer"
                      />
                      <span className="text-gray-200 group-hover:text-gray-100">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Number of People */}
              <div>
                <label className="block text-gray-200 mb-2">Number of People</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={numPeople}
                  onChange={(e) => setNumPeople(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded focus:outline-none focus:border-teal-500 text-gray-200"
                />
              </div>

              {/* Plan Name */}
              <div>
                <label className="block text-gray-200 mb-2">Plan Name (Optional)</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g., Weekly Family Meal Plan"
                  className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded focus:outline-none focus:border-teal-500 text-gray-200 placeholder-gray-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Dietary preferences and cuisine types</p>
                <p className="text-sm mt-2">Coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'constraints' && (
            <div className="space-y-6">
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Budget, time, and ingredient constraints</p>
                <p className="text-sm mt-2">Coming soon...</p>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-gray-700" style={{ background: '#0f2020' }}>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border-2 border-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded border-2 border-teal-600 transition-colors shadow-md"
          >
            Generate Plan
          </button>
        </div>
      </div>
    </div>
  );
}