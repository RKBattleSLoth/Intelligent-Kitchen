export interface PantryItem {
  id: string
  name: string
  quantity: string
  category?: string
  expirationDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface PantryItemInput {
  name: string
  quantity: string
  category?: string
  expirationDate?: string
  notes?: string
}

const STORAGE_KEY = 'intelligent-kitchen-pantry'

class PantryService {
  private getStoredItems(): PantryItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed
            .filter(item => item && typeof item.id === 'string')
            .map(item => ({
              id: item.id,
              name: item.name || 'Unnamed Item',
              quantity: item.quantity || '1',
              category: item.category,
              expirationDate: item.expirationDate,
              notes: item.notes,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString()
            }))
        }
      }
    } catch (error) {
      console.warn('Failed to parse stored pantry items:', error)
    }

    return this.getDefaultItems()
  }

  private saveItems(items: PantryItem[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }

  private getDefaultItems(): PantryItem[] {
    const now = new Date()
    const formatDate = (date: Date) => date.toISOString().split('T')[0]

    return [
      {
        id: 'pantry-1',
        name: 'Canned Tomatoes',
        quantity: '4 cans',
        category: 'pantry',
        expirationDate: formatDate(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'pantry-2',
        name: 'Brown Rice',
        quantity: '2 lbs',
        category: 'grains',
        expirationDate: formatDate(new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000)),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'pantry-3',
        name: 'Olive Oil',
        quantity: '1 bottle',
        category: 'pantry',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ]
  }

  async getAllItems(): Promise<PantryItem[]> {
    return this.getStoredItems()
  }

  async addItem(input: PantryItemInput): Promise<PantryItem> {
    const items = this.getStoredItems()
    const now = new Date().toISOString()
    const newItem: PantryItem = {
      id: `pantry-${Date.now()}`,
      name: input.name.trim(),
      quantity: input.quantity.trim(),
      category: input.category?.trim() || undefined,
      expirationDate: input.expirationDate || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    }

    const nextItems = [...items, newItem]
    this.saveItems(nextItems)
    return newItem
  }

  async updateItem(id: string, updates: Partial<PantryItemInput>): Promise<PantryItem | null> {
    const items = this.getStoredItems()
    const index = items.findIndex(item => item.id === id)
    if (index === -1) {
      return null
    }

    const updatedItem: PantryItem = {
      ...items[index],
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : items[index].name,
      quantity: updates.quantity !== undefined ? updates.quantity.trim() : items[index].quantity,
      category: updates.category !== undefined ? updates.category.trim() : items[index].category,
      notes: updates.notes !== undefined ? updates.notes.trim() : items[index].notes,
      expirationDate: updates.expirationDate ?? items[index].expirationDate,
      updatedAt: new Date().toISOString()
    }

    const nextItems = [...items]
    nextItems[index] = updatedItem
    this.saveItems(nextItems)
    return updatedItem
  }

  async deleteItem(id: string): Promise<boolean> {
    const items = this.getStoredItems()
    const filtered = items.filter(item => item.id !== id)
    if (filtered.length === items.length) {
      return false
    }

    this.saveItems(filtered)
    return true
  }
}

export const pantryService = new PantryService()
