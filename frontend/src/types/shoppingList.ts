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

export interface CreateShoppingListRequest {
  name?: string;
}

export interface UpdateShoppingListRequest {
  name?: string;
  is_completed?: boolean;
}

export interface CreateShoppingListItemRequest {
  item_text: string;
}

export interface UpdateShoppingListItemRequest {
  item_text?: string;
  is_checked?: boolean;
}

export interface ReorderItemsRequest {
  itemIds: string[];
}