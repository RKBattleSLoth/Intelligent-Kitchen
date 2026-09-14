import { ShoppingListItem } from '../types/shoppingList';

const STORAGE_KEY = 'intelligent-kitchen-shopping-list';

type ShoppingListChangeListener = () => void;

class ShoppingListService {
  private changeListeners: Set<ShoppingListChangeListener> = new Set();

  // Subscribe to shopping list changes
  subscribe(listener: ShoppingListChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  // Notify all listeners of changes
  protected notifyChange(): void {
    this.changeListeners.forEach(listener => listener());
  }

  protected getItems(): ShoppingListItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  protected saveItems(items: ShoppingListItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    this.notifyChange();
  }

  protected generateId(): string {
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

  async addIngredientsToList(ingredients: Array<string | {
    text?: string;
    quantity?: string | number | null;
    amount?: string | number | null;
    quantityValue?: number | null;
    unit?: string | null;
    name?: string | null;
  }>): Promise<ShoppingListItem[]> {
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return [];
    }

    const addedItems: ShoppingListItem[] = [];

    for (const ingredient of ingredients) {
      if (!ingredient) {
        continue;
      }

      if (typeof ingredient === 'string') {
        const trimmed = ingredient.trim();
        if (!trimmed) {
          continue;
        }
        try {
          const newItem = await this.addShoppingListItem(trimmed);
          addedItems.push(newItem);
        } catch (error) {
          console.error('Failed to add shopping list item from string ingredient:', error);
        }
        continue;
      }

      const quantitySource = ingredient.quantity ?? ingredient.amount ?? ingredient.quantityValue ?? null;
      const quantityText = quantitySource === null || quantitySource === undefined
        ? null
        : typeof quantitySource === 'number'
          ? quantitySource.toString()
          : String(quantitySource).trim();

      const unitText = ingredient.unit ? String(ingredient.unit).trim() : null;
      const nameText = ingredient.name ? String(ingredient.name).trim() : null;

      const baseText = ingredient.text?.trim() || [quantityText, unitText, nameText]
        .filter(part => part && String(part).trim().length > 0)
        .join(' ')
        .trim();

      if (!baseText) {
        continue;
      }

      try {
        const newItem = await this.addShoppingListItem({
          text: baseText,
          quantity: quantityText,
          unit: unitText,
          name: nameText || baseText
        });
        addedItems.push(newItem);
      } catch (error) {
        console.error('Failed to add shopping list item from structured ingredient:', error);
      }
    }

    return addedItems;
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

// Shopping list templates for common household staples
export interface ShoppingListTemplate {
  id: string;
  name: string;
  description: string;
  items: Array<{
    name: string;
    quantity?: string;
    unit?: string;
    category?: string;
  }>;
  isDefault: boolean;
}

export const SHOPPING_LIST_TEMPLATES: ShoppingListTemplate[] = [
  {
    id: 'weekly-staples',
    name: 'Weekly Household Staples',
    description: 'Essential items for weekly meal planning and grocery shopping',
    isDefault: true,
    items: [
      { name: 'Milk', quantity: '1 gallon', category: 'Dairy' },
      { name: 'Bread', quantity: '1 loaf', category: 'Bakery' },
      { name: 'Eggs', quantity: '1 dozen', category: 'Protein' },
      { name: 'Butter', quantity: '1 lb', category: 'Dairy' },
      { name: 'Cheese', quantity: '1 lb', category: 'Dairy' },
      { name: 'Onions', quantity: '3 lbs', category: 'Produce' },
      { name: 'Potatoes', quantity: '5 lbs', category: 'Produce' },
      { name: 'Rice', quantity: '5 lbs', category: 'Grains' },
      { name: 'Pasta', quantity: '2 lbs', category: 'Grains' },
      { name: 'Chicken', quantity: '2 lbs', category: 'Protein' },
      { name: 'Ground Beef', quantity: '1 lb', category: 'Protein' },
      { name: 'Cooking Oil', quantity: '1 bottle', category: 'Pantry' },
      { name: 'Flour', quantity: '5 lbs', category: 'Bakery' },
      { name: 'Sugar', quantity: '2 lbs', category: 'Pantry' },
      { name: 'Coffee', quantity: '1 lb', category: 'Beverage' },
      { name: 'Tea Bags', quantity: '1 box', category: 'Beverage' },
      { name: 'Paper Towels', quantity: '1 roll', category: 'Household' },
      { name: 'Dish Soap', quantity: '1 bottle', category: 'Household' },
      { name: 'Laundry Detergent', quantity: '1 bottle', category: 'Household' }
    ]
  },
  {
    id: 'meal-prep-groceries',
    name: 'Weekly Meal Prep Groceries',
    description: 'Groceries for weekly meal preparation',
    isDefault: false,
    items: [
      { name: 'Fresh Vegetables', quantity: '5 lbs', category: 'Produce' },
      { name: 'Fresh Herbs', quantity: '1 bunch', category: 'Produce' },
      { name: 'Garlic', quantity: '1 head', category: 'Produce' },
      { name: 'Ginger', quantity: '1 piece', category: 'Produce' },
      { name: 'Lemons', quantity: '4', category: 'Produce' },
      { name: 'Olive Oil', quantity: '1 bottle', category: 'Pantry' },
      { name: 'Yogurt', quantity: '2 containers', category: 'Dairy' }
    ]
  },
  {
    id: 'bulk-buying',
    name: 'Bulk Buying Essentials',
    description: 'Cost-effective bulk purchases for larger households',
    isDefault: false,
    items: [
      { name: 'Toilet Paper', quantity: '12 rolls', category: 'Household' },
      { name: 'Paper Towels', quantity: '6 rolls', category: 'Household' },
      { name: 'Hand Soap', quantity: '3 refill packs', category: 'Household' },
      { name: 'Dish Soap', quantity: '2 bottles', category: 'Household' },
      { name: 'Trash Bags', quantity: '100 count', category: 'Household' },
      { name: 'Batteries', quantity: '20 pack', category: 'Household' }
    ]
  }
];

// Enhanced Shopping List Service Class with Template Support
class EnhancedShoppingListService extends ShoppingListService {
  async getTemplates(): Promise<ShoppingListTemplate[]> {
    return SHOPPING_LIST_TEMPLATES;
  }

  async getStoredTemplates(): Promise<ShoppingListTemplate[]> {
    try {
      const stored = localStorage.getItem('shopping-list-templates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async setStoredTemplates(templates: ShoppingListTemplate[]): Promise<void> {
    localStorage.setItem('shopping-list-templates', JSON.stringify(templates));
  }

  async getAllTemplates(): Promise<ShoppingListTemplate[]> {
    const stored = await this.getStoredTemplates();
    return [...SHOPPING_LIST_TEMPLATES, ...stored];
  }

  async deleteStoredTemplate(templateId: string): Promise<void> {
    const stored = await this.getStoredTemplates();
    const filtered = stored.filter(template => template.id !== templateId);
    await this.setStoredTemplates(filtered);
  }

  async applyTemplate(templateId: string): Promise<ShoppingListItem[]> {
    const templates = await this.getAllTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const newItems = template.items.map(item => ({
      id: this.generateId(),
      item_text: item.quantity ? `${item.quantity} ${item.unit ? `${item.unit} ` : ''}${item.name}` : item.name,
      is_checked: false,
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      quantity: item.quantity?.toString(),
      unit: item.unit || null,
      name: item.name
    }));

    // Clear existing items and add template items
    this.saveItems(newItems);
    return newItems;
  }

  async saveAsTemplate(name: string, description: string): Promise<ShoppingListTemplate> {
    const currentItems = this.getItems();
    
    const newTemplate: ShoppingListTemplate = {
      id: Date.now().toString(36),
      name,
      description,
      items: currentItems.map(item => ({
        name: item.item_text,
        quantity: item.quantity != null ? String(item.quantity) : undefined,
        unit: item.unit ?? undefined,
        category: item.name || 'Other'
      })),
      isDefault: false
    };

    // Store template (in a real app, this would save to a backend)
    const existingTemplates = await this.getStoredTemplates();
    existingTemplates.push(newTemplate);
    await this.setStoredTemplates(existingTemplates);
    
    return newTemplate;
  }

  async consolidateItems(): Promise<{ items: ShoppingListItem[]; stats: { originalCount: number; finalCount: number; combinedCount: number; combinedItems: string[] } }> {
    const items = this.getItems();
    const originalCount = items.length;
    
    if (items.length <= 1) {
      return { 
        items, 
        stats: { originalCount, finalCount: items.length, combinedCount: 0, combinedItems: [] } 
      };
    }

    // Track which items got combined
    const combinedItems: string[] = [];

    // Extract quantity and name from item text like "2 cups flour" or "3 eggs"
    const parseItemText = (text: string): { quantity: number; unit: string; name: string } => {
      // Match patterns like "2 cups flour", "1/2 lb chicken", "3 eggs"
      const match = text.match(/^([\d.\/]+)\s*([a-zA-Z]*)\s*(.+)$/);
      if (match) {
        let qty = 0;
        const qtyStr = match[1];
        // Handle fractions like "1/2"
        if (qtyStr.includes('/')) {
          const [num, denom] = qtyStr.split('/');
          qty = parseFloat(num) / parseFloat(denom);
        } else {
          qty = parseFloat(qtyStr);
        }
        return {
          quantity: isNaN(qty) ? 0 : qty,
          unit: match[2].toLowerCase().trim(),
          name: match[3].toLowerCase().trim()
        };
      }
      return { quantity: 0, unit: '', name: text.toLowerCase().trim() };
    };

    // Normalize ingredient name for matching
    const normalizeName = (name: string) => 
      name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const consolidated = new Map<string, { item: ShoppingListItem; parsed: { quantity: number; unit: string; name: string } }>();
    
    for (const item of items) {
      // Try to parse from item_text first, fall back to stored fields
      const parsed = parseItemText(item.item_text);
      
      // Use parsed name or stored name for the key
      const itemName = parsed.name || normalizeName(item.name || item.item_text);
      const key = normalizeName(itemName);
      
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        const existingParsed = existing.parsed;
        
        // Track that this item was combined
        if (!combinedItems.includes(itemName)) {
          combinedItems.push(itemName);
        }
        
        // Add quantities if both have numeric quantities and compatible units
        if (existingParsed.quantity > 0 && parsed.quantity > 0) {
          // Same unit or one has no unit
          if (existingParsed.unit === parsed.unit || !existingParsed.unit || !parsed.unit) {
            existingParsed.quantity += parsed.quantity;
            const unit = existingParsed.unit || parsed.unit;
            existing.item.item_text = `${existingParsed.quantity}${unit ? ' ' + unit : ''} ${itemName}`;
            existing.item.quantity = String(existingParsed.quantity);
          } else {
            // Different units - append
            existing.item.item_text = `${existing.item.item_text} + ${item.item_text}`;
          }
        } else if (parsed.quantity > 0) {
          // Only new item has quantity
          existingParsed.quantity = parsed.quantity;
          existingParsed.unit = parsed.unit;
          existing.item.item_text = item.item_text;
          existing.item.quantity = String(parsed.quantity);
        } else {
          // Neither has quantity or only existing has - just note the duplicate
          if (!existing.item.item_text.includes(item.item_text)) {
            existing.item.item_text = `${existing.item.item_text} (x2)`;
          }
        }
        existing.item.updated_at = new Date().toISOString();
      } else {
        consolidated.set(key, { 
          item: { ...item }, 
          parsed 
        });
      }
    }

    const result = Array.from(consolidated.values()).map(v => v.item);
    this.saveItems(result);
    
    return {
      items: result,
      stats: {
        originalCount,
        finalCount: result.length,
        combinedCount: combinedItems.length,
        combinedItems
      }
    };
  }
}

export const enhancedShoppingListService = new EnhancedShoppingListService();