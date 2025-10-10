/**
 * Ingredient Extractor
 * AI-powered service for extracting and normalizing ingredients from recipes
 */

const RequestRouter = require('./RequestRouter');
const ResponseCache = require('./ResponseCache');

class IngredientExtractor {
  constructor() {
    this.router = new RequestRouter();
    this.cache = new ResponseCache();
    
    // Common ingredient normalization patterns
    this.unitPatterns = {
      volume: ['cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp', 'liter', 'liters', 'ml', 'milliliter', 'fluid ounce', 'fl oz'],
      weight: ['pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces', 'oz', 'gram', 'grams', 'g', 'kilogram', 'kg', 'milligram', 'mg'],
      count: ['piece', 'pieces', 'pc', 'pcs', 'whole', 'clove', 'cloves', 'slice', 'slices', 'can', 'cans', 'jar', 'jars', 'bottle', 'bottles'],
      length: ['inch', 'inches', 'in', 'centimeter', 'cm', 'foot', 'feet', 'ft']
    };
    
    // Common ingredient name variations
    this.nameNormalizations = {
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
      'flour': 'flour'
    };
  }

  /**
   * Extract ingredients from recipe text
   */
  async extractFromRecipe(recipeText, options = {}) {
    const { servings = 4, targetServings = 4, includePreparation = true } = options;
    
    const cacheKey = `extract_${recipeText.length}_${servings}_${targetServings}`;
    
    return await this.cache.wrap('ingredient_extraction', { recipeText, options }, async () => {
      const prompt = this.buildExtractionPrompt(recipeText, servings, targetServings, includePreparation);
      
      const response = await this.router.route('ingredient_extraction', recipeText, {
        prompt,
        maxTokens: 2000,
        temperature: 0.2
      });
      
      const ingredients = this.parseExtractionResponse(response.content);
      
      return {
        ingredients,
        originalServings: servings,
        targetServings,
        extractionMethod: 'ai',
        confidence: this.calculateConfidence(ingredients),
        routing: response.routing
      };
    });
  }

  /**
   * Build the extraction prompt
   */
  buildExtractionPrompt(recipeText, originalServings, targetServings, includePreparation) {
    const scalingFactor = targetServings / originalServings;
    
    return `Extract and normalize all ingredients from this recipe. Return as a JSON array of objects with this structure:
{
  "ingredients": [
    {
      "name": "normalized ingredient name",
      "quantity": number,
      "unit": "standard unit",
      "preparation": "preparation instructions (optional)",
      "notes": "additional notes (optional)"
    }
  ]
}

Requirements:
1. Normalize ingredient names (e.g., "tomatoes" → "tomato")
2. Standardize units (use: cups, tbsp, tsp, oz, lb, g, kg, ml, l, pieces)
3. Scale quantities from ${originalServings} to ${targetServings} servings (multiply by ${scalingFactor})
4. Include preparation instructions like "chopped", "diced", "minced" if mentioned
5. Handle ranges like "2-3 cups" by using the average
6. Handle fractions like "1/2 cup" and convert to decimals
7. Omit common pantry staples like "salt", "pepper", "water" unless specifically requested
8. If quantity is unclear, estimate based on context

Recipe text:
${recipeText}

Respond only with valid JSON, no additional text.`;
  }

