/**
 * BetsyAgent - LLM-powered intent classification for kitchen assistant
 * Interprets natural language commands and extracts structured intents + entities
 */

const OpenRouterClient = require('./OpenRouterClient');

class BetsyAgent {
  constructor() {
    this.client = new OpenRouterClient();
    // Use claude-3-5-haiku (the current fast model) or fall back to claude-3.5-sonnet
    this.model = process.env.OPENROUTER_BETSY_MODEL || 'anthropic/claude-3-5-haiku-20241022';
  }

  /**
   * Interpret user input and return structured intent + entities
   * Strategy: Try fast fallback first, only use LLM for unknown/ambiguous commands
   */
  async interpret(userInput, context = {}) {
    const startTime = Date.now();
    
    console.log('🤖 [BETSY_AGENT] Interpreting:', {
      input: userInput,
      context
    });

    // Try fallback patterns first (instant, free)
    const fallbackResult = this.fallbackInterpret(userInput);
    
    // If fallback found a known intent, use it
    if (fallbackResult.intent !== 'unknown') {
      const processingTime = Date.now() - startTime;
      console.log('✅ [BETSY_AGENT] Fallback matched in', processingTime, 'ms:', fallbackResult.intent);
      return {
        ...fallbackResult,
        metadata: {
          ...fallbackResult.metadata,
          processingTimeMs: processingTime
        }
      };
    }

    // Only use LLM for truly ambiguous/unknown commands
    console.log('🤖 [BETSY_AGENT] Fallback returned unknown, trying LLM...');
    
    const prompt = this.buildInterpretationPrompt(userInput, context);

    try {
      const response = await this.client.chat([
        {
          role: 'system',
          content: `You are Betsy, a helpful kitchen assistant. Your job is to interpret user commands and return structured JSON responses.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation, just the JSON object.`
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        model: this.model,
        temperature: 0.1,
        maxTokens: 500
      });

      const processingTime = Date.now() - startTime;
      console.log('✅ [BETSY_AGENT] LLM response received in', processingTime, 'ms');

      // Parse the JSON response
      const parsed = this.parseResponse(response.content);
      
      return {
        success: true,
        ...parsed,
        metadata: {
          model: this.model,
          method: 'llm',
          processingTimeMs: processingTime,
          tokensUsed: response.usage?.total_tokens || 0
        }
      };

    } catch (error) {
      console.error('❌ [BETSY_AGENT] LLM Error:', error.message);
      
      // Return the fallback result (which was 'unknown')
      return fallbackResult;
    }
  }

  buildInterpretationPrompt(userInput, context) {
    return `Interpret this kitchen assistant command and return a JSON response.

USER INPUT: "${userInput}"

AVAILABLE INTENTS:
1. "add_shopping_item" - Add item(s) to shopping list
   entities: { items: [{ name: string, quantity?: string, unit?: string }] }
   
2. "navigate" - Go to a page in the app
   entities: { destination: "recipes" | "shopping_list" | "meal_planning" }
   
3. "add_meal" - Plan a meal for a specific time
   entities: { food: string, mealType: "breakfast" | "lunch" | "dinner" | "snack", day?: string }
   
4. "remove_shopping_item" - Remove item from shopping list
   entities: { itemName: string }
   
5. "clear_shopping_list" - Clear all items from shopping list OR clear checked/completed items
   entities: { checkedOnly?: boolean }

6. "clear_meals" - Clear/delete meals from the meal plan
   entities: { timeRange: "today" | "this_week" | "tomorrow", mealType?: "breakfast" | "lunch" | "dinner" | "snack" }
   IMPORTANT: "this week" or "this full week" means timeRange: "this_week", NOT "all"
   
7. "generate_meals" - Use AI to generate/create a meal plan
   entities: { timeRange: "today" | "this_week" | "tomorrow" }

8. "import_recipe" - Import a recipe from a URL
   entities: { url: string, category?: "Breakfast" | "Lunch" | "Dinner" | "Snack" }

9. "search_recipe" - Search for recipes online by keyword and import
   entities: { query: string, category?: "Breakfast" | "Lunch" | "Dinner" | "Snack" }

10. "add_recipe_to_shopping_list" - Add all ingredients from a recipe to the shopping list
    entities: { recipeName: string }

11. "consolidate_shopping_list" - Merge duplicate items and combine quantities in shopping list
    entities: {}

12. "move_meal" - Move a meal from one slot to another
    entities: { fromDay: string, fromMealType: string, toDay: string, toMealType: string }

13. "swap_meals" - Swap two meals between slots
    entities: { day1: string, mealType1: string, day2: string, mealType2: string }

14. "delete_recipe" - Delete a recipe from the collection
    entities: { recipeName: string }

15. "search_recipes" - Search saved recipes by keyword
    entities: { query: string }
   
16. "help" - User needs help or instructions
    entities: {}
   
17. "greeting" - User is saying hello or starting conversation
    entities: {}
   
18. "unknown" - Cannot determine intent
    entities: {}

RESPONSE FORMAT (JSON only, no markdown):
{
  "intent": "<intent_name>",
  "entities": { ... },
  "confidence": 0.0-1.0,
  "response": "<friendly response to say to user>"
}

EXAMPLES:
- "add a gallon of milk to my shopping list" → add_shopping_item with items: [{ name: "milk", quantity: "1", unit: "gallon" }]
- "put eggs and butter on the list" → add_shopping_item with items: [{ name: "eggs" }, { name: "butter" }]
- "show me recipes" → navigate with destination: "recipes"
- "plan pancakes for breakfast saturday" → add_meal with food: "pancakes", mealType: "breakfast", day: "saturday"
- "I need bread, 2 dozen eggs, and a pound of cheese" → add_shopping_item with items: [{ name: "bread" }, { name: "eggs", quantity: "2", unit: "dozen" }, { name: "cheese", quantity: "1", unit: "pound" }]
- "clear all meals for this week" → clear_meals with timeRange: "this_week"
- "clear all meals this week" → clear_meals with timeRange: "this_week" (NOT "all")
- "delete today's meals" → clear_meals with timeRange: "today"
- "remove all breakfast entries this week" → clear_meals with timeRange: "this_week", mealType: "breakfast"
- "use the smart meal planner to create meals for this week" → generate_meals with timeRange: "this_week"
- "generate meals for the full week" → generate_meals with timeRange: "this_week"
- "plan my meals for tomorrow" → generate_meals with timeRange: "tomorrow"
- "import recipe from https://example.com/recipe" → import_recipe with url: "https://example.com/recipe"
- "find me a chicken parmesan recipe" → search_recipe with query: "chicken parmesan"
- "search online for pasta recipes" → search_recipe with query: "pasta"
- "add the spaghetti carbonara ingredients to my shopping list" → add_recipe_to_shopping_list with recipeName: "spaghetti carbonara"
- "consolidate my shopping list" → consolidate_shopping_list
- "merge duplicate items on my list" → consolidate_shopping_list
- "move monday's breakfast to tuesday lunch" → move_meal with fromDay: "monday", fromMealType: "breakfast", toDay: "tuesday", toMealType: "lunch"
- "swap tuesday dinner with wednesday dinner" → swap_meals with day1: "tuesday", mealType1: "dinner", day2: "wednesday", mealType2: "dinner"
- "clear completed items from shopping list" → clear_shopping_list with checkedOnly: true
- "remove checked items" → clear_shopping_list with checkedOnly: true
- "delete the pancakes recipe" → delete_recipe with recipeName: "pancakes"
- "search my recipes for chicken" → search_recipes with query: "chicken"
- "find recipes with pasta" → search_recipes with query: "pasta"

Now interpret the user input and respond with JSON only:`;
  }

  parseResponse(content) {
    try {
      // Remove any markdown code blocks if present
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
      }
      
      const parsed = JSON.parse(cleaned);
      
      // Validate required fields
      if (!parsed.intent) {
        throw new Error('Missing intent field');
      }
      
      return {
        intent: parsed.intent,
        entities: parsed.entities || {},
        confidence: parsed.confidence || 0.5,
        response: parsed.response || this.getDefaultResponse(parsed.intent)
      };
    } catch (error) {
      console.error('❌ [BETSY_AGENT] Failed to parse response:', error.message);
      console.error('Raw content:', content);
      
      return {
        intent: 'unknown',
        entities: {},
        confidence: 0,
        response: "I'm having trouble understanding. Could you try rephrasing that?"
      };
    }
  }

