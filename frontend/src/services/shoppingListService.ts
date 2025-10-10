import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ShoppingListItem {
  id: string;
  item_text: string;
  is_checked: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  name: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  items?: ShoppingListItem[];
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/shopping-lists`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const shoppingListService = {
  // Get all shopping lists
  async getShoppingLists(): Promise<ShoppingList[]> {
    const response = await api.get('/');
    return response.data.data;
  },

  // Get a single shopping list with items
  async getShoppingList(id: string): Promise<ShoppingList> {
    const response = await api.get(`/${id}`);
    return response.data.data;
  },

  // Create a new shopping list
  async createShoppingList(name: string): Promise<ShoppingList> {
    const response = await api.post('/', { name });
    return response.data.data;
  },

  // Update a shopping list
  async updateShoppingList(id: string, updates: Partial<ShoppingList>): Promise<ShoppingList> {
    const response = await api.put(`/${id}`, updates);
    return response.data.data;
  },

  // Delete a shopping list
  async deleteShoppingList(id: string): Promise<void> {
    await api.delete(`/${id}`);
  },

  // Add an item to a shopping list
  async addShoppingListItem(listId: string, itemText: string): Promise<ShoppingListItem> {
    const response = await api.post(`/${listId}/items`, { item_text: itemText });
    return response.data.data;
  },

  // Update a shopping list item
  async updateShoppingListItem(listId: string, itemId: string, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    const response = await api.put(`/${listId}/items/${itemId}`, updates);
    return response.data.data;
  },

  // Delete a shopping list item
  async deleteShoppingListItem(listId: string, itemId: string): Promise<void> {
    await api.delete(`/${listId}/items/${itemId}`);
  },

  // Reorder shopping list items
  async reorderShoppingListItems(listId: string, itemIds: string[]): Promise<void> {
    await api.put(`/${listId}/items/reorder`, { itemIds });
  },
};