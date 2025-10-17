import { ShoppingListItem } from '../types/shoppingList';

const STORAGE_KEY = 'intelligent-kitchen-shopping-list';

class ShoppingListService {
  private getItems(): ShoppingListItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveItems(items: ShoppingListItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async getShoppingListItems(): Promise<ShoppingListItem[]> {
    return this.getItems();
  }

  async addShoppingListItem(item: string | {
    text: string;
    quantity?: string | number | null;
    unit?: string | null;
    name?: string | null;
  }): Promise<ShoppingListItem> {
    const items = this.getItems();
    const baseText = typeof item === 'string' ? item : item.text;
    const newItem: ShoppingListItem = {
      id: this.generateId(),
      item_text: baseText.trim(),
      is_checked: false,
      position: items.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      quantity: typeof item === 'object' ? (item.quantity ?? null) : null,
      unit: typeof item === 'object' ? (item.unit ?? null) : null,
      name: typeof item === 'object' ? (item.name ?? null) : null
    };
    
    items.push(newItem);
    this.saveItems(items);
    return newItem;
  }

  async updateShoppingListItem(itemId: string, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    const items = this.getItems();
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }
    
    items[itemIndex] = {
      ...items[itemIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.saveItems(items);
    return items[itemIndex];
  }

  async deleteShoppingListItem(itemId: string): Promise<void> {
    const items = this.getItems();
    const filteredItems = items.filter(item => item.id !== itemId);
    this.saveItems(filteredItems);
  }

  async clearCompletedItems(): Promise<void> {
    const items = this.getItems();
    const activeItems = items.filter(item => !item.is_checked);
    this.saveItems(activeItems);
  }

  async reorderItems(itemIds: string[]): Promise<void> {
    const items = this.getItems();
    const reorderedItems: ShoppingListItem[] = [];
    
    itemIds.forEach((id, index) => {
      const item = items.find(i => i.id === id);
      if (item) {
        reorderedItems.push({
          ...item,
          position: index,
          updated_at: new Date().toISOString()
        });
      }
    });
    
    this.saveItems(reorderedItems);
  }
}

export const shoppingListService = new ShoppingListService();