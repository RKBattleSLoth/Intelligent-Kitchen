const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, pool } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all recipes (public and user's private recipes)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { mealType, difficulty, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT r.id, r.name, r.description, r.prep_time, r.cook_time, r.servings, r.difficulty, r.meal_type, r.is_public, r.created_at,
             u.first_name || ' ' || u.last_name as author_name,
             n.calories, n.protein, n.carbohydrates, n.fat
      FROM recipes r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN nutrition_info n ON r.id = n.recipe_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // If user is authenticated, show their private recipes too
    if (req.user) {
      sql += ` AND (r.is_public = true OR r.user_id = $${paramIndex})`;
      params.push(req.user.id);
      paramIndex++;
    } else {
      sql += ` AND r.is_public = true`;
    }
    
    if (mealType) {
      sql += ` AND r.meal_type = $${paramIndex}`;
      params.push(mealType);
      paramIndex++;
    }
    
    if (difficulty) {
      sql += ` AND r.difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }
    
    if (search) {
      sql += ` AND (r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    sql += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);
    
    const result = await query(sql, params);
    
    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM recipes r
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamIndex = 1;
    
    if (req.user) {
      countSql += ` AND (r.is_public = true OR r.user_id = $${countParamIndex})`;
      countParams.push(req.user.id);
      countParamIndex++;
    } else {
      countSql += ` AND r.is_public = true`;
    }
    
    if (mealType) {
      countSql += ` AND r.meal_type = $${countParamIndex}`;
      countParams.push(mealType);
      countParamIndex++;
    }
    
    if (difficulty) {
      countSql += ` AND r.difficulty = $${countParamIndex}`;
      countParams.push(difficulty);
      countParamIndex++;
    }
    
    if (search) {
      countSql += ` AND (r.name ILIKE $${countParamIndex} OR r.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      recipes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Failed to get recipes' });
  }
});

// Get single recipe with ingredients
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const recipeResult = await query(
      `SELECT r.id, r.name, r.description, r.instructions, r.prep_time, r.cook_time, r.servings, r.difficulty, r.meal_type, r.is_public, r.created_at,
              u.first_name || ' ' || u.last_name as author_name,
              n.calories, n.protein, n.carbohydrates, n.fat, n.fiber, n.sugar, n.sodium
       FROM recipes r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN nutrition_info n ON r.id = n.recipe_id
       WHERE r.id = $1 AND (r.is_public = true OR r.user_id = $2)`,
      [req.params.id, req.user?.id || null]
    );

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipe = recipeResult.rows[0];

    // Get ingredients
    const ingredientsResult = await query(
      'SELECT id, name, quantity, unit, notes FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY id',
      [req.params.id]
    );

    recipe.ingredients = ingredientsResult.rows;

    res.json(recipe);
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Failed to get recipe' });
  }
});

// Create new recipe
router.post('/', [
  // Temporarily disable authentication for MVP testing
  // authenticateToken, 
  body('name').notEmpty().trim(),
  body('instructions').notEmpty().trim(),
  body('servings').isInt({ min: 1 }),
  body('mealType').optional().isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, description, instructions, prepTime, cookTime, servings, mealType, difficulty, isPublic, ingredients, nutrition } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create recipe with hardcoded user ID for MVP testing
      const recipeResult = await client.query(
        `INSERT INTO recipes (user_id, name, description, instructions, prep_time, cook_time, servings, meal_type, difficulty, is_public) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         RETURNING id, name, description, instructions, prep_time, cook_time, servings, meal_type, difficulty, is_public, created_at`,
        ['2d4969fe-fedb-4c37-89e2-75eaf6ad61a3', name, description, instructions, prepTime, cookTime, servings, mealType, difficulty, isPublic || false]
      );

      const recipe = recipeResult.rows[0];

      // Add ingredients
      if (ingredients && ingredients.length > 0) {
        for (const ingredient of ingredients) {
          await client.query(
            'INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, notes) VALUES ($1, $2, $3, $4, $5)',
            [recipe.id, ingredient.name, ingredient.quantity, ingredient.unit, ingredient.notes]
          );
        }
      }

      // Add nutrition information
      if (nutrition) {
        await client.query(
          `INSERT INTO nutrition_info (recipe_id, calories, protein, carbohydrates, fat, fiber, sugar, sodium) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [recipe.id, nutrition.calories, nutrition.protein, nutrition.carbohydrates, nutrition.fat, nutrition.fiber, nutrition.sugar, nutrition.sodium]
        );
      }

      await client.query('COMMIT');

      // Get the complete recipe with ingredients
      const completeRecipe = await query(
        `SELECT r.*, u.first_name || ' ' || u.last_name as author_name,
                n.calories, n.protein, n.carbohydrates, n.fat, n.fiber, n.sugar, n.sodium
         FROM recipes r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN nutrition_info n ON r.id = n.recipe_id
         WHERE r.id = $1`,
        [recipe.id]
      );

      const ingredientsResult = await query(
        'SELECT id, name, quantity, unit, notes FROM recipe_ingredients WHERE recipe_id = $1',
        [recipe.id]
      );

      const completeRecipeData = completeRecipe.rows[0];
      completeRecipeData.ingredients = ingredientsResult.rows;

      res.status(201).json({
        message: 'Recipe created successfully',
        recipe: completeRecipeData
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create recipe error:', error);
    if (error.code === '22P02') {
      // Invalid enum value error
      res.status(400).json({ error: 'Invalid unit of measure. Please use valid units like: pieces, cups, tablespoons, teaspoons, grams, kilograms, ounces, pounds, milliliters, liters' });
    } else if (error.code === '23514') {
      // Constraint violation
      res.status(400).json({ error: 'Invalid data provided. Please check all required fields.' });
    } else {
      res.status(500).json({ error: 'Failed to create recipe: ' + error.message });
    }
  }
});

