import React, { useState, useEffect } from 'react';
import { shoppingListService, ShoppingListItem } from '../../services/shoppingListService';

interface ShoppingListPageProps {}

export const ShoppingListPage: React.FC<ShoppingListPageProps> = () => {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  // Load shopping list on component mount
  useEffect(() => {
    loadShoppingList();
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
      React.createElement('h1', {
        key: 'title',
        style: { 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          color: '#f1f5f9',
          margin: 0
        }
      }, '🛒 Shopping List'),
      
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
              }, 'Add items above to get started!')
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