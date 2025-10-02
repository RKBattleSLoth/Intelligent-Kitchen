/**
 * Tool Registry
 * Central registry for all tools available to AI models
 * Tools enable models to interact with database, APIs, and perform calculations
 */

const { query } = require('../../../config/database');

class ToolRegistry {
  constructor() {
    this.tools = this.registerTools();
  }

  /**
   * Register all available tools
   * @returns {Object} Map of tool name to function
   */
  registerTools() {
    return {
      // ============ DATABASE TOOLS ============
      
      // Pantry Tools
      'get_pantry_items': this.getPantryItems.bind(this),
      'add_pantry_item': this.addPantryItem.bind(this),
      'update_pantry_item': this.updatePantryItem.bind(this),
      'remove_pantry_item': this.removePantryItem.bind(this),
      'check_pantry_for_recipe': this.checkPantryForRecipe.bind(this),
      'get_expiring_items': this.getExpiringItems.bind(this),
      
      // Recipe Tools
      'search_recipes': this.searchRecipes.bind(this),
      'get_recipe_details': this.getRecipeDetails.bind(this),
      'get_recipe_ingredients': this.getRecipeIngredients.bind(this),
      'create_recipe': this.createRecipe.bind(this),
      
      // Meal Plan Tools
      'get_meal_plans': this.getMealPlans.bind(this),
      'get_meal_plan_details': this.getMealPlanDetails.bind(this),
      'create_meal_plan': this.createMealPlan.bind(this),
      'add_meal_to_plan': this.addMealToPlan.bind(this),
      'remove_meal_from_plan': this.removeMealFromPlan.bind(this),
      
      // Grocery List Tools
      'get_grocery_lists': this.getGroceryLists.bind(this),
      'create_grocery_list': this.createGroceryList.bind(this),
      'add_item_to_grocery_list': this.addItemToGroceryList.bind(this),
      'generate_grocery_list_from_meal_plan': this.generateGroceryListFromMealPlan.bind(this),
      
      // ============ CALCULATION TOOLS ============
      'calculate_nutrition': this.calculateNutrition.bind(this),
      'convert_units': this.convertUnits.bind(this),
      'scale_recipe': this.scaleRecipe.bind(this),
      'estimate_cooking_time': this.estimateCookingTime.bind(this),
      
      // ============ ANALYSIS TOOLS ============
      'analyze_dietary_compliance': this.analyzeDietaryCompliance.bind(this),
      'suggest_ingredient_substitutions': this.suggestIngredientSubstitutions.bind(this),
      'calculate_meal_plan_nutrition': this.calculateMealPlanNutrition.bind(this),
    };
  }

