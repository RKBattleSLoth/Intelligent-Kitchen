import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { voiceService } from '../services/voiceService';
import { shoppingListService, enhancedShoppingListService } from '../services/shoppingListService';
import { betsyService, BetsyInterpretation } from '../services/betsyService';
import { recipeService } from '../services/recipeService';
import { mealPlanService } from '../services/mealPlanService';

interface Message {
  id: string;
  role: 'user' | 'betsy';
  content: string;
  timestamp: Date;
  action?: {
    type: string;
    details: string;
    success: boolean;
  };
}

const STORAGE_KEY = 'betsy-chat-history';

interface BetsyChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BetsyChat: React.FC<BetsyChatProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        } catch (e) {
          console.error('Failed to load chat history:', e);
        }
      }
      if (messages.length === 0) {
        addBetsyMessage("Hi! I'm Betsy. How can I help?");
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    
    const unsubResult = voiceService.onResult((result) => {
      setLiveTranscript(result.transcript);
      if (result.isFinal) {
        setIsListening(false);
        setLiveTranscript('');
        handleUserInput(result.transcript);
      }
    });

    const unsubError = voiceService.onError((error) => {
      setIsListening(false);
      setLiveTranscript('');
    });

    return () => {
      unsubResult();
      unsubError();
      voiceService.stopListening();
    };
  }, [isOpen]);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const addBetsyMessage = (content: string, action?: Message['action']) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'betsy',
      content,
      timestamp: new Date(),
      action
    }]);
  };

  const handleUserInput = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addUserMessage(trimmed);
    setIsProcessing(true);
    setInputText('');

    try {
      const interpretation = await betsyService.interpret(trimmed);
      await executeIntent(interpretation);
    } catch (error) {
      addBetsyMessage("Sorry, something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeIntent = async (interpretation: BetsyInterpretation) => {
    const { intent, entities, response } = interpretation;

    switch (intent) {
      case 'add_shopping_item':
        if (entities.items && entities.items.length > 0) {
          try {
            const addedItems: string[] = [];
            for (const item of entities.items) {
              const itemText = formatShoppingItem(item);
              await shoppingListService.addShoppingListItem(itemText);
              addedItems.push(itemText);
            }
            addBetsyMessage(response || `Added ${addedItems.join(', ')} to your list.`, {
              type: 'shopping_list',
              details: `Added: ${addedItems.join(', ')}`,
              success: true
            });
          } catch (e) {
            addBetsyMessage("Couldn't add items. Try again.", { type: 'shopping_list', details: 'Failed', success: false });
          }
        }
        break;

      case 'navigate':
        const destinations: Record<string, { path: string; label: string }> = {
          recipes: { path: '/recipes', label: 'Recipes' },
          shopping_list: { path: '/shopping-lists', label: 'Shopping List' },
          meal_planning: { path: '/meal-planning', label: 'Meal Planning' }
        };
        const dest = destinations[entities.destination || ''];
        if (dest) {
          addBetsyMessage(response || `Taking you to ${dest.label}!`, { type: 'navigate', details: dest.label, success: true });
          setTimeout(() => { navigate(dest.path); onClose(); }, 500);
        }
        break;

      case 'add_meal':
        if (entities.food && entities.mealType) {
          sessionStorage.setItem('pendingMeal', JSON.stringify({
            food: entities.food,
            mealType: entities.mealType,
            dateStr: entities.day || 'today'
          }));
          addBetsyMessage(response || `Adding ${entities.food} for ${entities.mealType}.`, { type: 'meal_plan', details: `${entities.food}`, success: true });
          setTimeout(() => { navigate('/meal-planning'); onClose(); }, 500);
        }
        break;

      case 'clear_meals':
        if (entities.timeRange) {
          const result = await betsyService.clearMeals(entities.timeRange);
          addBetsyMessage(result.success ? `Cleared ${result.deletedCount} meals.` : `Error: ${result.error}`, {
            type: 'meal_plan', details: `Cleared ${result.deletedCount}`, success: result.success
          });
        }
        break;

      case 'generate_meals':
        if (entities.timeRange) {
          addBetsyMessage(`Generating meals... This may take a moment.`);
          const result = await betsyService.generateMeals(entities.timeRange);
          addBetsyMessage(result.success ? `Created ${result.mealCount} meals!` : `Error: ${result.error}`, {
            type: 'meal_plan', details: `Generated ${result.mealCount}`, success: result.success
          });
        }
        break;

      case 'import_recipe':
        if (entities.url) {
          try {
            addBetsyMessage(`Importing recipe...`);
            const recipe = await recipeService.importRecipeFromUrl(entities.url, entities.category || 'Dinner');
            addBetsyMessage(`Imported "${recipe.name}"!`, { type: 'recipe', details: recipe.name, success: true });
          } catch (e: any) {
            addBetsyMessage(`Couldn't import: ${e.message}`, { type: 'recipe', details: 'Failed', success: false });
          }
        }
        break;

      case 'create_recipe':
        // Navigate to recipes page and trigger the add recipe modal
        addBetsyMessage(
          entities.recipeName 
            ? `Let's create a recipe for ${entities.recipeName}! I'll take you to the recipes page.`
            : "I'll take you to the recipes page to create a new recipe!",
          { type: 'recipe', details: 'Create recipe', success: true }
        );
        sessionStorage.setItem('openRecipeForm', 'true');
        if (entities.recipeName) {
          sessionStorage.setItem('newRecipeName', entities.recipeName);
        }
        setTimeout(() => { navigate('/recipes'); onClose(); }, 500);
        break;

      case 'web_search_recipe':
        // Search for recipe online and provide URL for import
        const searchQuery = entities.query || entities.recipeName || 'recipe';
        const source = entities.source ? ` site:${entities.source.toLowerCase().replace(/\s+/g, '')}` : '';
        addBetsyMessage(
          `I'll search for "${searchQuery}" recipes online. Once you find one you like, share the URL and I'll import it for you!`,
          { type: 'recipe', details: 'Web search', success: true }
        );
        // Open search in new tab
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' recipe' + source)}`;
        window.open(searchUrl, '_blank');
        break;

      case 'add_recipe_to_shopping_list':
        if (entities.recipeName) {
          try {
            const recipes = await recipeService.getAllRecipes();
            const recipe = recipes.find(r => r.name.toLowerCase().includes(entities.recipeName!.toLowerCase()));
            if (recipe) {
              const ingredients = await recipeService.extractIngredients(recipe.instructions, recipe.name);
              await shoppingListService.addIngredientsToList(ingredients);
              addBetsyMessage(`Added ${ingredients.length} ingredients from "${recipe.name}".`, {
                type: 'shopping_list', details: `${ingredients.length} items`, success: true
              });
            } else {
              addBetsyMessage(`Couldn't find "${entities.recipeName}".`);
            }
          } catch (e) {
            addBetsyMessage("Error adding ingredients.", { type: 'shopping_list', details: 'Failed', success: false });
          }
        }
        break;

      case 'consolidate_shopping_list':
        try {
          const consolidated = await enhancedShoppingListService.consolidateItems();
          addBetsyMessage(`Consolidated to ${consolidated.length} items.`, {
            type: 'shopping_list', details: `${consolidated.length} items`, success: true
          });
        } catch (e) {
          addBetsyMessage("Couldn't consolidate.", { type: 'shopping_list', details: 'Failed', success: false });
        }
        break;

      case 'move_meal':
        if (entities.fromDay && entities.fromMealType && entities.toDay && entities.toMealType) {
          const fromDate = getDateFromDayName(entities.fromDay);
          const toDate = getDateFromDayName(entities.toDay);
          const fromMeal = mealPlanService.getPlannedMeal(fromDate, capitalize(entities.fromMealType));
          if (fromMeal) {
            mealPlanService.removePlannedMeal(fromDate, capitalize(entities.fromMealType));
            mealPlanService.addPlannedMeal(toDate, capitalize(entities.toMealType), fromMeal.recipe);
            addBetsyMessage(`Moved ${fromMeal.recipe.name}.`, { type: 'meal_plan', details: 'Moved', success: true });
          } else {
            addBetsyMessage(`No meal found for ${entities.fromDay} ${entities.fromMealType}.`);
          }
        }
        break;

      case 'swap_meals':
        if (entities.day1 && entities.mealType1 && entities.day2 && entities.mealType2) {
          const date1 = getDateFromDayName(entities.day1);
          const date2 = getDateFromDayName(entities.day2);
          const slot1 = capitalize(entities.mealType1);
          const slot2 = capitalize(entities.mealType2);
          
          // Debug: log what we're looking for
          console.log('[BetsyChat] Looking for meals:', { date1, slot1, date2, slot2 });
          const allPlans = mealPlanService.getAllMealPlans();
          console.log('[BetsyChat] All meal plans:', allPlans);
          
          const meal1 = mealPlanService.getPlannedMeal(date1, slot1);
          const meal2 = mealPlanService.getPlannedMeal(date2, slot2);
          
          console.log('[BetsyChat] Found meals:', { meal1, meal2 });
          
          if (meal1 && meal2) {
            mealPlanService.removePlannedMeal(date1, slot1);
            mealPlanService.removePlannedMeal(date2, slot2);
            mealPlanService.addPlannedMeal(date1, slot1, meal2.recipe);
            mealPlanService.addPlannedMeal(date2, slot2, meal1.recipe);
            addBetsyMessage(`Swapped meals!`, { type: 'meal_plan', details: 'Swapped', success: true });
          } else {
            const missing = [];
            if (!meal1) missing.push(`${entities.day1} ${entities.mealType1}`);
            if (!meal2) missing.push(`${entities.day2} ${entities.mealType2}`);
            addBetsyMessage(`Couldn't find meals for: ${missing.join(' and ')}. Check the Meal Planning page to see your scheduled meals.`);
          }
        }
        break;

      case 'delete_recipe':
        if (entities.recipeName) {
          const recipes = await recipeService.getAllRecipes();
          const recipe = recipes.find(r => r.name.toLowerCase().includes(entities.recipeName!.toLowerCase()));
          if (recipe) {
            await recipeService.deleteRecipe(recipe.id);
            addBetsyMessage(`Deleted "${recipe.name}".`, { type: 'recipe', details: recipe.name, success: true });
          } else {
            addBetsyMessage(`Couldn't find "${entities.recipeName}".`);
          }
        }
        break;

      case 'search_recipes':
        if (entities.query) {
          const recipes = await recipeService.getAllRecipes();
          const matches = recipes.filter(r => 
            r.name.toLowerCase().includes(entities.query!.toLowerCase()) ||
            r.instructions.toLowerCase().includes(entities.query!.toLowerCase())
          );
          if (matches.length > 0) {
            const list = matches.slice(0, 5).map(r => `• ${r.name}`).join('\n');
            addBetsyMessage(`Found ${matches.length} recipes:\n${list}`);
          } else {
            addBetsyMessage(`No recipes found for "${entities.query}".`);
          }
        }
        break;

      case 'help':
        addBetsyMessage(
          "I can help with:\n" +
          "• Add items to shopping list\n" +
          "• Generate/clear meals\n" +
          "• Move/swap meals\n" +
          "• Import recipes from URLs\n" +
          "• Add recipe ingredients to list\n" +
          "• Search your recipes\n" +
          "• Navigate the app"
        );
        break;

      case 'greeting':
        addBetsyMessage(response || "Hi! How can I help?");
        break;

      default:
        addBetsyMessage(response || "I'm not sure what you mean. Try 'help'.");
        break;
    }
  };

  const formatShoppingItem = (item: { name: string; quantity?: string; unit?: string }): string => {
    if (item.quantity && item.unit) return `${item.quantity} ${item.unit} ${item.name}`;
    if (item.quantity) return `${item.quantity} ${item.name}`;
    return item.name;
  };

  const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const getDateFromDayName = (dayName: string): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const todayDay = today.getDay();
    const targetDay = days.indexOf(dayName.toLowerCase());
    
    if (targetDay === -1) {
      if (dayName.toLowerCase() === 'today') return today.toISOString().split('T')[0];
      if (dayName.toLowerCase() === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }
      return today.toISOString().split('T')[0];
    }
    
    let daysUntil = targetDay - todayDay;
    if (daysUntil < 0) daysUntil += 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    return targetDate.toISOString().split('T')[0];
  };

  const toggleListening = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setLiveTranscript('');
    } else {
      const started = voiceService.startListening();
      if (started) setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUserInput(inputText);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      width: '380px',
      maxWidth: 'calc(100vw - 40px)',
      height: '500px',
      maxHeight: 'calc(100vh - 120px)',
      background: '#1e293b',
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      border: '1px solid #334155'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: '1rem' }}>👩‍🍳 Betsy</span>
        <button onClick={onClose} style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          fontSize: '1.25rem',
          cursor: 'pointer',
          padding: '4px'
        }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '8px'
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '8px 12px',
              borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
              background: msg.role === 'user' ? '#6366f1' : '#334155',
              color: '#f1f5f9',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.content}
              {msg.action && (
                <div style={{
                  marginTop: '4px',
                  padding: '4px 8px',
                  background: msg.action.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  color: msg.action.success ? '#10b981' : '#ef4444'
                }}>
                  {msg.action.success ? '✓' : '✗'} {msg.action.details}
                </div>
              )}
            </div>
          </div>
        ))}
        {liveTranscript && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <div style={{
              padding: '8px 12px',
              borderRadius: '12px 12px 0 12px',
              background: '#4f46e5',
              color: '#e0e7ff',
              fontStyle: 'italic',
              opacity: 0.8,
              fontSize: '0.875rem'
            }}>{liveTranscript}...</div>
          </div>
        )}
        {isProcessing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '8px' }}>
            <div style={{
              padding: '8px 12px',
              borderRadius: '12px 12px 12px 0',
              background: '#334155',
              color: '#94a3b8',
              fontSize: '0.875rem'
            }}>Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        padding: '12px',
        borderTop: '1px solid #334155',
        display: 'flex',
        gap: '8px'
      }}>
        <button type="button" onClick={toggleListening} style={{
          background: isListening ? '#f97316' : '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          cursor: 'pointer',
          fontSize: '1.25rem',
          flexShrink: 0
        }}>{isListening ? '🛑' : '🎤'}</button>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Ask Betsy...'}
          disabled={isListening || isProcessing}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '22px',
            border: '1px solid #475569',
            background: '#0f172a',
            color: '#f1f5f9',
            fontSize: '0.875rem',
            outline: 'none'
          }}
        />
        <button type="submit" disabled={!inputText.trim() || isProcessing} style={{
          background: inputText.trim() ? '#10b981' : '#475569',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          cursor: inputText.trim() ? 'pointer' : 'not-allowed',
          fontSize: '1.25rem',
          flexShrink: 0
        }}>➤</button>
      </form>
    </div>
  );
};

// Floating Betsy Button Component
export const BetsyButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isOpen ? '#475569' : '#6366f1',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
          cursor: 'pointer',
          fontSize: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          transition: 'all 0.2s ease'
        }}
      >
        {isOpen ? '×' : '👩‍🍳'}
      </button>
      <BetsyChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default BetsyButton;
