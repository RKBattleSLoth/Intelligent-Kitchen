/**
 * Smart Processing Agent
 * Preprocessing agent that intelligently parses and normalizes recipe text
 * Handles diverse recipe formats and prepares structured data for extraction
 */

const RequestRouter = require('../RequestRouter');
const ResponseCache = require('../ResponseCache');

class SmartProcessingAgent {
  constructor() {
    this.router = new RequestRouter();
    this.cache = new ResponseCache();
    
    // Recipe format patterns
    this.formatPatterns = {
      structured: {
        indicators: ['ingredients:', 'ingredients list', 'you will need', 'what you need'],
        patterns: [/ingredients\s*[:\-]\s*/i, /you will need\s*[:\-]\s*/i, /what you need\s*[:\-]\s*/i]
      },
      narrative: {
        indicators: ['first', 'then', 'next', 'after', 'start', 'begin'],
        patterns: [/first.*?add/i, /then.*?add/i, /next.*?add/i, /start.*?with/i]
      },
      mixed: {
        indicators: ['ingredients', 'instructions', 'method'],
        patterns: [/ingredients.*?instructions/i, /method.*?ingredients/i]
      },
      casual: {
        indicators: ['just mix', 'throw in', 'grab', 'get', 'use'],
        patterns: [/just mix.*?and/i, /throw in.*?with/i, /grab.*?and/i]
      }
    };
    
    // Unit normalization patterns
    this.unitPatterns = {
      metric: {
        weight: ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'mg', 'milligram', 'milligrams'],
        volume: ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'],
        length: ['cm', 'centimeter', 'centimeters', 'mm', 'millimeter', 'millimeters']
      },
      imperial: {
        weight: ['oz', 'ounce', 'ounces', 'lb', 'pound', 'pounds'],
        volume: ['cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 'fl oz', 'fluid ounce', 'pint', 'quart', 'gallon'],
        length: ['in', 'inch', 'inches', 'ft', 'foot', 'feet']
      },
      informal: {
        count: ['piece', 'pieces', 'pc', 'pcs', 'whole', 'clove', 'cloves', 'slice', 'slices', 'can', 'cans', 'jar', 'jars', 'bottle', 'bottles', 'handful', 'pinch', 'dash', 'sprinkle'],
        descriptive: ['bunch', 'head', 'stalk', 'stalks', 'package', 'pack', 'box', 'bag']
      }
    };
    
    // Common ingredient indicators
    this.ingredientIndicators = [
      'add', 'mix', 'combine', 'stir', 'fold', 'whisk', 'beat', 'pour', 'sprinkle', 'toss', 'layer', 'spread', 'top', 'garnish',
      'chop', 'dice', 'mince', 'grate', 'slice', 'cut', 'crush', 'mash', 'blend', 'puree', 'press', 'squeeze'
    ];
  }

  /**
   * Process recipe text and create structured intermediate format
   */
  async processRecipe(recipeData, options = {}) {
    const { forceModel = null, priority = 'normal' } = options;
    
    const cacheKey = `smart_process_${this.hashRecipeData(recipeData)}_${priority}`;
    
    return await this.cache.wrap('smart_processing', { recipeData, options }, async () => {
      // Detect recipe format
      const formatType = this.detectRecipeFormat(recipeData);
      
      // Extract raw ingredient mentions
      const rawIngredients = await this.extractRawIngredients(recipeData, formatType, forceModel);
      
      // Normalize measurements and units
      const normalizedIngredients = this.normalizeMeasurements(rawIngredients);
      
      // Create structured intermediate format
      const structuredData = this.createStructuredIntermediate(recipeData, normalizedIngredients, formatType);
      
      return {
        success: true,
        formatType,
        originalText: this.prepareOriginalText(recipeData),
        rawIngredients,
        normalizedIngredients,
        structuredData,
        confidence: this.calculateProcessingConfidence(structuredData),
        processingSteps: this.getProcessingSteps(formatType)
      };
    });
  }