  getDefaultResponse(intent) {
    const responses = {
      add_shopping_item: "I'll add that to your shopping list.",
      navigate: "Taking you there now!",
      add_meal: "I'll add that to your meal plan.",
      remove_shopping_item: "I'll remove that from your list.",
      clear_shopping_list: "I'll clear your shopping list.",
      clear_meals: "I'll clear those meals from your plan.",
      generate_meals: "I'll generate a meal plan for you!",
      import_recipe: "I'll import that recipe for you!",
      search_recipe: "Let me search for that recipe online!",
      add_recipe_to_shopping_list: "I'll add those ingredients to your shopping list!",
      consolidate_shopping_list: "I'll consolidate your shopping list and merge duplicates!",
      move_meal: "I'll move that meal for you!",
      swap_meals: "I'll swap those meals!",
      delete_recipe: "I'll delete that recipe.",
      search_recipes: "Let me search your recipes!",
      help: "I can help you manage shopping lists, plan meals, import recipes, and more!",
      greeting: "Hello! How can I help you in the kitchen today?",
      unknown: "I'm not sure what you mean. Try saying 'help' for options."
    };
    return responses[intent] || responses.unknown;
  }

  /**
   * Fallback interpretation using keyword matching (when LLM fails)
   */
  fallbackInterpret(userInput) {
    const text = userInput.toLowerCase();
    
    console.log('⚠️ [BETSY_AGENT] Using fallback interpretation');

    // Check for add shopping item patterns first (before navigation)
    if (text.match(/^(add|put|get|buy|need|pick up)\b/i) && !text.match(/\b(breakfast|lunch|dinner|snack)\b/i)) {
      const itemText = text
        .replace(/^(add|put|get|buy|need|pick up)\s+/i, '')
        .replace(/\s+(to|on|in)\s+(the\s+)?(shopping\s+)?(list|cart).*$/i, '')
        .replace(/\s+please$/i, '')
        .trim();
      
      if (itemText) {
        return {
          success: true,
          intent: 'add_shopping_item',
          entities: { items: [{ name: itemText }] },
          confidence: 0.6,
          response: `I'll add "${itemText}" to your shopping list.`,
          metadata: { method: 'fallback' }
        };
      }
    }

    // Navigation patterns
    if (text.includes('recipe')) {
      return {
        success: true,
        intent: 'navigate',
        entities: { destination: 'recipes' },
        confidence: 0.7,
        response: 'Taking you to recipes!',
        metadata: { method: 'fallback' }
      };
    }

    if (text.includes('shopping') || text.includes('groceries') || text.includes('list')) {
      return {
        success: true,
        intent: 'navigate',
        entities: { destination: 'shopping_list' },
        confidence: 0.7,
        response: "Here's your shopping list!",
        metadata: { method: 'fallback' }
      };
    }

    // Clear meals pattern (check before navigate to meal planning)
    if ((text.includes('clear') || text.includes('delete') || text.includes('remove')) && 
        (text.includes('meal') || text.includes('plan'))) {
      let timeRange = 'this_week';
      if (text.includes('today')) timeRange = 'today';
      else if (text.includes('tomorrow')) timeRange = 'tomorrow';
      // "this week" or "full week" should be this_week, not checking for "all" alone
      
      return {
        success: true,
        intent: 'clear_meals',
        entities: { timeRange },
        confidence: 0.7,
        response: `I'll clear the meals for ${timeRange.replace('_', ' ')}.`,
        metadata: { method: 'fallback' }
      };
    }

    // Generate meals pattern (check before navigate to meal planning)
    if ((text.includes('generate') || text.includes('create') || text.includes('smart meal planner') || 
         text.includes('make meals') || text.includes('plan meals')) && 
        (text.includes('meal') || text.includes('week') || text.includes('plan'))) {
      let timeRange = 'this_week';
      if (text.includes('today')) timeRange = 'today';
      else if (text.includes('tomorrow')) timeRange = 'tomorrow';
      
      return {
        success: true,
        intent: 'generate_meals',
        entities: { timeRange },
        confidence: 0.7,
        response: `I'll generate meals for ${timeRange.replace('_', ' ')}!`,
        metadata: { method: 'fallback' }
      };
    }

    // Swap meals pattern
    if (text.includes('swap')) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      let day1 = null, mealType1 = null, day2 = null, mealType2 = null;
      
      for (const day of days) {
        if (text.includes(day)) {
          if (!day1) day1 = day;
          else if (!day2) day2 = day;
        }
      }
      for (const meal of mealTypes) {
        if (text.includes(meal)) {
          if (!mealType1) mealType1 = meal;
          else if (!mealType2) mealType2 = meal;
        }
      }
      
      // If only one meal type mentioned, use it for both
      if (mealType1 && !mealType2) mealType2 = mealType1;
      
      if (day1 && day2 && mealType1 && mealType2) {
        return {
          success: true,
          intent: 'swap_meals',
          entities: { day1, mealType1, day2, mealType2 },
          confidence: 0.7,
          response: `I'll swap ${day1} ${mealType1} with ${day2} ${mealType2}!`,
          metadata: { method: 'fallback' }
        };
      }
    }