  /**
   * Execute a tool by name
   * @param {String} toolName
   * @param {Object} parameters
   * @param {Object} context - User context
   * @returns {Promise<Object>}
   */
  async execute(toolName, parameters, context) {
    if (!this.tools[toolName]) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    try {
      console.log(`🔧 Executing tool: ${toolName}`, parameters);
      const result = await this.tools[toolName](parameters, context);
      return { success: true, data: result };
    } catch (error) {
      console.error(`❌ Tool execution error (${toolName}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tool definitions for OpenRouter function calling
   * @returns {Array} Array of tool definitions
   */
  getToolDefinitions() {
    return [
      // Pantry Tools
      {
        type: 'function',
        function: {
          name: 'get_pantry_items',
          description: 'Get all items from user\'s pantry. Can filter by category.',
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Filter by category (optional)' },
              sortBy: { type: 'string', enum: ['name', 'quantity', 'expiration_date'], description: 'Sort results by' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'add_pantry_item',
          description: 'Add a new item to the pantry',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Item name' },
              quantity: { type: 'number', description: 'Quantity' },
              unit: { type: 'string', enum: ['pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds', 'grams', 'kilograms', 'liters', 'milliliters'] },
              expirationDate: { type: 'string', description: 'Expiration date (YYYY-MM-DD)' },
              category: { type: 'string', description: 'Item category' }
            },
            required: ['name', 'quantity', 'unit']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_recipes',
          description: 'Search for recipes based on criteria',
          parameters: {
            type: 'object',
            properties: {
              ingredients: { type: 'array', items: { type: 'string' }, description: 'Ingredients to search for' },
              mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              maxTime: { type: 'number', description: 'Maximum cooking time in minutes' },
              diet: { type: 'string', description: 'Dietary preference' },
              limit: { type: 'number', description: 'Maximum number of results' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_recipe_details',
          description: 'Get full details of a specific recipe including ingredients and instructions',
          parameters: {
            type: 'object',
            properties: {
              recipeId: { type: 'string', description: 'Recipe ID' }
            },
            required: ['recipeId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_pantry_for_recipe',
          description: 'Check if user has ingredients for a recipe and identify missing items',
          parameters: {
            type: 'object',
            properties: {
              recipeId: { type: 'string', description: 'Recipe ID' }
            },
            required: ['recipeId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_meal_plan',
          description: 'Create a new meal plan',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Meal plan name' },
              startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
              notes: { type: 'string', description: 'Optional notes' }
            },
            required: ['name', 'startDate', 'endDate']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'add_meal_to_plan',
          description: 'Add a meal (recipe) to a meal plan',
          parameters: {
            type: 'object',
            properties: {
              mealPlanId: { type: 'string', description: 'Meal plan ID' },
              recipeId: { type: 'string', description: 'Recipe ID' },
              mealDate: { type: 'string', description: 'Date for the meal (YYYY-MM-DD)' },
              mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] }
            },
            required: ['mealPlanId', 'recipeId', 'mealDate', 'mealType']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_grocery_list',
          description: 'Create a new grocery list',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'List name' }
            },
            required: ['name']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'add_item_to_grocery_list',
          description: 'Add an item to a grocery list',
          parameters: {
            type: 'object',
            properties: {
              listId: { type: 'string', description: 'Grocery list ID' },
              itemName: { type: 'string', description: 'Item name' },
              quantity: { type: 'number', description: 'Quantity' },
              unit: { type: 'string', description: 'Unit of measure' },
              category: { type: 'string', enum: ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'canned', 'dry_goods', 'beverages', 'snacks', 'household', 'other'] }
            },
            required: ['listId', 'itemName', 'quantity']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'calculate_nutrition',
          description: 'Calculate total nutrition for a list of ingredients',
          parameters: {
            type: 'object',
            properties: {
              ingredients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    amount: { type: 'number' },
                    unit: { type: 'string' }
                  }
                }
              }
            },
            required: ['ingredients']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'convert_units',
          description: 'Convert cooking measurements between units',
          parameters: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'Amount to convert' },
              fromUnit: { type: 'string', description: 'Original unit' },
              toUnit: { type: 'string', description: 'Target unit' }
            },
            required: ['amount', 'fromUnit', 'toUnit']
          }
        }
      }
    ];
  }

  // ============ PANTRY TOOLS IMPLEMENTATION ============

  async getPantryItems(params, context) {
    const { category, sortBy = 'name' } = params;
    
    let sql = `
      SELECT id, name, quantity, unit, purchase_date, expiration_date, category, notes
      FROM pantry_items 
      WHERE user_id = $1
    `;
    
    const queryParams = [context.userId];
    let paramIndex = 2;
    
    if (category) {
      sql += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }
    
    const validSortColumns = ['name', 'quantity', 'expiration_date', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
    sql += ` ORDER BY ${sortColumn} ASC`;
    
    const result = await query(sql, queryParams);
    return result.rows;
  }

  async addPantryItem(params, context) {
    const { name, quantity, unit, expirationDate, category, notes } = params;
    
    const result = await query(
      `INSERT INTO pantry_items (user_id, name, quantity, unit, expiration_date, category, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, quantity, unit, expiration_date, category`,
      [context.userId, name, quantity, unit, expirationDate || null, category || null, notes || null]
    );
    
    return result.rows[0];
  }

  async updatePantryItem(params, context) {
    const { itemId, quantity, expirationDate, notes } = params;
    
    const result = await query(
      `UPDATE pantry_items 
       SET quantity = COALESCE($2, quantity),
           expiration_date = COALESCE($3, expiration_date),
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $5
       RETURNING id, name, quantity, unit, expiration_date`,
      [itemId, quantity, expirationDate, notes, context.userId]
    );
    
    return result.rows[0];
  }

  async removePantryItem(params, context) {
    const { itemId } = params;
    
    const result = await query(
      `DELETE FROM pantry_items WHERE id = $1 AND user_id = $2 RETURNING name`,
      [itemId, context.userId]
    );
    
    return { deleted: result.rowCount > 0, item: result.rows[0]?.name };
  }

  async getExpiringItems(params, context) {
    const { days = 7 } = params;
    
    const result = await query(
      `SELECT id, name, quantity, unit, expiration_date,
              DATE_PART('day', expiration_date - CURRENT_DATE) as days_until_expiry
       FROM pantry_items
       WHERE user_id = $1 
         AND expiration_date IS NOT NULL
         AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2::interval
       ORDER BY expiration_date ASC`,
      [context.userId, `${days} days`]
    );
    
    return result.rows;
  }

  async checkPantryForRecipe(params, context) {
    const { recipeId } = params;
    
    // Get recipe ingredients
    const recipeResult = await query(
      `SELECT ri.name, ri.amount, ri.unit
       FROM recipe_ingredients ri
       WHERE ri.recipe_id = $1`,
      [recipeId]
    );
    
    const requiredIngredients = recipeResult.rows;
    
    // Get user's pantry
    const pantryResult = await query(
      `SELECT name, quantity, unit FROM pantry_items WHERE user_id = $1`,
      [context.userId]
    );
    
    const pantryItems = pantryResult.rows;
    
    // Check availability
    const available = [];
    const missing = [];
    
    for (const ingredient of requiredIngredients) {
      const pantryItem = pantryItems.find(p => 
        p.name.toLowerCase() === ingredient.name.toLowerCase()
      );
      
      if (pantryItem && pantryItem.quantity >= ingredient.amount) {
        available.push(ingredient.name);
      } else {
        missing.push({
          name: ingredient.name,
          needed: ingredient.amount,
          unit: ingredient.unit,
          have: pantryItem?.quantity || 0
        });
      }
    }
    
    return {
      canMake: missing.length === 0,
      available,
      missing,
      completeness: (available.length / requiredIngredients.length) * 100
    };
  }

  // ============ RECIPE TOOLS IMPLEMENTATION ============

  async searchRecipes(params, context) {
    const { ingredients, mealType, difficulty, maxTime, diet, limit = 10 } = params;
    
    let sql = `
      SELECT DISTINCT r.id, r.name, r.description, r.prep_time, r.cook_time, 
             r.servings, r.difficulty, r.meal_type,
             (r.prep_time + r.cook_time) as total_time
      FROM recipes r
      WHERE (r.is_public = true OR r.user_id = $1)
    `;
    
    const queryParams = [context.userId];
    let paramIndex = 2;
    
    if (ingredients && ingredients.length > 0) {
      sql += ` AND EXISTS (
        SELECT 1 FROM recipe_ingredients ri 
        WHERE ri.recipe_id = r.id 
        AND ri.name ILIKE ANY($${paramIndex}::text[])
      )`;
      queryParams.push(ingredients.map(i => `%${i}%`));
      paramIndex++;
    }
    
    if (mealType) {
      sql += ` AND r.meal_type = $${paramIndex}`;
      queryParams.push(mealType);
      paramIndex++;
    }
    
    if (difficulty) {
      sql += ` AND r.difficulty = $${paramIndex}`;
      queryParams.push(difficulty);
      paramIndex++;
    }
    
    if (maxTime) {
      sql += ` AND (r.prep_time + r.cook_time) <= $${paramIndex}`;
      queryParams.push(maxTime);
      paramIndex++;
    }
    
    sql += ` ORDER BY r.created_at DESC LIMIT $${paramIndex}`;
    queryParams.push(limit);
    
    const result = await query(sql, queryParams);
    return result.rows;
  }

  async getRecipeDetails(params, context) {
    const { recipeId } = params;
    
    // Get recipe
    const recipeResult = await query(
      `SELECT r.id, r.name, r.description, r.instructions, r.prep_time, r.cook_time,
              r.servings, r.difficulty, r.meal_type,
              n.calories, n.protein, n.carbohydrates, n.fat, n.fiber, n.sugar
       FROM recipes r
       LEFT JOIN nutrition_info n ON r.id = n.recipe_id
       WHERE r.id = $1 AND (r.is_public = true OR r.user_id = $2)`,
      [recipeId, context.userId]
    );
    
    if (recipeResult.rows.length === 0) {
      throw new Error('Recipe not found');
    }
    
    const recipe = recipeResult.rows[0];
    
    // Get ingredients
    const ingredientsResult = await query(
      `SELECT name, amount, unit FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY id`,
      [recipeId]
    );
    
    recipe.ingredients = ingredientsResult.rows;
    
    return recipe;
  }

  async getRecipeIngredients(params, context) {
    const { recipeId } = params;
    
    const result = await query(
      `SELECT name, amount, unit FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY id`,
      [recipeId]
    );
    
    return result.rows;
  }

  async createRecipe(params, context) {
    const { name, description, instructions, prepTime, cookTime, servings, difficulty, mealType, ingredients } = params;
    
    // Create recipe
    const recipeResult = await query(
      `INSERT INTO recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, meal_type, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
       RETURNING id, name`,
      [context.userId, name, description, instructions, prepTime, cookTime, servings, difficulty, mealType]
    );
    
    const recipe = recipeResult.rows[0];
    
    // Add ingredients if provided
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        await query(
          `INSERT INTO recipe_ingredients (recipe_id, name, amount, unit)
           VALUES ($1, $2, $3, $4)`,
          [recipe.id, ingredient.name, ingredient.amount, ingredient.unit]
        );
      }
    }
    
    return recipe;
  }

  // ============ MEAL PLAN TOOLS IMPLEMENTATION ============

  async getMealPlans(params, context) {
    const result = await query(
      `SELECT mp.id, mp.name, mp.start_date, mp.end_date, mp.notes,
              COUNT(mpe.id) as meal_count
       FROM meal_plans mp
       LEFT JOIN meal_plan_entries mpe ON mp.id = mpe.meal_plan_id
       WHERE mp.user_id = $1
       GROUP BY mp.id
       ORDER BY mp.start_date DESC`,
      [context.userId]
    );
    
    return result.rows;
  }

  async getMealPlanDetails(params, context) {
    const { mealPlanId } = params;
    
    const planResult = await query(
      `SELECT id, name, start_date, end_date, notes FROM meal_plans 
       WHERE id = $1 AND user_id = $2`,
      [mealPlanId, context.userId]
    );
    
    if (planResult.rows.length === 0) {
      throw new Error('Meal plan not found');
    }
    
    const plan = planResult.rows[0];
    
    // Get entries
    const entriesResult = await query(
      `SELECT mpe.id, mpe.meal_date, mpe.meal_type, mpe.notes,
              r.id as recipe_id, r.name as recipe_name, r.prep_time, r.cook_time
       FROM meal_plan_entries mpe
       JOIN recipes r ON mpe.recipe_id = r.id
       WHERE mpe.meal_plan_id = $1
       ORDER BY mpe.meal_date, mpe.meal_type`,
      [mealPlanId]
    );
    
    plan.entries = entriesResult.rows;
    
    return plan;
  }

  async createMealPlan(params, context) {
    const { name, startDate, endDate, notes } = params;
    
    const result = await query(
      `INSERT INTO meal_plans (user_id, name, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, start_date, end_date`,
      [context.userId, name, startDate, endDate, notes || null]
    );
    
    return result.rows[0];
  }

  async addMealToPlan(params, context) {
    const { mealPlanId, recipeId, mealDate, mealType, notes } = params;
    
    // Verify meal plan belongs to user
    const planCheck = await query(
      `SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2`,
      [mealPlanId, context.userId]
    );
    
    if (planCheck.rows.length === 0) {
      throw new Error('Meal plan not found');
    }
    
    const result = await query(
      `INSERT INTO meal_plan_entries (meal_plan_id, recipe_id, meal_date, meal_type, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, meal_date, meal_type`,
      [mealPlanId, recipeId, mealDate, mealType, notes || null]
    );
    
    return result.rows[0];
  }

  async removeMealFromPlan(params, context) {
    const { entryId } = params;
    
    const result = await query(
      `DELETE FROM meal_plan_entries mpe
       USING meal_plans mp
       WHERE mpe.id = $1 
         AND mpe.meal_plan_id = mp.id 
         AND mp.user_id = $2
       RETURNING mpe.id`,
      [entryId, context.userId]
    );
    
    return { deleted: result.rowCount > 0 };
  }

  // ============ GROCERY LIST TOOLS IMPLEMENTATION ============

  async getGroceryLists(params, context) {
    const result = await query(
      `SELECT gl.id, gl.name, gl.created_at,
              COUNT(gli.id) as item_count,
              SUM(CASE WHEN gli.is_purchased THEN 1 ELSE 0 END) as purchased_count
       FROM grocery_lists gl
       LEFT JOIN grocery_list_items gli ON gl.id = gli.list_id
       WHERE gl.user_id = $1
       GROUP BY gl.id
       ORDER BY gl.created_at DESC`,
      [context.userId]
    );
    
    return result.rows;
  }

  async createGroceryList(params, context) {
    const { name } = params;
    
    const result = await query(
      `INSERT INTO grocery_lists (user_id, name)
       VALUES ($1, $2)
       RETURNING id, name, created_at`,
      [context.userId, name]
    );
    
    return result.rows[0];
  }

  async addItemToGroceryList(params, context) {
    const { listId, itemName, quantity, unit, category } = params;
    
    // Verify list belongs to user
    const listCheck = await query(
      `SELECT id FROM grocery_lists WHERE id = $1 AND user_id = $2`,
      [listId, context.userId]
    );
    
    if (listCheck.rows.length === 0) {
      throw new Error('Grocery list not found');
    }
    
    const result = await query(
      `INSERT INTO grocery_list_items (list_id, item_name, quantity, unit, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, item_name, quantity, unit, category`,
      [listId, itemName, quantity, unit || 'pieces', category || 'other']
    );
    
    return result.rows[0];
  }

  async generateGroceryListFromMealPlan(params, context) {
    const { mealPlanId } = params;
    
    // Verify meal plan belongs to user
    const planCheck = await query(
      `SELECT name FROM meal_plans WHERE id = $1 AND user_id = $2`,
      [mealPlanId, context.userId]
    );
    
    if (planCheck.rows.length === 0) {
      throw new Error('Meal plan not found');
    }
    
    // Create grocery list
    const listName = `Grocery List for ${planCheck.rows[0].name}`;
    const listResult = await query(
      `INSERT INTO grocery_lists (user_id, name)
       VALUES ($1, $2)
       RETURNING id`,
      [context.userId, listName]
    );
    
    const listId = listResult.rows[0].id;
    
    // Get all ingredients from meal plan recipes
    const ingredientsResult = await query(
      `SELECT ri.name, SUM(ri.amount) as total_amount, ri.unit
       FROM meal_plan_entries mpe
       JOIN recipe_ingredients ri ON mpe.recipe_id = ri.recipe_id
       WHERE mpe.meal_plan_id = $1
       GROUP BY ri.name, ri.unit
       ORDER BY ri.name`,
      [mealPlanId]
    );
    
    // Add to grocery list
    for (const ingredient of ingredientsResult.rows) {
      await query(
        `INSERT INTO grocery_list_items (list_id, item_name, quantity, unit)
         VALUES ($1, $2, $3, $4)`,
        [listId, ingredient.name, ingredient.total_amount, ingredient.unit]
      );
    }
    
    return {
      listId,
      listName,
      itemCount: ingredientsResult.rows.length
    };
  }

  // ============ CALCULATION TOOLS IMPLEMENTATION ============

  async calculateNutrition(params, context) {
    // Basic nutrition calculation
    // In production, would use nutrition API
    const { ingredients } = params;
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    // Simple estimation (would use real nutrition API in production)
    for (const ingredient of ingredients) {
      // Basic estimation based on common foods
      totalCalories += ingredient.amount * 50; // rough estimate
      totalProtein += ingredient.amount * 5;
      totalCarbs += ingredient.amount * 10;
      totalFat += ingredient.amount * 3;
    }
    
    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      carbohydrates: Math.round(totalCarbs),
      fat: Math.round(totalFat),
      note: 'Estimated values - would use nutrition API in production'
    };
  }

  async convertUnits(params, context) {
    const { amount, fromUnit, toUnit } = params;
    
    const conversions = {
      // Volume conversions to ml
      'cups_to_ml': 236.588,
      'tablespoons_to_ml': 14.787,
      'teaspoons_to_ml': 4.929,
      'liters_to_ml': 1000,
      
      // Weight conversions to grams
      'ounces_to_grams': 28.35,
      'pounds_to_grams': 453.592,
      'kilograms_to_grams': 1000,
    };
    
    const key = `${fromUnit}_to_${toUnit}`;
    if (conversions[key]) {
      return {
        amount: amount * conversions[key],
        unit: toUnit,
        original: { amount, unit: fromUnit }
      };
    }
    
    // Try reverse conversion
    const reverseKey = `${toUnit}_to_${fromUnit}`;
    if (conversions[reverseKey]) {
      return {
        amount: amount / conversions[reverseKey],
        unit: toUnit,
        original: { amount, unit: fromUnit }
      };
    }
    
    throw new Error(`Conversion not supported: ${fromUnit} to ${toUnit}`);
  }

  async scaleRecipe(params, context) {
    const { recipeId, newServings } = params;
    
    const recipe = await this.getRecipeDetails({ recipeId }, context);
    const scaleFactor = newServings / recipe.servings;
    
    const scaledIngredients = recipe.ingredients.map(ing => ({
      ...ing,
      amount: Math.round(ing.amount * scaleFactor * 100) / 100
    }));
    
    return {
      originalServings: recipe.servings,
      newServings,
      scaleFactor,
      ingredients: scaledIngredients
    };
  }

  async estimateCookingTime(params, context) {
    const { recipeIds } = params;
    
    let totalTime = 0;
    const recipes = [];
    
    for (const recipeId of recipeIds) {
      const result = await query(
        `SELECT name, prep_time, cook_time FROM recipes WHERE id = $1`,
        [recipeId]
      );
      
      if (result.rows.length > 0) {
        const recipe = result.rows[0];
        const time = (recipe.prep_time || 0) + (recipe.cook_time || 0);
        totalTime += time;
        recipes.push({ ...recipe, total_time: time });
      }
    }
    
    return {
      totalTime,
      recipes,
      averageTime: Math.round(totalTime / recipes.length)
    };
  }

  // ============ ANALYSIS TOOLS ============

  async analyzeDietaryCompliance(params, context) {
    const { recipeId, dietaryRestrictions } = params;
    
    const recipe = await this.getRecipeDetails({ recipeId }, context);
    
    // Simple compliance check (would be more sophisticated in production)
    const issues = [];
    const restrictions = Array.isArray(dietaryRestrictions) ? dietaryRestrictions : [dietaryRestrictions];
    
    for (const restriction of restrictions) {
      if (restriction === 'vegetarian') {
        const hasMeat = recipe.ingredients.some(ing => 
          /meat|chicken|beef|pork|fish/i.test(ing.name)
        );
        if (hasMeat) issues.push('Contains meat products');
      }
      
      if (restriction === 'vegan') {
        const hasAnimal = recipe.ingredients.some(ing =>
          /meat|chicken|beef|pork|fish|egg|milk|cheese|butter|cream/i.test(ing.name)
        );
        if (hasAnimal) issues.push('Contains animal products');
      }
      
      if (restriction === 'gluten-free') {
        const hasGluten = recipe.ingredients.some(ing =>
          /wheat|flour|bread|pasta/i.test(ing.name)
        );
        if (hasGluten) issues.push('Contains gluten');
      }
    }
    
    return {
      compliant: issues.length === 0,
      issues,
      restrictions
    };
  }

  async suggestIngredientSubstitutions(params, context) {
    const { ingredient, reason } = params;
    
    // Simple substitution suggestions
    const substitutions = {
      'butter': ['olive oil', 'coconut oil', 'margarine'],
      'milk': ['almond milk', 'soy milk', 'oat milk'],
      'egg': ['flax egg', 'chia egg', 'applesauce'],
      'flour': ['almond flour', 'coconut flour', 'gluten-free flour'],
      'sugar': ['honey', 'maple syrup', 'stevia'],
    };
    
    const suggestions = [];
    for (const [key, subs] of Object.entries(substitutions)) {
      if (ingredient.toLowerCase().includes(key)) {
        suggestions.push(...subs);
      }
    }
    
    return {
      original: ingredient,
      suggestions: suggestions.length > 0 ? suggestions : ['No substitutions available'],
      reason
    };
  }

  async calculateMealPlanNutrition(params, context) {
    const { mealPlanId } = params;
    
    // Get all recipes in meal plan
    const result = await query(
      `SELECT r.id, n.calories, n.protein, n.carbohydrates, n.fat
       FROM meal_plan_entries mpe
       JOIN recipes r ON mpe.recipe_id = r.id
       LEFT JOIN nutrition_info n ON r.id = n.recipe_id
       WHERE mpe.meal_plan_id = $1`,
      [mealPlanId]
    );
    
    const totals = result.rows.reduce((acc, row) => ({
      calories: acc.calories + (row.calories || 0),
      protein: acc.protein + (row.protein || 0),
      carbohydrates: acc.carbohydrates + (row.carbohydrates || 0),
      fat: acc.fat + (row.fat || 0)
    }), { calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
    
    const days = result.rows.length / 3; // Assuming 3 meals per day
    
    return {
      ...totals,
      dailyAverage: {
        calories: Math.round(totals.calories / days),
        protein: Math.round(totals.protein / days),
        carbohydrates: Math.round(totals.carbohydrates / days),
        fat: Math.round(totals.fat / days)
      },
      mealCount: result.rows.length
    };
  }
}

module.exports = ToolRegistry;
