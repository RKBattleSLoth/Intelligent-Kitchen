const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all grocery lists for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT gl.id, gl.name, gl.meal_plan_id, gl.is_completed, gl.created_at, gl.updated_at,
              COUNT(gli.id) as total_items,
              SUM(CASE WHEN gli.is_purchased = true THEN 1 ELSE 0 END) as purchased_items
       FROM grocery_lists gl
       LEFT JOIN grocery_list_items gli ON gl.id = gli.grocery_list_id
       WHERE gl.user_id = $1
       GROUP BY gl.id
       ORDER BY gl.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get grocery lists error:', error);
    res.status(500).json({ error: 'Failed to get grocery lists' });
  }
});

// Get single grocery list with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const groceryListResult = await query(
      `SELECT gl.id, gl.name, gl.meal_plan_id, gl.is_completed, gl.created_at, gl.updated_at,
              mp.name as meal_plan_name
       FROM grocery_lists gl
       LEFT JOIN meal_plans mp ON gl.meal_plan_id = mp.id
       WHERE gl.id = $1 AND gl.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (groceryListResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    const groceryList = groceryListResult.rows[0];

    // Get grocery list items organized by aisle
    const itemsResult = await query(
      `SELECT id, name, quantity, unit, aisle, is_purchased, notes, created_at, updated_at
       FROM grocery_list_items
       WHERE grocery_list_id = $1
       ORDER BY aisle, name`,
      [req.params.id]
    );

    // Group items by aisle
    const itemsByAisle = {};
    itemsResult.rows.forEach(item => {
      if (!itemsByAisle[item.aisle]) {
        itemsByAisle[item.aisle] = [];
      }
      itemsByAisle[item.aisle].push(item);
    });

    groceryList.items = itemsResult.rows;
    groceryList.itemsByAisle = itemsByAisle;

    res.json(groceryList);
  } catch (error) {
    console.error('Get grocery list error:', error);
    res.status(500).json({ error: 'Failed to get grocery list' });
  }
});

// Create new grocery list
router.post('/', authenticateToken, [
  body('name').notEmpty().trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, mealPlanId } = req.body;

    // If mealPlanId is provided, check if it exists and belongs to user
    if (mealPlanId) {
      const mealPlanResult = await query(
        'SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2',
        [mealPlanId, req.user.id]
      );

      if (mealPlanResult.rows.length === 0) {
        return res.status(404).json({ error: 'Meal plan not found' });
      }
    }

    const result = await query(
      `INSERT INTO grocery_lists (user_id, name, meal_plan_id) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, meal_plan_id, is_completed, created_at, updated_at`,
      [req.user.id, name, mealPlanId]
    );

    res.status(201).json({
      message: 'Grocery list created successfully',
      groceryList: result.rows[0]
    });
  } catch (error) {
    console.error('Create grocery list error:', error);
    res.status(500).json({ error: 'Failed to create grocery list' });
  }
});

// Generate grocery list from meal plan
router.post('/generate/:mealPlanId', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    // Check if meal plan exists and belongs to user
    const mealPlanResult = await query(
      'SELECT id, name FROM meal_plans WHERE id = $1 AND user_id = $2',
      [req.params.mealPlanId, req.user.id]
    );

    if (mealPlanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const mealPlan = mealPlanResult.rows[0];

    const client = await require('../config/database').pool.connect();

    try {
      await client.query('BEGIN');

      // Create grocery list
      const groceryListResult = await client.query(
        `INSERT INTO grocery_lists (user_id, name, meal_plan_id) 
         VALUES ($1, $2, $3) 
         RETURNING id, name, meal_plan_id, is_completed, created_at, updated_at`,
        [req.user.id, name || `Grocery List for ${mealPlan.name}`, req.params.mealPlanId]
      );

      const groceryList = groceryListResult.rows[0];

      // Get all ingredients from meal plan recipes
      const ingredientsResult = await client.query(
        `SELECT DISTINCT ri.name, ri.quantity, ri.unit, ri.notes
         FROM meal_plan_entries mpe
         JOIN recipe_ingredients ri ON mpe.recipe_id = ri.recipe_id
         WHERE mpe.meal_plan_id = $1`,
        [req.params.mealPlanId]
      );

      // Get user's pantry items to exclude
      const pantryResult = await client.query(
        'SELECT name, quantity, unit FROM pantry_items WHERE user_id = $1',
        [req.user.id]
      );

      const pantryItems = pantryResult.rows;

      // Process ingredients and create grocery list items
      const groceryItems = [];
      const ingredientMap = new Map();

      // Aggregate ingredients by name and unit
      ingredientsResult.rows.forEach(ingredient => {
        const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.quantity += ingredient.quantity;
        } else {
          ingredientMap.set(key, { ...ingredient });
        }
      });

      // Create grocery list items, excluding items available in pantry
      for (const [key, ingredient] of ingredientMap) {
        // Check if item is available in pantry
        const pantryItem = pantryItems.find(item => 
          item.name.toLowerCase() === ingredient.name.toLowerCase() && 
          item.unit === ingredient.unit &&
          item.quantity >= ingredient.quantity
        );

        if (!pantryItem) {
          // Determine aisle based on item category
          const aisle = determineAisle(ingredient.name);

          const itemResult = await client.query(
            `INSERT INTO grocery_list_items (grocery_list_id, name, quantity, unit, aisle, notes) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, name, quantity, unit, aisle, is_purchased, notes, created_at, updated_at`,
            [groceryList.id, ingredient.name, ingredient.quantity, ingredient.unit, aisle, ingredient.notes]
          );

          groceryItems.push(itemResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Grocery list generated successfully',
        groceryList: {
          ...groceryList,
          items: groceryItems
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Generate grocery list error:', error);
    res.status(500).json({ error: 'Failed to generate grocery list' });
  }
});

// Update grocery list
router.put('/:id', authenticateToken, [
  body('name').optional().notEmpty().trim(),
  body('isCompleted').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, isCompleted } = req.body;

    const result = await query(
      `UPDATE grocery_lists 
       SET name = COALESCE($1, name), 
           is_completed = COALESCE($2, is_completed),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 AND user_id = $4 
       RETURNING id, name, meal_plan_id, is_completed, created_at, updated_at`,
      [name, isCompleted, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    res.json({
      message: 'Grocery list updated successfully',
      groceryList: result.rows[0]
    });
  } catch (error) {
    console.error('Update grocery list error:', error);
    res.status(500).json({ error: 'Failed to update grocery list' });
  }
});

// Delete grocery list
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM grocery_lists WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    res.json({ message: 'Grocery list deleted successfully' });
  } catch (error) {
    console.error('Delete grocery list error:', error);
    res.status(500).json({ error: 'Failed to delete grocery list' });
  }
});

// Add item to grocery list
router.post('/:id/items', authenticateToken, [
  body('name').notEmpty().trim(),
  body('quantity').isFloat({ min: 0 }),
  body('unit').isIn(['pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds', 'grams', 'kilograms', 'liters', 'milliliters']),
  body('aisle').optional().isIn(['produce', 'dairy', 'meat', 'bakery', 'frozen', 'canned', 'dry_goods', 'beverages', 'snacks', 'household', 'other']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, quantity, unit, aisle, notes } = req.body;

    // Check if grocery list exists and belongs to user
    const groceryListResult = await query(
      'SELECT id FROM grocery_lists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (groceryListResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    // Determine aisle if not provided
    const finalAisle = aisle || determineAisle(name);

    const result = await query(
      `INSERT INTO grocery_list_items (grocery_list_id, name, quantity, unit, aisle, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, quantity, unit, aisle, is_purchased, notes, created_at, updated_at`,
      [req.params.id, name, quantity, unit, finalAisle, notes]
    );

    res.status(201).json({
      message: 'Item added successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Add grocery item error:', error);
    res.status(500).json({ error: 'Failed to add item to grocery list' });
  }
});

// Update grocery list item
router.put('/items/:itemId', authenticateToken, [
  body('name').optional().notEmpty().trim(),
  body('quantity').optional().isFloat({ min: 0 }),
  body('unit').optional().isIn(['pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds', 'grams', 'kilograms', 'liters', 'milliliters']),
  body('aisle').optional().isIn(['produce', 'dairy', 'meat', 'bakery', 'frozen', 'canned', 'dry_goods', 'beverages', 'snacks', 'household', 'other']),
  body('isPurchased').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, quantity, unit, aisle, isPurchased, notes } = req.body;

    const result = await query(
      `UPDATE grocery_list_items 
       SET name = COALESCE($1, name), 
           quantity = COALESCE($2, quantity), 
           unit = COALESCE($3, unit), 
           aisle = COALESCE($4, aisle), 
           is_purchased = COALESCE($5, is_purchased),
           notes = COALESCE($6, notes),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 AND 
             grocery_list_id IN (SELECT id FROM grocery_lists WHERE user_id = $8) 
       RETURNING id, name, quantity, unit, aisle, is_purchased, notes, created_at, updated_at`,
      [name, quantity, unit, aisle, isPurchased, notes, req.params.itemId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grocery item not found' });
    }

    res.json({
      message: 'Item updated successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Update grocery item error:', error);
    res.status(500).json({ error: 'Failed to update grocery item' });
  }
});

// Delete grocery list item
router.delete('/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM grocery_list_items 
       WHERE id = $1 AND 
             grocery_list_id IN (SELECT id FROM grocery_lists WHERE user_id = $2) 
       RETURNING id`,
      [req.params.itemId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grocery item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete grocery item error:', error);
    res.status(500).json({ error: 'Failed to delete grocery item' });
  }
});

// Helper function to determine aisle based on item name
function determineAisle(itemName) {
  const name = itemName.toLowerCase();
  
  const aisleMap = {
    'produce': ['apple', 'banana', 'lettuce', 'tomato', 'carrot', 'onion', 'potato', 'vegetable', 'fruit', 'salad', 'spinach', 'broccoli'],
    'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese'],
    'meat': ['chicken', 'beef', 'pork', 'fish', 'turkey', 'sausage', 'bacon', 'steak'],
    'bakery': ['bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'tortilla'],
    'frozen': ['frozen', 'ice cream', 'pizza', 'waffle', 'pancake'],
    'canned': ['canned', 'soup', 'beans', 'corn', 'peas', 'tomato sauce'],
    'dry_goods': ['pasta', 'rice', 'flour', 'sugar', 'salt', 'pepper', 'spice', 'cereal', 'oatmeal'],
    'beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine'],
    'snacks': ['chips', 'cracker', 'cookie', 'nut', 'granola', 'popcorn'],
    'household': ['paper', 'cleaner', 'soap', 'detergent', 'foil', 'wrap']
  };

  for (const [aisle, keywords] of Object.entries(aisleMap)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return aisle;
    }
  }

  return 'other';
}

module.exports = router;