    // Move meal pattern
    if (text.includes('move')) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'today', 'tomorrow'];
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      let fromDay = null, fromMealType = null, toDay = null, toMealType = null;
      
      // Find days in order
      for (const day of days) {
        const idx = text.indexOf(day);
        if (idx !== -1) {
          if (!fromDay) fromDay = day;
          else if (!toDay && text.indexOf(day, idx + 1) !== -1) toDay = day;
          else if (!toDay) toDay = day;
        }
      }
      
      // Find meal types
      for (const meal of mealTypes) {
        if (text.includes(meal)) {
          if (!fromMealType) fromMealType = meal;
          else if (!toMealType) toMealType = meal;
        }
      }
      
      if (fromDay && fromMealType && toDay && toMealType) {
        return {
          success: true,
          intent: 'move_meal',
          entities: { fromDay, fromMealType, toDay, toMealType },
          confidence: 0.7,
          response: `I'll move ${fromDay} ${fromMealType} to ${toDay} ${toMealType}!`,
          metadata: { method: 'fallback' }
        };
      }
    }

    // Import recipe from URL
    if (text.includes('import') && (text.includes('http://') || text.includes('https://'))) {
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        return {
          success: true,
          intent: 'import_recipe',
          entities: { url: urlMatch[0] },
          confidence: 0.8,
          response: "I'll import that recipe for you!",
          metadata: { method: 'fallback' }
        };
      }
    }

    // Add recipe ingredients to shopping list
    if ((text.includes('add') && text.includes('ingredients')) || 
        (text.includes('add') && text.includes('shopping') && text.includes('recipe'))) {
      // Extract recipe name - everything after "add" and before "ingredients" or "to"
      const recipeMatch = text.match(/add\s+(?:the\s+)?(.+?)\s+(?:ingredients|to)/i);
      if (recipeMatch) {
        return {
          success: true,
          intent: 'add_recipe_to_shopping_list',
          entities: { recipeName: recipeMatch[1].trim() },
          confidence: 0.7,
          response: "I'll add those ingredients to your shopping list!",
          metadata: { method: 'fallback' }
        };
      }
    }

    // Consolidate shopping list
    if (text.includes('consolidate') || (text.includes('merge') && text.includes('list'))) {
      return {
        success: true,
        intent: 'consolidate_shopping_list',
        entities: {},
        confidence: 0.8,
        response: "I'll consolidate your shopping list!",
        metadata: { method: 'fallback' }
      };
    }

    // Search recipes
    if ((text.includes('search') || text.includes('find')) && text.includes('recipe')) {
      const queryMatch = text.match(/(?:search|find)\s+(?:my\s+)?(?:recipes?\s+)?(?:for\s+)?(.+)/i);
      if (queryMatch) {
        return {
          success: true,
          intent: 'search_recipes',
          entities: { query: queryMatch[1].replace(/recipes?/gi, '').trim() },
          confidence: 0.7,
          response: "Let me search your recipes!",
          metadata: { method: 'fallback' }
        };
      }
    }

    // Delete recipe
    if ((text.includes('delete') || text.includes('remove')) && text.includes('recipe')) {
      const nameMatch = text.match(/(?:delete|remove)\s+(?:the\s+)?(.+?)\s+recipe/i);
      if (nameMatch) {
        return {
          success: true,
          intent: 'delete_recipe',
          entities: { recipeName: nameMatch[1].trim() },
          confidence: 0.7,
          response: "I'll delete that recipe.",
          metadata: { method: 'fallback' }
        };
      }
    }

    if (text.includes('meal') || text.includes('plan')) {
      return {
        success: true,
        intent: 'navigate',
        entities: { destination: 'meal_planning' },
        confidence: 0.7,
        response: "Let's work on your meal plan!",
        metadata: { method: 'fallback' }
      };
    }

    if (text.includes('help')) {
      return {
        success: true,
        intent: 'help',
        entities: {},
        confidence: 0.9,
        response: "I can help you add items to your shopping list, plan meals, or navigate the app. Just tell me what you need!",
        metadata: { method: 'fallback' }
      };
    }

    if (text.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/i)) {
      return {
        success: true,
        intent: 'greeting',
        entities: {},
        confidence: 0.9,
        response: "Hello! I'm Betsy, your kitchen assistant. How can I help you today?",
        metadata: { method: 'fallback' }
      };
    }

    return {
      success: true,
      intent: 'unknown',
      entities: {},
      confidence: 0.3,
      response: `I'm not sure how to help with "${userInput}". Try saying "help" to see what I can do!`,
      metadata: { method: 'fallback' }
    };
  }
}

module.exports = BetsyAgent;
