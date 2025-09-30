const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all pantry items for user
router.get('/', async (req, res) => {
  try {
    const { category, sortBy, sortOrder } = req.query;
    
    let sql = `
      SELECT id, name, quantity, unit, purchase_date, expiration_date, barcode, category, notes, created_at, updated_at
      FROM pantry_items 
      WHERE user_id = $1
    `;
    
    const params = ['2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']; // Admin user ID for MVP
    let paramIndex = 2;
    
    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    // Sorting
    const validSortColumns = ['name', 'quantity', 'expiration_date', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    sql += ` ORDER BY ${sortColumn} ${order}`;
    
    const result = await query(sql, params);
    
    // Check for items expiring soon (within 3 days)
    const expiringSoon = await query(
      `SELECT COUNT(*) as count FROM pantry_items 
       WHERE user_id = $1 AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`,
      ['2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']
    );
    
    // Check for expired items
    const expired = await query(
      `SELECT COUNT(*) as count FROM pantry_items 
       WHERE user_id = $1 AND expiration_date < CURRENT_DATE`,
      ['2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']
    );
    
    res.json({
      items: result.rows,
      summary: {
        totalItems: result.rows.length,
        expiringSoon: parseInt(expiringSoon.rows[0].count),
        expired: parseInt(expired.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get pantry items error:', error);
    res.status(500).json({ error: 'Failed to get pantry items' });
  }
});

// Get single pantry item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, quantity, unit, purchase_date, expiration_date, barcode, category, notes, created_at, updated_at FROM pantry_items WHERE id = $1 AND user_id = $2',
      [req.params.id, '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pantry item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get pantry item error:', error);
    res.status(500).json({ error: 'Failed to get pantry item' });
  }
});

// Add new pantry item
router.post('/', authenticateToken, [
  body('name').notEmpty().trim(),
  body('quantity').isFloat({ min: 0 }),
  body('unit').isIn(['pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds', 'grams', 'kilograms', 'liters', 'milliliters']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, quantity, unit, purchaseDate, expirationDate, barcode, category, notes } = req.body;

    const result = await query(
      `INSERT INTO pantry_items (user_id, name, quantity, unit, purchase_date, expiration_date, barcode, category, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, name, quantity, unit, purchase_date, expiration_date, barcode, category, notes, created_at, updated_at`,
      ['2d4969fe-fedb-4c37-89e2-75eaf6ad61a3', name, quantity, unit, purchaseDate, expirationDate, barcode, category, notes]
    );

    res.status(201).json({
      message: 'Pantry item added successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Add pantry item error:', error);
    res.status(500).json({ error: 'Failed to add pantry item' });
  }
});

// Update pantry item
router.put('/:id', authenticateToken, [
  body('name').optional().notEmpty().trim(),
  body('quantity').optional().isFloat({ min: 0 }),
  body('unit').optional().isIn(['pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds', 'grams', 'kilograms', 'liters', 'milliliters']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, quantity, unit, purchaseDate, expirationDate, barcode, category, notes } = req.body;

    // Check if item exists and belongs to user
    const existingItem = await query(
      'SELECT id FROM pantry_items WHERE id = $1 AND user_id = $2',
      [req.params.id, '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']
    );

    if (existingItem.rows.length === 0) {
      return res.status(404).json({ error: 'Pantry item not found' });
    }

    const result = await query(
      `UPDATE pantry_items 
       SET name = COALESCE($1, name), 
           quantity = COALESCE($2, quantity), 
           unit = COALESCE($3, unit), 
           purchase_date = COALESCE($4, purchase_date), 
           expiration_date = COALESCE($5, expiration_date), 
           barcode = COALESCE($6, barcode), 
           category = COALESCE($7, category), 
           notes = COALESCE($8, notes),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 AND user_id = $10 
       RETURNING id, name, quantity, unit, purchase_date, expiration_date, barcode, category, notes, created_at, updated_at`,
      [name, quantity, unit, purchaseDate, expirationDate, barcode, category, notes, req.params.id, '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']
    );

    res.json({
      message: 'Pantry item updated successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Update pantry item error:', error);
    res.status(500).json({ error: 'Failed to update pantry item' });
  }
});

// Delete pantry item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM pantry_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pantry item not found' });
    }

    res.json({ message: 'Pantry item deleted successfully' });
  } catch (error) {
    console.error('Delete pantry item error:', error);
    res.status(500).json({ error: 'Failed to delete pantry item' });
  }
});

// Get expiring items
router.get('/expiring/soon', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, quantity, unit, expiration_date, category 
       FROM pantry_items 
       WHERE user_id = $1 AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       ORDER BY expiration_date ASC`,
      ['2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get expiring items error:', error);
    res.status(500).json({ error: 'Failed to get expiring items' });
  }
});

// Get expired items
router.get('/expiring/expired', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, quantity, unit, expiration_date, category 
       FROM pantry_items 
       WHERE user_id = $1 AND expiration_date < CURRENT_DATE
       ORDER BY expiration_date DESC`,
      ['2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get expired items error:', error);
    res.status(500).json({ error: 'Failed to get expired items' });
  }
});

// Bulk add pantry items
router.post('/bulk', authenticateToken, [
  body('items').isArray({ min: 1 }),
  body('items.*.name').notEmpty().trim(),
  body('items.*.quantity').isFloat({ min: 0 }),
  body('items.*.unit').isIn(['pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds', 'grams', 'kilograms', 'liters', 'milliliters']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { items } = req.body;
    const addedItems = [];

    for (const item of items) {
      const result = await query(
        `INSERT INTO pantry_items (user_id, name, quantity, unit, purchase_date, expiration_date, barcode, category, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING id, name, quantity, unit, purchase_date, expiration_date, barcode, category, notes, created_at, updated_at`,
        [
          '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3',
          item.name,
          item.quantity,
          item.unit,
          item.purchaseDate,
          item.expirationDate,
          item.barcode,
          item.category,
          item.notes
        ]
      );
      addedItems.push(result.rows[0]);
    }

    res.status(201).json({
      message: `${addedItems.length} pantry items added successfully`,
      items: addedItems
    });
  } catch (error) {
    console.error('Bulk add pantry items error:', error);
    res.status(500).json({ error: 'Failed to add pantry items' });
  }
});

// Delete expired items
router.delete('/expired/cleanup', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM pantry_items WHERE user_id = $1 AND expiration_date < CURRENT_DATE RETURNING id',
      ['2d4969fe-fedb-4c37-89e2-75eaf6ad61a3']
    );

    res.json({
      message: `${result.rows.length} expired items deleted successfully`,
      deletedCount: result.rows.length
    });
  } catch (error) {
    console.error('Delete expired items error:', error);
    res.status(500).json({ error: 'Failed to delete expired items' });
  }
});

module.exports = router;