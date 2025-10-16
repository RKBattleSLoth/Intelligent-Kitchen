/**
 * Information Extraction Agent
 * Core extraction agent that processes preprocessed recipe data
 * and extracts structured ingredient information with high accuracy
 */

const RequestRouter = require('../RequestRouter');
const ResponseCache = require('../ResponseCache');
const { extractAndParseJSON } = require('../../../utils/jsonParser');

class InformationExtractionAgent {
  constructor() {
    this.router = new RequestRouter();
    this.cache = new ResponseCache();
    
    // Ingredient categorization system
    this.categories = {
      produce: {
        keywords: ['tomato', 'onion', 'garlic', 'carrot', 'potato', 'lettuce', 'celery', 'pepper', 'cucumber', 'spinach', 'broccoli', 'cauliflower', 'mushroom', 'avocado', 'lemon', 'lime', 'herb', 'basil', 'parsley', 'cilantro', 'mint', 'oregano', 'thyme', 'rosemary', 'sage', 'dill', 'chive', 'fruit', 'apple', 'banana', 'orange', 'berry', 'strawberry', 'blueberry', 'raspberry'],
        subcategories: ['vegetables', 'fruits', 'herbs', 'leafy_greens']
      },
      dairy: {
        keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'cream cheese', 'mozzarella', 'cheddar', 'parmesan', 'gouda', 'brie', 'feta', 'goat cheese', 'blue cheese', 'whipped cream', 'heavy cream', 'half and half', 'evaporated milk', 'condensed milk', 'egg', 'eggs'],
        subcategories: ['milk', 'cheese', 'cream', 'yogurt', 'other']
      },
      meat: {
        keywords: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'sausage', 'bacon', 'ham', 'steak', 'ground beef', 'pork chop', 'chicken breast', 'thigh', 'drumstick', 'wing', 'ribs', 'veal', 'duck', 'seafood', 'crab', 'lobster', 'clams', 'mussels', 'pancetta', 'guanciale'],
        subcategories: ['poultry', 'beef', 'pork', 'lamb', 'seafood', 'processed_meat']
      },
      pantry: {
        keywords: ['flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'soy sauce', 'rice', 'pasta', 'spaghetti', 'bread', 'cereal', 'beans', 'nuts', 'seeds', 'honey', 'maple syrup', 'ketchup', 'mustard', 'mayonnaise', 'hot sauce', 'worcestershire', 'sriracha', 'tobasco', 'barbecue sauce', 'teriyaki', 'hoisin', 'oyster sauce', 'fish sauce', 'coconut milk', 'broth', 'stock', 'bouillon', 'tomato sauce', 'tomato paste', 'canned tomatoes', 'diced tomatoes', 'crushed tomatoes'],
        subcategories: ['grains', 'pasta', 'canned_goods', 'oils_vinegars', 'condiments', 'spices', 'sweeteners', 'nuts_seeds']
      },
      frozen: {
        keywords: ['frozen', 'ice cream', 'frozen vegetables', 'frozen fruit', 'frozen pizza', 'frozen dinners', 'frozen meat', 'frozen fish'],
        subcategories: ['vegetables', 'fruits', 'meals', 'meat_seafood']
      },
      bakery: {
        keywords: ['bread', 'roll', 'bagel', 'croissant', 'muffin', 'cake', 'cookie', 'pastry', 'pie', 'tart', 'biscuit', 'scone', 'donut', 'cinnamon roll', 'baguette', 'ciabatta', 'sourdough', 'rye', 'whole wheat', 'white bread'],
        subcategories: ['bread', 'pastries', 'desserts']
      },
      beverages: {
        keywords: ['water', 'juice', 'soda', 'coffee', 'tea', 'wine', 'beer', 'milk', 'smoothie', 'cocktail', 'spirits', 'liquor', 'energy drink', 'sports drink'],
        subcategories: ['water', 'juice', 'coffee_tea', 'alcoholic', 'other']
      },
      household: {
        keywords: ['paper towel', 'foil', 'plastic wrap', 'trash bag', 'cleaning', 'detergent', 'soap', 'sponge', 'dish soap', 'laundry'],
        subcategories: ['kitchen_supplies', 'cleaning', 'paper_products']
      }
    };
    