  /**
   * Detect the format type of the recipe
   */
  detectRecipeFormat(recipeData) {
    const text = this.prepareOriginalText(recipeData).toLowerCase();
    
    let scores = {
      structured: 0,
      narrative: 0,
      mixed: 0,
      casual: 0
    };
    
    // Score each format type
    for (const [format, config] of Object.entries(this.formatPatterns)) {
      // Check for indicators
      for (const indicator of config.indicators) {
        if (text.includes(indicator)) {
          scores[format] += 2;
        }
      }
      
      // Check for patterns
      for (const pattern of config.patterns) {
        if (pattern.test(text)) {
          scores[format] += 3;
        }
      }
    }
    
    // Additional heuristics
    if (text.includes(':') && text.includes('\n')) {
      scores.structured += 2;
    }
    
    if (text.length > 500 && !text.includes('ingredients:')) {
      scores.narrative += 2;
    }
    
    if (text.includes('step') || text.includes('instruction')) {
      scores.mixed += 1;
    }
    
    // Determine the format with highest score
    const maxScore = Math.max(...Object.values(scores));
    const detectedFormat = Object.keys(scores).find(key => scores[key] === maxScore);
    
    return detectedFormat || 'mixed';
  }

  /**
   * Extract raw ingredient mentions using AI
   */
  async extractRawIngredients(recipeData, formatType, forceModel) {
    const text = this.prepareOriginalText(recipeData);
    
    const prompt = this.buildProcessingPrompt(text, formatType);
    
    const response = await this.router.route('smart_processing', text, {
      prompt,
      maxTokens: 2000,
      temperature: 0.2,
      forceModel
    });
    
    return this.parseProcessingResponse(response.content, formatType);
  }

  /**
   * Build the smart processing prompt
   */
  buildProcessingPrompt(text, formatType) {
    const formatInstructions = {
      structured: 'This recipe appears to have a structured ingredients section. Extract all ingredients from the ingredients list and any additional ingredients mentioned in the instructions.',
      narrative: 'This recipe is written in narrative format. Carefully extract ALL ingredient mentions from throughout the text, including quantities, units, and preparation methods.',
      mixed: 'This recipe has mixed formatting. Extract ingredients from both the ingredients section and scattered throughout the instructions.',
      casual: 'This is a casual recipe description. Extract all ingredient mentions, inferring quantities and units from context where possible.'
    };
    
    return `You are a smart recipe processing agent. Your task is to extract ALL ingredient mentions from recipe text, regardless of format.

${formatInstructions[formatType]}

For each ingredient mention, extract:
1. The ingredient name (normalized)
2. Quantity (if mentioned or can be inferred)
3. Unit (standardized)
4. Preparation method (chopped, diced, etc.)
5. Context/location in recipe
6. Confidence in extraction

Pay special attention to:
- Ingredients mentioned in instructions (e.g., "add 2 cups of flour")
- Implicit quantities (e.g., "an onion", "some garlic")
- Preparation instructions embedded with ingredients
- Ingredients mentioned across multiple sentences

Return as JSON:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "quantity or null",
      "unit": "unit or null",
      "preparation": "preparation method or null",
      "context": "where this was found in the recipe",
      "confidence": 0.0-1.0,
      "raw_text": "exact text from recipe"
    }
  ],
  "format_confidence": 0.0-1.0,
  "total_mentions": number
}

Recipe text:
${text}

Respond only with valid JSON, no additional text.`;
  }

