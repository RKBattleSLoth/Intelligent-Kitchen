/**
 * Shopping List Agent
 * Specialized AI agent for generating shopping lists from recipes and meal plans
 */

const RecipeAgent = require('./RecipeAgent');
const RequestRouter = require('../RequestRouter');
const CostMonitor = require('../CostMonitor');

class ShoppingListAgent {
  constructor() {
    this.recipeAgent = new RecipeAgent();
    this.router = new RequestRouter();
    this.costMonitor = new CostMonitor();
  }

  /**
   * Generate shopping list from a single recipe
   */
  async generateFromRecipe(recipeData, userId, options = {}) {
    const { 
      targetServings = 4,
      includePantryStaples = false,
      categorize = true,
      forceModel = null
    } = options;

    try {
      // Extract ingredients from recipe
      const extraction = await this.recipeAgent.extractIngredients(recipeData, userId, {
        targetServings,
        forceModel
      });

      if (!extraction.success) {
        throw new Error(extraction.error);
      }

      // Process ingredients
      let ingredients = extraction.ingredients;
      
      // Filter out pantry staples if requested
      if (!includePantryStaples) {
        ingredients = this.filterPantryStaples(ingredients);
      }

      // Categorize if requested
      if (categorize) {
        ingredients = this.enhanceCategorization(ingredients);
      }

      // Generate shopping list items
      const shoppingListItems = this.convertToShoppingListItems(ingredients);

      return {
        success: true,
        shoppingList: {
          name: `${recipeData.name || 'Recipe'} Shopping List`,
          items: shoppingListItems,
          source: {
            type: 'recipe',
            recipeId: recipeData.id,
            recipeName: recipeData.name,
            servings: targetServings
          },
          metadata: {
            totalItems: shoppingListItems.length,
            confidence: extraction.confidence,
            cost: extraction.cost,
            tokens: extraction.tokens,
            generatedAt: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      console.error('Shopping list generation from recipe failed:', error);
      return {
        success: false,
        error: error.message,
        shoppingList: null
      };
    }
  }

  /**
   * Generate shopping list from multiple recipes (meal plan)
   */
  async generateFromMealPlan(recipes, userId, options = {}) {
    const { 
      targetServings = null, // null = use recipe servings
      includePantryStaples = false,
      categorize = true,
      mergeDuplicates = true,
      forceModel = null
    } = options;

    try {
      console.log(`🛒 Generating shopping list from ${recipes.length} recipes`);

      // Extract ingredients from all recipes
      const extractions = [];
      for (const recipe of recipes) {
        const servings = targetServings || recipe.servings || 4;
        const extraction = await this.recipeAgent.extractIngredients(recipe, userId, {
          targetServings: servings,
          forceModel
        });

        if (extraction.success) {
          extractions.push({
            recipe,
            extraction
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (extractions.length === 0) {
        throw new Error('No ingredients could be extracted from recipes');
      }

      // Combine all ingredients
      let allIngredients = [];
      extractions.forEach(({ recipe, extraction }) => {
        const ingredientsWithSource = extraction.ingredients.map(ing => ({
          ...ing,
          sourceRecipe: recipe.name,
          sourceRecipeId: recipe.id
        }));
        allIngredients.push(...ingredientsWithSource);
      });

      // Filter pantry staples
      if (!includePantryStaples) {
        allIngredients = this.filterPantryStaples(allIngredients);
      }

      // Merge duplicates
      if (mergeDuplicates) {
        allIngredients = this.mergeDuplicateIngredients(allIngredients);
      }

      // Categorize
      if (categorize) {
        allIngredients = this.enhanceCategorization(allIngredients);
      }

      // Convert to shopping list items
      const shoppingListItems = this.convertToShoppingListItems(allIngredients);

      // Calculate total cost
      const totalCost = extractions.reduce((sum, e) => sum + (e.extraction.cost || 0), 0);
      const totalTokens = extractions.reduce((sum, e) => sum + (e.extraction.tokens || 0), 0);

      return {
        success: true,
        shoppingList: {
          name: 'Meal Plan Shopping List',
          items: shoppingListItems,
          source: {
            type: 'meal_plan',
            recipeCount: recipes.length,
            recipes: recipes.map(r => ({ id: r.id, name: r.name }))
          },
          metadata: {
            totalItems: shoppingListItems.length,
            totalRecipes: recipes.length,
            averageConfidence: extractions.reduce((sum, e) => sum + e.extraction.confidence, 0) / extractions.length,
            cost: totalCost,
            tokens: totalTokens,
            generatedAt: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      console.error('Shopping list generation from meal plan failed:', error);
      return {
        success: false,
        error: error.message,
        shoppingList: null
      };
    }
  }

  /**
   * Optimize shopping list for store layout
   */
  async optimizeForStore(shoppingList, storeLayout = 'grocery', userId) {
    try {
      const items = shoppingList.items || [];
      
      const prompt = `Organize these shopping list items by store aisle for optimal shopping efficiency. 

Store type: ${storeLayout}

Items:
${items.map(item => `- ${item.name}`).join('\n')}

Return as JSON with categories:
{
  "categories": [
    {
      "name": "Produce",
      "items": ["item1", "item2"],
      "order": 1
    }
  ]
}

Use standard grocery store categories: Produce, Dairy, Meat, Bakery, Frozen, Canned Goods, Dry Goods, Beverages, Snacks, Household, Other.`;

      const response = await this.router.route('complex_reasoning', items, {
        prompt,
        maxTokens: 1000,
        temperature: 0.3
      });

      const organization = this.parseOrganizationResponse(response.content);
      
      // Track cost
      const costTracking = await this.costMonitor.trackRequest(userId, {
        model: response.routing?.modelName,
        inputTokens: this.estimateTokens(items.map(i => i.name).join(' ')),
        outputTokens: this.estimateTokens(response.content),
        taskType: 'shopping_list_optimization',
        routing: response.routing
      });

      // Reorganize items
      const organizedItems = this.reorganizeItems(items, organization);

      return {
        success: true,
        optimizedList: {
          ...shoppingList,
          items: organizedItems,
          organization,
          metadata: {
            ...shoppingList.metadata,
            optimized: true,
            optimizationCost: costTracking.cost,
            storeLayout
          }
        }
      };

    } catch (error) {
      console.error('Shopping list optimization failed:', error);
      return {
        success: false,
        error: error.message,
        optimizedList: shoppingList
      };
    }
  }

  /**
   * Filter out common pantry staples
   */
  filterPantryStaples(ingredients) {
    const staples = [
      'salt', 'pepper', 'water', 'sugar', 'flour', 'oil', 'butter',
      'garlic', 'onion', 'common spices', 'basic seasonings'
    ];

    return ingredients.filter(ingredient => {
      const name = ingredient.name.toLowerCase();
      return !staples.some(staple => name.includes(staple));
    });
  }

  /**
   * Merge duplicate ingredients
   */
  mergeDuplicateIngredients(ingredients) {
    const merged = {};
    
    ingredients.forEach(ingredient => {
      const key = `${ingredient.name}_${ingredient.unit}`;
      
      if (merged[key]) {
        merged[key].quantity += ingredient.quantity;
        merged[key].sourceRecipes = [...(merged[key].sourceRecipes || []), ingredient.sourceRecipe];
      } else {
        merged[key] = {
          ...ingredient,
          sourceRecipes: ingredient.sourceRecipe ? [ingredient.sourceRecipe] : []
        };
      }
    });
    
    return Object.values(merged);
  }

  /**
   * Enhance categorization with more specific categories
   */
  enhanceCategorization(ingredients) {
    return ingredients.map(ingredient => ({
      ...ingredient,
      category: this.getDetailedCategory(ingredient.name),
      aisle: this.getStoreAisle(ingredient.name)
    }));
  }

  /**
   * Get detailed category for ingredient
   */
  getDetailedCategory(name) {
    const categories = {
      'produce': ['tomato', 'lettuce', 'onion', 'carrot', 'celery', 'pepper', 'cucumber', 'spinach', 'broccoli', 'cauliflower', 'mushroom', 'avocado', 'lemon', 'lime', 'herbs', 'basil', 'parsley', 'cilantro'],
      'dairy': ['milk', 'cheese', 'cream', 'yogurt', 'sour cream', 'cream cheese', 'butter', 'margarine'],
      'meat': ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'sausage', 'bacon', 'ground meat'],
      'seafood': ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallops'],
      'bakery': ['bread', 'rolls', 'bagels', 'croissants', 'muffins', 'cake', 'cookies', 'tortillas', 'pita'],
      'frozen': ['frozen', 'ice cream', 'frozen vegetables', 'frozen fruit', 'frozen meals'],
      'canned': ['canned', 'beans', 'tomatoes', 'soup', 'broth', 'tuna', 'sardines'],
      'dry_goods': ['pasta', 'rice', 'flour', 'sugar', 'cereal', 'oats', 'grains', 'nuts', 'seeds', 'dried fruit'],
      'beverages': ['juice', 'soda', 'water', 'coffee', 'tea', 'milk', 'plant-based milk'],
      'snacks': ['chips', 'crackers', 'pretzels', 'popcorn', 'nuts', 'dried fruit', 'granola bars'],
      'condiments': ['ketchup', 'mustard', 'mayo', 'relish', 'salsa', 'soy sauce', 'vinegar', 'hot sauce'],
      'spices': ['salt', 'pepper', 'garlic powder', 'onion powder', 'cumin', 'paprika', 'oregano', 'basil', 'thyme'],
      'household': ['paper towels', 'napkins', 'foil', 'plastic wrap', 'dish soap', 'cleaning supplies']
    };
    
    const lowerName = name.toLowerCase();
    
    for (const [category, items] of Object.entries(categories)) {
      if (items.some(item => lowerName.includes(item))) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Get store aisle for ingredient
   */
  getStoreAisle(name) {
    const aisleMap = {
      'produce': 'Produce',
      'dairy': 'Dairy',
      'meat': 'Meat & Seafood',
      'seafood': 'Meat & Seafood',
      'bakery': 'Bakery',
      'frozen': 'Frozen Foods',
      'canned': 'Canned Goods',
      'dry_goods': 'Dry Goods & Pasta',
      'beverages': 'Beverages',
      'snacks': 'Snack Aisle',
      'condiments': 'Condiments',
      'spices': 'Spices & Seasonings',
      'household': 'Household'
    };
    
    const category = this.getDetailedCategory(name);
    return aisleMap[category] || 'Other';
  }

  /**
   * Convert ingredients to shopping list items
   */
  convertToShoppingListItems(ingredients) {
    return ingredients.map((ingredient, index) => ({
      id: `item_${Date.now()}_${index}`,
      name: this.formatIngredientName(ingredient),
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      category: ingredient.category,
      aisle: ingredient.aisle,
      preparation: ingredient.preparation,
      notes: ingredient.notes,
      checked: false,
      position: index,
      sourceRecipes: ingredient.sourceRecipes || [],
      metadata: {
        confidence: ingredient.confidence || 0.8,
        extractedAt: new Date().toISOString()
      }
    }));
  }

  /**
   * Format ingredient name for display
   */
  formatIngredientName(ingredient) {
    let name = ingredient.name;
    
    if (ingredient.preparation) {
      name = `${ingredient.preparation} ${name}`;
    }
    
    if (ingredient.notes) {
      name += ` (${ingredient.notes})`;
    }
    
    return name;
  }

  /**
   * Parse organization response
   */
  parseOrganizationResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in organization response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.categories || [];
    } catch (error) {
      console.error('Failed to parse organization response:', error);
      return [];
    }
  }

  /**
   * Reorganize items based on store layout
   */
  reorganizeItems(items, organization) {
    const organized = [];
    
    organization.forEach(category => {
      category.items.forEach(itemName => {
        const item = items.find(i => i.name.toLowerCase().includes(itemName.toLowerCase()));
        if (item) {
          organized.push({
            ...item,
            category: category.name,
            aisle: category.name
          });
        }
      });
    });
    
    // Add any items that weren't categorized
    items.forEach(item => {
      if (!organized.find(i => i.id === item.id)) {
        organized.push(item);
      }
    });
    
    return organized;
  }

  /**
   * Estimate token count
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
}

module.exports = ShoppingListAgent;