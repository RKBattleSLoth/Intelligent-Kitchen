import { useState } from 'react';
import { ShoppingCart, Plus, Trash2, Printer, Download } from 'lucide-react';
import { Checkbox } from './ui/checkbox';

interface ShoppingItem {
  id: number;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
}

const initialItems: ShoppingItem[] = [
  { id: 1, name: 'Eggs', quantity: '1 dozen', category: 'Dairy', checked: false },
  { id: 2, name: 'Bread', quantity: '1 loaf', category: 'Bakery', checked: false },
  { id: 3, name: 'Chicken Breast', quantity: '2 lbs', category: 'Meat', checked: true },
  { id: 4, name: 'Tomatoes', quantity: '6 items', category: 'Produce', checked: false },
  { id: 5, name: 'Olive Oil', quantity: '1 bottle', category: 'Pantry', checked: false },
  { id: 6, name: 'Pasta', quantity: '2 boxes', category: 'Pantry', checked: true },
  { id: 7, name: 'Bell Peppers', quantity: '3 items', category: 'Produce', checked: false },
  { id: 8, name: 'Cheese', quantity: '8 oz', category: 'Dairy', checked: false },
  { id: 9, name: 'Onions', quantity: '3 items', category: 'Produce', checked: false },
  { id: 10, name: 'Garlic', quantity: '1 bulb', category: 'Produce', checked: false },
  { id: 11, name: 'Milk', quantity: '1 gallon', category: 'Dairy', checked: true },
  { id: 12, name: 'Rice', quantity: '2 lbs', category: 'Pantry', checked: false },
];

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Pantry');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(items.map(item => item.category)))];
  const categoryOptions = ['Produce', 'Meat', 'Dairy', 'Bakery', 'Pantry', 'Other'];

  const toggleItem = (id: number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const deleteItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const addItem = () => {
    if (newItemName.trim() && newItemQuantity.trim()) {
      const newItem: ShoppingItem = {
        id: Math.max(...items.map(i => i.id), 0) + 1,
        name: newItemName,
        quantity: newItemQuantity,
        category: newItemCategory,
        checked: false,
      };
      setItems([...items, newItem]);
      setNewItemName('');
      setNewItemQuantity('');
    }
  };

  const clearCompleted = () => {
    setItems(items.filter(item => !item.checked));
  };

  const printList = () => {
    window.print();
  };

  const exportList = () => {
    const listContent = items.map(item => 
      `${item.checked ? '[x]' : '[ ]'} ${item.name} - ${item.quantity} (${item.category})`
    ).join('\n');
    
    const blob = new Blob([`Shopping List\n\n${listContent}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shopping-list.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredItems = selectedCategory === 'All' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const completedCount = items.filter(item => item.checked).length;
  const totalValue = items.length;
  const remainingItems = items.filter(item => !item.checked).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Summary - Mobile Friendly */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Total Items</p>
              <p className="text-gray-900 text-xl sm:text-2xl mt-0.5 sm:mt-1">{totalValue}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Completed</p>
              <p className="text-gray-900 text-xl sm:text-2xl mt-0.5 sm:mt-1">{completedCount}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Remaining</p>
              <p className="text-gray-900 text-xl sm:text-2xl mt-0.5 sm:mt-1">{remainingItems}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Header - Mobile Friendly */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
          <h1 className="text-gray-900 text-xl sm:text-2xl">Shopping List</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button 
            onClick={printList}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Print</span>
          </button>
          <button 
            onClick={exportList}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Export</span>
          </button>
          <button 
            onClick={clearCompleted}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors text-xs sm:text-sm shadow-md flex items-center justify-center"
          >
            Clear Completed
          </button>
        </div>
      </div>

      {/* Add Item - Mobile Friendly */}
      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-md">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="text"
            placeholder="Item name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50 text-gray-900 text-sm rounded border border-gray-300 focus:border-blue-500 outline-none"
          />
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              placeholder="Quantity"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
              className="flex-1 sm:w-32 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50 text-gray-900 text-sm rounded border border-gray-300 focus:border-blue-500 outline-none"
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="flex-1 sm:w-32 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50 text-gray-900 text-sm rounded border border-gray-300 focus:border-blue-500 outline-none"
            >
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addItem}
            className="px-4 py-1.5 sm:px-6 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center gap-1.5 sm:gap-2 transition-colors shadow-md text-xs sm:text-sm"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded transition-colors text-xs sm:text-sm ${
              selectedCategory === category
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {category} ({category === 'All' ? items.length : items.filter(i => i.category === category).length})
          </button>
        ))}
      </div>

      {/* Shopping Items */}
      <div className="space-y-1.5 sm:space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-lg p-3 sm:p-4 transition-all border border-gray-200 shadow-sm hover:shadow-md ${
              item.checked ? 'opacity-60 bg-gray-50' : ''
            }`}
          >
            {/* Mobile Layout */}
            <div className="flex sm:hidden items-start gap-3">
              <Checkbox
                checked={item.checked}
                onCheckedChange={() => toggleItem(item.id)}
                id={`item-${item.id}`}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`item-${item.id}`}
                  className={`block cursor-pointer mb-1 ${
                    item.checked ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {item.name}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-600 text-sm">{item.quantity}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.category === 'Produce' ? 'bg-green-100 text-green-700' :
                    item.category === 'Meat' ? 'bg-red-100 text-red-700' :
                    item.category === 'Dairy' ? 'bg-blue-100 text-blue-700' :
                    item.category === 'Bakery' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {item.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleItem(item.id)}
                  id={`item-desktop-${item.id}`}
                />
                <label
                  htmlFor={`item-desktop-${item.id}`}
                  className={`flex-1 cursor-pointer ${
                    item.checked ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {item.name}
                </label>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-gray-600 min-w-[80px] text-sm">{item.quantity}</span>
                <span className={`text-sm min-w-[80px] px-2 py-1 rounded ${
                  item.category === 'Produce' ? 'bg-green-100 text-green-700' :
                  item.category === 'Meat' ? 'bg-red-100 text-red-700' :
                  item.category === 'Dairy' ? 'bg-blue-100 text-blue-700' :
                  item.category === 'Bakery' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {item.category}
                </span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">No items in this category</h3>
          <p className="text-gray-600 text-sm">Add some items to get started!</p>
        </div>
      )}
    </div>
  );
}