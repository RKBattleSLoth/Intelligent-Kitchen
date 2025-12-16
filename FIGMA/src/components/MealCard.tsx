import { Check, Clock, TrendingUp } from 'lucide-react';

interface Meal {
  name: string;
  hasCheckmark: boolean;
  prepTime?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  calories?: number;
}

interface MealCardProps {
  meal: Meal | null;
  onChange: () => void;
  onAdd: () => void;
  onRemove: () => void;
}

export function MealCard({ meal, onChange, onAdd, onRemove }: MealCardProps) {
  if (!meal) {
    return (
      <div className="rounded-lg p-3 h-28 flex items-center justify-center border-2 border-dashed shadow-sm transition-all hover:shadow-md hover:scale-105" style={{
        background: '#fafafa',
        borderColor: '#e5e5e5'
      }}>
        <button
          onClick={onAdd}
          className="text-2xl hover:scale-110 transition-transform"
          title="Add meal"
        >
          ➕
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-3 h-28 flex flex-col justify-between relative group shadow-md transition-all hover:shadow-xl hover:scale-105" style={{
      background: '#fafafa',
      border: '1px solid #e5e5e5'
    }}>
      {meal.hasCheckmark && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded flex items-center justify-center" style={{
          backgroundColor: '#4a7c7e'
        }}>
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className="pr-6">
        <p className="text-gray-900 text-xs line-clamp-2 mb-2">{meal.name}</p>
        
        {/* Recipe details */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {meal.prepTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{meal.prepTime}</span>
            </div>
          )}
          {meal.difficulty && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              meal.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
              meal.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {meal.difficulty}
            </span>
          )}
          {meal.calories && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{meal.calories} cal</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onChange}
          className="text-xl hover:scale-125 transition-transform"
          title="Change meal"
        >
          🔄
        </button>
        <button
          onClick={onAdd}
          className="text-xl hover:scale-125 transition-transform"
          title="Add meal"
        >
          ➕
        </button>
        <button
          onClick={onRemove}
          className="text-xl hover:scale-125 transition-transform"
          title="Remove meal"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}