import React, { useState, useEffect } from 'react'
import { Recipe } from '../../types/recipe'
import { recipeService } from '../../services/recipeService'

interface RecipeViewModalProps {
  isOpen: boolean
  onClose: () => void
  recipe: Recipe | null
  isAIGenerated: boolean
  onSaveRecipe?: (recipe: Recipe) => void
  onReplaceMeal?: () => void
}

export const RecipeViewModal: React.FC<RecipeViewModalProps> = ({
  isOpen,
  onClose,
  recipe,
  isAIGenerated,
  onSaveRecipe,
  onReplaceMeal
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedRecipe, setEditedRecipe] = useState<Recipe | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Reset state when recipe changes
  useEffect(() => {
    setIsEditing(false)
    setEditedRecipe(null)
    setIsSaving(false)
  }, [recipe])

  if (!isOpen || !recipe) return null

  const handleEdit = () => {
    setEditedRecipe({ ...recipe })
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (editedRecipe && onSaveRecipe) {
      onSaveRecipe(editedRecipe)
    }
    setIsEditing(false)
    setEditedRecipe(null)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedRecipe(null)
  }

  const handleSaveToRecipes = async () => {
    if (!recipe) return
    
    setIsSaving(true)
    try {
      const recipeToSave = editedRecipe || recipe
      
      // Convert recipe to the format expected by the backend
      const savedRecipe = await recipeService.createRecipe({
        name: recipeToSave.name,
        category: recipeToSave.category,
        instructions: recipeToSave.instructions,
        ingredients: Array.isArray(recipeToSave.ingredients) 
          ? recipeToSave.ingredients.map(ing => 
              typeof ing === 'string' ? ing : `${ing.quantity || ''} ${ing.unit || ''} ${ing.name || ''}`.trim()
            ).filter(Boolean)
          : [],
        prepTime: recipeToSave.prepTime || 30,
        cookTime: recipeToSave.cookTime || 30,
        servings: 4,
        difficulty: 'easy',
        isPublic: false
      })
      
      alert('Recipe saved successfully!')
      onClose()
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('Failed to save recipe. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const currentRecipe = editedRecipe || recipe
  const displayIngredients = Array.isArray(currentRecipe.ingredients)
    ? currentRecipe.ingredients.map(ing => 
        typeof ing === 'string' ? ing : `${ing.quantity || ''} ${ing.unit || ''} ${ing.name || ''}`.trim()
      ).filter(Boolean)
    : []

  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }
  }, [
    React.createElement('div', {
      key: 'modal',
      style: {
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '0.5rem',
        padding: '2rem',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem'
        }
      }, [
        React.createElement('div', { key: 'title-section' }, [
          React.createElement('h2', {
            key: 'title',
            style: { fontSize: '1.5rem', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '0.5rem' }
          }, currentRecipe.name),
          React.createElement('div', {
            key: 'meta',
            style: { display: 'flex', gap: '1rem', alignItems: 'center' }
          }, [
            React.createElement('span', {
              key: 'category',
              style: {
                padding: '0.25rem 0.75rem',
                background: isAIGenerated ? '#10b981' : '#3b82f6',
                color: 'white',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }
            }, isAIGenerated ? '🤖 AI Generated' : '📖 Saved Recipe'),
            React.createElement('span', {
              key: 'timing',
              style: { color: '#94a3b8', fontSize: '0.875rem' }
            }, `⏱️ ${currentRecipe.prepTime || 30} min prep • ${currentRecipe.cookTime || 30} min cook`)
          ])
        ]),
        React.createElement('button', {
          key: 'close',
          onClick: onClose,
          style: {
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#94a3b8',
            padding: '0.25rem'
          }
        }, '×')
      ]),

      // Edit Mode vs View Mode
      isEditing ? [
        // Edit Form
        React.createElement('div', { key: 'edit-form' }, [
          React.createElement('div', {
            key: 'name-field',
            style: { marginBottom: '1rem' }
          }, [
            React.createElement('label', {
              key: 'label',
              style: { display: 'block', marginBottom: '0.5rem', color: '#f1f5f9', fontWeight: 'bold' }
            }, 'Recipe Name:'),
            React.createElement('input', {
              key: 'input',
              type: 'text',
              value: editedRecipe?.name || '',
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => 
                setEditedRecipe(prev => prev ? { ...prev, name: e.target.value } : null),
              style: {
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #4b5563',
                borderRadius: '0.375rem',
                background: '#0f172a',
                color: '#f1f5f9'
              }
            })
          ]),
          React.createElement('div', {
            key: 'instructions-field',
            style: { marginBottom: '1rem' }
          }, [
            React.createElement('label', {
              key: 'label',
              style: { display: 'block', marginBottom: '0.5rem', color: '#f1f5f9', fontWeight: 'bold' }
            }, 'Instructions:'),
            React.createElement('textarea', {
              key: 'textarea',
              value: editedRecipe?.instructions || '',
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => 
                setEditedRecipe(prev => prev ? { ...prev, instructions: e.target.value } : null),
              rows: 6,
              style: {
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #4b5563',
                borderRadius: '0.375rem',
                background: '#0f172a',
                color: '#f1f5f9',
                resize: 'vertical'
              }
            })
          ]),
          React.createElement('div', {
            key: 'ingredients-field',
            style: { marginBottom: '1rem' }
          }, [
            React.createElement('label', {
              key: 'label',
              style: { display: 'block', marginBottom: '0.5rem', color: '#f1f5f9', fontWeight: 'bold' }
            }, 'Ingredients (one per line):'),
            React.createElement('textarea', {
              key: 'textarea',
              value: displayIngredients.join('\n'),
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => 
                setEditedRecipe(prev => prev ? { 
                  ...prev, 
                  ingredients: e.target.value.split('\n').filter(line => line.trim())
                } : null),
              rows: 8,
              placeholder: 'Enter ingredients, one per line',
              style: {
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #4b5563',
                borderRadius: '0.375rem',
                background: '#0f172a',
                color: '#f1f5f9',
                resize: 'vertical'
              }
            })
          ])
        ])
      ] : [
        // View Mode
        React.createElement('div', { key: 'view-content' }, [
          // Ingredients
          React.createElement('div', {
            key: 'ingredients',
            style: { marginBottom: '1.5rem' }
          }, [
            React.createElement('h3', {
              key: 'title',
              style: { fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f1f5f9' }
            }, '🥘 Ingredients'),
            React.createElement('ul', {
              key: 'list',
              style: {
                listStyle: 'none',
                padding: 0,
                margin: 0
              }
            }, displayIngredients.length > 0 
              ? displayIngredients.map((ingredient, index) => 
                  React.createElement('li', {
                    key: index,
                    style: {
                      padding: '0.5rem 0',
                      borderBottom: '1px solid #334155',
                      color: '#e2e8f0'
                    }
                  }, `• ${ingredient}`)
                )
              : React.createElement('li', {
                  style: { color: '#94a3b8', fontStyle: 'italic' }
                }, 'No ingredients listed')
            )
          ]),

          // Instructions
          React.createElement('div', {
            key: 'instructions',
            style: { marginBottom: '1.5rem' }
          }, [
            React.createElement('h3', {
              key: 'title',
              style: { fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f1f5f9' }
            }, '📝 Instructions'),
            React.createElement('div', {
              key: 'content',
              style: {
                lineHeight: '1.6',
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap'
              }
            }, currentRecipe.instructions || 'No instructions provided')
          ])
        ])
      ],

      // Action Buttons
      React.createElement('div', {
        key: 'actions',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #334155'
        }
      }, [
        React.createElement('div', { key: 'left-buttons' }, [
          isAIGenerated && React.createElement('button', {
            key: 'save-to-recipes',
            onClick: handleSaveToRecipes,
            disabled: isSaving,
            style: {
              padding: '0.75rem 1.5rem',
              background: '#10b981',
              color: 'white',
              border: '1px solid #059669',
              borderRadius: '0.375rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginRight: '0.75rem',
              opacity: isSaving ? 0.7 : 1
            }
          }, isSaving ? 'Saving...' : '💾 Save to Recipes')
        ]),
        React.createElement('div', { key: 'right-buttons' }, [
          isEditing ? [
            React.createElement('button', {
              key: 'cancel-edit',
              onClick: handleCancelEdit,
              style: {
                padding: '0.75rem 1.5rem',
                background: '#374151',
                color: '#f1f5f9',
                border: '1px solid #4b5563',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                marginRight: '0.75rem'
              }
            }, 'Cancel'),
            React.createElement('button', {
              key: 'save-edit',
              onClick: handleSaveEdit,
              style: {
                padding: '0.75rem 1.5rem',
                background: '#3b82f6',
                color: 'white',
                border: '1px solid #2563eb',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }
            }, 'Save Changes')
          ] : [
            React.createElement('button', {
              key: 'change-meal',
              onClick: onReplaceMeal,
              style: {
                padding: '0.75rem 1.5rem',
                background: '#374151',
                color: '#f1f5f9',
                border: '1px solid #4b5563',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                marginRight: '0.75rem'
              }
            }, '🔄 Change Recipe'),
            React.createElement('button', {
              key: 'edit',
              onClick: handleEdit,
              style: {
                padding: '0.75rem 1.5rem',
                background: '#f59e0b',
                color: 'white',
                border: '1px solid #d97706',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }
            }, '✏️ Edit')
          ]
        ])
      ])
    ])
  ])
}
