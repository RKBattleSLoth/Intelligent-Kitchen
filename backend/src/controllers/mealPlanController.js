const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all meal plans for user
router.get('/', async (req, res) => {
  try {
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';
    
    const result = await query(
      `SELECT mp.id, mp.name, mp.start_date, mp.end_date, mp.notes, mp.created_at, mp.updated_at,
              COUNT(mpe.id) as total_meals
       FROM meal_plans mp
       LEFT JOIN meal_plan_entries mpe ON mp.id = mpe.meal_plan_id
       WHERE mp.user_id = $1
       GROUP BY mp.id
       ORDER BY mp.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ error: 'Failed to get meal plans' });
  }
});

// Get single meal plan with entries
router.get('/:id', async (req, res) => {
  try {
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';
    
    const mealPlanResult = await query(
      'SELECT id, name, start_date, end_date, notes, created_at, updated_at FROM meal_plans WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );

    if (mealPlanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const mealPlan = mealPlanResult.rows[0];

    // Get meal plan entries
    const entriesResult = await query(
      `SELECT mpe.id, mpe.meal_date, mpe.meal_type, mpe.notes, mpe.created_at, mpe.updated_at,
              r.id as recipe_id, r.name as recipe_name, r.description as recipe_description,
              r.prep_time, r.cook_time, r.servings, r.difficulty,
              n.calories, n.protein, n.carbohydrates, n.fat
       FROM meal_plan_entries mpe
       LEFT JOIN recipes r ON mpe.recipe_id = r.id
       LEFT JOIN nutrition_info n ON r.id = n.recipe_id
       WHERE mpe.meal_plan_id = $1
       ORDER BY mpe.meal_date, mpe.meal_type`,
      [req.params.id]
    );

    mealPlan.entries = entriesResult.rows;

    res.json(mealPlan);
  } catch (error) {
    console.error('Get meal plan error:', error);
    res.status(500).json({ error: 'Failed to get meal plan' });
  }
});

// Create new meal plan
router.post('/', [
  body('name').notEmpty().trim(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, startDate, endDate, notes } = req.body;
    
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';

    // Create dates at noon local time to avoid timezone issues
    const localStartDate = new Date(startDate + 'T12:00:00');
    const localEndDate = new Date(endDate + 'T12:00:00');

    // Validate date range
    if (localStartDate > localEndDate) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    const result = await query(
      `INSERT INTO meal_plans (user_id, name, start_date, end_date, notes) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, start_date, end_date, notes, created_at, updated_at`,
      [userId, name, localStartDate, localEndDate, notes]
    );

    res.status(201).json({
      message: 'Meal plan created successfully',
      mealPlan: result.rows[0]
    });
  } catch (error) {
    console.error('Create meal plan error:', error);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
});

// Update meal plan
router.put('/:id', [
  body('name').optional().notEmpty().trim(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, startDate, endDate, notes } = req.body;
    
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';

    // Check if meal plan exists and belongs to user
    const existingMealPlan = await query(
      'SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );

    if (existingMealPlan.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Validate date range if both dates are provided
    if (startDate && endDate) {
      const localStartDate = new Date(startDate + 'T12:00:00');
      const localEndDate = new Date(endDate + 'T12:00:00');
      if (localStartDate > localEndDate) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }
    }

    // Convert dates to local time if provided
    const localStartDate = startDate ? new Date(startDate + 'T12:00:00') : null;
    const localEndDate = endDate ? new Date(endDate + 'T12:00:00') : null;

    const result = await query(
      `UPDATE meal_plans 
       SET name = COALESCE($1, name), 
           start_date = COALESCE($2, start_date), 
           end_date = COALESCE($3, end_date), 
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 AND user_id = $6 
       RETURNING id, name, start_date, end_date, notes, created_at, updated_at`,
      [name, localStartDate, localEndDate, notes, req.params.id, userId]
    );

    res.json({
      message: 'Meal plan updated successfully',
      mealPlan: result.rows[0]
    });
  } catch (error) {
    console.error('Update meal plan error:', error);
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
});

// Delete meal plan
router.delete('/:id', async (req, res) => {
  try {
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';
    
    const result = await query(
      'DELETE FROM meal_plans WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Delete meal plan error:', error);
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

// Add meal entry to meal plan
router.post('/:id/entries', [
  body('mealDate').isISO8601(),
  body('mealType').isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { mealDate, mealType, recipeId, notes } = req.body;
    
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';

    // Create date at noon local time to avoid timezone issues
    const localDate = new Date(mealDate + 'T12:00:00');

    // Check if meal plan exists and belongs to user
    const mealPlanResult = await query(
      'SELECT id, start_date, end_date FROM meal_plans WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );

    if (mealPlanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const mealPlan = mealPlanResult.rows[0];

    // Validate that meal date is within meal plan date range
    const startDateObj = new Date(mealPlan.start_date);
    const endDateObj = new Date(mealPlan.end_date);

    if (localDate < startDateObj || localDate > endDateObj) {
      return res.status(400).json({ error: 'Meal date must be within meal plan date range' });
    }

    // Check if recipe exists and belongs to user or is public
    if (recipeId) {
      const recipeResult = await query(
        'SELECT id FROM recipes WHERE id = $1 AND (user_id = $2 OR is_public = true)',
        [recipeId, userId]
      );

      if (recipeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
    }

    // Check if entry already exists for this date and meal type
    const existingEntry = await query(
      'SELECT id FROM meal_plan_entries WHERE meal_plan_id = $1 AND meal_date = $2 AND meal_type = $3',
      [req.params.id, localDate, mealType]
    );

    if (existingEntry.rows.length > 0) {
      return res.status(409).json({ error: 'Meal entry already exists for this date and meal type' });
    }

    const result = await query(
      `INSERT INTO meal_plan_entries (meal_plan_id, recipe_id, meal_date, meal_type, notes) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, meal_plan_id, recipe_id, meal_date, meal_type, notes, created_at, updated_at`,
      [req.params.id, recipeId, localDate, mealType, notes]
    );

    res.status(201).json({
      message: 'Meal entry added successfully',
      entry: result.rows[0]
    });
  } catch (error) {
    console.error('Add meal entry error:', error);
    res.status(500).json({ error: 'Failed to add meal entry' });
  }
});

// Update meal entry
router.put('/entries/:entryId', [
  body('mealType').optional().isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { mealDate, mealType, recipeId, notes } = req.body;
    
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';

    // Check if entry exists and belongs to user's meal plan
    const entryResult = await query(
      `SELECT mpe.id, mp.user_id, mp.start_date, mp.end_date 
       FROM meal_plan_entries mpe
       JOIN meal_plans mp ON mpe.meal_plan_id = mp.id
       WHERE mpe.id = $1 AND mp.user_id = $2`,
      [req.params.entryId, userId]
    );

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meal entry not found' });
    }

    const entry = entryResult.rows[0];

    // Validate meal date if provided
    if (mealDate) {
      const mealDateObj = new Date(mealDate);
      const startDateObj = new Date(entry.start_date);
      const endDateObj = new Date(entry.end_date);

      if (mealDateObj < startDateObj || mealDateObj > endDateObj) {
        return res.status(400).json({ error: 'Meal date must be within meal plan date range' });
      }
    }

    // Check if recipe exists and belongs to user or is public
    if (recipeId) {
      const recipeResult = await query(
        'SELECT id FROM recipes WHERE id = $1 AND (user_id = $2 OR is_public = true)',
        [recipeId, userId]
      );

      if (recipeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
    }

    const result = await query(
      `UPDATE meal_plan_entries 
       SET recipe_id = COALESCE($1, recipe_id), 
           meal_date = COALESCE($2, meal_date), 
           meal_type = COALESCE($3, meal_type), 
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING id, meal_plan_id, recipe_id, meal_date, meal_type, notes, created_at, updated_at`,
      [recipeId, mealDate, mealType, notes, req.params.entryId]
    );

    res.json({
      message: 'Meal entry updated successfully',
      entry: result.rows[0]
    });
  } catch (error) {
    console.error('Update meal entry error:', error);
    res.status(500).json({ error: 'Failed to update meal entry' });
  }
});

// Delete meal entry
router.delete('/entries/:entryId', async (req, res) => {
  try {
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';
    const result = await query(
      `DELETE FROM meal_plan_entries 
       WHERE id = $1 AND 
             meal_plan_id IN (SELECT id FROM meal_plans WHERE user_id = $2) 
       RETURNING id`,
      [req.params.entryId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal entry not found' });
    }

    res.json({ message: 'Meal entry deleted successfully' });
  } catch (error) {
    console.error('Delete meal entry error:', error);
    res.status(500).json({ error: 'Failed to delete meal entry' });
  }
});

// Get meal plan for a specific date range
router.get('/range/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    // MVP: Use hardcoded user ID instead of authentication
    const userId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';

    // Create dates at noon local time to avoid timezone issues
    const localStartDate = new Date(startDate + 'T12:00:00');
    const localEndDate = new Date(endDate + 'T12:00:00');

    const result = await query(
      `SELECT mpe.id, mpe.meal_date, mpe.meal_type, mpe.notes,
              r.id as recipe_id, r.name as recipe_name, r.description as recipe_description,
              r.prep_time, r.cook_time, r.servings, r.difficulty,
              n.calories, n.protein, n.carbohydrates, n.fat,
              mp.id as meal_plan_id, mp.name as meal_plan_name
       FROM meal_plan_entries mpe
       JOIN meal_plans mp ON mpe.meal_plan_id = mp.id
       LEFT JOIN recipes r ON mpe.recipe_id = r.id
       LEFT JOIN nutrition_info n ON r.id = n.recipe_id
       WHERE mp.user_id = $1 AND mpe.meal_date BETWEEN $2 AND $3
       ORDER BY mpe.meal_date, mpe.meal_type`,
      [userId, localStartDate, localEndDate]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get meal plan range error:', error);
    res.status(500).json({ error: 'Failed to get meal plan range' });
  }
});

module.exports = router;