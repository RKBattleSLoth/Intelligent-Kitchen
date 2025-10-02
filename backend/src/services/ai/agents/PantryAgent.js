/**
 * Pantry Agent
 * Specialist for pantry inventory management
 */

const OpenRouterService = require('../OpenRouterService');

class PantryAgent {
  constructor(tools) {
    this.openRouter = OpenRouterService;
    this.tools = tools;
  }

  async execute(action, params, context) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (action) {
        case 'check_inventory':
          result = await this.checkInventory(params, context);
          break;
        case 'find_expiring_items':
          result = await this.findExpiringItems(params, context);
          break;
        case 'suggest_usage':
          result = await this.suggestUsage(params, context);
          break;
        case 'add_items':
          result = await this.addItems(params, context);
          break;
        case 'remove_items':
          result = await this.removeItems(params, context);
          break;
        case 'search_items':
          result = await this.searchItems(params, context);
          break;
        case 'general_help':
          result = await this.generalHelp(params, context);
          break;
        default:
          throw new Error(`Unknown pantry action: ${action}`);
      }

      return {
        ...result,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`PantryAgent error (${action}):`, error);
      return {
        success: false,
        message: `Error in pantry operation: ${error.message}`,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  async checkInventory(params, context) {
    // Get pantry items from tools
    const pantryItems = await this.tools.get_pantry_items({}, context);
    
    if (!pantryItems || pantryItems.length === 0) {
      return {
        success: true,
        message: "Your pantry is currently empty. Would you like to add some items?",
        data: { items: [], count: 0 },
      };
    }

    const analysisPrompt = `
Analyze this pantry inventory and provide useful insights.

Pantry Items (${pantryItems.length} total):
${JSON.stringify(pantryItems, null, 2)}

Provide:
1. A brief summary of what's in the pantry
2. Suggestions for what meals can be made
3. Any items that might be running low
4. Categories of items available

Format as a conversational response.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a pantry inventory specialist.' },
      { role: 'user', content: analysisPrompt },
    ], { tier: 'medium', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: { 
        items: pantryItems, 
        count: pantryItems.length,
        categories: this.categorizeItems(pantryItems),
      },
    };
  }

  async findExpiringItems(params, context) {
    const daysThreshold = params.days || 7;
    
    // Get all pantry items
    const pantryItems = await this.tools.get_pantry_items({}, context);
    
    // Filter items expiring soon
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + (daysThreshold * 24 * 60 * 60 * 1000));
    
    const expiringItems = pantryItems.filter(item => {
      if (item.expiry_date) {
        const expiryDate = new Date(item.expiry_date);
        return expiryDate <= thresholdDate && expiryDate >= now;
      }
      return false;
    });

    if (expiringItems.length === 0) {
      return {
        success: true,
        message: `No items expiring in the next ${daysThreshold} days.`,
        data: { items: [], count: 0 },
      };
    }

    const urgency = expiringItems.length > 5 ? 'high' : 'medium';
    const message = `Found ${expiringItems.length} items expiring within ${daysThreshold} days:\n\n` +
      expiringItems.map(item => 
        `• ${item.name} - expires ${new Date(item.expiry_date).toLocaleDateString()}`
      ).join('\n');

    return {
      success: true,
      message,
      data: {
        items: expiringItems,
        count: expiringItems.length,
        urgency,
        daysThreshold,
      },
    };
  }

  async suggestUsage(params, context) {
    const item = params.item || params.itemName;
    
    if (!item) {
      return {
        success: false,
        message: "Please specify which item you'd like suggestions for.",
      };
    }

    // Search for recipes using this ingredient
    const recipes = await this.tools.search_recipes({ 
      ingredients: [item],
      limit: 10 
    }, context);

    const suggestionPrompt = `
Suggest creative ways to use "${item}" before it expires.

Available Recipes Using This Ingredient:
${JSON.stringify(recipes.slice(0, 5), null, 2)}

Provide 3-5 practical suggestions including:
- Quick meal ideas
- Storage tips to extend freshness
- Recipe recommendations from the list
- Alternative uses

Be conversational and helpful.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a cooking and food storage expert.' },
      { role: 'user', content: suggestionPrompt },
    ], { tier: 'small', temperature: 0.8 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: {
        item,
        recipes: recipes.slice(0, 5),
        recipeCount: recipes.length,
      },
    };
  }

  async addItems(params, context) {
    const items = params.items || [params];
    const results = [];

    for (const item of items) {
      try {
        const result = await this.tools.add_pantry_item(item, context);
        results.push({ item: item.name, success: true, data: result });
      } catch (error) {
        results.push({ item: item.name, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const message = `Successfully added ${successCount} of ${items.length} items to your pantry.`;

    return {
      success: true,
      message,
      data: { results, count: successCount },
    };
  }

  async removeItems(params, context) {
    const items = params.items || [params.itemId];
    const results = [];

    for (const itemId of items) {
      try {
        await this.tools.remove_pantry_item({ id: itemId }, context);
        results.push({ itemId, success: true });
      } catch (error) {
        results.push({ itemId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const message = `Successfully removed ${successCount} of ${items.length} items from your pantry.`;

    return {
      success: true,
      message,
      data: { results, count: successCount },
    };
  }

  async searchItems(params, context) {
    const query = params.query || params.search;
    
    const pantryItems = await this.tools.get_pantry_items({}, context);
    const matching = pantryItems.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );

    if (matching.length === 0) {
      return {
        success: true,
        message: `No items found matching "${query}".`,
        data: { items: [], count: 0 },
      };
    }

    const message = `Found ${matching.length} items matching "${query}":\n\n` +
      matching.map(item => `• ${item.name} - ${item.quantity} ${item.unit}`).join('\n');

    return {
      success: true,
      message,
      data: { items: matching, count: matching.length },
    };
  }

  async generalHelp(params, context) {
    const query = params.query || "help with pantry";
    
    // Get pantry context
    const pantryItems = await this.tools.get_pantry_items({}, context);

    const helpPrompt = `
User Question: "${query}"

User's Pantry: ${pantryItems.length} items
${JSON.stringify(pantryItems.slice(0, 10), null, 2)}
${pantryItems.length > 10 ? `\n(showing first 10 of ${pantryItems.length})` : ''}

Provide helpful assistance related to pantry management. Be conversational and practical.
`;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a helpful pantry management assistant.' },
      { role: 'user', content: helpPrompt },
    ], { tier: 'small', temperature: 0.7 });

    return {
      success: true,
      message: response.choices[0].message.content,
      data: { pantryCount: pantryItems.length },
    };
  }

  categorizeItems(items) {
    const categories = {};
    
    for (const item of items) {
      const category = item.category || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    }

    return categories;
  }

  getCapabilities() {
    return {
      name: 'Pantry Agent',
      actions: [
        'check_inventory',
        'find_expiring_items',
        'suggest_usage',
        'add_items',
        'remove_items',
        'search_items',
        'general_help',
      ],
      description: 'Manages pantry inventory, tracks expiration, and suggests item usage',
    };
  }
}

module.exports = PantryAgent;
