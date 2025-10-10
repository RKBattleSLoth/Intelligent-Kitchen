const { query } = require('../config/database');
const { body, validationResult } = require('express-validator');

// Get all shopping lists for a user
const getShoppingLists = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      'SELECT * FROM shopping_lists WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching shopping lists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shopping lists'
    });
  }
};

// Get a single shopping list with its items
const getShoppingList = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get the shopping list
    const listResult = await query(
      'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (listResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list not found'
      });
    }
    
    // Get the items for this list
    const itemsResult = await query(
      'SELECT * FROM shopping_list_items WHERE shopping_list_id = $1 ORDER BY position ASC, created_at ASC',
      [id]
    );
    
    const shoppingList = {
      ...listResult.rows[0],
      items: itemsResult.rows
    };
    
    res.json({
      success: true,
      data: shoppingList
    });
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shopping list'
    });
  }
};

// Create a new shopping list
const createShoppingList = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { name } = req.body;
    const userId = req.user.id;
    
    const result = await query(
      'INSERT INTO shopping_lists (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name || 'Shopping List']
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating shopping list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create shopping list'
    });
  }
};

// Update a shopping list
const updateShoppingList = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { id } = req.params;
    const { name, is_completed } = req.body;
    const userId = req.user.id;
    
    const result = await query(
      'UPDATE shopping_lists SET name = COALESCE($1, name), is_completed = COALESCE($2, is_completed), updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, is_completed, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating shopping list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shopping list'
    });
  }
};

// Delete a shopping list
const deleteShoppingList = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await query(
      'DELETE FROM shopping_lists WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Shopping list deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shopping list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete shopping list'
    });
  }
};

// Add an item to a shopping list
const addShoppingListItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { id } = req.params;
    const { item_text } = req.body;
    const userId = req.user.id;
    
    // Verify the shopping list belongs to the user
    const listCheck = await query(
      'SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (listCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list not found'
      });
    }
    
    // Get the next position
    const positionResult = await query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM shopping_list_items WHERE shopping_list_id = $1',
      [id]
    );
    
    const nextPosition = positionResult.rows[0].next_position;
    
    const result = await query(
      'INSERT INTO shopping_list_items (shopping_list_id, item_text, position) VALUES ($1, $2, $3) RETURNING *',
      [id, item_text, nextPosition]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding shopping list item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add shopping list item'
    });
  }
};

// Update a shopping list item
const updateShoppingListItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { listId, itemId } = req.params;
    const { item_text, is_checked } = req.body;
    const userId = req.user.id;
    
    // Verify the shopping list belongs to the user
    const listCheck = await query(
      'SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [listId, userId]
    );
    
    if (listCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list not found'
      });
    }
    
    const result = await query(
      'UPDATE shopping_list_items SET item_text = COALESCE($1, item_text), is_checked = COALESCE($2, is_checked), updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND shopping_list_id = $4 RETURNING *',
      [item_text, is_checked, itemId, listId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list item not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating shopping list item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shopping list item'
    });
  }
};

// Delete a shopping list item
const deleteShoppingListItem = async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const userId = req.user.id;
    
    // Verify the shopping list belongs to the user
    const listCheck = await query(
      'SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [listId, userId]
    );
    
    if (listCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list not found'
      });
    }
    
    const result = await query(
      'DELETE FROM shopping_list_items WHERE id = $1 AND shopping_list_id = $2 RETURNING *',
      [itemId, listId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Shopping list item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shopping list item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete shopping list item'
    });
  }
};

// Reorder shopping list items
const reorderShoppingListItems = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { id } = req.params;
    const { itemIds } = req.body; // Array of item IDs in new order
    const userId = req.user.id;
    
    // Verify the shopping list belongs to the user
    const listCheck = await query(
      'SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (listCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list not found'
      });
    }
    
    // Update positions in a transaction
    await query('BEGIN');
    
    try {
      for (let i = 0; i < itemIds.length; i++) {
        await query(
          'UPDATE shopping_list_items SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND shopping_list_id = $3',
          [i + 1, itemIds[i], id]
        );
      }
      
      await query('COMMIT');
      
      res.json({
        success: true,
        message: 'Shopping list items reordered successfully'
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error reordering shopping list items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder shopping list items'
    });
  }
};

module.exports = {
  getShoppingLists,
  getShoppingList,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  reorderShoppingListItems,
  
  // Validation rules
  validateCreateShoppingList: [
    body('name').optional().isLength({ min: 1, max: 255 }).trim().escape()
  ],
  
  validateUpdateShoppingList: [
    body('name').optional().isLength({ min: 1, max: 255 }).trim().escape(),
    body('is_completed').optional().isBoolean()
  ],
  
  validateAddShoppingListItem: [
    body('item_text').isLength({ min: 1, max: 500 }).trim().escape()
  ],
  
  validateUpdateShoppingListItem: [
    body('item_text').optional().isLength({ min: 1, max: 500 }).trim().escape(),
    body('is_checked').optional().isBoolean()
  ],
  
  validateReorderItems: [
    body('itemIds').isArray({ min: 1 }),
    body('itemIds.*').isUUID()
  ]
};