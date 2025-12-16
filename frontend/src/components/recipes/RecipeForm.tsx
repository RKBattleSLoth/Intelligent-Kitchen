import React, { useState, useEffect } from 'react'
import { Recipe, RecipeFormData, RecipeCategory } from '../../types/recipe'
import { recipeService } from '../../services/recipeService'

interface RecipeFormProps {
  recipe?: Recipe
  onSave: (recipe: Recipe) => void
  onCancel: () => void
  defaultCategory?: RecipeCategory
}

const CATEGORIES: RecipeCategory[] = ['Dinner', 'Lunch', 'Breakfast', 'Snack', 'Dessert', 'Beverage']

export function RecipeForm({ recipe, onSave, onCancel, defaultCategory }: RecipeFormProps) {
  const [formData, setFormData] = useState<RecipeFormData>({
    name: '',
    category: defaultCategory || 'Dinner',
    instructions: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        category: recipe.category,
        instructions: recipe.instructions
      })
    } else {
      const storedName = sessionStorage.getItem('newRecipeName')
      if (storedName) {
        sessionStorage.removeItem('newRecipeName')
        setFormData(prev => ({
          ...prev,
          name: storedName,
          category: defaultCategory || 'Dinner'
        }))
      } else if (defaultCategory) {
        setFormData(prev => ({
          ...prev,
          category: defaultCategory
        }))
      }
    }
  }, [recipe, defaultCategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.instructions.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      let savedRecipe: Recipe
      if (recipe) {
        savedRecipe = await recipeService.updateRecipe(recipe.id, formData)!
      } else {
        savedRecipe = await recipeService.createRecipe(formData)
      }
      onSave(savedRecipe)
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('Error saving recipe')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return React.createElement('form', {
    onSubmit: handleSubmit,
    style: {
      background: '#ffffff',
      padding: '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      maxWidth: '600px'
    }
  }, [
    React.createElement('h2', {
      key: 'title',
      style: { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1a1a1a', fontFamily: "'Playfair Display', Georgia, serif" }
    }, recipe ? 'Edit Recipe' : 'Add New Recipe'),

    // Name field
    React.createElement('div', {
      key: 'name-group',
      style: { marginBottom: '1.5rem' }
    }, [
       React.createElement('label', {
         key: 'name-label',
         htmlFor: 'name',
         style: {
           display: 'block',
           fontSize: '0.875rem',
           fontWeight: '500',
           color: '#1a1a1a',
           marginBottom: '0.5rem'
         }
       }, 'Recipe Name *'),
       React.createElement('input', {
         key: 'name-input',
         type: 'text',
         id: 'name',
         name: 'name',
         value: formData.name,
         onChange: handleChange,
         placeholder: 'Enter recipe name',
         required: true,
         style: {
           width: '100%',
           padding: '0.75rem',
           border: '1px solid #d1d5db',
           borderRadius: '0.375rem',
           fontSize: '1rem',
           background: '#ffffff',
           color: '#1a1a1a'
         }
       })
    ]),

    // Category field
    React.createElement('div', {
      key: 'category-group',
      style: { marginBottom: '1.5rem' }
    }, [
       React.createElement('label', {
         key: 'category-label',
         htmlFor: 'category',
         style: {
           display: 'block',
           fontSize: '0.875rem',
           fontWeight: '500',
           color: '#1a1a1a',
           marginBottom: '0.5rem'
         }
       }, 'Category *'),
       React.createElement('select', {
         key: 'category-select',
         id: 'category',
         name: 'category',
         value: formData.category,
         onChange: handleChange,
         required: true,
         style: {
           width: '100%',
           padding: '0.75rem',
           border: '1px solid #d1d5db',
           borderRadius: '0.375rem',
           fontSize: '1rem',
           background: '#ffffff',
           color: '#1a1a1a'
         }
       }, CATEGORIES.map(category => 
         React.createElement('option', {
           key: category,
           value: category
         }, category)
       ))
    ]),

    // Instructions field
    React.createElement('div', {
      key: 'instructions-group',
      style: { marginBottom: '1.5rem' }
    }, [
       React.createElement('label', {
         key: 'instructions-label',
         htmlFor: 'instructions',
         style: {
           display: 'block',
           fontSize: '0.875rem',
           fontWeight: '500',
           color: '#1a1a1a',
           marginBottom: '0.5rem'
         }
       }, 'Ingredients & Instructions *'),
       React.createElement('textarea', {
         key: 'instructions-input',
         id: 'instructions',
         name: 'instructions',
         value: formData.instructions,
         onChange: handleChange,
         placeholder: 'Start with "Ingredients:" followed by your ingredients list, then "Instructions:" with step-by-step instructions.\n\nExample:\nIngredients: 2 cups flour, 1 cup sugar, 3 eggs\n\nInstructions: 1. Mix flour and sugar. 2. Beat eggs. 3. Combine all ingredients...',
         required: true,
         rows: 10,
         style: {
           width: '100%',
           padding: '0.75rem',
           border: '1px solid #d1d5db',
           borderRadius: '0.375rem',
           fontSize: '1rem',
           fontFamily: 'inherit',
           resize: 'vertical',
           background: '#ffffff',
           color: '#1a1a1a'
         }
       })
    ]),

    // Action buttons
    React.createElement('div', {
      key: 'actions',
      style: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end'
      }
    }, [
       React.createElement('button', {
         key: 'cancel',
         type: 'button',
         onClick: onCancel,
         disabled: isSubmitting,
         style: {
           padding: '0.75rem 1.5rem',
           border: '1px solid #d1d5db',
           borderRadius: '0.375rem',
           fontSize: '1rem',
           cursor: isSubmitting ? 'not-allowed' : 'pointer',
           opacity: isSubmitting ? 0.5 : 1,
           background: '#f3f4f6',
           color: '#1a1a1a'
         }
       }, 'Cancel'),
      React.createElement('button', {
        key: 'submit',
        type: 'submit',
        disabled: isSubmitting,
        style: {
          padding: '0.75rem 1.5rem',
          background: '#0fc7b9',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.5 : 1
        }
      }, isSubmitting ? 'Saving...' : (recipe ? 'Update Recipe' : 'Add Recipe'))
    ])
  ])
}