import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { voiceService } from '../../services/voiceService';
import { shoppingListService, enhancedShoppingListService } from '../../services/shoppingListService';
import { betsyService, BetsyInterpretation } from '../../services/betsyService';
import { recipeService } from '../../services/recipeService';
import { mealPlanService } from '../../services/mealPlanService';

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

const STORAGE_KEY = 'betsy-conversation-history';

export const BetsyPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversation history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error('Failed to load conversation history:', e);
      }
    } else {
      // Add welcome message
      addBetsyMessage("Hi! I'm Betsy, your kitchen assistant. I can help you manage your meal plans, recipes, and shopping lists. Just type or tap the microphone to talk to me!\n\nTry saying: \"Add milk to shopping list\" or \"Go to recipes\"");
    }
  }, []);

  // Save conversation history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100))); // Keep last 100 messages
    }
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up voice recognition
  useEffect(() => {
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
      if (error && !error.includes('aborted')) {
        addBetsyMessage(`I had trouble hearing you: ${error}. Please try again.`);
      }
    });

    return () => {
      unsubResult();
      unsubError();
      voiceService.stopListening();
    };
  }, []);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const addUserMessage = (content: string) => {
    const msg: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, msg]);
  };

  const addBetsyMessage = (content: string, action?: Message['action']) => {
    const msg: Message = {
      id: generateId(),
      role: 'betsy',
      content,
      timestamp: new Date(),
      action
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleUserInput = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addUserMessage(trimmed);
    setIsProcessing(true);
    setInputText('');

    try {
      await processCommand(trimmed.toLowerCase());
    } catch (error) {
      addBetsyMessage("Sorry, something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processCommand = async (text: string) => {
    // Clear history is handled locally (no LLM needed)
    if (text.toLowerCase().includes('clear') && text.toLowerCase().includes('history')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      addBetsyMessage("I've cleared our conversation history. Fresh start!");
      return;
    }

    // Use LLM to interpret the command
    const interpretation = await betsyService.interpret(text);
    console.log('[BetsyPage] Interpretation:', interpretation);

    // Execute based on intent
    await executeIntent(interpretation);
  };

  const executeIntent = async (interpretation: BetsyInterpretation) => {
    const { intent, entities, response, confidence } = interpretation;

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
            addBetsyMessage(response || `Done! I've added ${addedItems.join(', ')} to your shopping list.`, {
              type: 'shopping_list',
              details: `Added: ${addedItems.join(', ')}`,
              success: true
            });
          } catch (e) {
            addBetsyMessage(`I had trouble adding items to the list. Please try again.`, {
              type: 'shopping_list',
              details: 'Failed to add items',
              success: false
            });
          }
        } else {
          addBetsyMessage(response || "I couldn't identify what to add. Please try again.");
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
          addBetsyMessage(response || `Taking you to ${dest.label}!`, {
            type: 'navigate',
            details: dest.label,
            success: true
          });
          setTimeout(() => navigate(dest.path), 500);
        } else {
          addBetsyMessage("I'm not sure where you want to go. Try 'recipes', 'shopping list', or 'meal planning'.");
        }
        break;

      case 'add_meal':
        if (entities.food && entities.mealType) {
          sessionStorage.setItem('pendingMeal', JSON.stringify({
            food: entities.food,
            mealType: entities.mealType,
            dateStr: entities.day || 'today'
          }));
          addBetsyMessage(response || `I'll add "${entities.food}" for ${entities.mealType}. Taking you to the meal planner!`, {
            type: 'meal_plan',
            details: `${entities.food} for ${entities.mealType}${entities.day ? ` on ${entities.day}` : ''}`,
            success: true
          });
          setTimeout(() => navigate('/meal-planning'), 500);
        } else {
          addBetsyMessage("I need to know what food and which meal. Try 'add pancakes for breakfast'.");
        }
        break;

      case 'clear_shopping_list':
        if (entities.checkedOnly) {
          try {
            await shoppingListService.clearCompletedItems();
            addBetsyMessage("Done! I've cleared the completed items from your shopping list.", {
              type: 'shopping_list',
              details: 'Cleared completed items',
              success: true
            });
          } catch (e) {
            addBetsyMessage("I had trouble clearing the items. Please try again.");
          }
        } else {
          addBetsyMessage("To clear your entire list, please use the 'Clear List' button on the Shopping List page. I can clear just the checked items if you say 'remove checked items'.");
        }
        break;

      case 'mark_all_completed':
        try {
          await shoppingListService.markAllAsCompleted();
          addBetsyMessage("Done! I've marked every item on your list as checked.", {
            type: 'shopping_list',
            details: 'All items marked complete',
            success: true
          });
        } catch (e) {
          addBetsyMessage("I couldn't mark the items as completed. Please try again.");
        }
        break;

      case 'generate_meals':
        if (entities.timeRange) {
          try {
            const result = await betsyService.clearMeals(entities.timeRange);
            if (result.success) {
              const timeLabel = entities.timeRange.replace('_', ' ');
              addBetsyMessage(
                result.deletedCount > 0 
                  ? `Done! I've cleared ${result.deletedCount} meal${result.deletedCount === 1 ? '' : 's'} for ${timeLabel}.`
                  : `There were no meals to clear for ${timeLabel}.`,
                {
                  type: 'meal_plan',
                  details: `Cleared ${result.deletedCount} meals`,
                  success: true
                }
              );
            } else {
              addBetsyMessage(`I had trouble clearing the meals: ${result.error}`, {
                type: 'meal_plan',
                details: 'Failed to clear meals',
                success: false
              });
            }
          } catch (e) {
            addBetsyMessage("I couldn't clear the meals. Please try again.", {
              type: 'meal_plan',
              details: 'Error clearing meals',
              success: false
            });
          }
        } else {
          addBetsyMessage("I need to know which meals to clear. Try 'clear meals for this week' or 'clear today's meals'.");
        }
        break;

      case 'generate_meals':
        if (entities.timeRange) {
          try {
            const timeLabel = entities.timeRange.replace('_', ' ');
            addBetsyMessage(`Generating meals for ${timeLabel}... This may take a moment.`);
            
            const result = await betsyService.generateMeals(entities.timeRange);
            if (result.success) {
              addBetsyMessage(
                result.mealCount > 0 
                  ? `Done! I've created ${result.mealCount} meal${result.mealCount === 1 ? '' : 's'} for ${timeLabel}. Go to Meal Planning to see them!`
                  : `The meal plan was generated. Go to Meal Planning to see the results!`,
                {
                  type: 'meal_plan',
                  details: `Generated ${result.mealCount} meals`,
                  success: true
                }
              );
            } else {
              addBetsyMessage(`I had trouble generating the meal plan: ${result.error}`, {
                type: 'meal_plan',
                details: 'Failed to generate meals',
                success: false
              });
            }
          } catch (e) {
            addBetsyMessage("I couldn't generate the meal plan. Please try again or use the Meal Planning page directly.", {
              type: 'meal_plan',
              details: 'Error generating meals',
              success: false
            });
          }
        } else {
          addBetsyMessage("I need to know the time range. Try 'generate meals for this week' or 'create meals for tomorrow'.");
        }
        break;

      case 'import_recipe':
        if (entities.url) {
          try {
            addBetsyMessage(`Importing recipe from ${entities.url}... This may take a moment.`);
            const recipe = await recipeService.importRecipeFromUrl(entities.url, entities.category || 'Dinner');
            addBetsyMessage(`Done! I've imported "${recipe.name}" to your recipes.`, {
              type: 'recipe',
              details: `Imported: ${recipe.name}`,
              success: true
            });
          } catch (e: any) {
            addBetsyMessage(`I couldn't import that recipe: ${e.message}`, {
              type: 'recipe',
              details: 'Failed to import recipe',
              success: false
            });
          }
        } else {
          addBetsyMessage("I need a URL to import a recipe. Try 'import recipe from https://...'");
        }
        break;

      case 'search_recipe':
        if (entities.query) {
          addBetsyMessage(`I found some recipes for "${entities.query}"! Unfortunately, I can't search the web directly yet. Please find a recipe URL and say "import recipe from [URL]" to add it.`);
        } else {
          addBetsyMessage("What recipe would you like me to search for?");
        }
        break;

      case 'add_to_shopping_list':
        // Smart handler: check if itemText matches a recipe, if so add ingredients, otherwise add as item
        if (entities.itemText) {
          try {
            const recipes = await recipeService.getAllRecipes();
            const itemLower = entities.itemText.toLowerCase();
            
            // Find exact or close match
            const exactMatch = recipes.find(r => r.name.toLowerCase() === itemLower);
            const partialMatch = recipes.find(r => 
              r.name.toLowerCase().includes(itemLower) || itemLower.includes(r.name.toLowerCase())
            );
            const matchedRecipe = exactMatch || partialMatch;
            
            if (matchedRecipe) {
              // It's a recipe - add all ingredients from recipe.ingredients if available
              let ingredientsList: string[] = [];
              
              if (matchedRecipe.ingredients && matchedRecipe.ingredients.length > 0) {
                // Use stored ingredients directly
                ingredientsList = matchedRecipe.ingredients.map(ing => {
                  if (typeof ing === 'string') return ing;
                  // Format structured ingredient
                  const parts = [];
                  if (ing.quantity) parts.push(String(ing.quantity));
                  if (ing.unit) parts.push(ing.unit);
                  if (ing.name) parts.push(ing.name);
                  else if (ing.text) parts.push(ing.text);
                  return parts.join(' ') || ing.text || '';
                }).filter(s => s.trim());
              } else {
                // Fallback to AI extraction if no ingredients stored
                ingredientsList = await recipeService.extractIngredients(matchedRecipe.instructions, matchedRecipe.name);
              }
              
              if (ingredientsList.length > 0) {
                await shoppingListService.addIngredientsToList(ingredientsList);
                addBetsyMessage(`Found recipe "${matchedRecipe.name}"! Added ${ingredientsList.length} ingredients to your shopping list.`, {
                  type: 'shopping_list',
                  details: `${ingredientsList.length} items from ${matchedRecipe.name}`,
                  success: true
                });
              } else {
                addBetsyMessage(`Found recipe "${matchedRecipe.name}" but couldn't extract ingredients. Adding recipe name instead.`);
                await shoppingListService.addShoppingListItem(matchedRecipe.name);
              }
            } else {
              // Not a recipe - add as regular item
              await shoppingListService.addShoppingListItem(entities.itemText);
              addBetsyMessage(`Added "${entities.itemText}" to your shopping list.`, {
                type: 'shopping_list',
                details: `Added: ${entities.itemText}`,
                success: true
              });
            }
          } catch (e) {
            addBetsyMessage("I had trouble adding to the shopping list. Please try again.", {
              type: 'shopping_list',
              details: 'Failed',
              success: false
            });
          }
        }
        break;

      case 'add_recipe_to_shopping_list':
        if (entities.recipeName) {
          try {
            const recipes = await recipeService.getAllRecipes();
            const recipe = recipes.find(r => 
              r.name.toLowerCase().includes(entities.recipeName!.toLowerCase())
            );
            if (recipe) {
              // Use stored ingredients if available, fallback to AI extraction
              let ingredientsList: string[] = [];
              if (recipe.ingredients && recipe.ingredients.length > 0) {
                ingredientsList = recipe.ingredients.map(ing => {
                  if (typeof ing === 'string') return ing;
                  const parts = [];
                  if (ing.quantity) parts.push(String(ing.quantity));
                  if (ing.unit) parts.push(ing.unit);
                  if (ing.name) parts.push(ing.name);
                  else if (ing.text) parts.push(ing.text);
                  return parts.join(' ') || ing.text || '';
                }).filter(s => s.trim());
              } else {
                ingredientsList = await recipeService.extractIngredients(recipe.instructions, recipe.name);
              }
              
              if (ingredientsList.length > 0) {
                await shoppingListService.addIngredientsToList(ingredientsList);
                addBetsyMessage(`Done! I've added ${ingredientsList.length} ingredients from "${recipe.name}" to your shopping list.`, {
                  type: 'shopping_list',
                  details: `Added ${ingredientsList.length} ingredients from ${recipe.name}`,
                  success: true
                });
              } else {
                addBetsyMessage(`I couldn't extract ingredients from "${recipe.name}".`);
              }
            } else {
              addBetsyMessage(`I couldn't find a recipe called "${entities.recipeName}". Try checking the Recipes page.`);
            }
          } catch (e) {
            addBetsyMessage("I had trouble adding the ingredients. Please try again.", {
              type: 'shopping_list',
              details: 'Failed to add ingredients',
              success: false
            });
          }
        } else {
          addBetsyMessage("Which recipe's ingredients should I add to the shopping list?");
        }
        break;

      case 'consolidate_shopping_list':
        try {
          const { items: consolidatedItems, stats } = await enhancedShoppingListService.consolidateItems();
          if (stats.combinedCount > 0) {
            const itemList = stats.combinedItems.slice(0, 3).join(', ');
            const moreText = stats.combinedItems.length > 3 ? ` and ${stats.combinedItems.length - 3} more` : '';
            addBetsyMessage(
              `Done! Combined ${stats.combinedCount} duplicate${stats.combinedCount > 1 ? 's' : ''}: ${itemList}${moreText}. List reduced from ${stats.originalCount} to ${stats.finalCount} items.`,
              { type: 'shopping_list', details: `Combined ${stats.combinedCount}`, success: true }
            );
          } else {
            addBetsyMessage(`No duplicates found. Your ${stats.finalCount} items are already consolidated.`, {
              type: 'shopping_list',
              details: 'No changes needed',
              success: true
            });
          }
        } catch (e) {
          addBetsyMessage("I had trouble consolidating the list. Please try again.", {
            type: 'shopping_list',
            details: 'Failed to consolidate',
            success: false
          });
        }
        break;

      case 'double_recipe':
        if (entities.recipeName) {
          try {
            const multiplier = entities.multiplier || 2;
            const multiplierWord = multiplier === 2 ? 'doubled' : multiplier === 3 ? 'tripled' : `multiplied by ${multiplier}`;
            
            // First find the recipe (from saved recipes or meal plan)
            let recipe = null;
            const savedRecipes = await recipeService.getAllRecipes();
            recipe = savedRecipes.find(r => 
              r.name.toLowerCase().includes(entities.recipeName!.toLowerCase())
            );
            
            // If not found in saved recipes, check meal plans
            if (!recipe) {
              const allPlans = mealPlanService.getAllMealPlans();
              for (const plan of allPlans) {
                for (const meal of plan.meals) {
                  if (meal.recipe.name.toLowerCase().includes(entities.recipeName!.toLowerCase())) {
                    recipe = meal.recipe;
                    break;
                  }
                }
                if (recipe) break;
              }
            }
            
            if (!recipe) {
              addBetsyMessage(`I couldn't find a recipe called "${entities.recipeName}". Make sure it's in your recipes or meal plan.`);
              break;
            }
            
            // Get shopping list items and find ones that match recipe ingredients
            const shoppingItems = await shoppingListService.getShoppingListItems();
            const recipeIngredients = recipe.ingredients || [];
            
            if (recipeIngredients.length === 0) {
              addBetsyMessage(`"${recipe.name}" doesn't have any ingredients listed.`);
              break;
            }
            
            // Find matching items in shopping list and double their quantities
            let updatedCount = 0;
            const updatedItems: string[] = [];
            
            // Helper to extract just the ingredient name (strip quantity and unit)
            const extractIngredientName = (text: string): string => {
              return text
                .toLowerCase()
                .replace(/^[\d.\/\s]+/, '') // Remove leading numbers
                .replace(/^(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|quarts?|pints?|gallons?|cans?|packages?|boxes?|bags?|bunch|head|cloves?|slices?|pieces?|large|medium|small|fresh|dried|chopped|minced|diced)\s+/i, '') // Remove units and modifiers
                .replace(/^of\s+/i, '') // Remove "of"
                .trim();
            };
            
            // Simple stemming - remove common plural endings
            const stem = (word: string): string => {
              return word.replace(/ies$/, 'y').replace(/es$/, '').replace(/s$/, '');
            };
            
            // Extract key words (nouns) from ingredient for flexible matching
            const getKeyWords = (text: string): string[] => {
              const cleaned = text.toLowerCase()
                .replace(/[\d.\/]+/g, '') // Remove numbers
                .replace(/\b(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|quarts?|pints?|gallons?|cans?|packages?|boxes?|bags?|bunch|head|cloves?|slices?|pieces?|large|medium|small|fresh|dried|chopped|minced|diced|of|and|or|to|for)\b/gi, '')
                .trim();
              return cleaned.split(/\s+/).filter(w => w.length > 1); // Allow 2-char words like "egg" stem
            };
            
            for (const ingredient of recipeIngredients) {
              const rawIngredient = typeof ingredient === 'string' 
                ? ingredient 
                : (ingredient.name || ingredient).toString();
              const ingredientName = extractIngredientName(rawIngredient);
              const ingredientKeyWords = getKeyWords(rawIngredient);
              
              // Find matching shopping list item
              const matchingItem = shoppingItems.find(item => {
                const itemText = (item.item_text || '').toLowerCase();
                const itemName = extractIngredientName(item.name || item.item_text || '');
                const itemKeyWords = getKeyWords(item.item_text || '');
                
                // Check multiple matching strategies
                if (itemName.includes(ingredientName) || ingredientName.includes(itemName)) return true;
                if (itemText.includes(ingredientName)) return true;
                
                // Check if key ingredient words match (with stemming)
                if (ingredientKeyWords.length > 0 && ingredientKeyWords.every(word => 
                  itemText.includes(word) || itemText.includes(stem(word)) || 
                  itemKeyWords.some(iw => stem(iw) === stem(word))
                )) return true;
                
                // Check if key item words match ingredient (with stemming)
                if (itemKeyWords.length > 0 && itemKeyWords.some(word => 
                  rawIngredient.toLowerCase().includes(word) || 
                  rawIngredient.toLowerCase().includes(stem(word)) ||
                  ingredientKeyWords.some(ik => stem(ik) === stem(word))
                )) return true;
                
                return false;
              });
              
              if (matchingItem) {
                // Parse the quantity from the item_text (e.g., "2 cups flour" -> 2)
                const itemText = matchingItem.item_text || '';
                const qtyMatch = itemText.match(/^([\d.\/]+)\s*/);
                const currentQty = qtyMatch ? parseFloat(qtyMatch[1]) || 1 : 1;
                const newQty = currentQty * multiplier;
                
                // Reconstruct item_text with new quantity
                let newItemText = itemText;
                if (qtyMatch) {
                  // Replace the existing quantity
                  newItemText = itemText.replace(/^[\d.\/]+/, newQty.toString());
                } else {
                  // Prepend the quantity if there wasn't one
                  newItemText = `${newQty} ${itemText}`;
                }
                
                // Update both quantity and item_text
                await shoppingListService.updateShoppingListItem(matchingItem.id, {
                  quantity: newQty.toString(),
                  item_text: newItemText
                });
                updatedCount++;
                updatedItems.push(matchingItem.name || matchingItem.item_text || 'item');
              }
            }
            
            if (updatedCount > 0) {
              const itemList = updatedItems.slice(0, 3).join(', ');
              const moreText = updatedItems.length > 3 ? ` and ${updatedItems.length - 3} more` : '';
              addBetsyMessage(
                `Done! I've ${multiplierWord} the quantities for ${updatedCount} item${updatedCount > 1 ? 's' : ''}: ${itemList}${moreText}.`,
                { type: 'shopping_list', details: `${multiplierWord} ${updatedCount} items`, success: true }
              );
            } else {
              addBetsyMessage(
                `I couldn't find any "${recipe.name}" ingredients in your shopping list. Try adding the recipe ingredients first with "add ${recipe.name} ingredients to shopping list".`
              );
            }
          } catch (e) {
            addBetsyMessage("I had trouble updating the quantities. Please try again.");
          }
        } else {
          addBetsyMessage("Which recipe would you like to double? Try 'double the spaghetti bolognese'.");
        }
        break;

      case 'move_meal':
        if (entities.fromDay && entities.fromMealType && entities.toDay && entities.toMealType) {
          try {
            const fromDate = getDateFromDayName(entities.fromDay);
            const toDate = getDateFromDayName(entities.toDay);
            const fromMeal = mealPlanService.getPlannedMeal(fromDate, capitalize(entities.fromMealType));
            
            if (fromMeal) {
              mealPlanService.removePlannedMeal(fromDate, capitalize(entities.fromMealType));
              mealPlanService.addPlannedMeal(toDate, capitalize(entities.toMealType), fromMeal.recipe);
              addBetsyMessage(`Done! I've moved ${fromMeal.recipe.name} from ${entities.fromDay} ${entities.fromMealType} to ${entities.toDay} ${entities.toMealType}.`, {
                type: 'meal_plan',
                details: `Moved meal`,
                success: true
              });
            } else {
              addBetsyMessage(`I couldn't find a meal for ${entities.fromDay} ${entities.fromMealType}.`);
            }
          } catch (e) {
            addBetsyMessage("I had trouble moving that meal. Please try again.");
          }
        } else {
          addBetsyMessage("I need to know where to move the meal from and to. Try 'move Monday breakfast to Tuesday lunch'.");
        }
        break;

      case 'swap_meals':
        if (entities.day1 && entities.mealType1 && entities.day2 && entities.mealType2) {
          try {
            const date1 = getDateFromDayName(entities.day1);
            const date2 = getDateFromDayName(entities.day2);
            const meal1 = mealPlanService.getPlannedMeal(date1, capitalize(entities.mealType1));
            const meal2 = mealPlanService.getPlannedMeal(date2, capitalize(entities.mealType2));
            
            if (meal1 && meal2) {
              mealPlanService.removePlannedMeal(date1, capitalize(entities.mealType1));
              mealPlanService.removePlannedMeal(date2, capitalize(entities.mealType2));
              mealPlanService.addPlannedMeal(date1, capitalize(entities.mealType1), meal2.recipe);
              mealPlanService.addPlannedMeal(date2, capitalize(entities.mealType2), meal1.recipe);
              addBetsyMessage(`Done! I've swapped ${meal1.recipe.name} with ${meal2.recipe.name}.`, {
                type: 'meal_plan',
                details: 'Swapped meals',
                success: true
              });
            } else {
              addBetsyMessage("I couldn't find meals in both slots to swap.");
            }
          } catch (e) {
            addBetsyMessage("I had trouble swapping those meals. Please try again.");
          }
        } else {
          addBetsyMessage("I need to know which meals to swap. Try 'swap Monday dinner with Tuesday dinner'.");
        }
        break;

      case 'swap_all_meals':
        if (entities.day1 && entities.day2) {
          try {
            const date1 = getDateFromDayName(entities.day1);
            const date2 = getDateFromDayName(entities.day2);
            const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
            let swappedCount = 0;
            const swappedMeals: string[] = [];
            
            for (const mealType of mealTypes) {
              const meal1 = mealPlanService.getPlannedMeal(date1, mealType);
              const meal2 = mealPlanService.getPlannedMeal(date2, mealType);
              
              if (meal1 || meal2) {
                // Remove both meals first
                if (meal1) mealPlanService.removePlannedMeal(date1, mealType);
                if (meal2) mealPlanService.removePlannedMeal(date2, mealType);
                
                // Swap them
                if (meal2) mealPlanService.addPlannedMeal(date1, mealType, meal2.recipe);
                if (meal1) mealPlanService.addPlannedMeal(date2, mealType, meal1.recipe);
                
                if (meal1 && meal2) {
                  swappedMeals.push(`${mealType.toLowerCase()}`);
                  swappedCount++;
                } else if (meal1 || meal2) {
                  swappedMeals.push(`${mealType.toLowerCase()} (moved)`);
                  swappedCount++;
                }
              }
            }
            
            if (swappedCount > 0) {
              addBetsyMessage(`Done! I've swapped ${swappedMeals.join(', ')} between ${entities.day1} and ${entities.day2}.`, {
                type: 'meal_plan',
                details: `Swapped ${swappedCount} meal(s)`,
                success: true
              });
            } else {
              addBetsyMessage(`Neither ${entities.day1} nor ${entities.day2} has any meals to swap.`);
            }
          } catch (e) {
            addBetsyMessage("I had trouble swapping those days. Please try again.");
          }
        } else {
          addBetsyMessage("I need to know which two days to swap. Try 'switch Wednesday and Thursday'.");
        }
        break;

      case 'save_recipe':
        if (entities.recipeName) {
          try {
            // First check if it already exists in saved recipes
            const existingRecipes = await recipeService.getAllRecipes();
            const alreadySaved = existingRecipes.find(r => 
              r.name.toLowerCase() === entities.recipeName!.toLowerCase()
            );
            if (alreadySaved) {
              addBetsyMessage(`"${alreadySaved.name}" is already in your recipes!`);
              break;
            }
            
            // Search through all meal plans for a matching AI-generated recipe
            const allPlans = mealPlanService.getAllMealPlans();
            let foundRecipe = null;
            
            for (const plan of allPlans) {
              for (const meal of plan.meals) {
                if (meal.recipe.name.toLowerCase().includes(entities.recipeName!.toLowerCase())) {
                  // Check if it's an AI-generated recipe (not already in user's collection)
                  const isUserRecipe = existingRecipes.some(r => r.id === meal.recipe.id);
                  if (!isUserRecipe) {
                    foundRecipe = meal.recipe;
                    break;
                  }
                }
              }
              if (foundRecipe) break;
            }
            
            if (foundRecipe) {
              // Save the recipe to the collection
              const savedRecipe = await recipeService.createRecipe({
                name: foundRecipe.name,
                instructions: foundRecipe.instructions || '',
                ingredients: foundRecipe.ingredients || [],
                prepTime: foundRecipe.prepTime,
                cookTime: foundRecipe.cookTime,
                servings: foundRecipe.servings,
                category: foundRecipe.category || 'Dinner'
              });
              addBetsyMessage(`Done! I've saved "${savedRecipe.name}" to your recipes. You can find it on the Recipes page.`, {
                type: 'recipe',
                details: `Saved: ${savedRecipe.name}`,
                success: true
              });
            } else {
              addBetsyMessage(`I couldn't find "${entities.recipeName}" in your meal plan. Make sure the recipe is on your meal planning calendar.`);
            }
          } catch (e) {
            addBetsyMessage("I had trouble saving that recipe. Please try again.");
          }
        } else {
          addBetsyMessage("Which recipe would you like me to save? Try 'save Breakfast Burritos to recipes'.");
        }
        break;

      case 'delete_recipe':
        if (entities.recipeName) {
          try {
            const recipes = await recipeService.getAllRecipes();
            const recipe = recipes.find(r => 
              r.name.toLowerCase().includes(entities.recipeName!.toLowerCase())
            );
            if (recipe) {
              await recipeService.deleteRecipe(recipe.id);
              addBetsyMessage(`Done! I've deleted "${recipe.name}" from your recipes.`, {
                type: 'recipe',
                details: `Deleted: ${recipe.name}`,
                success: true
              });
            } else {
              addBetsyMessage(`I couldn't find a recipe called "${entities.recipeName}".`);
            }
          } catch (e) {
            addBetsyMessage("I had trouble deleting that recipe. Please try again.");
          }
        } else {
          addBetsyMessage("Which recipe would you like me to delete?");
        }
        break;

      case 'search_recipes':
        if (entities.query) {
          try {
            const recipes = await recipeService.getAllRecipes();
            const matches = recipes.filter(r => 
              r.name.toLowerCase().includes(entities.query!.toLowerCase()) ||
              r.instructions.toLowerCase().includes(entities.query!.toLowerCase())
            );
            if (matches.length > 0) {
              const recipeList = matches.slice(0, 5).map(r => `• ${r.name}`).join('\n');
              addBetsyMessage(`I found ${matches.length} recipe${matches.length === 1 ? '' : 's'} matching "${entities.query}":\n\n${recipeList}${matches.length > 5 ? `\n\n...and ${matches.length - 5} more` : ''}`);
            } else {
              addBetsyMessage(`I couldn't find any recipes matching "${entities.query}".`);
            }
          } catch (e) {
            addBetsyMessage("I had trouble searching recipes. Please try again.");
          }
        } else {
          addBetsyMessage("What would you like me to search for in your recipes?");
        }
        break;

      case 'create_recipe':
        if (entities.recipeName) {
          try {
            const existingRecipes = await recipeService.getAllRecipes();
            const alreadySaved = existingRecipes.find(r => r.name.toLowerCase() === entities.recipeName!.toLowerCase());
            
            if (alreadySaved) {
              addBetsyMessage(`"${alreadySaved.name}" is already in your recipes! I'll take you there.`, { type: 'recipe', details: alreadySaved.name, success: true });
              navigate('/recipes');
              return;
            }

            const allPlans = mealPlanService.getAllMealPlans();
            let foundRecipe = null;
            let bestMatch = null;

            // Search all plans for the best matching recipe
            for (const plan of allPlans) {
              for (const meal of plan.meals) {
                 if (meal.recipe.name.toLowerCase().includes(entities.recipeName!.toLowerCase()) || 
                     entities.recipeName!.toLowerCase().includes(meal.recipe.name.toLowerCase())) {
                    
                    const isUserRecipe = existingRecipes.some(r => r.id === meal.recipe.id);
                    console.log(`[BetsyPage] Found match: "${meal.recipe.name}" (Instructions: ${meal.recipe.instructions?.length || 0} chars, Ingredients: ${meal.recipe.ingredients?.length || 0})`);
                    
                    if (!isUserRecipe) {
                      // Check quality of this match
                      const hasInstructions = meal.recipe.instructions && meal.recipe.instructions.length > 50;
                      const hasIngredients = meal.recipe.ingredients && meal.recipe.ingredients.length > 0;
                      
                      // If we haven't found a match yet, take this one
                      if (!bestMatch) {
                        bestMatch = meal.recipe;
                        console.log('[BetsyPage] New best match (first)');
                      } 
                      // If this match is better (has details while current best doesn't), take it
                      else if ((hasInstructions || hasIngredients) && 
                               (!bestMatch.instructions || bestMatch.instructions.length <= 50) && 
                               (!bestMatch.ingredients || bestMatch.ingredients.length === 0)) {
                        bestMatch = meal.recipe;
                        console.log('[BetsyPage] New best match (better quality)');
                      }
                    }
                 }
              }
            }
            
            foundRecipe = bestMatch;

            if (foundRecipe) {
              const savedRecipe = await recipeService.createRecipe({
                name: foundRecipe.name,
                instructions: foundRecipe.instructions || '',
                ingredients: foundRecipe.ingredients || [],
                prepTime: foundRecipe.prepTime,
                cookTime: foundRecipe.cookTime,
                servings: foundRecipe.servings,
                category: foundRecipe.category || 'Dinner'
              });
              addBetsyMessage(`I found "${foundRecipe.name}" in your meal plan and saved it to your recipes!`, { type: 'recipe', details: savedRecipe.name, success: true });
              return;
            }
          } catch (e) {
            console.error('Error checking meal plan for recipe:', e);
          }
        }

        addBetsyMessage(
          entities.recipeName 
            ? `Let's create a recipe for ${entities.recipeName}! I'll take you to the recipes page where you can add all the details.`
            : "I'll take you to the recipes page to create a new recipe!",
          { type: 'recipe', details: 'Create recipe', success: true }
        );
        sessionStorage.setItem('openRecipeForm', 'true');
        if (entities.recipeName) {
          sessionStorage.setItem('newRecipeName', entities.recipeName);
        }
        setTimeout(() => navigate('/recipes'), 500);
        break;

      case 'web_search_recipe':
        {
          const recipeQuery = entities.query || entities.recipeName || '';
          const siteSource = entities.source ? entities.source.toLowerCase().replace(/\s+/g, '') : '';
          
          // Build clean search query
          let googleQuery = recipeQuery;
          if (!googleQuery.toLowerCase().includes('recipe')) {
            googleQuery += ' recipe';
          }
          if (siteSource) {
            googleQuery += ` site:${siteSource}.com`;
          }
          
          addBetsyMessage(
            `I'll search for "${recipeQuery}" ${siteSource ? `on ${entities.source}` : 'online'}. Once you find one you like, come back and share the URL - I'll import it for you!`,
            { type: 'recipe', details: 'Web search', success: true }
          );
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery.trim())}`;
          window.open(searchUrl, '_blank');
        }
        break;

      case 'help':
        addBetsyMessage(
          "Here's what I can help you with:\n\n" +
          "🛒 **Shopping List**\n" +
          "• \"Add a gallon of milk\"\n" +
          "• \"Add spaghetti carbonara ingredients to list\"\n" +
          "• \"Consolidate my shopping list\"\n" +
          "• \"Clear checked items\"\n\n" +
          "🍳 **Meal Planning**\n" +
          "• \"Generate meals for this week\"\n" +
          "• \"Move Monday breakfast to Tuesday\"\n" +
          "• \"Swap Tuesday dinner with Wednesday dinner\"\n" +
          "• \"Clear all meals this week\"\n\n" +
          "📖 **Recipes**\n" +
          "• \"Import recipe from [URL]\"\n" +
          "• \"Search my recipes for chicken\"\n" +
          "• \"Delete the pancakes recipe\"\n\n" +
          "🧭 **Navigation**\n" +
          "• \"Go to recipes\"\n" +
          "• \"Show me my shopping list\"\n\n" +
          "Just type or tap the microphone!"
        );
        break;

      case 'greeting':
        addBetsyMessage(response || "Hello! I'm Betsy, your kitchen assistant. How can I help you today?");
        break;

      case 'unknown':
      default:
        addBetsyMessage(response || `I'm not sure how to help with that. Try saying "help" to see what I can do!`);
        break;
    }
  };

  const formatShoppingItem = (item: { name: string; quantity?: string; unit?: string }): string => {
    if (item.quantity && item.unit) {
      return `${item.quantity} ${item.unit} ${item.name}`;
    } else if (item.quantity) {
      return `${item.quantity} ${item.name}`;
    }
    return item.name;
  };

  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const getDateFromDayName = (dayName: string): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const todayDay = today.getDay();
    const targetDay = days.indexOf(dayName.toLowerCase());
    
    if (targetDay === -1) {
      // Handle "today", "tomorrow"
      if (dayName.toLowerCase() === 'today') {
        return today.toISOString().split('T')[0];
      }
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
      if (started) {
        setIsListening(true);
      } else {
        addBetsyMessage("Voice recognition isn't available in your browser. Please type your request instead.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUserInput(inputText);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 120px)',
      maxWidth: '800px',
      margin: '0 auto'
    }
  }, [
    // Header
    React.createElement('div', {
      key: 'header',
      style: {
        textAlign: 'center',
        marginBottom: '1rem'
      }
    }, [
      React.createElement('h1', {
        key: 'title',
        style: { fontSize: '2rem', color: '#1a1a1a', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }
      }, 'Betsy'),
      React.createElement('p', {
        key: 'subtitle',
        style: { color: '#4b5563', margin: '0.5rem 0 0 0' }
      }, 'Your Kitchen Assistant')
    ]),

    // Messages container
    React.createElement('div', {
      key: 'messages',
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        background: '#ffffff',
        borderRadius: '0.75rem',
        marginBottom: '1rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }
    }, [
      ...messages.map(msg => 
        React.createElement('div', {
          key: msg.id,
          style: {
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '1rem'
          }
        }, 
          React.createElement('div', {
            style: {
              maxWidth: '80%',
              padding: '0.75rem 1rem',
              borderRadius: msg.role === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
              background: msg.role === 'user' ? '#0fc7b9' : '#f3f4f6',
              color: msg.role === 'user' ? '#ffffff' : '#1a1a1a'
            }
          }, [
            React.createElement('div', {
              key: 'content',
              style: { whiteSpace: 'pre-wrap' }
            }, msg.content),
            msg.action && React.createElement('div', {
              key: 'action',
              style: {
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: msg.action.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                color: msg.action.success ? '#10b981' : '#ef4444'
              }
            }, `${msg.action.success ? '✓' : '✗'} ${msg.action.details}`),
            React.createElement('div', {
              key: 'time',
              style: {
                fontSize: '0.625rem',
                color: '#64748b',
                marginTop: '0.25rem',
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }
            }, formatTime(msg.timestamp))
          ])
        )
      ),
      // Live transcript while listening
      isListening && liveTranscript && React.createElement('div', {
        key: 'live-transcript',
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '1rem'
        }
      },
        React.createElement('div', {
          style: {
            maxWidth: '80%',
            padding: '0.75rem 1rem',
            borderRadius: '1rem 1rem 0 1rem',
            background: '#2a6f6f',
            color: '#ffffff',
            fontStyle: 'italic',
            opacity: 0.8
          }
        }, liveTranscript + '...')
      ),
      // Processing indicator
      isProcessing && React.createElement('div', {
        key: 'processing',
        style: {
          display: 'flex',
          justifyContent: 'flex-start',
          marginBottom: '1rem'
        }
      },
        React.createElement('div', {
          style: {
            padding: '0.75rem 1rem',
            borderRadius: '1rem 1rem 1rem 0',
            background: '#f3f4f6',
            color: '#4b5563'
          }
        }, 'Thinking...')
      ),
      React.createElement('div', { key: 'scroll-anchor', ref: messagesEndRef })
    ]),

    // Input area
    React.createElement('form', {
      key: 'input-form',
      onSubmit: handleSubmit,
      style: {
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center'
      }
    }, [
      // Voice button
      React.createElement('button', {
        key: 'voice-btn',
        type: 'button',
        onClick: toggleListening,
        style: {
          background: isListening ? '#EA6A47' : '#0fc7b9',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          cursor: 'pointer',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.2s'
        }
      }, isListening ? '🛑' : '🎤'),

      // Text input
      React.createElement('input', {
        key: 'text-input',
        ref: inputRef,
        type: 'text',
        value: inputText,
        onChange: (e) => setInputText(e.target.value),
        placeholder: isListening ? 'Listening...' : 'Type a message or tap the mic...',
        disabled: isListening || isProcessing,
        style: {
          flex: 1,
          padding: '1rem',
          borderRadius: '1.5rem',
          border: '1px solid #e5e7eb',
          background: '#ffffff',
          color: '#1a1a1a',
          fontSize: '1rem',
          outline: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }
      }),

      // Send button
      React.createElement('button', {
        key: 'send-btn',
        type: 'submit',
        disabled: !inputText.trim() || isProcessing,
        style: {
          background: inputText.trim() ? '#0fc7b9' : '#d1d5db',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          cursor: inputText.trim() ? 'pointer' : 'not-allowed',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.2s'
        }
      }, '➤')
    ]),

    // Listening indicator
    isListening && React.createElement('div', {
      key: 'listening-indicator',
      style: {
        textAlign: 'center',
        marginTop: '0.75rem',
        color: '#EA6A47',
        fontSize: '0.875rem',
        fontWeight: 'bold'
      }
    }, '🎤 Listening... speak now')
  ]);
};

export default BetsyPage;