// Update recipe
router.put('/:id', [ // Temporarily disable authentication for MVP testing
  body('name').optional().notEmpty().trim(),
  body('instructions').optional().notEmpty().trim(),
  body('servings').optional().isInt({ min: 1 }),
  body('mealType').optional().isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, description, instructions, prepTime, cookTime, servings, mealType, difficulty, isPublic, ingredients, nutrition } = req.body;

    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';
    const existingRecipe = await query(
      'SELECT id FROM recipes WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );

    if (existingRecipe.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update recipe
      const recipeResult = await client.query(
        `UPDATE recipes 
         SET name = COALESCE($1, name), 
             description = COALESCE($2, description), 
             instructions = COALESCE($3, instructions), 
             prep_time = COALESCE($4, prep_time), 
             cook_time = COALESCE($5, cook_time), 
             servings = COALESCE($6, servings), 
             meal_type = COALESCE($7, meal_type), 
             difficulty = COALESCE($8, difficulty), 
             is_public = COALESCE($9, is_public),
             updated_at = CURRENT_TIMESTAMP 
          WHERE id = $10 AND user_id = $11 
          RETURNING id, name, description, instructions, prep_time, cook_time, servings, meal_type, difficulty, is_public, created_at`,
        [name, description, instructions, prepTime, cookTime, servings, mealType, difficulty, isPublic, req.params.id, userId]
      );

      // Update ingredients if provided
      if (ingredients) {
        // Delete existing ingredients
        await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [req.params.id]);

        // Add new ingredients
        for (const ingredient of ingredients) {
          await client.query(
            'INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, notes) VALUES ($1, $2, $3, $4, $5)',
            [req.params.id, ingredient.name, ingredient.quantity, ingredient.unit, ingredient.notes]
          );
        }
      }

      // Update nutrition if provided
      if (nutrition) {
        await client.query(
          `UPDATE nutrition_info 
           SET calories = $1, protein = $2, carbohydrates = $3, fat = $4, fiber = $5, sugar = $6, sodium = $7,
               updated_at = CURRENT_TIMESTAMP 
           WHERE recipe_id = $8`,
          [nutrition.calories, nutrition.protein, nutrition.carbohydrates, nutrition.fat, nutrition.fiber, nutrition.sugar, nutrition.sodium, req.params.id]
        );
      }

      await client.query('COMMIT');

      // Get the updated recipe with ingredients
      const completeRecipe = await query(
        `SELECT r.*, u.first_name || ' ' || u.last_name as author_name,
                n.calories, n.protein, n.carbohydrates, n.fat, n.fiber, n.sugar, n.sodium
         FROM recipes r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN nutrition_info n ON r.id = n.recipe_id
         WHERE r.id = $1`,
        [req.params.id]
      );

      const ingredientsResult = await query(
        'SELECT id, name, quantity, unit, notes FROM recipe_ingredients WHERE recipe_id = $1',
        [req.params.id]
      );

      const completeRecipeData = completeRecipe.rows[0];
      completeRecipeData.ingredients = ingredientsResult.rows;

      res.json({
        message: 'Recipe updated successfully',
        recipe: completeRecipeData
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Delete recipe
router.delete('/:id', async (req, res) => { // Temporarily disable authentication for MVP testing
  try {
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';
    const result = await query(
      'DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Get user's recipes
router.get('/user/my-recipes', async (req, res) => { // Temporarily disable authentication for MVP testing
  try {
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT r.id, r.name, r.description, r.prep_time, r.cook_time, r.servings, r.difficulty, r.meal_type, r.is_public, r.created_at,
              n.calories, n.protein, n.carbohydrates, n.fat
       FROM recipes r
       LEFT JOIN nutrition_info n ON r.id = n.recipe_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM recipes WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      recipes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user recipes error:', error);
    res.status(500).json({ error: 'Failed to get user recipes' });
  }
});

module.exports = router;