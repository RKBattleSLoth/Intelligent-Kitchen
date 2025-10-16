import React, { useState, useEffect } from 'react'
import { mealPlanService } from '../../services/mealPlanService'

interface SmartMealPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  onMealPlanGenerated: (mealPlan: any) => void
}

interface PlanningOptions {
  startDate: string
  endDate: string
  mealTypes: string[]
  preferences: {
    dietary: string
    healthGoal: string
    cuisines: string[]
    maxCookTime: number | null
    budget: string
  }
  constraints: Array<{
    dayOfWeek: string
    mealType: string
    requirement: string
  }>
  recipeSource: 'saved' | 'generated' | 'mixed'
  peopleCount: number
  planName: string
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']
const DIETARY_OPTIONS = ['none', 'vegetarian', 'vegan', 'gluten-free', 'keto', 'paleo', 'dairy-free']
const HEALTH_GOALS = ['maintain', 'weight_loss', 'weight_gain', 'muscle_gain', 'fitness']
const CUISINE_OPTIONS = ['Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian', 'Thai', 'Chinese', 'French', 'Japanese']
const BUDGET_OPTIONS = ['low', 'moderate', 'high']
const RECIPE_SOURCES = [
  { value: 'saved', label: 'My Saved Recipes Only' },
  { value: 'generated', label: 'AI Generated Recipes Only' },
  { value: 'mixed', label: 'Mix of Saved and Generated' }
]

const DURATION_PRESETS = [
  { label: '1 Day', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 }
]

const CONSTRAINT_PRESETS = [
  { label: 'Taco Tuesday', day: 'Tuesday', meal: 'dinner', requirement: 'tacos' },
  { label: 'Pizza Friday', day: 'Friday', meal: 'dinner', requirement: 'pizza' },
  { label: 'Sunday Brunch', day: 'Sunday', meal: 'brunch', requirement: 'brunch' },
  { label: 'Meatless Monday', day: 'Monday', meal: 'dinner', requirement: 'vegetarian' }
]

export const SmartMealPlannerModal: React.FC<SmartMealPlannerModalProps> = ({
  isOpen,
  onClose,
  onMealPlanGenerated
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'preferences' | 'constraints'>('basic')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState(7)
  
  const [options, setOptions] = useState<PlanningOptions>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    preferences: {
      dietary: 'none',
      healthGoal: 'maintain',
      cuisines: [],
      maxCookTime: null,
      budget: 'moderate'
    },
    constraints: [],
    recipeSource: 'mixed',
    peopleCount: 4,
    planName: ''
  })

  useEffect(() => {
    const endDate = new Date(options.startDate)
    endDate.setDate(endDate.getDate() + selectedDuration - 1)
    setOptions(prev => ({
      ...prev,
      endDate: endDate.toISOString().split('T')[0]
    }))
  }, [options.startDate, selectedDuration])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await mealPlanService.generateAIMealPlan({
        startDate: options.startDate,
        endDate: options.endDate,
        mealTypes: options.mealTypes,
        preferences: options.preferences,
        constraints: options.constraints,
        recipeSource: options.recipeSource,
        peopleCount: options.peopleCount,
        saveToDatabase: true,
        planName: options.planName || `Smart Meal Plan ${options.startDate} to ${options.endDate}`
      })

