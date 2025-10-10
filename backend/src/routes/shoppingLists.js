const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getShoppingLists,
  getShoppingList,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  reorderShoppingListItems,
  validateCreateShoppingList,
  validateUpdateShoppingList,
  validateAddShoppingListItem,
  validateUpdateShoppingListItem,
  validateReorderItems
} = require('../controllers/shoppingListController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Shopping list routes
router.get('/', getShoppingLists);
router.post('/', validateCreateShoppingList, createShoppingList);
router.get('/:id', getShoppingList);
router.put('/:id', validateUpdateShoppingList, updateShoppingList);
router.delete('/:id', deleteShoppingList);

// Shopping list item routes
router.post('/:id/items', validateAddShoppingListItem, addShoppingListItem);
router.put('/:listId/items/:itemId', validateUpdateShoppingListItem, updateShoppingListItem);
router.delete('/:listId/items/:itemId', deleteShoppingListItem);
router.put('/:id/items/reorder', validateReorderItems, reorderShoppingListItems);

module.exports = router;