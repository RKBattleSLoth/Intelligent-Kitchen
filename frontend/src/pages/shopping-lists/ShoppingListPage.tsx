import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { shoppingListService, enhancedShoppingListService, ShoppingListTemplate } from '../../services/shoppingListService';
import { aiService } from '../../services/aiService';
import { recipeService } from '../../services/recipeService';
import { ShoppingListItem } from '../../types/shoppingList';
import { Recipe } from '../../types/recipe';
import { voiceService, VoiceCommand } from '../../services/voiceService';

interface ShoppingListPageProps {}

export const ShoppingListPage: React.FC<ShoppingListPageProps> = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  
  // AI-related states
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>('checking');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ShoppingListTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const itemsRef = useRef<ShoppingListItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Load shopping list and recipes on component mount
  useEffect(() => {
    loadShoppingList();
    loadRecipes();
    checkAIStatus();
    loadTemplates();

    // Subscribe to shopping list changes (for Betsy updates)
    const unsubShoppingList = shoppingListService.subscribe(() => {
      console.log('[ShoppingListPage] Shopping list changed, reloading...');
      loadShoppingList();
    });

    const unsubCommand = voiceService.onCommand(async (command) => {
      setVoiceError(null);
      await handleVoiceCommand(command);
    });

    const unsubResult = voiceService.onResult((result) => {
      setVoiceTranscript(result.transcript);
      if (result.isFinal) {
        setIsListening(false);
      }
    });

    const unsubError = voiceService.onError((msg) => {
      setVoiceError(msg);
      setIsListening(false);
    });

    return () => {
      unsubShoppingList();
      unsubCommand();
      unsubResult();
      unsubError();
      voiceService.stopListening();
    };
  }, []);

  const loadShoppingList = async () => {
    try {
      setLoading(true);
      setError(null);
      const listItems = await enhancedShoppingListService.getShoppingListItems();
      setItems(listItems);
    } catch (err) {
      setError('Failed to load shopping list');
      console.error('Error loading shopping list:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const [defaultTemplates, storedTemplates] = await Promise.all([
        enhancedShoppingListService.getTemplates(),
        enhancedShoppingListService.getStoredTemplates()
      ]);
      setTemplates([...defaultTemplates, ...storedTemplates]);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const loadRecipes = async () => {
    try {
      const recipeList = await recipeService.getAllRecipes();
      setRecipes(recipeList);
    } catch (err) {
      console.error('Error loading recipes:', err);
    }
  };

  // Template-related functions
  const toggleTemplates = () => {
    const next = !showTemplates;
    setShowTemplates(next);
    if (next) {
      loadTemplates();
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      const newItems = await enhancedShoppingListService.applyTemplate(templateId);
      setItems(newItems);
      setShowTemplates(false);
      
      const template = templates.find(t => t.id === templateId);
      const appliedCount = newItems.length;
      const templateName = template?.name || 'Custom Template';
      
      // Show success message
      if (templateName && appliedCount > 0) {
        console.log(`Applied ${templateName} template with ${appliedCount} items`);
      }
    } catch (err) {
      console.error('Error applying template:', err);
    }
  };

  const handleSaveTemplate = async () => {
    if (items.length === 0) {
      setError('Add at least one item before saving a template');
      return;
    }

    const nameInput = window.prompt('Name this template', 'My Shopping Template');
    if (!nameInput) {
      return;
    }

    const descriptionInput = window.prompt('Describe this template (optional)', '');

    try {
      await enhancedShoppingListService.saveAsTemplate(
        nameInput.trim(),
        (descriptionInput || '').trim() || 'Custom shopping list template'
      );
      await loadTemplates();
      setShowTemplates(true);
      setError(null);
      console.log(`Saved template: ${nameInput}`);
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await enhancedShoppingListService.deleteStoredTemplate(templateId);
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
    }
  };

  // Check if AI is configured and available
  const checkAIStatus = async () => {
    try {
      const isConfigured = await aiService.isConfigured();
      setAiEnabled(isConfigured);
      setAiStatus(isConfigured ? 'ready' : 'not_configured');
    } catch (error) {
      setAiEnabled(false);
      setAiStatus('error');
    }
  };

  const addItem = async () => {
    if (!newItemText.trim()) return;
    
    try {
      setError(null);
      const newItem = await shoppingListService.addShoppingListItem(newItemText.trim());
      setItems([...items, newItem]);
      setNewItemText('');
    } catch (err) {
      setError('Failed to add item');
      console.error('Error adding item:', err);
    }
  };

  const toggleItem = async (item: ShoppingListItem) => {
    try {
      setError(null);
      const updatedItem = await shoppingListService.updateShoppingListItem(
        item.id, 
        { is_checked: !item.is_checked }
      );
      
      setItems(items.map(i => i.id === item.id ? updatedItem : i));
    } catch (err) {
      setError('Failed to update item');
      console.error('Error updating item:', err);
    }
  };

  const updateItemText = async (item: ShoppingListItem, newText: string) => {
    if (!newText.trim()) return;
    
    try {
      setError(null);
      const updatedItem = await shoppingListService.updateShoppingListItem(
        item.id, 
        { item_text: newText.trim() }
      );
      
      setItems(items.map(i => i.id === item.id ? updatedItem : i));
    } catch (err) {
      setError('Failed to update item');
      console.error('Error updating item:', err);
    }
  };

  const deleteItem = async (item: ShoppingListItem) => {
    try {
      setError(null);
      await shoppingListService.deleteShoppingListItem(item.id);
      setItems(items.filter(i => i.id !== item.id));
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error deleting item:', err);
    }
  };

  const clearCompleted = async () => {
    try {
      setError(null);
      await shoppingListService.clearCompletedItems();
      setItems(items.filter(item => !item.is_checked));
    } catch (err) {
      setError('Failed to clear completed items');
      console.error('Error clearing completed items:', err);
    }
  };

  const markAllAsComplete = async () => {
    try {
      setError(null);
      const updatedItems = await Promise.all(
        items.filter(item => !item.is_checked).map(item =>
          shoppingListService.updateShoppingListItem(item.id, { is_checked: true })
        )
      );
      
      // Update all items to checked
      setItems(items.map(item => ({
        ...item,
        is_checked: true
      })));
    } catch (err) {
      setError('Failed to mark all items as complete');
      console.error('Error marking all as complete:', err);
    }
  };

  // Helper function to extract ingredients from recipe - matching RecipeList logic
  const extractIngredientsForShopping = (recipe: Recipe): Array<string | {
    text?: string
    quantity?: string | number | null
    unit?: string | null
    name?: string | null
  }> => {
    if (!recipe) return []

    if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
      return recipe.ingredients
    }

    if (typeof recipe.instructions === 'string' && recipe.instructions.trim()) {
      const parsed = recipeService.parseInstructions(recipe.instructions)
      if (parsed.items.length > 0) {
        return parsed.items.map(item => ({
          text: item.text,
          quantity: item.quantity ?? item.quantityValue ?? null,
          unit: item.unit ?? null,
          name: item.name ?? null
        }))
      }
    }

    return []
  }

  // AI Functions
  const addRecipeIngredients = async (recipeId: string) => {
    try {
      setAiLoading(true);
      setError(null);
      
      const recipe = await recipeService.getRecipeById(recipeId);
      if (!recipe) {
        setError('Recipe not found');
        return;
      }

      // Use the same extraction logic as RecipeList
      const ingredients = extractIngredientsForShopping(recipe);
      if (!ingredients.length) {
        setError('No ingredients found in this recipe');
        return;
      }

      // Add ingredients using the shopping list service
      const addedItems = await shoppingListService.addIngredientsToList(ingredients);
      if (!addedItems || addedItems.length === 0) {
        setError('No ingredients were added to the shopping list');
        return;
      }

      setItems([...items, ...addedItems]);
      setSelectedRecipes(selectedRecipes.filter(id => id !== recipeId));
    } catch (err: any) {
      setError(err.message || 'Failed to add recipe ingredients');
    } finally {
      setAiLoading(false);
    }
  };

  const addMultipleRecipeIngredients = async () => {
    if (selectedRecipes.length === 0) return;
    
    try {
      setAiLoading(true);
      setError(null);
      
      // Collect all ingredients from all selected recipes first
      const allNewItems: ShoppingListItem[] = [];
      
      for (const recipeId of selectedRecipes) {
        const recipe = await recipeService.getRecipeById(recipeId);
        if (!recipe) continue;
        
        const ingredients = extractIngredientsForShopping(recipe);
        if (!ingredients.length) continue;
        
        const addedItems = await shoppingListService.addIngredientsToList(ingredients);
        if (addedItems && addedItems.length > 0) {
          allNewItems.push(...addedItems);
        }
      }
      
      // Update state once with all new items
      if (allNewItems.length > 0) {
        setItems(prev => [...prev, ...allNewItems]);
      }
      
      setShowRecipeSelector(false);
      setSelectedRecipes([]);
    } catch (err: any) {
      setError(err.message || 'Failed to add recipe ingredients');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleRecipeSelection = (recipeId: string) => {
    setSelectedRecipes(prev => 
      prev.includes(recipeId) 
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const copyAllItems = async () => {
    if (items.length === 0) return;
    
    try {
      // Format items nicely for copying
      const formattedItems = items
        .map(item => `${item.is_checked ? '✓' : '○'} ${item.item_text}`)
        .join('\n');
      
      // Copy to clipboard
      await navigator.clipboard.writeText(formattedItems);
      
      // Show brief success feedback
      setError(null);
      // We can't show success easily without adding more state, so we'll just silently succeed
      console.log('Shopping list copied to clipboard');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const toggleVoiceListening = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      return;
    }

    const started = voiceService.startListening();
    if (started) {
      setIsListening(true);
      setVoiceTranscript('Listening...');
      setVoiceError(null);
    } else {
      setVoiceError('Speech recognition is not supported in this browser');
    }
  };

  const handleVoiceCommand = async (command: VoiceCommand) => {
    const [primaryParam] = command.parameters || [];
    const normalizedParam = primaryParam?.toLowerCase().trim();

    switch (command.command) {
      case 'add_to_shopping_list': {
        if (!normalizedParam) return;
        try {
          const newItem = await shoppingListService.addShoppingListItem(normalizedParam);
          setItems([...itemsRef.current, newItem]);
        } catch (err) {
          console.error('Voice add item failed:', err);
          setError('Voice command failed to add item');
        }
        break;
      }
      case 'remove_from_shopping_list': {
        if (!normalizedParam) return;
        const target = itemsRef.current.find(item => item.item_text.toLowerCase().includes(normalizedParam));
        if (!target) {
          setError(`Could not find ${normalizedParam} in list`);
          return;
        }
        await deleteItem(target);
        break;
      }
      case 'check_off_item': {
        if (!normalizedParam) return;
        const target = itemsRef.current.find(item => item.item_text.toLowerCase().includes(normalizedParam));
        if (!target) {
          setError(`Could not find ${normalizedParam} to check off`);
          return;
        }
        await toggleItem(target);
        break;
      }
      case 'consolidate_shopping_list': {
        try {
          const consolidated = await enhancedShoppingListService.consolidateItems();
          setItems(consolidated);
        } catch (err) {
          console.error('Consolidation failed:', err);
          setError('Failed to consolidate shopping list');
        }
        break;
      }
      case 'plan_meals': {
        navigate('/meal-planning');
        break;
      }
      case 'view_recipes': {
        navigate('/recipes');
        break;
      }
      case 'view_shopping_list': {
        navigate('/shopping-lists');
        break;
      }
      case 'help': {
        setError('Voice help: try commands like "Add milk", "Remove onions", "Plan meals"');
        break;
      }
      default:
        console.log('Unhandled voice command:', command);
    }
  };

  if (loading) {
    return React.createElement('div', {
      style: { 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        color: '#f1f5f9'
      }
    }, 'Loading shopping list...');
  }

  return React.createElement('div', null, [
    // Header
    React.createElement('div', {
      key: 'header',
      style: { 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        marginBottom: isMobile ? '1rem' : '2rem',
        gap: isMobile ? '1rem' : '0'
      }
    }, [
      React.createElement('div', {
        key: 'title-section',
        style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
      }, [
        React.createElement('h1', {
          key: 'title',
          style: { 
            fontSize: isMobile ? '1.5rem' : '2rem', 
            fontWeight: 'bold', 
            color: '#f1f5f9',
            margin: 0
          }
        }, '🛒 Shopping List'),
        
        // AI Status Indicator
        React.createElement('div', {
          key: 'ai-status',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            color: aiEnabled ? '#10b981' : '#f59e0b'
          }
        }, [
          React.createElement('span', { key: 'ai-dot' }, aiEnabled ? '🤖' : '⚠️'),
          React.createElement('span', { key: 'ai-text' }, 
            aiEnabled 
              ? (isMobile ? 'AI Available' : 'AI Recipe Integration Available')
              : `AI ${aiStatus === 'checking' ? 'initializing...' : 'unavailable'}`)
        ])
      ]),
      
      React.createElement('div', {
        key: 'header-buttons',
        style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }
      }, [
        // Add Recipe Ingredients Button
        React.createElement('button', {
          key: 'recipe-btn',
          onClick: () => {
            if (aiEnabled) {
              setShowRecipeSelector(!showRecipeSelector);
            }
          },
          disabled: !aiEnabled,
          title: aiEnabled ? 'Add ingredients from your recipes' : 'AI is currently unavailable',
          style: {
            background: aiEnabled ? (showRecipeSelector ? '#8b5cf6' : '#6366f1') : '#94a3b8',
            color: 'white',
            border: 'none',
            padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: aiEnabled ? 'pointer' : 'not-allowed',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            opacity: aiEnabled ? 1 : 0.6,
            minHeight: '44px'
          }
        }, ['🍳', isMobile ? 'Recipes' : (showRecipeSelector ? 'Hide Recipes' : 'Add Recipe Ingredients')]),
        
        // Mark All As Complete Button
        items.length > 0 && items.some(item => !item.is_checked) && React.createElement('button', {
          key: 'mark-all-btn',
          onClick: markAllAsComplete,
          style: {
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            minHeight: '44px'
          }
        }, ['✓', isMobile ? 'Complete All' : 'Mark All Complete']),
        
        // Copy All Button
        items.length > 0 && React.createElement('button', {
          key: 'copy-all-btn',
          onClick: copyAllItems,
          style: {
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            minHeight: '44px'
          }
        }, ['📋', 'Copy']),
        
        // Consolidate Button
        items.length > 1 && React.createElement('button', {
          key: 'consolidate-btn',
          onClick: async () => {
            try {
              const consolidated = await enhancedShoppingListService.consolidateItems();
              setItems(consolidated);
            } catch (err) {
              setError('Failed to consolidate list');
            }
          },
          style: {
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            minHeight: '44px'
          }
        }, ['🔗', 'Consolidate']),
        
        // Clear Completed Button
        items.some(item => item.is_checked) && React.createElement('button', {
          key: 'clear-btn',
          onClick: clearCompleted,
          style: {
            background: '#ef4444',
            color: 'white',
            border: 'none',
            padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            minHeight: '44px'
          }
        }, isMobile ? 'Clear' : 'Clear Completed'),

        React.createElement('button', {
          key: 'voice-btn',
          onClick: toggleVoiceListening,
          style: {
            background: isListening ? '#f97316' : '#6366f1',
            color: 'white',
            border: 'none',
            padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            minHeight: '44px'
          }
        }, [isListening ? '🛑 Stop' : '🎙️ Voice'])
      ])
    ]),

    React.createElement('div', {
      key: 'voice-status',
      style: {
        background: '#0f172a',
        borderRadius: '0.5rem',
        padding: '1rem',
        border: `1px solid ${isListening ? '#f97316' : '#334155'}`,
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }
    }, [
      React.createElement('div', {
        key: 'voice-info',
        style: { color: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.25rem' }
      }, [
        React.createElement('strong', {
          key: 'voice-title',
          style: { color: isListening ? '#f97316' : '#94a3b8' }
        }, isListening ? 'Listening for commands…' : 'Voice assistant idle'),
        voiceTranscript && React.createElement('span', {
          key: 'voice-transcript',
          style: { color: '#cbd5f5', fontSize: '0.875rem' }
        }, `Heard: ${voiceTranscript}`)
      ]),
      voiceError && React.createElement('span', {
        key: 'voice-error',
        style: {
          color: '#fecaca',
          background: '#7f1d1d',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem'
        }
      }, voiceError)
    ]),

    // Recipe Selector Panel
    showRecipeSelector && React.createElement('div', {
      key: 'recipe-selector',
      style: {
        background: '#1e293b',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        marginBottom: '1rem',
        border: '2px solid #6366f1'
      }
    }, [
      React.createElement('h3', {
        key: 'recipe-title',
        style: {
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#f1f5f9',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }
      }, ['🍳', 'Select Recipes to Add Ingredients']),
      
      React.createElement('div', {
        key: 'recipe-list',
        style: {
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: isMobile ? '0.75rem' : '1rem',
          marginBottom: '1rem'
        }
      }, 
        recipes.map(recipe =>
          React.createElement('div', {
            key: recipe.id,
            style: {
              background: selectedRecipes.includes(recipe.id) ? '#312e81' : '#0f172a',
              border: `2px solid ${selectedRecipes.includes(recipe.id) ? '#6366f1' : '#475569'}`,
              borderRadius: '0.5rem',
              padding: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            },
            onClick: () => toggleRecipeSelection(recipe.id)
          }, [
            React.createElement('div', {
              key: 'recipe-header',
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }
            }, [
              React.createElement('h4', {
                key: 'recipe-name',
                style: {
                  color: '#f1f5f9',
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }
              }, recipe.name),
              
              React.createElement('input', {
                key: 'recipe-checkbox',
                type: 'checkbox',
                checked: selectedRecipes.includes(recipe.id),
                onChange: () => {},
                style: {
                  width: '1.25rem',
                  height: '1.25rem',
                  cursor: 'pointer',
                  accentColor: '#6366f1'
                }
              })
            ]),
            
            React.createElement('div', {
              key: 'recipe-category',
              style: {
                color: '#94a3b8',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }
            }, recipe.category),
            
            React.createElement('div', {
              key: 'recipe-preview',
              style: {
                color: '#64748b',
                fontSize: '0.75rem',
                lineHeight: '1.4'
              }
            }, recipe.instructions.substring(0, 100) + '...')
          ])
        )
      ),
      
      React.createElement('div', {
        key: 'recipe-actions',
        style: {
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #334155',
          paddingTop: '1rem'
        }
      }, [
        React.createElement('span', {
          key: 'selection-count',
          style: {
            color: '#94a3b8',
            fontSize: '0.875rem'
          }
        }, `${selectedRecipes.length} recipe${selectedRecipes.length !== 1 ? 's' : ''} selected`),
        
        React.createElement('div', {
          key: 'action-buttons',
          style: { display: 'flex', gap: '0.5rem' }
        }, [
          React.createElement('button', {
            key: 'cancel-btn',
            onClick: () => {
              setShowRecipeSelector(false);
              setSelectedRecipes([]);
            },
            style: {
              background: '#64748b',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }
          }, 'Cancel'),
          
          React.createElement('button', {
            key: 'add-ingredients-btn',
            onClick: addMultipleRecipeIngredients,
            disabled: aiLoading || selectedRecipes.length === 0,
            style: {
              background: aiLoading || selectedRecipes.length === 0 ? '#475569' : '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: aiLoading || selectedRecipes.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }
          }, [aiLoading ? '⏳' : '🛒', aiLoading ? 'Processing...' : `Add Ingredients (${selectedRecipes.length})`])
        ])
      ]),

    // Template buttons
    React.createElement('div', {
      key: 'template-actions',
      style: {
        display: 'flex',
        gap: '0.75rem',
        marginTop: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    }, [
      React.createElement('button', {
        key: 'templates-btn',
        onClick: toggleTemplates,
        style: {
          background: showTemplates ? '#8b5cf6' : '#1f2937',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          fontSize: '0.875rem'
        }
      }, [showTemplates ? 'Hide Templates' : 'Show Templates']),
      
      React.createElement('button', {
        key: 'save-template-btn',
        onClick: handleSaveTemplate,
        disabled: items.length === 0,
        style: {
          background: items.length > 0 ? '#10b981' : '#6b7280',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          cursor: items.length > 0 ? 'pointer' : 'not-allowed',
          fontSize: '0.875rem'
        }
      }, ['Save Current List as Template'])
    ])
    ]),

    showTemplates && React.createElement('div', {
      key: 'templates-panel',
      style: {
        background: '#0f172a',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginTop: '1rem',
        border: '1px solid #334155'
      }
    }, [
      React.createElement('h3', {
        key: 'template-title',
        style: {
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#f1f5f9',
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }
      }, ['📦', 'Shopping List Templates']),

      React.createElement('div', {
        key: 'template-list',
        style: {
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: isMobile ? '0.75rem' : '1rem'
        }
      },
        templates.length > 0
          ? templates.map(template => React.createElement('div', {
              key: template.id,
              style: {
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }
            }, [
              React.createElement('div', {
                key: 'card-header',
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem'
                }
              }, [
                React.createElement('h4', {
                  key: 'template-name',
                  style: {
                    color: '#f8fafc',
                    margin: 0,
                    fontSize: '1rem'
                  }
                }, template.name),
                !template.isDefault && React.createElement('button', {
                  key: 'delete-template',
                  onClick: () => {
                    if (window.confirm('Delete this template?')) {
                      handleDeleteTemplate(template.id);
                    }
                  },
                  style: {
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }
                }, 'Delete')
              ]),
              React.createElement('p', {
                key: 'template-description',
                style: {
                  color: '#cbd5f5',
                  margin: 0,
                  fontSize: '0.875rem'
                }
              }, template.description || 'Custom template'),
              React.createElement('span', {
                key: 'template-count',
                style: {
                  color: '#94a3b8',
                  fontSize: '0.75rem'
                }
              }, `${template.items.length} items`),
              React.createElement('button', {
                key: 'apply-template',
                onClick: () => handleApplyTemplate(template.id),
                style: {
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }
              }, 'Apply Template')
            ]))
          : React.createElement('p', {
              key: 'no-templates',
              style: {
                color: '#94a3b8',
                margin: 0,
                fontSize: '0.875rem'
              }
            }, 'No templates available yet. Save your current list to build a template.')
      )
    ]),

    // Error message
    error && React.createElement('div', {
      key: 'error',
      style: {
        background: '#ef4444',
        color: 'white',
        padding: '1rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem'
      }
    }, [
      error,
      React.createElement('button', {
        key: 'dismiss-error',
        onClick: () => setError(null),
        style: {
          background: 'none',
          border: 'none',
          color: 'white',
          marginLeft: '1rem',
          cursor: 'pointer',
          fontSize: '1rem'
        }
      }, '×')
    ]),

    // Main content
    React.createElement('div', {
      key: 'content',
      style: {
        background: '#1e293b',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        border: '1px solid #334155'
      }
    }, [
      // Add new item form
      React.createElement('div', {
        key: 'add-item',
        style: { 
          display: 'flex', 
          gap: '0.75rem', 
          marginBottom: '1.5rem' 
        }
      }, [
        React.createElement('input', {
          key: 'item-input',
          type: 'text',
          value: newItemText,
          onChange: (e) => setNewItemText(e.target.value),
          placeholder: 'Add item to shopping list...',
          onKeyPress: (e) => {
            if (e.key === 'Enter') {
              addItem();
              e.currentTarget.blur();
            }
          },
          autoFocus: true,
          style: {
            flex: 1,
            padding: '0.75rem',
            border: '1px solid #475569',
            borderRadius: '0.375rem',
            background: '#0f172a',
            color: '#f1f5f9',
            fontSize: '1rem'
          }
        }),
        
        React.createElement('button', {
          key: 'add-btn',
          onClick: addItem,
          disabled: !newItemText.trim(),
          style: {
            background: newItemText.trim() ? '#10b981' : '#475569',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            cursor: newItemText.trim() ? 'pointer' : 'not-allowed',
            fontSize: '1rem'
          }
        }, 'Add')
      ]),

      // Shopping list items
      React.createElement('div', {
        key: 'items',
        style: { maxHeight: isMobile ? '60vh' : '500px', overflowY: 'auto' }
      }, 
        items.length > 0 
          ? items.map(item =>
              React.createElement('div', {
                key: item.id,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '0.5rem' : '0.75rem',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  background: item.is_checked ? '#0f172a' : 'transparent',
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem',
                  border: '1px solid #334155',
                  transition: 'background-color 0.2s'
                }
              }, [
                React.createElement('input', {
                  key: 'checkbox',
                  type: 'checkbox',
                  checked: item.is_checked,
                  onChange: () => toggleItem(item),
                  style: {
                    width: isMobile ? '1.5rem' : '1.25rem',
                    height: isMobile ? '1.5rem' : '1.25rem',
                    cursor: 'pointer',
                    accentColor: '#10b981',
                    minWidth: '24px',
                    minHeight: '24px'
                  }
                }),
                
                React.createElement('input', {
                  key: 'text',
                  type: 'text',
                  defaultValue: item.item_text,
                  onKeyDown: (e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  },
                  onBlur: (e) => {
                    const newText = e.currentTarget.value;
                    if (newText.trim() && newText !== item.item_text) {
                      updateItemText(item, newText);
                    } else if (!newText.trim()) {
                      e.currentTarget.value = item.item_text;
                    }
                  },
                  style: {
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: item.is_checked ? '#64748b' : '#f1f5f9',
                    fontSize: '1rem',
                    textDecoration: item.is_checked ? 'line-through' : 'none',
                    cursor: 'text',
                    padding: '0.25rem'
                  }
                }),
                
                React.createElement('button', {
                  key: 'delete',
                  onClick: () => deleteItem(item),
                  style: {
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '0.75rem' : '0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.8125rem' : '0.75rem',
                    opacity: 0.8,
                    transition: 'opacity 0.2s',
                    minWidth: '44px',
                    minHeight: '44px'
                  },
                  onMouseEnter: (e) => { e.currentTarget.style.opacity = '1'; },
                  onMouseLeave: (e) => { e.currentTarget.style.opacity = '0.8'; }
                }, isMobile ? '🗑️' : 'Delete')
              ])
            )
          : React.createElement('div', {
              key: 'empty',
              style: {
                textAlign: 'center',
                color: '#64748b',
                padding: '3rem'
              }
            }, [
              React.createElement('div', {
                key: 'empty-icon',
                style: { fontSize: '3rem', marginBottom: '1rem' }
              }, '🛒'),
              
              React.createElement('h3', {
                key: 'empty-title',
                style: { 
                  fontSize: '1.25rem', 
                  fontWeight: 'bold', 
                  marginBottom: '0.5rem', 
                  color: '#94a3b8' 
                }
              }, 'Your shopping list is empty'),
              
              React.createElement('p', {
                key: 'empty-desc',
                style: { color: '#64748b' }
              }, aiEnabled 
                ? 'Add items manually or select recipes to add ingredients automatically!'
                : 'Add items above to get started!'
              )
            ])
      ),

      // Stats
      items.length > 0 && React.createElement('div', {
        key: 'stats',
        style: {
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          color: '#64748b',
          fontSize: '0.875rem'
        }
      }, [
        React.createElement('span', {
          key: 'total'
        }, `${items.length} total items`),
        
        React.createElement('span', {
          key: 'completed'
        }, `${items.filter(item => item.is_checked).length} completed`)
      ])
    ])
  ]);
};