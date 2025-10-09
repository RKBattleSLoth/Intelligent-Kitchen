import React, { useState, useEffect } from 'react'
import { Recipe, RecipeCategory } from '../../types/recipe'
import { recipeService } from '../../services/recipeService'

interface RecipeListProps {
  onEdit: (recipe: Recipe) => void
  onAdd: () => void
}

const CATEGORIES: RecipeCategory[] = ['Dinner', 'Lunch', 'Breakfast', 'Snack', 'Dessert', 'Beverage']

const CATEGORY_COLORS: Record<RecipeCategory, string> = {
  Dinner: '#ef4444',
  Lunch: '#f59e0b',
  Breakfast: '#10b981',
  Snack: '#8b5cf6',
  Dessert: '#ec4899',
  Beverage: '#06b6d4'
}

export function RecipeList({ onEdit, onAdd }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'All'>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecipes()
  }, [])

  useEffect(() => {
    filterRecipes()
  }, [recipes, selectedCategory, searchTerm])

  const loadRecipes = async () => {
    try {
      const recipeList = await recipeService.getAllRecipes()
      setRecipes(recipeList)
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterRecipes = () => {
    let filtered = recipes

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(recipe => recipe.category === selectedCategory)
    }

    if (searchTerm) {
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.instructions.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredRecipes(filtered)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return

    try {
      await recipeService.deleteRecipe(id)
      await loadRecipes()
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Error deleting recipe')
    }
  }

  const getCategoryColor = (category: RecipeCategory) => CATEGORY_COLORS[category]

  if (loading) {
    return React.createElement('div', {
      style: { textAlign: 'center', padding: '2rem' }
    }, 'Loading recipes...')
  }

  return React.createElement('div', null, [
    // Header with search and filters
    React.createElement('div', {
      key: 'header',
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }
    }, [
      React.createElement('h2', {
        key: 'title',
        style: { fontSize: '1.5rem', fontWeight: 'bold', color: '#f1f5f9' }
      }, `Recipes (${filteredRecipes.length})`),
      
      React.createElement('button', {
        key: 'add-btn',
        onClick: onAdd,
        style: {
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          cursor: 'pointer'
        }
      }, '+ Add Recipe')
    ]),

    // Search and filters
    React.createElement('div', {
      key: 'filters',
      style: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }
    }, [
      React.createElement('input', {
        key: 'search',
        type: 'text',
        placeholder: 'Search recipes...',
        value: searchTerm,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value),
        style: {
          flex: 1,
          minWidth: '200px',
          padding: '0.75rem',
          border: '1px solid #4b5563',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          background: '#1f2937',
          color: '#f9fafb'
        }
      }),
      
      React.createElement('select', {
        key: 'category-filter',
        value: selectedCategory,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value as RecipeCategory | 'All'),
        style: {
          padding: '0.75rem',
          border: '1px solid #4b5563',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          background: '#1f2937',
          color: '#f9fafb'
        }
      }, ['All', ...CATEGORIES].map(category => 
        React.createElement('option', { key: category, value: category }, category)
      ))
    ]),

    // Recipe grid
    React.createElement('div', {
      key: 'recipe-grid',
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem'
      }
    }, 
      filteredRecipes.length === 0 
        ? React.createElement('div', {
            key: 'empty',
            style: {
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '3rem',
              background: '#1e293b',
              borderRadius: '0.5rem',
              border: '1px solid #334155'
            }
          }, [
            React.createElement('div', { key: 'icon', style: { fontSize: '3rem', marginBottom: '1rem' } }, '📖'),
            React.createElement('h3', { key: 'empty-title', style: { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#f1f5f9' } }, 'No recipes found'),
            React.createElement('p', { key: 'empty-desc', style: { color: '#94a3b8', marginBottom: '1rem' } }, 
              searchTerm || selectedCategory !== 'All' 
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first recipe'
            ),
            !searchTerm && selectedCategory === 'All' && React.createElement('button', {
              key: 'add-first',
              onClick: onAdd,
              style: {
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                cursor: 'pointer'
              }
            }, '+ Add Your First Recipe')
          ])
        : filteredRecipes.map(recipe => 
            React.createElement('div', {
              key: recipe.id,
              style: {
                background: '#1e293b',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                border: '1px solid #334155',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }
            }, [
              // Recipe header
              React.createElement('div', {
                key: 'recipe-header',
                style: {
                  padding: '1rem',
                  borderBottom: '1px solid #334155'
                }
              }, [
                React.createElement('div', {
                  key: 'category-badge',
                  style: {
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    background: getCategoryColor(recipe.category),
                    color: 'white',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem'
                  }
                }, recipe.category),
                React.createElement('h3', {
                  key: 'recipe-name',
                  style: {
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem',
                    color: '#f1f5f9'
                  }
                }, recipe.name)
              ]),

              // Recipe preview
              React.createElement('div', {
                key: 'recipe-preview',
                style: {
                  padding: '1rem',
                  maxHeight: '150px',
                  overflow: 'hidden'
                }
              }, [
                React.createElement('p', {
                  key: 'preview-text',
                  style: {
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }
                }, recipe.instructions.substring(0, 200) + (recipe.instructions.length > 200 ? '...' : ''))
              ]),

              // Actions
              React.createElement('div', {
                key: 'actions',
                style: {
                  padding: '1rem',
                  borderTop: '1px solid #334155',
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end'
                }
              }, [
                React.createElement('button', {
                  key: 'edit-btn',
                  onClick: () => onEdit(recipe),
                  style: {
                    padding: '0.5rem 1rem',
                    background: '#374151',
                    color: '#f1f5f9',
                    border: '1px solid #4b5563',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }
                }, 'Edit'),
                React.createElement('button', {
                  key: 'delete-btn',
                  onClick: () => handleDelete(recipe.id),
                  style: {
                    padding: '0.5rem 1rem',
                    background: '#7f1d1d',
                    color: '#fca5a5',
                    border: '1px solid #991b1b',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }
                }, 'Delete')
              ])
            ])
          )
    )
  ])
}