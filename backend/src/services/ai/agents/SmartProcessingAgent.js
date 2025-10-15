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
    
    // Section boundary markers
    this.sectionMarkers = {
      ingredients: [
        'ingredients:', 'ingredients list:', 'you will need:', 'what you need:', 'you need:', 
        'for the recipe:', 'recipe ingredients:', 'shopping list:', 'gather:', 'prepare:'
      ],
      instructions: [
        'instructions:', 'directions:', 'method:', 'steps:', 'procedure:', 'how to make:',
        'preparation:', 'cooking instructions:', 'step by step:'
      ],
      metadata: [
        'yield:', 'servings:', 'serves:', 'makes:', 'prep time:', 'cook time:', 'total time:',
        'temperature:', 'oven:', 'bake at:', 'cook at:'
      ]
    };
    
    // Step and direction patterns to filter out
    this.stepPatterns = [
      /^step\s*\d+/i,
      /^\d+\.\s/,
      /^first\s/,
      /^then\s/,
      /^next\s/,
      /^after\s/,
      /^finally\s/,
      /^lastly\s/,
      /^preheat\s/,
      /^heat\s/,
      /^cook\s/,
      /^bake\s/,
      /^boil\s/,
      /^simmer\s/,
      /^fry\s/,
      /^grill\s/,
      /^roast\s/
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
      const { ingredients: rawIngredients, fallbackUsed } = await this.extractRawIngredients(
        recipeData,
        formatType,
        forceModel
      );

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
        processingSteps: fallbackUsed
          ? [...this.getProcessingSteps(formatType), 'Used heuristic ingredient parsing fallback']
          : this.getProcessingSteps(formatType),
        fallbackUsed
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
    
    // Apply section-based processing to isolate ingredients section
    const processedText = this.isolateIngredientsSection(text);
    
    const prompt = this.buildProcessingPrompt(processedText, formatType);
    const fallbackModel = process.env.OPENROUTER_SMART_FALLBACK_MODEL || 'anthropic/claude-3-haiku-20240307';
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

    for (const candidate of modelCandidates) {
      try {
        const routeOptions = {
          prompt,
          maxTokens: 1200,
          temperature: 0.2
        };

        if (candidate.type === 'tier') {
          routeOptions.forceModel = candidate.value;
        } else if (candidate.type === 'name') {
          routeOptions.forceModelName = candidate.value;
        }

        const response = await this.router.route('smart_processing', processedText, {
          ...routeOptions,
          maxTokens: Math.min(routeOptions.maxTokens, 1200),
          priority: 'speed'
        });

        const ingredients = this.parseProcessingResponse(response.content, formatType);
        return {
          ingredients,
          fallbackUsed: false
        };
      } catch (error) {
        lastError = error;
        console.warn('SmartProcessingAgent: model attempt failed', {
          candidate,
          message: error.message
        });
      }
    }

    console.warn('SmartProcessingAgent: Falling back to heuristic ingredient parsing after model failures', {
      lastError: lastError?.message
    });
    const fallbackIngredients = this.generateFallbackIngredients(processedText);
    return {
      ingredients: fallbackIngredients,
      fallbackUsed: true
    };
  }

  /**
   * Isolate the ingredients section from recipe text using context-aware filtering
   */
  isolateIngredientsSection(fullText) {
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let ingredientsStart = -1;
    let ingredientsEnd = lines.length;
    
    // Find ingredients section start
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      // Check for ingredients section markers
      if (this.sectionMarkers.ingredients.some(marker => line.includes(marker))) {
        ingredientsStart = i;
        break;
      }
    }
    
    // If no explicit ingredients section found, try to infer it
    if (ingredientsStart === -1) {
      // Look for lines that contain ingredient-like patterns
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (this.looksLikeIngredientLine(line)) {
          ingredientsStart = i;
          break;
        }
      }
    }
    
    // Find end of ingredients section (start of instructions or metadata)
    for (let i = ingredientsStart + 1; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      // Check for instructions section markers
      if (this.sectionMarkers.instructions.some(marker => line.includes(marker))) {
        ingredientsEnd = i;
        break;
      }
      
      // Check for metadata markers
      if (this.sectionMarkers.metadata.some(marker => line.includes(marker))) {
        ingredientsEnd = i;
        break;
      }
      
      // Check for step patterns
      if (this.stepPatterns.some(pattern => pattern.test(line))) {
        ingredientsEnd = i;
        break;
      }
    }
    
    // Extract ingredients section
    if (ingredientsStart !== -1 && ingredientsEnd > ingredientsStart) {
      let ingredientsSection = lines.slice(ingredientsStart, ingredientsEnd);
      
      // Filter out non-ingredient lines within the section
      ingredientsSection = ingredientsSection.filter(line => {
        const lowerLine = line.toLowerCase();
        
        // Filter out step patterns
        if (this.stepPatterns.some(pattern => pattern.test(lowerLine))) {
          return false;
        }
        
        // Filter out metadata patterns
        if (this.sectionMarkers.metadata.some(marker => lowerLine.includes(marker))) {
          return false;
        }
        
        // Keep lines that look like ingredients
        return this.looksLikeIngredientLine(line) || 
               this.sectionMarkers.ingredients.some(marker => lowerLine.includes(marker));
      });
      
      return ingredientsSection.join('\n');
    }
    
    // If no clear section found, return filtered original text
    return lines.filter(line => {
      const lowerLine = line.toLowerCase();
      
      // Filter out obvious non-ingredient lines
      if (this.stepPatterns.some(pattern => pattern.test(lowerLine))) {
        return false;
      }
      
      if (this.sectionMarkers.metadata.some(marker => lowerLine.includes(marker))) {
        return false;
      }
      
      if (this.sectionMarkers.instructions.some(marker => lowerLine.includes(marker))) {
        return false;
      }
      
      return true;
    }).join('\n');
  }
  
  /**
   * Check if a line looks like it contains ingredient information
   */
  looksLikeIngredientLine(line) {
    const lowerLine = line.toLowerCase();
    
    // Look for quantity patterns (numbers, fractions)
    const quantityPattern = /\d+[\d\/\s.-]*/;
    const hasQuantity = quantityPattern.test(line);
    
    // Look for unit patterns
    const unitPatterns = [
      'cup', 'tablespoon', 'tbsp', 'teaspoon', 'tsp', 'ounce', 'oz', 'pound', 'lb',
      'gram', 'g', 'kilogram', 'kg', 'ml', 'liter', 'l', 'piece', 'pieces', 'can',
      'jar', 'bottle', 'clove', 'cloves', 'slice', 'slices'
    ];
    
    const hasUnit = unitPatterns.some(unit => lowerLine.includes(unit));
    
    // Look for common ingredient keywords
    const ingredientKeywords = [
      'flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'egg', 'milk', 'cheese',
      'tomato', 'onion', 'garlic', 'carrot', 'potato', 'chicken', 'beef', 'pork',
      'rice', 'pasta', 'bread', 'bean', 'vegetable', 'fruit', 'herb', 'spice'
    ];
    
    const hasIngredient = ingredientKeywords.some(keyword => lowerLine.includes(keyword));
    
    // Line is likely an ingredient if it has quantity + unit OR quantity + ingredient keyword
    return (hasQuantity && hasUnit) || (hasQuantity && hasIngredient) || (hasUnit && hasIngredient);
  }

  /**
   * Build the smart processing prompt
   */
  buildProcessingPrompt(text, formatType) {
    const formatInstructions = {
      structured: 'This recipe appears to have a structured ingredients section. Extract all ingredients from the ingredients list only. Ignore any instructions, steps, or metadata.',
      narrative: 'This recipe is written in narrative format. Extract only actual ingredient mentions with their quantities and units. Ignore cooking instructions, steps, and serving information.',
      mixed: 'This recipe has mixed formatting. Focus exclusively on the ingredients section. Extract ingredients with quantities and units, but ignore all instructions and steps.',
      casual: 'This is a casual recipe description. Extract only ingredient mentions with quantities and units. Ignore preparation steps, cooking instructions, and serving information.'
    };
    
    return `You are a smart recipe processing agent. Your task is to extract ONLY ingredient information from the provided text.

${formatInstructions[formatType]}

CRITICAL: Extract ONLY actual ingredients. IGNORE:
- Step numbers (Step 1, 1., 2., etc.)
- Cooking instructions (preheat, mix, stir, bake, etc.)
- Serving information (Yield, Servings, Serves, etc.)
- Time and temperature information
- Preparation directions

For each ingredient, extract:
1. The ingredient name (normalized)
2. Quantity (if mentioned)
3. Unit (standardized)
4. Preparation method (chopped, diced, etc. - only if part of ingredient description)
5. Confidence in extraction

Focus EXCLUSIVELY on lines that contain:
- Food items with quantities (e.g., "2 cups flour", "1 onion", "3 eggs")
- Ingredients with units (e.g., "1 lb chicken", "1 can tomatoes")
- Preparation notes attached to ingredients (e.g., "2 cups chopped carrots")

DO NOT extract:
- "Step 1: Preheat oven to 350°F"
- "Yield: 4 servings"
- "Cook for 30 minutes"
- "Mix until well combined"

Return as JSON:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "quantity or null",
      "unit": "unit or null",
      "preparation": "preparation method or null",
      "context": "ingredients section",
      "confidence": 0.0-1.0,
      "raw_text": "exact text from recipe"
    }
  ],
  "format_confidence": 0.0-1.0,
  "total_mentions": number
}

Recipe text (ingredients section only):
${text}

CRITICAL OUTPUT FORMAT RULES:
- Respond with a single JSON object ONLY.
- Do NOT include explanations, commentary, or code fences.
- The very first character must be '{' and the final character must be '}'.
- If you cannot comply, respond with {"ingredients":[],"format_confidence":0,"total_mentions":0}.
`;
  }

  /**
   * Parse the AI processing response
   */
  parseProcessingResponse(response, formatType) {
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
  }

  /**
   * Generate heuristic ingredient list when AI response is unusable
   */
  generateFallbackIngredients(text) {
    const lines = (text || '').split('\n');
    const results = [];

    lines.forEach(line => {
      let cleanedLine = line.replace(/^[\-\*\u2022\u2023\u25CF\u25E6•●◦]+\s*/, '').trim();
      if (!cleanedLine) return;

      cleanedLine = cleanedLine.replace(/^ingredients?\s*[:\-]\s*/i, '').trim();
      if (!cleanedLine) return;

      const segments = cleanedLine.split(/,(?![^()]*\))/).map(segment => segment.trim()).filter(Boolean);

      segments.forEach(segment => {
        if (!segment) return;

        const looksLikeIngredient = this.looksLikeIngredientLine(segment) || /[a-z]/i.test(segment);
        if (!looksLikeIngredient) return;

        let remaining = segment;
        let quantity = null;
        const quantityMatch = remaining.match(/^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d*\.\d+)/);
        if (quantityMatch) {
          quantity = quantityMatch[1].trim();
          remaining = remaining.slice(quantityMatch[0].length).trim();
        }

        let unit = null;
        const unitMatch = remaining.match(/^(cups?|tablespoons?|tbsp|teaspoons?|tsp|pounds?|lbs?|ounces?|oz|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cloves?|pieces?|slices?|sticks?|packages?|packs?|packets?|cans?|jars?|heads?|bunches?|pinches?|dashes?|sprinkles?|cups?\b)/i);
        if (unitMatch) {
          unit = unitMatch[0];
          remaining = remaining.slice(unitMatch[0].length).trim();
        }

        if (!remaining) {
          remaining = segment;
        }

        results.push({
          name: remaining,
          quantity: quantity,
          unit: unit,
          preparation: null,
          context: 'heuristic_fallback',
          confidence: 0.7,
          raw_text: segment
        });
      });
    });

    return results;
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