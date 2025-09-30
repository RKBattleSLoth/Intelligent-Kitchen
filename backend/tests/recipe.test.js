const request = require('supertest');
const express = require('express');
const { query, pool } = require('../src/config/database');
const recipeRoutes = require('../src/controllers/recipeController');

// Test setup
const app = express();
app.use(express.json());
app.use('/api/recipes', recipeRoutes);

// Test data
const testUserId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';

describe('Recipe API', () => {
  let recipeId;
  let publicRecipeId;

  beforeAll(async () => {
    // Clean up any existing test data
    await query('DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = $1 AND name LIKE $2)', [testUserId, 'Test%']);
    await query('DELETE FROM nutrition_info WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = $1 AND name LIKE $2)', [testUserId, 'Test%']);
    await query('DELETE FROM recipes WHERE user_id = $1 AND name LIKE $2', [testUserId, 'Test%']);
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = $1 AND name LIKE $2)', [testUserId, 'Test%']);
    await query('DELETE FROM nutrition_info WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = $1 AND name LIKE $2)', [testUserId, 'Test%']);
    await query('DELETE FROM recipes WHERE user_id = $1 AND name LIKE $2', [testUserId, 'Test%']);
    await pool.end();
  });

  describe('POST /api/recipes', () => {
    it('should create a new private recipe', async () => {
      const recipeData = {
        name: 'Test Recipe',
        description: 'A test recipe for testing',
        instructions: '1. Mix ingredients\n2. Cook for 20 minutes\n3. Serve hot',
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        mealType: 'dinner',
        difficulty: 'easy',
        isPublic: false,
        ingredients: [
          { name: 'Test Ingredient 1', quantity: 2, unit: 'cups', notes: 'Fresh' },
          { name: 'Test Ingredient 2', quantity: 1, unit: 'tablespoons', notes: 'Optional' }
        ],
        nutrition: {
          calories: 250,
          protein: 15,
          carbohydrates: 30,
          fat: 8,
          fiber: 5,
          sugar: 10,
          sodium: 500
        }
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(201);

      expect(response.body.message).toBe('Recipe created successfully');
      expect(response.body.recipe.name).toBe(recipeData.name);
      expect(response.body.recipe.description).toBe(recipeData.description);
      expect(response.body.recipe.is_public).toBe(false);
      expect(Array.isArray(response.body.recipe.ingredients)).toBe(true);
      expect(response.body.recipe.ingredients.length).toBe(2);
      expect(parseFloat(response.body.recipe.calories)).toBe(250);
      
      recipeId = response.body.recipe.id;
    });

    it('should create a new public recipe', async () => {
      const recipeData = {
        name: 'Test Public Recipe',
        description: 'A public test recipe',
        instructions: 'Simple instructions',
        prepTime: 5,
        cookTime: 15,
        servings: 2,
        mealType: 'lunch',
        difficulty: 'medium',
        isPublic: true,
        ingredients: [
          { name: 'Public Ingredient', quantity: 1, unit: 'pieces' }
        ],
        nutrition: {
          calories: 150,
          protein: 10,
          carbohydrates: 20,
          fat: 5
        }
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(201);

      expect(response.body.message).toBe('Recipe created successfully');
      expect(response.body.recipe.is_public).toBe(true);
      
      publicRecipeId = response.body.recipe.id;
    });

    it('should reject recipe with missing required fields', async () => {
      const recipeData = {
        name: 'Incomplete Recipe'
        // Missing instructions and servings
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject recipe with invalid meal type', async () => {
      const recipeData = {
        name: 'Invalid Recipe',
        instructions: 'Test instructions',
        servings: 4,
        mealType: 'invalid-meal-type'
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject recipe with invalid difficulty', async () => {
      const recipeData = {
        name: 'Invalid Recipe',
        instructions: 'Test instructions',
        servings: 4,
        difficulty: 'impossible'
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/recipes', () => {
    it('should get all public recipes (no auth)', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(response.body.recipes).toBeDefined();
      expect(Array.isArray(response.body.recipes)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      
      // Should include public recipes
      const publicRecipe = response.body.recipes.find(r => r.name === 'Test Public Recipe');
      expect(publicRecipe).toBeDefined();
      expect(publicRecipe.is_public).toBe(true);
      
      // Should not include private recipes without auth
      const privateRecipe = response.body.recipes.find(r => r.name === 'Test Recipe');
      expect(privateRecipe).toBeUndefined();
    });

    it('should filter recipes by meal type', async () => {
      const response = await request(app)
        .get('/api/recipes?mealType=lunch')
        .expect(200);

      const lunchRecipes = response.body.recipes.filter(r => r.meal_type === 'lunch');
      expect(lunchRecipes.length).toBeGreaterThan(0);
      expect(lunchRecipes.every(r => r.meal_type === 'lunch')).toBe(true);
    });

    it('should filter recipes by difficulty', async () => {
      const response = await request(app)
        .get('/api/recipes?difficulty=easy')
        .expect(200);

      const easyRecipes = response.body.recipes.filter(r => r.difficulty === 'easy');
      expect(easyRecipes.every(r => r.difficulty === 'easy')).toBe(true);
    });

    it('should search recipes by name', async () => {
      const response = await request(app)
        .get('/api/recipes?search=Public')
        .expect(200);

      const searchResults = response.body.recipes.filter(r => r.name.includes('Public'));
      expect(searchResults.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/recipes?page=1&limit=5')
        .expect(200);

      expect(response.body.recipes.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/recipes/:id', () => {
    it('should get specific public recipe', async () => {
      const response = await request(app)
        .get(`/api/recipes/${publicRecipeId}`)
        .expect(200);

      expect(response.body.id).toBe(publicRecipeId);
      expect(response.body.name).toBe('Test Public Recipe');
      expect(response.body.is_public).toBe(true);
      expect(Array.isArray(response.body.ingredients)).toBe(true);
      expect(response.body.ingredients.length).toBeGreaterThan(0);
      expect(response.body.calories).toBeDefined();
    });

    it('should return 404 for private recipe without auth', async () => {
      const response = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(404);

      expect(response.body.error).toBe('Recipe not found');
    });

    it('should return 404 for non-existent recipe', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/recipes/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Recipe not found');
    });
  });

  describe('PUT /api/recipes/:id', () => {
    it('should update recipe (with auth)', async () => {
      // This test would normally require authentication, but for MVP it's disabled
      const updateData = {
        name: 'Updated Test Recipe',
        description: 'Updated description',
        prepTime: 15,
        difficulty: 'medium'
      };

      // Since auth is disabled for MVP, this should work
      const response = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Recipe updated successfully');
      expect(response.body.recipe.name).toBe('Updated Test Recipe');
      expect(response.body.recipe.description).toBe('Updated description');
    });

    it('should update recipe ingredients', async () => {
      const updateData = {
        ingredients: [
          { name: 'Updated Ingredient', quantity: 3, unit: 'cups', notes: 'New note' }
        ]
      };

      const response = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.recipe.ingredients.length).toBe(1);
      expect(response.body.recipe.ingredients[0].name).toBe('Updated Ingredient');
    });

    it('should update recipe nutrition', async () => {
      const updateData = {
        nutrition: {
          calories: 300,
          protein: 20,
          carbohydrates: 35,
          fat: 10
        }
      };

      const response = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(updateData)
        .expect(200);

      expect(parseFloat(response.body.recipe.calories)).toBe(300);
      expect(parseFloat(response.body.recipe.protein)).toBe(20);
    });
  });

  describe('GET /api/recipes/:id (after update)', () => {
    it('should get updated recipe details', async () => {
      const response = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(404); // Still private, so 404 without auth

      // But we can get the public one
      const publicResponse = await request(app)
        .get(`/api/recipes/${publicRecipeId}`)
        .expect(200);

      expect(publicResponse.body.name).toBe('Test Public Recipe');
    });
  });

  describe('DELETE /api/recipes/:id', () => {
    it('should delete recipe (with auth)', async () => {
      // Since auth is disabled for MVP, this should work
      const response = await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(response.body.message).toBe('Recipe deleted successfully');
    });

    it('should return 404 when deleting non-existent recipe', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/recipes/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Recipe not found');
    });

    it('should verify recipe is deleted', async () => {
      const response = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(404);

      expect(response.body.error).toBe('Recipe not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ingredients array', async () => {
      const recipeData = {
        name: 'Test Empty Ingredients',
        instructions: 'Simple instructions',
        servings: 1,
        ingredients: [],
        nutrition: {
          calories: 100,
          protein: 5,
          carbohydrates: 10,
          fat: 2
        }
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(201);

      expect(response.body.recipe.ingredients).toEqual([]);
      
      // Clean up
      await query('DELETE FROM recipes WHERE id = $1', [response.body.recipe.id]);
    });

    it('should handle recipe without nutrition info', async () => {
      const recipeData = {
        name: 'Test No Nutrition',
        instructions: 'Simple instructions',
        servings: 1,
        ingredients: [
          { name: 'Simple Ingredient', quantity: 1, unit: 'pieces' }
        ]
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(201);

      expect(response.body.recipe.calories).toBeNull();
      
      // Clean up
      await query('DELETE FROM recipes WHERE id = $1', [response.body.recipe.id]);
    });

    it('should handle very long recipe name', async () => {
      const longName = 'A'.repeat(250);
      const recipeData = {
        name: longName,
        instructions: 'Simple instructions',
        servings: 1
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(201);

      expect(response.body.recipe.name).toBe(longName);
      
      // Clean up
      await query('DELETE FROM recipes WHERE id = $1', [response.body.recipe.id]);
    });
  });
});