  /**
   * Parse the AI response into structured ingredients
   */
  parseExtractionResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.ingredients || !Array.isArray(parsed.ingredients)) {
        throw new Error('Invalid ingredients format');
      }
      
      // Normalize and validate each ingredient
      return parsed.ingredients.map(ingredient => this.normalizeIngredient(ingredient));
      
    } catch (error) {
      console.error('Failed to parse extraction response:', error);
      return [];
    }
  }

  /**
   * Normalize individual ingredient
   */
  normalizeIngredient(ingredient) {
    return {
      name: this.normalizeName(ingredient.name || ''),
      quantity: this.normalizeQuantity(ingredient.quantity),
      unit: this.normalizeUnit(ingredient.unit || ''),
      preparation: ingredient.preparation || '',
      notes: ingredient.notes || '',
      category: this.categorizeIngredient(ingredient.name || '')
    };
  }

  /**
   * Normalize ingredient name
   */
  normalizeName(name) {
    if (!name) return '';
    
    const normalized = name.toLowerCase().trim();
    
    // Check for common normalizations
    for (const [variant, standard] of Object.entries(this.nameNormalizations)) {
      if (normalized.includes(variant)) {
        return standard;
      }
    }
    
    // Remove pluralization (basic)
    if (normalized.endsWith('s') && normalized.length > 3) {
      const singular = normalized.slice(0, -1);
      if (this.nameNormalizations[singular]) {
        return this.nameNormalizations[singular];
      }
    }
    
    return normalized;
  }

  /**
   * Normalize quantity
   */
  normalizeQuantity(quantity) {
    if (typeof quantity === 'number') {
      return Math.round(quantity * 100) / 100; // Round to 2 decimal places
    }
    
    if (typeof quantity === 'string') {
      // Handle fractions
      const fractionMatch = quantity.match(/(\d+)\s+(\d+)\/(\d+)/);
      if (fractionMatch) {
        const whole = parseInt(fractionMatch[1]);
        const numerator = parseInt(fractionMatch[2]);
        const denominator = parseInt(fractionMatch[3]);
        return whole + (numerator / denominator);
      }
      
      // Handle simple fractions
      const simpleFractionMatch = quantity.match(/(\d+)\/(\d+)/);
      if (simpleFractionMatch) {
        return parseInt(simpleFractionMatch[1]) / parseInt(simpleFractionMatch[2]);
      }
      
      // Handle ranges (use average)
      const rangeMatch = quantity.match(/([\d.]+)\s*-\s*([\d.]+)/);
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        return (min + max) / 2;
      }
      
      // Handle decimals
      const decimalMatch = quantity.match(/([\d.]+)/);
      if (decimalMatch) {
        return parseFloat(decimalMatch[1]);
      }
    }
    
    return 1; // Default quantity
  }

  /**
   * Normalize unit
   */
  normalizeUnit(unit) {
    if (!unit) return 'pieces';
    
    const normalized = unit.toLowerCase().trim();
    
    // Volume units
    if (normalized.includes('cup')) return 'cups';
    if (normalized.includes('tablespoon') || normalized.includes('tbsp')) return 'tablespoons';
    if (normalized.includes('teaspoon') || normalized.includes('tsp')) return 'teaspoons';
    if (normalized.includes('liter') || normalized.includes('l')) return 'liters';
    if (normalized.includes('ml') || normalized.includes('milliliter')) return 'milliliters';
    if (normalized.includes('fluid ounce') || normalized.includes('fl oz')) return 'fluid ounces';
    
    // Weight units
    if (normalized.includes('pound') || normalized.includes('lb')) return 'pounds';
    if (normalized.includes('ounce') || normalized.includes('oz')) return 'ounces';
    if (normalized.includes('gram') || normalized.includes('g')) return 'grams';
    if (normalized.includes('kilogram') || normalized.includes('kg')) return 'kilograms';
    if (normalized.includes('milligram') || normalized.includes('mg')) return 'milligrams';
    
    // Count units
    if (normalized.includes('piece') || normalized.includes('pc')) return 'pieces';
    if (normalized.includes('clove')) return 'cloves';
    if (normalized.includes('slice')) return 'slices';
    if (normalized.includes('can')) return 'cans';
    if (normalized.includes('jar')) return 'jars';
    if (normalized.includes('bottle')) return 'bottles';
    
    // Length units
    if (normalized.includes('inch') || normalized.includes('in')) return 'inches';
    if (normalized.includes('centimeter') || normalized.includes('cm')) return 'centimeters';
    if (normalized.includes('foot') || normalized.includes('ft')) return 'feet';
    
    return 'pieces'; // Default
  }

  /**
   * Categorize ingredient
   */
  categorizeIngredient(name) {
    const categories = {
      produce: ['tomato', 'onion', 'garlic', 'carrot', 'potato', 'lettuce', 'celery', 'pepper', 'cucumber', 'spinach', 'broccoli', 'cauliflower', 'mushroom', 'avocado', 'lemon', 'lime', 'herb'],
      dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'cream cheese'],
      meat: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'sausage', 'bacon'],
      pantry: ['flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'soy sauce', 'rice', 'pasta', 'bread', 'cereal', 'beans', 'nuts', 'seeds'],
      frozen: ['frozen', 'ice cream', 'frozen vegetables', 'frozen fruit'],
      bakery: ['bread', 'roll', 'bagel', 'croissant', 'muffin', 'cake', 'cookie'],
      beverages: ['water', 'juice', 'soda', 'coffee', 'tea', 'wine', 'beer']
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
   * Calculate confidence score for extraction
   */
  calculateConfidence(ingredients) {
    if (!ingredients || ingredients.length === 0) return 0;
    
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on ingredient quality
    ingredients.forEach(ingredient => {
      if (ingredient.name && ingredient.quantity && ingredient.unit) {
        confidence += 0.1;
      }
      if (ingredient.preparation) {
        confidence += 0.05;
      }
      if (ingredient.category !== 'other') {
        confidence += 0.05;
      }
    });
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Merge duplicate ingredients from multiple recipes
   */
  mergeIngredients(ingredientLists) {
    const merged = {};
    
    ingredientLists.forEach(list => {
      list.forEach(ingredient => {
        const key = `${ingredient.name}_${ingredient.unit}_${ingredient.preparation}`;
        
        if (merged[key]) {
          merged[key].quantity += ingredient.quantity;
        } else {
          merged[key] = { ...ingredient };
        }
      });
    });
    
    return Object.values(merged);
  }

  /**
   * Convert units for better consistency
   */
  convertUnits(ingredients, targetUnit = null) {
    return ingredients.map(ingredient => {
      if (!targetUnit || ingredient.unit === targetUnit) {
        return ingredient;
      }
      
      // Simple conversion logic (can be expanded)
      const conversions = {
        'tablespoons_to_teaspoons': 3,
        'cups_to_tablespoons': 16,
        'ounces_to_grams': 28.35,
        'pounds_to_ounces': 16
      };
      
      const conversionKey = `${ingredient.unit}_to_${targetUnit}`;
      const factor = conversions[conversionKey];
      
      if (factor) {
        return {
          ...ingredient,
          quantity: ingredient.quantity * factor,
          unit: targetUnit
        };
      }
      
      return ingredient;
    });
  }
}

module.exports = IngredientExtractor;