      onMealPlanGenerated(result)
      onClose()
    } catch (error) {
      console.error('Error generating meal plan:', error)
      alert('Failed to generate meal plan. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const addConstraint = () => {
    setOptions(prev => ({
      ...prev,
      constraints: [
        ...prev.constraints,
        { dayOfWeek: 'Monday', mealType: 'dinner', requirement: '' }
      ]
    }))
  }

  const updateConstraint = (index: number, field: string, value: string) => {
    setOptions(prev => ({
      ...prev,
      constraints: prev.constraints.map((constraint, i) =>
        i === index ? { ...constraint, [field]: value } : constraint
      )
    }))
  }

  const removeConstraint = (index: number) => {
    setOptions(prev => ({
      ...prev,
      constraints: prev.constraints.filter((_, i) => i !== index)
    }))
  }

  const addConstraintPreset = (preset: typeof CONSTRAINT_PRESETS[0]) => {
    setOptions(prev => ({
      ...prev,
      constraints: [
        ...prev.constraints,
        { dayOfWeek: preset.day, mealType: preset.meal, requirement: preset.requirement }
      ]
    }))
  }

  const toggleCuisine = (cuisine: string) => {
    setOptions(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        cuisines: prev.preferences.cuisines.includes(cuisine)
          ? prev.preferences.cuisines.filter(c => c !== cuisine)
          : [...prev.preferences.cuisines, cuisine]
      }
    }))
  }

  const toggleMealType = (mealType: string) => {
    setOptions(prev => ({
      ...prev,
      mealTypes: prev.mealTypes.includes(mealType)
        ? prev.mealTypes.filter(mt => mt !== mealType)
        : [...prev.mealTypes, mealType]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-100">Smart Meal Planner</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b border-slate-700">
            {(['basic', 'preferences', 'constraints'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'basic' ? 'Basic Settings' : tab === 'preferences' ? 'Preferences' : 'Constraints'}
              </button>
            ))}
          </div>

          {/* Basic Settings Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Plan Duration</label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => setSelectedDuration(preset.days)}
                      className={`px-3 py-2 rounded-lg border ${
                        selectedDuration === preset.days
                          ? 'bg-blue-600 border-blue-500 text-slate-100'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={options.startDate}
                    onChange={(e) => setOptions(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">End Date</label>
                  <input
                    type="date"
                    value={options.endDate}
                    onChange={(e) => setOptions(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Meal Types</label>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map(mealType => (
                    <button
                      key={mealType}
                      onClick={() => toggleMealType(mealType)}
                      className={`px-3 py-2 rounded-lg border capitalize ${
                        options.mealTypes.includes(mealType)
                          ? 'bg-blue-600 border-blue-500 text-slate-100'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {mealType}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Recipe Source</label>
                <div className="space-y-2">
                  {RECIPE_SOURCES.map(source => (
                    <label key={source.value} className="flex items-center">
                      <input
                        type="radio"
                        value={source.value}
                        checked={options.recipeSource === source.value}
                        onChange={(e) => setOptions(prev => ({ ...prev, recipeSource: e.target.value as any }))}
                        className="mr-2"
                      />
                      <span className="text-slate-300">{source.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Number of People</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={options.peopleCount}
                  onChange={(e) => setOptions(prev => ({ ...prev, peopleCount: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Plan Name (Optional)</label>
                <input
                  type="text"
                  value={options.planName}
                  onChange={(e) => setOptions(prev => ({ ...prev, planName: e.target.value }))}
                  placeholder="e.g., Weekly Family Meal Plan"
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-500"
                />
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Dietary Preference</label>
                <select
                  value={options.preferences.dietary}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, dietary: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {DIETARY_OPTIONS.map(option => (
                    <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Health Goal</label>
                <select
                  value={options.preferences.healthGoal}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, healthGoal: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {HEALTH_GOALS.map(goal => (
                    <option key={goal} value={goal}>{goal.charAt(0).toUpperCase() + goal.slice(1).replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Preferred Cuisines</label>
                <div className="flex flex-wrap gap-2">
                  {CUISINE_OPTIONS.map(cuisine => (
                    <button
                      key={cuisine}
                      onClick={() => toggleCuisine(cuisine)}
                      className={`px-3 py-2 rounded-lg border ${
                        options.preferences.cuisines.includes(cuisine)
                          ? 'bg-blue-600 border-blue-500 text-slate-100'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Max Cooking Time (minutes)</label>
                <input
                  type="number"
                  min="10"
                  max="180"
                  value={options.preferences.maxCookTime || ''}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, maxCookTime: e.target.value ? parseInt(e.target.value) : null }
                  }))}
                  placeholder="e.g., 60 (leave empty for no limit)"
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Budget Level</label>
                <select
                  value={options.preferences.budget}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, budget: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {BUDGET_OPTIONS.map(budget => (
                    <option key={budget} value={budget}>{budget.charAt(0).toUpperCase() + budget.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Constraints Tab */}
          {activeTab === 'constraints' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Quick Constraints</label>
                <div className="flex flex-wrap gap-2">
                  {CONSTRAINT_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => addConstraintPreset(preset)}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-200">Custom Constraints</label>
                  <button
                    onClick={addConstraint}
                    className="px-3 py-1 bg-blue-600 text-slate-100 rounded-lg hover:bg-blue-700"
                  >
                    + Add Constraint
                  </button>
                </div>

                {options.constraints.length === 0 ? (
                  <p className="text-slate-400 italic">No constraints added. Add constraints to specify requirements for certain days and meals.</p>
                ) : (
                  <div className="space-y-3">
                    {options.constraints.map((constraint, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={constraint.dayOfWeek}
                          onChange={(e) => updateConstraint(index, 'dayOfWeek', e.target.value)}
                          className="px-2 py-1 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg"
                        >
                          {DAYS_OF_WEEK.map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>

                        <select
                          value={constraint.mealType}
                          onChange={(e) => updateConstraint(index, 'mealType', e.target.value)}
                          className="px-2 py-1 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg"
                        >
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                          <option value="snack">Snack</option>
                          <option value="dessert">Dessert</option>
                        </select>

                        <input
                          type="text"
                          value={constraint.requirement}
                          onChange={(e) => updateConstraint(index, 'requirement', e.target.value)}
                          placeholder="e.g., tacos, pizza, vegetarian"
                          className="flex-1 px-2 py-1 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg placeholder-slate-500"
                        />

                        <button
                          onClick={() => removeConstraint(index)}
                          className="p-1 text-red-400 hover:bg-red-900 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || options.mealTypes.length === 0}
              className="px-6 py-2 bg-blue-600 text-slate-100 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Meal Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