    // Preparation methods
    this.preparationMethods = {
      cutting: ['chop', 'dice', 'mince', 'cube', 'slice', 'julienne', 'shred', 'grate', 'peel', 'core', 'pit', 'seed', 'trim'],
      cooking: ['roast', 'bake', 'grill', 'fry', 'sauté', 'sauté', 'sear', 'brown', 'toast', 'broil', 'steam', 'boil', 'simmer', 'poach', 'blanch', 'parboil'],
      mixing: ['mix', 'stir', 'whisk', 'beat', 'fold', 'blend', 'puree', 'cream', 'emulsify'],
      preparation: ['marinate', 'brine', 'cure', 'smoke', 'pickle', 'ferment', 'soak', 'drain', 'rinse', 'pat dry', 'coat', 'dust', 'sprinkle', 'garnish']
    };
    
    // Common ingredient name variations
    this.nameVariations = {
      'tomatoes': 'tomato',
      'onions': 'onion',
      'garlic cloves': 'garlic',
      'carrots': 'carrot',
      'potatoes': 'potato',
      'eggs': 'egg',
      'milk': 'milk',
      'cheese': 'cheese',
      'chicken breast': 'chicken',
      'ground beef': 'beef',
      'butter': 'butter',
      'olive oil': 'olive oil',
      'salt': 'salt',
      'pepper': 'pepper',
      'sugar': 'sugar',
      'flour': 'flour',
      'rice': 'rice',
      'pasta': 'pasta',
      'beans': 'beans',
      'lettuce': 'lettuce',
      'spinach': 'spinach',
      'broccoli': 'broccoli',
      'cauliflower': 'cauliflower',
      'bell pepper': 'pepper',
      'cucumber': 'cucumber',
      'zucchini': 'zucchini',
      'squash': 'squash',
      'mushrooms': 'mushroom',
      'onion powder': 'onion',
      'garlic powder': 'garlic'
    };
  }

  /**
   * Extract structured ingredients from preprocessed data
   */
  async extractIngredients(processedData, options = {}) {
    const { forceModel = null, priority = 'normal', targetServings = null } = options;
    
    const cacheKey = `info_extract_${this.hashProcessedData(processedData)}_${priority}_${targetServings}`;
    
    return await this.cache.wrap('information_extraction', { processedData, options }, async () => {
      // Build extraction prompt
      const prompt = this.buildExtractionPrompt(processedData, targetServings);

      const fallbackModel = process.env.OPENROUTER_EXTRACTION_FALLBACK_MODEL || 'anthropic/claude-3-haiku-20240307';
      const modelCandidates = [];

      if (forceModel) {
        modelCandidates.push({ type: 'tier', value: forceModel });
      } else {
        modelCandidates.push({ type: 'default' });
      }

      if (!forceModel && fallbackModel) {
        modelCandidates.push({ type: 'name', value: fallbackModel });
      }

      let lastError = null;
      let lastRouting = null;

      for (const candidate of modelCandidates) {
        try {
          const routeOptions = {
            prompt,
            maxTokens: 1500,
            temperature: 0.1,
            priority: 'speed'
          };

          if (candidate.type === 'tier') {
            routeOptions.forceModel = candidate.value;
          } else if (candidate.type === 'name') {
            routeOptions.forceModelName = candidate.value;
          }

          const response = await this.router.route('ingredient_extraction', processedData, routeOptions);

          const extractedIngredients = this.parseExtractionResponse(response.content, processedData);
          const enhancedIngredients = this.enhanceIngredients(extractedIngredients, processedData);
          
          return {
            success: true,
            ingredients: enhancedIngredients,
            categorizedIngredients: enhancedIngredients,
            confidence: this.calculateExtractionConfidence(enhancedIngredients, processedData),
            extractionMethod: candidate.type === 'default' ? 'multi_agent' : `multi_agent:${candidate.value}`,
            routing: response.routing,
            metadata: {
              totalIngredients: enhancedIngredients.length,
              hasQuantities: enhancedIngredients.filter(ing => ing.quantity).length,
              hasUnits: enhancedIngredients.filter(ing => ing.unit).length,
              hasPreparation: enhancedIngredients.filter(ing => ing.preparation).length,
              categories: this.getCategoryDistribution(enhancedIngredients),
              processingConfidence: processedData.confidence || 0,
              fallbackUsed: false
            }
          };
        } catch (error) {
          lastError = error;
          lastRouting = candidate.value || candidate.type;
          console.warn('InformationExtractionAgent: model attempt failed, trying fallback', {
            candidate,
            message: error.message
          });
        }
      }

      const fallbackIngredients = Array.isArray(lastError?.fallback) && lastError.fallback.length
        ? lastError.fallback
        : this.buildFallbackIngredients(processedData);
      const enhancedFallback = this.enhanceIngredients(fallbackIngredients, processedData);

      return {
        success: true,
        ingredients: enhancedFallback,
        categorizedIngredients: enhancedFallback,
        confidence: this.calculateExtractionConfidence(enhancedFallback, processedData) * 0.8,
        extractionMethod: 'heuristic_fallback',
        routing: {
          modelTier: 'fallback',
          modelName: lastRouting || 'heuristic',
          taskType: 'ingredient_extraction',
          fallbackReason: lastError?.message
        },
        metadata: {
          totalIngredients: enhancedFallback.length,
          hasQuantities: enhancedFallback.filter(ing => ing.quantity).length,
          hasUnits: enhancedFallback.filter(ing => ing.unit).length,
          hasPreparation: enhancedFallback.filter(ing => ing.preparation).length,
          categories: this.getCategoryDistribution(enhancedFallback),
          processingConfidence: processedData.confidence || 0,
          fallbackUsed: true,
          fallbackReason: lastError?.message
        }
      };
    });
  }

  /**
   * Build the information extraction prompt
   */
  buildExtractionPrompt(processedData, targetServings) {
    const scalingInfo = targetServings && processedData.metadata?.totalIngredients 
      ? `Scale ingredients to ${targetServings} servings if serving information is available.` 
      : '';
    
    return `You are an expert culinary information extraction agent. Your task is to extract and structure ingredient information from preprocessed recipe data.

The recipe has already been processed by a Smart Processing Agent that filtered out non-ingredient content and identified ingredient mentions. Your job is to:

1. **Validate and enhance** the extracted ingredients
2. **Standardize** all measurements and units
3. **Categorize** each ingredient accurately
4. **Identify preparation methods** attached to ingredients
5. **Detect relationships** between ingredients
6. **Handle ambiguities** and make intelligent inferences
7. **Scale quantities** if serving information is available (${scalingInfo})

CRITICAL: Work ONLY with the preprocessed ingredient data. The Smart Processing Agent has already filtered out:
- Step numbers and cooking instructions
- Serving yields and metadata
- Preparation directions
- Non-ingredient content

For each ingredient, provide:
- **name**: Standardized ingredient name (singular, common form)
- **quantity**: Precise decimal quantity
- **unit**: Standard unit (cups, tablespoons, teaspoons, ounces, pounds, grams, pieces, etc.)
- **preparation**: How it should be prepared (chopped, diced, minced, etc. - only if part of ingredient description)
- **category**: Food category (produce, dairy, meat, pantry, etc.)
- **subcategory**: More specific category
- **notes**: Additional context or requirements
- **confidence**: Your confidence in this extraction (0.0-1.0)
- **source**: "ingredients section" (since preprocessing isolated this)

Special considerations:
- Merge duplicate ingredients with combined quantities
- Handle partial quantities (e.g., "1/2 onion") appropriately
- Identify optional ingredients and mark them
- Detect allergens and dietary restrictions
- Recognize brand names vs generic ingredients
- Handle cultural ingredient variations
- ONLY process actual food ingredients, ignore any remaining non-food items

IMPORTANT: If the processed data contains non-ingredient items (shouldn't happen but verify), exclude them from your extraction. Focus exclusively on edible ingredients with quantities and units.

Return as JSON:
{
  "ingredients": [
    {
      "name": "standardized name",
      "quantity": number,
      "unit": "standard unit",
      "preparation": "preparation method",
      "category": "main category",
      "subcategory": "specific category",
      "notes": "additional notes",
      "confidence": 0.0-1.0,
      "source": "ingredients section",
      "optional": boolean,
      "allergens": ["allergen1", "allergen2"]
    }
  ],
  "extraction_confidence": 0.0-1.0,
  "scaling_applied": boolean,
  "duplicates_merged": number,
  "ambiguities_resolved": number,
  "non_ingredients_filtered": number
}

Preprocessed Recipe Data:
${JSON.stringify(processedData, null, 2)}

CRITICAL OUTPUT FORMAT RULES:
- Respond with a single JSON object ONLY.
- Do NOT include explanations, commentary, or code fences.
- The very first character must be '{' and the final character must be '}'.
- If you cannot comply, respond with {"ingredients":[],"extraction_confidence":0,"scaling_applied":false,"duplicates_merged":0,"ambiguities_resolved":0,"non_ingredients_filtered":0}.
`;
  }

  /**
   * Parse the extraction response
   */
  parseExtractionResponse(response, processedData = null) {
    try {
      // Use robust JSON extraction that handles nested structures
      const parsed = extractAndParseJSON(response);
      
      if (!parsed.ingredients || !Array.isArray(parsed.ingredients)) {
        throw new Error('Invalid ingredients format in extraction response');
      }
      
      // Filter out any non-ingredient items that might have slipped through
      const validIngredients = parsed.ingredients.filter(ingredient => {
        const name = (ingredient.name || '').toLowerCase().trim();
        
        // Filter out obvious non-ingredients
        const nonIngredientPatterns = [
          /^step\s*\d+/,
          /^\d+\.\s*$/,
          /^yield\s*:/,
          /^servings?\s*:/,
          /^serves\s*:/,
          /^makes\s*:/,
          /^prep\s*time\s*:/,
          /^cook\s*time\s*:/,
          /^temperature\s*:/,
          /^oven\s*:/,
          /^preheat\s*/,
          /^heat\s*/,
          /^cook\s*/,
          /^bake\s*/,
          /^boil\s*/,
          /^simmer\s*/,
          /^mix\s*/,
          /^stir\s*/,
          /^combine\s*/,
          /^add\s*/,
          /^pour\s*/,
          /^fold\s*/,
          /^whisk\s*/,
          /^beat\s*/
        ];
        
        // Check if name matches any non-ingredient patterns
        const isNonIngredient = nonIngredientPatterns.some(pattern => pattern.test(name));
        
        // Check if it's empty or just numbers/punctuation
        const isEmptyOrInvalid = !name || /^[\d\s\.\,\-:]*$/.test(name);
        
        // Check if it contains food-related keywords
        const foodKeywords = [
          'flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'egg', 'milk', 'cheese',
          'tomato', 'onion', 'garlic', 'carrot', 'potato', 'chicken', 'beef', 'pork',
          'rice', 'pasta', 'bread', 'bean', 'vegetable', 'fruit', 'herb', 'spice',
          'water', 'vinegar', 'soy', 'sauce', 'cream', 'yogurt', 'lemon', 'lime'
        ];
        
        const hasFoodKeyword = foodKeywords.some(keyword => name.includes(keyword));
        
        // Keep only if it's not a non-ingredient, not empty, and has food keywords or looks like an ingredient
        return !isNonIngredient && !isEmptyOrInvalid && (hasFoodKeyword || ingredient.quantity || ingredient.unit);
      });
      
      return validIngredients.map(ingredient => ({
        name: ingredient.name || '',
        quantity: ingredient.quantity || null,
        unit: ingredient.unit || null,
        preparation: ingredient.preparation || null,
        category: ingredient.category || 'other',
        subcategory: ingredient.subcategory || null,
        notes: ingredient.notes || '',
        confidence: parseFloat(ingredient.confidence) || 0.5,
        source: ingredient.source || 'ingredients section',
        optional: Boolean(ingredient.optional),
        allergens: Array.isArray(ingredient.allergens) ? ingredient.allergens : []
      }));
      
    } catch (error) {
      console.error('Failed to parse extraction response:', error);
      const parseError = new Error(error.message || 'Failed to parse extraction response');
      parseError.cause = error;
      parseError.fallback = this.buildFallbackIngredients(processedData);
      throw parseError;
    }
  }

  buildFallbackIngredients(processedData) {
    if (!processedData) return [];
    const source = Array.isArray(processedData.normalizedIngredients) && processedData.normalizedIngredients.length
      ? processedData.normalizedIngredients
      : Array.isArray(processedData.rawIngredients) && processedData.rawIngredients.length
        ? processedData.rawIngredients
        : [];

    return source.map(item => {
      const name = item.name || item.raw_text || item.original || '';
      const category = item.category || this.categorizeIngredient(name);
      return {
        name,
        quantity: this.parseFallbackQuantity(item.quantity),
        unit: item.unit || null,
        preparation: item.preparation || null,
        category,
        subcategory: item.subcategory || this.getSubcategory(name, category),
        notes: item.notes || '',
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.4,
        source: item.context || item.source || 'fallback',
        optional: Boolean(item.optional),
        allergens: Array.isArray(item.allergens) ? item.allergens : []
      };
    });
  }

  buildProcessedIngredientLookup(processedData) {
    const lookup = new Map();
    if (!processedData) {
      return lookup;
    }

    const candidateLists = [];
    if (Array.isArray(processedData.normalizedIngredients)) {
      candidateLists.push(...processedData.normalizedIngredients);
    }
    if (Array.isArray(processedData.rawIngredients)) {
      candidateLists.push(...processedData.rawIngredients);
    }
    if (processedData.structuredData?.ingredients && Array.isArray(processedData.structuredData.ingredients)) {
      candidateLists.push(...processedData.structuredData.ingredients);
    }

    for (const item of candidateLists) {
      if (!item) continue;
      const keyCandidate = item.name || item.raw_text || item.original;
      if (!keyCandidate) continue;
      const normalizedKey = this.normalizeIngredientName(keyCandidate);
      if (!normalizedKey) continue;
      if (!lookup.has(normalizedKey)) {
        lookup.set(normalizedKey, item);
      }
    }

    return lookup;
  }

  inferUnitFromQuantityString(quantityValue, normalizedName = '') {
    if (typeof quantityValue !== 'string') {
      return null;
    }

    const trimmed = quantityValue.trim();
    if (!trimmed) {
      return null;
    }

    const match = trimmed.match(/^([\d\s\/\.\-]+)([a-zA-Z][a-zA-Z\s]*)$/);
    if (!match) {
      return null;
    }

    const unitCandidate = match[2].trim().toLowerCase();
    if (!unitCandidate) {
      return null;
    }

    // If the unit candidate repeats the ingredient name, discard it
    if (normalizedName && (unitCandidate === normalizedName || normalizedName.includes(unitCandidate))) {
      return null;
    }

    const knownUnits = new Set([
      'teaspoon', 'teaspoons', 'tsp', 'tablespoon', 'tablespoons', 'tbsp',
      'cup', 'cups', 'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs',
      'gram', 'grams', 'g', 'kilogram', 'kilograms', 'kg',
      'milliliter', 'milliliters', 'ml', 'liter', 'liters', 'l',
      'slice', 'slices', 'clove', 'cloves', 'can', 'cans', 'bunch', 'bunches',
      'piece', 'pieces', 'stick', 'sticks', 'package', 'packages', 'pinch', 'pinches',
      'sprig', 'sprigs', 'head', 'heads', 'stalk', 'stalks', 'leaf', 'leaves'
    ]);

    const unitWords = unitCandidate.split(/\s+/);
    for (const word of unitWords) {
      if (knownUnits.has(word)) {
        return word;
      }
    }

    return null;
  }

  parseFallbackQuantity(quantity) {
    if (quantity == null) return null;
    if (typeof quantity === 'number') return quantity;
    if (typeof quantity !== 'string') return null;

    const trimmed = quantity.trim();

    const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) {
      const whole = parseInt(mixed[1], 10);
      const numerator = parseInt(mixed[2], 10);
      const denominator = parseInt(mixed[3], 10);
      if (denominator) {
        return whole + numerator / denominator;
      }
    }

    const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
    if (fraction) {
      const numerator = parseInt(fraction[1], 10);
      const denominator = parseInt(fraction[2], 10);
      if (denominator) {
        return numerator / denominator;
      }
    }

    const numeric = parseFloat(trimmed);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }

    return null;
  }

  /**
   * Enhance ingredients with additional processing
   */
  enhanceIngredients(ingredients, processedData) {
    const processedLookup = this.buildProcessedIngredientLookup(processedData);

    return ingredients.map(ingredient => {
      const enhanced = { ...ingredient };
      
      // Preserve original name if already good, otherwise normalize
      const normalizedName = this.normalizeIngredientName(ingredient.name);
      enhanced.name = normalizedName || ingredient.name;

      const processedMatch = processedLookup.get(normalizedName);

      // CRITICAL: Only enhance if current values are missing or invalid
      // Don't overwrite good values with nulls or empty strings
      
      // Handle quantity - only look for alternatives if current value is missing
      if (ingredient.quantity === null || ingredient.quantity === undefined) {
        const quantitySources = [
          ingredient.quantity_value,
          ingredient.amount,
          ingredient.count,
          ingredient.raw_quantity,
          ingredient.quantityText,
          ingredient.quantity_text,
          processedMatch?.quantity,
          processedMatch?.amount,
          processedMatch?.count,
          processedMatch?.raw_quantity
        ];

        let resolvedQuantity = quantitySources.find(value => value !== undefined && value !== null && value !== '');
        
        if (resolvedQuantity && typeof resolvedQuantity === 'object') {
          if (typeof resolvedQuantity.value !== 'undefined') {
            resolvedQuantity = resolvedQuantity.value;
          } else if (typeof resolvedQuantity.amount !== 'undefined') {
            resolvedQuantity = resolvedQuantity.amount;
          } else if (typeof resolvedQuantity.quantity !== 'undefined') {
            resolvedQuantity = resolvedQuantity.quantity;
          } else {
            resolvedQuantity = null;
          }
        }
        
        enhanced.quantity = this.parseFallbackQuantity(resolvedQuantity);
      }
      // else keep the existing quantity value

      // Handle unit - only look for alternatives if current value is missing
      if (!ingredient.unit || ingredient.unit.trim() === '') {
        const unitCandidates = [
          ingredient.unit_type,
          ingredient.measure,
          ingredient.quantity_unit,
          ingredient.unitOfMeasure,
          processedMatch?.unit,
          processedMatch?.unit_type,
          processedMatch?.measure
        ];

        let resolvedUnit = unitCandidates.find(unit => typeof unit === 'string' && unit.trim().length > 0) || null;
        
        if (!resolvedUnit) {
          // Try to infer from quantity string
          const quantitySource = [ingredient.quantity, ingredient.amount, ingredient.raw_quantity]
            .find(value => typeof value === 'string' && value.trim().length > 0);
          resolvedUnit = this.inferUnitFromQuantityString(quantitySource, normalizedName);
        }
        
        enhanced.unit = resolvedUnit ? resolvedUnit.toLowerCase().trim() : null;
      }
      // else keep the existing unit value

      // Ensure notes exists before appending
      if (!enhanced.notes) {
        enhanced.notes = '';
      }

      // Validate and enhance category
      enhanced.category = this.categorizeIngredient(enhanced.name, ingredient.category);
      enhanced.subcategory = this.getSubcategory(enhanced.name, enhanced.category);
      
      // Standardize preparation method
      enhanced.preparation = this.standardizePreparation(ingredient.preparation);
      
      // Detect allergens
      enhanced.allergens = this.detectAllergens(enhanced.name, enhanced.allergens);
      
      // Validate quantity and unit consistency
      if (enhanced.quantity != null && enhanced.unit) {
        const validation = this.validateQuantityUnit(enhanced.quantity, enhanced.unit);
        if (!validation.valid) {
          enhanced.notes += ` [Quantity/unit issue: ${validation.message}]`;
        }
      }
      
      // Add confidence boost for well-structured ingredients
      if (enhanced.name && enhanced.quantity != null && enhanced.unit && enhanced.category !== 'other') {
        enhanced.confidence = Math.min((enhanced.confidence || 0.5) + 0.1, 1.0);
      }
      
      return enhanced;
    });
  }

  /**
   * Normalize ingredient name
   */
  normalizeIngredientName(name) {
    if (!name) return '';
    
    let normalized = name.toLowerCase().trim();
    
    // Remove common descriptors
    normalized = normalized.replace(/\b(fresh|dried|canned|frozen|organic|natural|ripe|large|small|medium)\b/g, '');
    
    // Handle pluralization
    for (const [plural, singular] of Object.entries(this.nameVariations)) {
      if (normalized.includes(plural)) {
        normalized = normalized.replace(new RegExp(plural, 'g'), singular);
        break;
      }
    }
    
    // Remove extra spaces and clean up
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  /**
   * Categorize ingredient
   */
  categorizeIngredient(name, suggestedCategory = null) {
    if (!name) return 'other';
    
    // If a category is already suggested and valid, use it
    if (suggestedCategory && this.categories[suggestedCategory]) {
      return suggestedCategory;
    }
    
    // Check against category keywords
    const lowerName = name.toLowerCase();
    
    for (const [category, config] of Object.entries(this.categories)) {
      if (config.keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Get subcategory for ingredient
   */
  getSubcategory(name, category) {
    if (!name || !category || !this.categories[category]) return null;
    
    const categoryConfig = this.categories[category];
    const lowerName = name.toLowerCase();
    
    for (const subcategory of categoryConfig.subcategories) {
      // Simple heuristic - could be enhanced with more sophisticated logic
      if (this.matchesSubcategory(lowerName, subcategory)) {
        return subcategory;
      }
    }
    
    return null;
  }

  /**
   * Check if ingredient matches subcategory
   */
  matchesSubcategory(name, subcategory) {
    const subcategoryPatterns = {
      vegetables: ['tomato', 'onion', 'carrot', 'potato', 'lettuce', 'pepper', 'cucumber', 'broccoli', 'cauliflower', 'spinach'],
      fruits: ['apple', 'banana', 'orange', 'berry', 'strawberry', 'blueberry', 'raspberry', 'lemon', 'lime'],
      herbs: ['basil', 'parsley', 'cilantro', 'mint', 'oregano', 'thyme', 'rosemary', 'sage', 'dill', 'chive'],
      poultry: ['chicken', 'turkey', 'duck'],
      beef: ['beef', 'steak', 'ground beef'],
      pork: ['pork', 'bacon', 'ham', 'sausage'],
      seafood: ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'clams', 'mussels'],
      grains: ['rice', 'quinoa', 'oats', 'barley', 'couscous'],
      canned_goods: ['canned', 'tomato sauce', 'tomato paste', 'coconut milk'],
      oils_vinegars: ['oil', 'olive oil', 'vegetable oil', 'vinegar', 'balsamic'],
      condiments: ['ketchup', 'mustard', 'mayonnaise', 'soy sauce', 'hot sauce'],
      spices: ['salt', 'pepper', 'cumin', 'paprika', 'cinnamon', 'nutmeg'],
      milk: ['milk', 'cream', 'half and half'],
      cheese: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta'],
      coffee_tea: ['coffee', 'tea', 'espresso'],
      alcoholic: ['wine', 'beer', 'spirits', 'liquor']
    };
    
    const patterns = subcategoryPatterns[subcategory] || [];
    return patterns.some(pattern => name.includes(pattern));
  }

  /**
   * Standardize preparation method
   */
  standardizePreparation(preparation) {
    if (!preparation) return null;
    
    const normalized = preparation.toLowerCase().trim();
    
    for (const [category, methods] of Object.entries(this.preparationMethods)) {
      for (const method of methods) {
        if (normalized.includes(method)) {
          return method;
        }
      }
    }
    
    return preparation; // Return original if not found
  }

  /**
   * Detect allergens in ingredient
   */
  detectAllergens(name, existingAllergens = []) {
    const allergens = [...existingAllergens];
    const lowerName = name.toLowerCase();
    
    const allergenMap = {
      'milk': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy'],
      'eggs': ['egg', 'eggs'],
      'wheat': ['flour', 'wheat', 'bread', 'pasta', 'couscous'],
      'soy': ['soy', 'soy sauce', 'tofu', 'edamame'],
      'peanuts': ['peanut', 'peanuts'],
      'tree nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia'],
      'fish': ['fish', 'salmon', 'tuna', 'cod', 'tilapia'],
      'shellfish': ['shrimp', 'crab', 'lobster', 'clams', 'mussels', 'scallops']
    };
    
    for (const [allergen, ingredients] of Object.entries(allergenMap)) {
      if (ingredients.some(ing => lowerName.includes(ing)) && !allergens.includes(allergen)) {
        allergens.push(allergen);
      }
    }
    
    return allergens;
  }

  /**
   * Validate quantity and unit consistency
   */
  validateQuantityUnit(quantity, unit) {
    // Basic validation - could be enhanced
    if (typeof quantity !== 'number' || quantity <= 0) {
      return { valid: false, message: 'Invalid quantity' };
    }
    
    if (!unit) {
      return { valid: false, message: 'Missing unit' };
    }
    
    // Check for incompatible unit/quantity combinations
    const solidUnits = ['cups', 'tablespoons', 'teaspoons', 'pieces', 'cans', 'jars'];
    const liquidUnits = ['milliliters', 'liters', 'fluid ounces', 'pints', 'quarts'];
    const weightUnits = ['grams', 'kilograms', 'ounces', 'pounds'];
    
    // This is a simplified check - in practice, you'd need ingredient-specific logic
    return { valid: true, message: 'Valid' };
  }

  /**
   * Calculate extraction confidence
   */
  calculateExtractionConfidence(ingredients, processedData) {
    if (!ingredients || ingredients.length === 0) return 0;
    
    let confidence = 0.3; // Base confidence
    
    // Boost based on ingredient quality
    const avgIngredientConfidence = ingredients.reduce((sum, ing) => sum + (ing.confidence || 0), 0) / ingredients.length;
    confidence += avgIngredientConfidence * 0.4;
    
    // Boost based on completeness
    const completeIngredients = ingredients.filter(ing => 
      ing.name && ing.quantity && ing.unit && ing.category !== 'other'
    ).length;
    confidence += (completeIngredients / ingredients.length) * 0.2;
    
    // Boost based on processing confidence
    if (processedData.confidence) {
      confidence += processedData.confidence * 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get category distribution
   */
  getCategoryDistribution(ingredients) {
    const distribution = {};
    
    ingredients.forEach(ingredient => {
      const category = ingredient.category || 'other';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    
    return distribution;
  }

  /**
   * Create hash for processed data caching
   */
  hashProcessedData(processedData) {
    const key = JSON.stringify({
      recipeName: processedData.recipeName,
      ingredientCount: processedData.ingredients?.length || 0,
      formatType: processedData.formatType
    });
    return require('crypto').createHash('md5').update(key).digest('hex');
  }
}

module.exports = InformationExtractionAgent;