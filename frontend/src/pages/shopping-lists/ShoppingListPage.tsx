import React, { useState, useEffect } from 'react';
import { shoppingListService, ShoppingList, ShoppingListItem } from '../../services/shoppingListService';

interface ShoppingListPageProps {}

export const ShoppingListPage: React.FC<ShoppingListPageProps> = () => {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [currentList, setCurrentList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    loadShoppingLists();
  }, []);

  const loadShoppingLists = async () => {
    try {
      setLoading(true);
      const lists = await shoppingListService.getShoppingLists();
      setShoppingLists(lists);
      
      // Load the first list if available
      if (lists.length > 0 && !currentList) {
        const listWithItems = await shoppingListService.getShoppingList(lists[0].id);
        setCurrentList(listWithItems);
      }
    } catch (err) {
      setError('Failed to load shopping lists');
      console.error('Error loading shopping lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadShoppingList = async (listId: string) => {
    try {
      const list = await shoppingListService.getShoppingList(listId);
      setCurrentList(list);
    } catch (err) {
      setError('Failed to load shopping list');
      console.error('Error loading shopping list:', err);
    }
  };

  const createShoppingList = async () => {
    if (!newListName.trim()) return;
    
    try {
      const newList = await shoppingListService.createShoppingList(newListName);
      setShoppingLists([newList, ...shoppingLists]);
      setNewListName('');
      setIsCreatingList(false);
      await loadShoppingList(newList.id);
    } catch (err) {
      setError('Failed to create shopping list');
      console.error('Error creating shopping list:', err);
    }
  };

  const addShoppingListItem = async () => {
    if (!newItemText.trim() || !currentList) return;
    
    try {
      const newItem = await shoppingListService.addShoppingListItem(currentList.id, newItemText);
      setCurrentList({
        ...currentList,
        items: [...(currentList.items || []), newItem]
      });
      setNewItemText('');
    } catch (err) {
      setError('Failed to add item');
      console.error('Error adding item:', err);
    }
  };

  const toggleItemChecked = async (item: ShoppingListItem) => {
    if (!currentList) return;
    
    try {
      const updatedItem = await shoppingListService.updateShoppingListItem(
        currentList.id, 
        item.id, 
        { is_checked: !item.is_checked }
      );
      
      setCurrentList({
        ...currentList,
        items: currentList.items?.map(i => i.id === item.id ? updatedItem : i)
      });
    } catch (err) {
      setError('Failed to update item');
      console.error('Error updating item:', err);
    }
  };

  const deleteShoppingListItem = async (item: ShoppingListItem) => {
    if (!currentList) return;
    
    try {
      await shoppingListService.deleteShoppingListItem(currentList.id, item.id);
      setCurrentList({
        ...currentList,
        items: currentList.items?.filter(i => i.id !== item.id)
      });
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error deleting item:', err);
    }
  };

  const updateItemText = async (item: ShoppingListItem, newText: string) => {
    if (!currentList || !newText.trim()) return;
    
    try {
      const updatedItem = await shoppingListService.updateShoppingListItem(
        currentList.id, 
        item.id, 
        { item_text: newText }
      );
      
      setCurrentList({
        ...currentList,
        items: currentList.items?.map(i => i.id === item.id ? updatedItem : i)
      });
    } catch (err) {
      setError('Failed to update item');
      console.error('Error updating item:', err);
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
    }, 'Loading shopping lists...');
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
      }, '🛒 Shopping Lists'),
      
      React.createElement('button', {
        key: 'create-btn',
        onClick: () => setIsCreatingList(true),
        style: {
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: '500'
        }
      }, '+ New List')
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
    }, error),

    // Create new list form
    isCreatingList && React.createElement('div', {
      key: 'create-form',
      style: {
        background: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        marginBottom: '2rem',
        border: '1px solid #334155'
      }
    }, [
      React.createElement('h3', {
        key: 'create-title',
        style: { 
          fontSize: '1.25rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem', 
          color: '#f1f5f9' 
        }
      }, 'Create New Shopping List'),
      
      React.createElement('div', {
        key: 'create-inputs',
        style: { display: 'flex', gap: '1rem' }
      }, [
        React.createElement('input', {
          key: 'name-input',
          type: 'text',
          value: newListName,
          onChange: (e) => setNewListName(e.target.value),
          placeholder: 'List name...',
          onKeyPress: (e) => e.key === 'Enter' && createShoppingList(),
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
          key: 'save-btn',
          onClick: createShoppingList,
          disabled: !newListName.trim(),
          style: {
            background: newListName.trim() ? '#10b981' : '#475569',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            cursor: newListName.trim() ? 'pointer' : 'not-allowed',
            fontSize: '1rem'
          }
        }, 'Create'),
        
        React.createElement('button', {
          key: 'cancel-btn',
          onClick: () => {
            setIsCreatingList(false);
            setNewListName('');
          },
          style: {
            background: '#64748b',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '1rem'
          }
        }, 'Cancel')
      ])
    ]),

    // Main content
    React.createElement('div', {
      key: 'content',
      style: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }
    }, [
      // Sidebar with list of shopping lists
      React.createElement('div', {
        key: 'sidebar',
        style: {
          background: '#1e293b',
          borderRadius: '0.5rem',
          padding: '1rem',
          border: '1px solid #334155',
          height: 'fit-content'
        }
      }, [
        React.createElement('h3', {
          key: 'sidebar-title',
          style: { 
            fontSize: '1.125rem', 
            fontWeight: 'bold', 
            marginBottom: '1rem', 
            color: '#f1f5f9' 
          }
        }, 'My Lists'),
        
        ...shoppingLists.map(list =>
          React.createElement('div', {
            key: list.id,
            onClick: () => loadShoppingList(list.id),
            style: {
              padding: '0.75rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              background: currentList?.id === list.id ? '#3b82f6' : 'transparent',
              color: currentList?.id === list.id ? 'white' : '#94a3b8',
              marginBottom: '0.5rem',
              transition: 'background-color 0.2s'
            }
          }, list.name)
        )
      ]),

      // Main shopping list content
      currentList ? React.createElement('div', {
        key: 'main-content',
        style: {
          background: '#1e293b',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          border: '1px solid #334155'
        }
      }, [
        // List header
        React.createElement('div', {
          key: 'list-header',
          style: { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem' 
          }
        }, [
          React.createElement('h2', {
            key: 'list-title',
            style: { 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: '#f1f5f9',
              margin: 0
            }
          }, currentList.name),
          
          React.createElement('div', {
            key: 'list-stats',
            style: { color: '#94a3b8', fontSize: '0.875rem' }
          }, `${currentList.items?.length || 0} items`)
        ]),

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
            placeholder: 'Add item to list...',
            onKeyPress: (e) => e.key === 'Enter' && addShoppingListItem(),
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
            onClick: addShoppingListItem,
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
          style: { maxHeight: '400px', overflowY: 'auto' }
        }, 
          currentList.items && currentList.items.length > 0 
            ? currentList.items.map(item =>
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
                    border: '1px solid #334155'
                  }
                }, [
                  React.createElement('input', {
                    key: 'checkbox',
                    type: 'checkbox',
                    checked: item.is_checked,
                    onChange: () => toggleItemChecked(item),
                    style: {
                      width: '1.25rem',
                      height: '1.25rem',
                      cursor: 'pointer'
                    }
                  }),
                  
                  React.createElement('input', {
                    key: 'text',
                    type: 'text',
                    value: item.item_text,
                    onChange: (e) => updateItemText(item, e.target.value),
                    style: {
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: item.is_checked ? '#64748b' : '#f1f5f9',
                      fontSize: '1rem',
                      textDecoration: item.is_checked ? 'line-through' : 'none',
                      cursor: 'text'
                    }
                  }),
                  
                  React.createElement('button', {
                    key: 'delete',
                    onClick: () => deleteShoppingListItem(item),
                    style: {
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }
                  }, 'Delete')
                ])
              )
            : React.createElement('div', {
                key: 'empty',
                style: {
                  textAlign: 'center',
                  color: '#64748b',
                  padding: '2rem'
                }
              }, 'No items in this list yet. Add your first item above!')
        )
      ]) : React.createElement('div', {
        key: 'no-list',
        style: {
          background: '#1e293b',
          borderRadius: '0.5rem',
          padding: '3rem',
          border: '1px solid #334155',
          textAlign: 'center'
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
            color: '#f1f5f9' 
          }
        }, 'No Shopping List Selected'),
        
        React.createElement('p', {
          key: 'empty-desc',
          style: { color: '#94a3b8' }
        }, shoppingLists.length > 0 
          ? 'Select a list from the sidebar or create a new one to get started.'
          : 'Create your first shopping list to get started.')
      ])
    ])
  ]);
};