  /**
   * Parse the AI processing response
   */
  parseProcessingResponse(response, formatType) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in processing response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.ingredients || !Array.isArray(parsed.ingredients)) {
        throw new Error('Invalid ingredients format in processing response');
      }
      
      return parsed.ingredients.map(ingredient => ({
        name: ingredient.name || '',
        quantity: ingredient.quantity || null,
        unit: ingredient.unit || null,
        preparation: ingredient.preparation || null,
        context: ingredient.context || '',
        confidence: parseFloat(ingredient.confidence) || 0.5,
        rawText: ingredient.raw_text || '',
        formatType
      }));
      
    } catch (error) {
      console.error('Failed to parse processing response:', error);
      return [];
    }
  }

  /**
   * Normalize measurements and units
   */
  normalizeMeasurements(ingredients) {
    return ingredients.map(ingredient => {
      const normalized = { ...ingredient };
      
      // Normalize quantity
      if (ingredient.quantity) {
        normalized.quantity = this.normalizeQuantity(ingredient.quantity);
      }
      
      // Normalize unit
      if (ingredient.unit) {
        normalized.unit = this.normalizeUnit(ingredient.unit);
      }
      
      // Extract preparation from name if needed
      if (!normalized.preparation && ingredient.name) {
        const prepMatch = ingredient.name.match(/\b(chopped|diced|minced|grated|sliced|crushed|mashed|blended|pureed|pressed|squeezed|roasted|toasted|fried|boiled|steamed|baked|grilled)\b/i);
        if (prepMatch) {
          normalized.preparation = prepMatch[1].toLowerCase();
          normalized.name = ingredient.name.replace(prepMatch[0], '').trim();
        }
      }
      
      return normalized;
    });
  }

  /**
   * Normalize quantity to decimal
   */
  normalizeQuantity(quantity) {
    if (typeof quantity === 'number') {
      return Math.round(quantity * 100) / 100;
    }
    
    if (typeof quantity === 'string') {
      // Handle mixed fractions (e.g., "1 1/2")
      const mixedFraction = quantity.match(/(\d+)\s+(\d+)\/(\d+)/);
      if (mixedFraction) {
        const whole = parseInt(mixedFraction[1]);
        const numerator = parseInt(mixedFraction[2]);
        const denominator = parseInt(mixedFraction[3]);
        return whole + (numerator / denominator);
      }
      
      // Handle simple fractions
      const simpleFraction = quantity.match(/(\d+)\/(\d+)/);
      if (simpleFraction) {
        return parseInt(simpleFraction[1]) / parseInt(simpleFraction[2]);
      }
      
      // Handle ranges (use average)
      const range = quantity.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
      if (range) {
        const min = parseFloat(range[1]);
        const max = parseFloat(range[2]);
        return (min + max) / 2;
      }
      
      // Handle decimals
      const decimal = quantity.match(/([\d.]+)/);
      if (decimal) {
        return parseFloat(decimal[1]);
      }
      
      // Handle informal quantities
      const informal = {
        'pinch': 0.125,
        'dash': 0.25,
        'sprinkle': 0.5,
        'handful': 0.33,
        'bunch': 1,
        'head': 1,
        'stalk': 1,
        'package': 1,
        'pack': 1,
        'box': 1,
        'bag': 1,
        'can': 1,
        'jar': 1,
        'bottle': 1
      };
      
      const lowerQuantity = quantity.toLowerCase().trim();
      if (informal[lowerQuantity]) {
        return informal[lowerQuantity];
      }
    }
    
    return null;
  }

  /**
   * Normalize unit to standard form
   */
  normalizeUnit(unit) {
    if (!unit) return null;
    
    const normalized = unit.toLowerCase().trim();
    
    // Volume units
    if (normalized.includes('cup')) return 'cups';
    if (normalized.includes('tablespoon') || normalized.includes('tbsp')) return 'tablespoons';
    if (normalized.includes('teaspoon') || normalized.includes('tsp')) return 'teaspoons';
    if (normalized.includes('liter') || normalized.includes('l')) return 'liters';
    if (normalized.includes('ml') || normalized.includes('milliliter')) return 'milliliters';
    if (normalized.includes('fluid ounce') || normalized.includes('fl oz')) return 'fluid ounces';
    if (normalized.includes('pint')) return 'pints';
    if (normalized.includes('quart')) return 'quarts';
    if (normalized.includes('gallon')) return 'gallons';
    
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
    if (normalized.includes('package') || normalized.includes('pack')) return 'packages';
    if (normalized.includes('box')) return 'boxes';
    if (normalized.includes('bag')) return 'bags';
    
    // Length units
    if (normalized.includes('inch') || normalized.includes('in')) return 'inches';
    if (normalized.includes('centimeter') || normalized.includes('cm')) return 'centimeters';
    if (normalized.includes('foot') || normalized.includes('ft')) return 'feet';
    
    // Informal units
    if (normalized.includes('handful')) return 'handfuls';
    if (normalized.includes('pinch')) return 'pinches';
    if (normalized.includes('dash')) return 'dashes';
    if (normalized.includes('sprinkle')) return 'sprinkles';
    if (normalized.includes('bunch')) return 'bunches';
    if (normalized.includes('head')) return 'heads';
    if (normalized.includes('stalk')) return 'stalks';
    
    return null;
  }

  /**
   * Create structured intermediate format
   */
  createStructuredIntermediate(recipeData, normalizedIngredients, formatType) {
    return {
      recipeName: recipeData.name || 'Unknown Recipe',
      formatType,
      processingTimestamp: new Date().toISOString(),
      ingredients: normalizedIngredients,
      metadata: {
        totalIngredients: normalizedIngredients.length,
        hasQuantities: normalizedIngredients.filter(ing => ing.quantity).length,
        hasUnits: normalizedIngredients.filter(ing => ing.unit).length,
        hasPreparation: normalizedIngredients.filter(ing => ing.preparation).length,
        averageConfidence: normalizedIngredients.reduce((sum, ing) => sum + (ing.confidence || 0), 0) / normalizedIngredients.length
      }
    };
  }

  /**
   * Calculate processing confidence
   */
  calculateProcessingConfidence(structuredData) {
    const { metadata } = structuredData;
    
    let confidence = 0.3; // Base confidence
    
    // Boost based on extraction quality
    if (metadata.totalIngredients > 0) confidence += 0.2;
    if (metadata.hasQuantities > metadata.totalIngredients * 0.5) confidence += 0.2;
    if (metadata.hasUnits > metadata.totalIngredients * 0.5) confidence += 0.1;
    if (metadata.hasPreparation > 0) confidence += 0.1;
    if (metadata.averageConfidence > 0.7) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get processing steps for transparency
   */
  getProcessingSteps(formatType) {
    const steps = {
      structured: [
        'Detected structured recipe format',
        'Extracted ingredients from ingredients list',
        'Scanned instructions for additional mentions',
        'Normalized measurements and units'
      ],
      narrative: [
        'Detected narrative recipe format',
        'Scanned entire text for ingredient mentions',
        'Inferred quantities from context',
        'Extracted preparation methods from instructions'
      ],
      mixed: [
        'Detected mixed recipe format',
        'Combined structured and narrative extraction',
        'Cross-referenced ingredients list with instructions',
        'Merged duplicate mentions'
      ],
      casual: [
        'Detected casual recipe format',
        'Used contextual analysis for ingredient extraction',
        'Inferred measurements from descriptive language',
        'Applied common cooking knowledge'
      ]
    };
    
    return steps[formatType] || steps.mixed;
  }

  /**
   * Prepare original text from recipe data
   */
  prepareOriginalText(recipeData) {
    let text = '';
    
    if (recipeData.name) {
      text += `Recipe: ${recipeData.name}\n\n`;
    }
    
    if (recipeData.description) {
      text += `Description: ${recipeData.description}\n\n`;
    }
    
    if (recipeData.ingredients) {
      if (Array.isArray(recipeData.ingredients)) {
        text += 'Ingredients:\n';
        recipeData.ingredients.forEach(ing => {
          if (typeof ing === 'string') {
            text += `- ${ing}\n`;
          } else if (ing.name) {
            text += `- ${ing.quantity || ''} ${ing.unit || ''} ${ing.name}\n`;
          }
        });
      } else {
        text += `Ingredients: ${recipeData.ingredients}\n`;
      }
      text += '\n';
    }
    
    if (recipeData.instructions) {
      text += 'Instructions:\n';
      text += recipeData.instructions;
      text += '\n\n';
    }
    
    if (recipeData.servings) {
      text += `Servings: ${recipeData.servings}\n`;
    }
    
    return text;
  }

  /**
   * Create hash for recipe data caching
   */
  hashRecipeData(recipeData) {
    const text = this.prepareOriginalText(recipeData);
    return require('crypto').createHash('md5').update(text).digest('hex');
  }
}

module.exports = SmartProcessingAgent;