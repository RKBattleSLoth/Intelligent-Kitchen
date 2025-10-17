import React, { useState, useEffect } from 'react';
import { shoppingListService, ShoppingListItem } from '../../services/shoppingListService';
import { aiService, IngredientExtractionResult } from '../../services/aiService';
import { recipeService, Recipe } from '../../services/recipeService';

interface ShoppingListPageProps {}

export const ShoppingListPage: React.FC<ShoppingListPageProps> = () => {
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

  // Load shopping list and recipes on component mount
  useEffect(() => {
    loadShoppingList();
    loadRecipes();
    checkAIStatus();
  }, []);

  const loadShoppingList = async () => {
    try {
      setLoading(true);
      setError(null);
      const listItems = await shoppingListService.getShoppingListItems();
      setItems(listItems);
    } catch (err) {
      setError('Failed to load shopping list');
      console.error('Error loading shopping list:', err);
    } finally {
      setLoading(false);
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
      
      const parseResult = recipeService.parseInstructions(recipe.instructions);
      const highConfidence = parseResult.confidence >= 0.5 && parseResult.items.length > 0;

      const response: IngredientExtractionResult = await aiService.extractIngredientsFromRecipe({
        id: recipe.id,
        name: recipe.name,
        instructions: recipe.instructions,
        parsedIngredients: highConfidence ? parseResult.items : undefined,
        parseConfidence: parseResult.confidence
      });

      const ingredientsToAdd = response.success && response.ingredients.length > 0
        ? response.ingredients
        : parseResult.items.map(item => ({
            name: item.name,
            quantity: item.quantityValue ?? item.quantity ?? null,
            amount: item.quantity ?? null,
            unit: item.unit ?? null,
            category: item.category ?? 'other',
            preparation: item.preparation ?? null,
            notes: item.notes ?? null
          }));

      if (!ingredientsToAdd.length) {
        setError(response.error || 'No ingredients found in recipe');
        return;
      }

      const newItems: ShoppingListItem[] = [];
      for (const ingredient of ingredientsToAdd) {
        const quantityText = typeof ingredient.amount === 'string'
          ? ingredient.amount
          : (ingredient.quantity !== null && ingredient.quantity !== undefined
              ? ingredient.quantity.toString()
              : null);
        const formatted = [quantityText, ingredient.unit, ingredient.name]
          .filter(Boolean)
          .join(' ')
          .trim();

        try {
      const newItem = await shoppingListService.addShoppingListItem({
        text: formatted || ingredient.name,
        quantity: quantityText,
        unit: ingredient.unit || null,
        name: ingredient.name || null
      });
          newItems.push(newItem);
        } catch (err) {
          console.error('Failed to add ingredient:', err);
        }
      }

      setItems([...items, ...newItems]);
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
      
      for (const recipeId of selectedRecipes) {
        await addRecipeIngredients(recipeId);
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
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }
    }, [
      React.createElement('div', {
        key: 'title-section',
        style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
      }, [
        React.createElement('h1', {
          key: 'title',
          style: { 
            fontSize: '2rem', 
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
            fontSize: '0.875rem',
            color: aiEnabled ? '#10b981' : '#f59e0b'
          }
        }, [
          React.createElement('span', { key: 'ai-dot' }, aiEnabled ? '🤖' : '⚠️'),
          React.createElement('span', { key: 'ai-text' }, 
            aiEnabled 
              ? 'AI Recipe Integration Available' 
              : `AI ${aiStatus === 'checking' ? 'initializing...' : 'unavailable'}`)
        ])
      ]),
      
      React.createElement('div', {
        key: 'header-buttons',
        style: { display: 'flex', gap: '0.5rem' }
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
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: aiEnabled ? 'pointer' : 'not-allowed',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            opacity: aiEnabled ? 1 : 0.6
          }
        }, ['🍳', showRecipeSelector ? 'Hide Recipes' : 'Add Recipe Ingredients']),
        
        // Mark All As Complete Button
        items.length > 0 && items.some(item => !item.is_checked) && React.createElement('button', {
          key: 'mark-all-btn',
          onClick: markAllAsComplete,
          style: {
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }
        }, ['✓', 'Mark All Complete']),
        
        // Copy All Button
        items.length > 0 && React.createElement('button', {
          key: 'copy-all-btn',
          onClick: copyAllItems,
          style: {
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }
        }, ['📋', 'Copy All']),
        
        // Clear Completed Button
        items.some(item => item.is_checked) && React.createElement('button', {
          key: 'clear-btn',
          onClick: clearCompleted,
          style: {
            background: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }
        }, 'Clear Completed')
      ])
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem',
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
      ])
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
          onKeyPress: (e) => e.key === 'Enter' && addItem(),
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
        style: { maxHeight: '500px', overflowY: 'auto' }
      }, 
        items.length > 0 
          ? items.map(item =>
              React.createElement('div', {
                key: item.id,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
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
                    width: '1.25rem',
                    height: '1.25rem',
                    cursor: 'pointer',
                    accentColor: '#10b981'
                  }
                }),
                
                React.createElement('input', {
                  key: 'text',
                  type: 'text',
                  value: item.item_text,
                  onChange: (e) => updateItemText(item, e.target.value),
                  onBlur: (e) => {
                    if (!e.target.value.trim()) {
                      // Revert to original if empty
                      e.target.value = item.item_text;
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
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    opacity: 0.8,
                    transition: 'opacity 0.2s'
                  },
                  onMouseEnter: (e) => { e.currentTarget.style.opacity = '1'; },
                  onMouseLeave: (e) => { e.currentTarget.style.opacity = '0.8'; }
                }, 'Delete')
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