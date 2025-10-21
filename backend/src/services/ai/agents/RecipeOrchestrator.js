/**
 * Recipe Orchestrator
 * 
 * This agent coordinates the multi-agent ingredient extraction flow.
 * It manages the sequence of agents, handles fallbacks, and provides
 * a unified interface for ingredient extraction from various recipe formats.
 */

const SmartProcessingAgent = require('./SmartProcessingAgent');
const InformationExtractionAgent = require('./InformationExtractionAgent');
const ValidationAgent = require('./ValidationAgent');

class RecipeOrchestrator {
  constructor(openRouterClient) {
    this.client = openRouterClient;
    this.orchestratorName = 'RecipeOrchestrator';
    
    // Initialize agents
    this.smartProcessingAgent = new SmartProcessingAgent(openRouterClient);
    this.informationExtractionAgent = new InformationExtractionAgent(openRouterClient);
    this.validationAgent = new ValidationAgent(openRouterClient);
  }

  /**
   * Main orchestration method for ingredient extraction
   * @param {string} recipeText - Raw recipe text
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} - Complete extraction results
   */
  async extractIngredients(recipeData, recipeText, options = {}) {
    const startTime = Date.now();
    const extractionId = this.generateExtractionId();
    this.fallbacksUsed = [];
    
    try {
      console.log(`${this.orchestratorName}: Starting ingredient extraction ${extractionId}`);
      
      // Step 1: Smart Processing (Preprocessing)
      const preprocessingResult = await this.executeWithFallback(
        'smart-processing',
        () => this.smartProcessingAgent.processRecipe(recipeData, options),
        this.createFallbackPreprocessing(recipeText)
      );
      const agentsExecuted = [preprocessingResult?.fallbackUsed ? 'smart-processing-heuristic' : 'smart-processing'];
      if (preprocessingResult?.fallbackUsed) {
        this.recordFallback('smart-processing-heuristic');
      }

      // Step 2: Information Extraction
      const extractionResult = await this.executeWithFallback(
        'information-extraction',
        () => this.informationExtractionAgent.extractIngredients(preprocessingResult, options),
        this.createFallbackExtraction(preprocessingResult)
      );
      const extractionStepLabel = extractionResult?.extractionMethod === 'heuristic_fallback'
        ? 'heuristic-extraction'
        : 'information-extraction';
      agentsExecuted.push(extractionStepLabel);

      if (extractionStepLabel === 'heuristic-extraction') {
        this.recordFallback('information-extraction');
      }

      // Step 3: Validation & Enhancement
      const validationResult = await this.executeWithFallback(
        'validation',
        () => this.validationAgent.validateAndEnhance(extractionResult, preprocessingResult, options),
        this.createFallbackValidation(extractionResult)
      );
      const validationStepLabel = validationResult?.validationMetadata?.method === 'fallback'
        ? 'heuristic-validation'
        : 'validation';
      agentsExecuted.push(validationStepLabel);

      if (validationStepLabel === 'heuristic-validation') {
        this.recordFallback('validation');
      }

      // Step 4: Compile final results
      const finalResult = this.compileFinalResult(
        preprocessingResult,
        extractionResult,
        validationResult,
        options
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`${this.orchestratorName}: Extraction ${extractionId} completed in ${processingTime}ms`);
      
      return {
        ...finalResult,
        orchestrationMetadata: {
          extractionId,
          processingTime,
          agentsExecuted,
          fallbacksUsed: this.getFallbacksUsed(),
          recipeFormat: preprocessingResult.recipeFormat,
          confidence: validationResult.validationMetadata?.confidence || 0.5,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error(`${this.orchestratorName}: Critical extraction failure:`, error);
      return this.createEmergencyFallback(recipeText, extractionId, Date.now() - startTime);
    }
  }

  /**
   * Execute a step with fallback handling
   */
  async executeWithFallback(stepName, executeFunction, fallbackFunction) {
    try {
      console.log(`${this.orchestratorName}: Executing ${stepName}`);
      const result = await executeFunction();
      console.log(`${this.orchestratorName}: ${stepName} completed successfully`);
      return result;
    } catch (error) {
      console.warn(`${this.orchestratorName}: ${stepName} failed, using fallback:`, error.message);
      this.recordFallback(stepName);
      return fallbackFunction;
    }
  }

  /**
   * Compile final results from all agents
   */
  compileFinalResult(preprocessingResult, extractionResult, validationResult, options) {
    return {
      ingredients: validationResult.validatedIngredients || [],
      issues: validationResult.issues || [],
      enhancements: validationResult.enhancements || [],
      duplicatesResolved: validationResult.duplicatesResolved || [],
      
      // Agent-specific results for debugging
      agentResults: {
        preprocessing: preprocessingResult,
        extraction: extractionResult,
        validation: validationResult
      },
      
      // Summary information
      summary: {
        totalIngredients: validationResult.validatedIngredients?.length || 0,
        categories: this.getIngredientCategories(validationResult.validatedIngredients || []),
        allergens: this.getAllAllergens(validationResult.validatedIngredients || []),
        confidence: validationResult.validationMetadata?.confidence || 0.5,
        processingQuality: this.assessProcessingQuality(validationResult)
      },
      
      // User-friendly output
      shoppingList: this.formatForShoppingList(validationResult.validatedIngredients || []),
      pantryCheck: this.formatForPantryCheck(validationResult.validatedIngredients || [])
    };
  }

  /**
   * Get ingredient categories summary
   */
  getIngredientCategories(ingredients) {
    const categories = {};
    ingredients.forEach(ingredient => {
      const category = ingredient.category || 'other';
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }

  /**
   * Get all allergens from ingredients
   */
  getAllAllergens(ingredients) {
    const allergenSet = new Set();
    ingredients.forEach(ingredient => {
      if (ingredient.allergens) {
        ingredient.allergens.forEach(allergen => allergenSet.add(allergen));
      }
    });
    return Array.from(allergenSet);
  }

  /**
   * Assess overall processing quality
   */
  assessProcessingQuality(validationResult) {
    const metadata = validationResult.validationMetadata || {};
    const issues = validationResult.issues || [];
    
    let quality = 'excellent';
    
    if (metadata.confidence < 0.7) quality = 'fair';
    else if (metadata.confidence < 0.85) quality = 'good';
    
    if (issues.some(issue => issue.severity === 'high')) {
      quality = 'needs-review';
    }
    
    return quality;
  }

  /**
   * Format ingredients for shopping list
   */
  formatForShoppingList(ingredients) {
    return ingredients
      .filter(ingredient => ingredient.confidence >= 0.6)
      .filter(ingredient => {
        const name = (ingredient.name || '').trim().toLowerCase();
        if (!name || name === 'ingredients') {
          return false;
        }
        return !['instructions', 'directions'].includes(name);
      })
      .map(ingredient => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: ingredient.category,
        notes: ingredient.notes,
        checked: false
      }));
  }

  /**
   * Format ingredients for pantry check
   */
  formatForPantryCheck(ingredients) {
    return ingredients
      .filter(ingredient => ingredient.confidence >= 0.6)
      .map(ingredient => ({
        ingredient: ingredient.name,
        needed: ingredient.quantity,
        unit: ingredient.unit,
        have: null,
        status: 'unknown'
      }));
  }

  /**
   * Generate unique extraction ID
   */
  generateExtractionId() {
    return `extract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record fallback usage
   */
  recordFallback(stepName) {
    if (!this.fallbacksUsed) this.fallbacksUsed = [];
    this.fallbacksUsed.push(stepName);
  }

  /**
   * Get fallbacks used during extraction
   */
  getFallbacksUsed() {
    return this.fallbacksUsed || [];
  }

  /**
   * Create fallback preprocessing result
   */
  createFallbackPreprocessing(recipeText) {
    // Apply the same filtering logic as SmartProcessingAgent
    const filteredText = this.isolateIngredientsSection(recipeText);
    const rawIngredientMentions = this.extractBasicIngredients(filteredText);
    
    return {
      recipeFormat: 'unknown',
      normalizedText: filteredText,
      rawIngredientMentions,
      preprocessingMetadata: {
        method: 'fallback',
        confidence: 0.4,
        issues: ['AI preprocessing unavailable']
      }
    };
  }

  /**
   * Create fallback extraction result
   */
  createFallbackExtraction(preprocessingResult) {
    const normalized = Array.isArray(preprocessingResult?.normalizedIngredients)
      && preprocessingResult.normalizedIngredients.length > 0
      ? preprocessingResult.normalizedIngredients
      : null;

    const mentions = normalized
      ? normalized
      : Array.isArray(preprocessingResult?.rawIngredientMentions)
        ? preprocessingResult.rawIngredientMentions
        : [];

    const categorize = (name, suggested) => {
      if (this.informationExtractionAgent &&
          typeof this.informationExtractionAgent.categorizeIngredient === 'function') {
        return this.informationExtractionAgent.categorizeIngredient(name, suggested);
      }
      return suggested || 'other';
    };

    const categorizedIngredients = mentions.map(mention => {
      if (normalized) {
        const name = mention.name || mention.rawText || mention.original || 'Unknown ingredient';
        return {
          name,
          quantity: mention.quantity ?? null,
          unit: mention.unit ?? null,
          category: categorize(name, mention.category || 'unknown'),
          confidence: mention.confidence ?? 0.7,
          notes: mention.notes || ''
        };
      }

      if (typeof mention === 'string') {
        const name = mention;
        return {
          name,
          quantity: null,
          unit: null,
          category: categorize(name, 'unknown'),
          confidence: 0.4
        };
      }

      if (mention && typeof mention === 'object') {
        const name = mention.name || mention.original || 'Unknown ingredient';
        return {
          name,
          quantity: mention.quantity || null,
          unit: mention.unit || null,
          category: categorize(name, mention.category || 'unknown'),
          confidence: mention.confidence ?? 0.4
        };
      }

      const fallbackName = 'Unknown ingredient';
      return {
        name: fallbackName,
        quantity: null,
        unit: null,
        category: categorize(fallbackName, 'unknown'),
        confidence: 0.3
      };
    });

    return {
      categorizedIngredients,
      extractionMetadata: {
        method: normalized ? 'heuristic' : 'fallback',
        confidence: normalized ? 0.6 : 0.3,
        issues: normalized
          ? ['LLM extraction skipped - using heuristic results']
          : ['AI extraction unavailable']
      }
    };
  }

  /**
   * Create fallback validation result
   */
  createFallbackValidation(extractionResult) {
    const baseConfidence = extractionResult.extractionMetadata?.confidence || 0.3;
    const validationIssueDescription = extractionResult.extractionMetadata?.method === 'heuristic'
      ? 'Heuristic validation applied (LLM skipped for speed)'
      : 'AI validation unavailable';
    const validationSeverity = extractionResult.extractionMetadata?.method === 'heuristic'
      ? 'low'
      : 'medium';

    return {
      validatedIngredients: extractionResult.categorizedIngredients,
      issues: [{
        type: 'system',
        description: validationIssueDescription,
        severity: validationSeverity,
        affectedIngredients: extractionResult.categorizedIngredients.map(i => i.name)
      }],
      enhancements: [],
      duplicatesResolved: [],
      validationMetadata: {
        originalCount: extractionResult.categorizedIngredients.length,
        validatedCount: extractionResult.categorizedIngredients.length,
        issuesDetected: 1,
        enhancementsApplied: 0,
        confidence: baseConfidence,
        method: 'fallback'
      }
    };
  }

  /**
   * Create emergency fallback when everything fails
   */
  createEmergencyFallback(recipeText, extractionId, processingTime) {
    const basicIngredients = this.extractBasicIngredients(recipeText);
    
    return {
      ingredients: basicIngredients.map(name => ({
        name,
        quantity: null,
        unit: null,
        category: 'unknown',
        confidence: 0.2,
        validationIssues: ['Emergency fallback - manual review required']
      })),
      issues: [{
        type: 'critical',
        description: 'All AI processing failed - manual review required',
        severity: 'high',
        affectedIngredients: basicIngredients
      }],
      enhancements: [],
      duplicatesResolved: [],
      orchestrationMetadata: {
        extractionId,
        processingTime,
        agentsExecuted: [],
        fallbacksUsed: ['emergency'],
        recipeFormat: 'unknown',
        confidence: 0.2,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Isolate the ingredients section from recipe text using context-aware filtering
   */
  isolateIngredientsSection(fullText) {
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Section markers (same as SmartProcessingAgent)
    const sectionMarkers = {
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
    
    // Step patterns to filter out
    const stepPatterns = [
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
    
    let ingredientsStart = -1;
    let ingredientsEnd = lines.length;
    
    // Find ingredients section start
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      // Check for ingredients section markers
      if (sectionMarkers.ingredients.some(marker => line.includes(marker))) {
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
      if (sectionMarkers.instructions.some(marker => line.includes(marker))) {
        ingredientsEnd = i;
        break;
      }
      
      // Check for metadata markers
      if (sectionMarkers.metadata.some(marker => line.includes(marker))) {
        ingredientsEnd = i;
        break;
      }
      
      // Check for step patterns
      if (stepPatterns.some(pattern => pattern.test(line))) {
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
        if (stepPatterns.some(pattern => pattern.test(lowerLine))) {
          return false;
        }
        
        // Filter out metadata patterns
        if (sectionMarkers.metadata.some(marker => lowerLine.includes(marker))) {
          return false;
        }
        
        // Keep lines that look like ingredients
        return this.looksLikeIngredientLine(line) || 
               sectionMarkers.ingredients.some(marker => lowerLine.includes(marker));
      });
      
      return ingredientsSection.join('\n');
    }
    
    // If no clear section found, return filtered original text
    return lines.filter(line => {
      const lowerLine = line.toLowerCase();
      
      // Filter out obvious non-ingredient lines
      if (stepPatterns.some(pattern => pattern.test(lowerLine))) {
        return false;
      }
      
      if (sectionMarkers.metadata.some(marker => lowerLine.includes(marker))) {
        return false;
      }
      
      if (sectionMarkers.instructions.some(marker => lowerLine.includes(marker))) {
        return false;
      }
      
      return true;
    }).join('\n');
  }
  
  /**
   * Check if a line looks like it contains ingredient information
   * More flexible approach that handles diverse recipe formats
   */
  looksLikeIngredientLine(line) {
    const cleaned = this.cleanIngredientLine(line);
    const trimmed = cleaned.trim();
    const lowerLine = trimmed.toLowerCase();
    
    // Skip empty lines
    if (!trimmed) return false;
    
    // Skip obvious non-ingredient lines
    const obviousNonIngredients = [
      'step 1', 'step 2', 'step 3', 'step 4', 'step 5', 'step 6', 'step 7', 'step 8', 'step 9',
      'preparation', 'instructions', 'directions', 'method',
      'yield:', 'servings:', 'serves:', 'makes:', 'prep time:', 'cook time:', 'total time:',
      'temperature:', 'oven:', 'preheat'
      // Note: removed 'garnish', 'serve', 'for serving' as they can appear in valid ingredients
    ];
    
    if (obviousNonIngredients.some(pattern => lowerLine.includes(pattern))) {
      return false;
    }
    
    // Skip lines that are purely instructional (start with action verbs)
    const instructionalStarts = [
      'in a', 'add', 'heat', 'cook', 'bake', 'boil', 'simmer', 'fry', 'grill', 'roast',
      'mix', 'stir', 'combine', 'pour', 'fold', 'whisk', 'beat', 'blend', 'transfer',
      'divide', 'garnish', 'serve', 'season', 'bring', 'reduce', 'push', 'mash'
    ];
    
    if (instructionalStarts.some(start => lowerLine.startsWith(start))) {
      return false;
    }
    
    // More flexible quantity detection - handles compact formats like "3tablespoons"
    const hasQuantity = /\d/.test(trimmed);
    
    // More comprehensive unit detection
    const unitPatterns = [
      'tablespoon', 'tbsp', 'teaspoon', 'tsp', 'cup', 'ounce', 'oz', 'pound', 'lb',
      'gram', 'g', 'kilogram', 'kg', 'ml', 'liter', 'l', 'piece', 'pieces', 'can',
      'jar', 'bottle', 'clove', 'cloves', 'slice', 'slices', 'package', 'inch'
    ];
    
    const hasUnit = unitPatterns.some(unit => lowerLine.includes(unit));
    
    // Comprehensive ingredient detection - food-related terms
    const foodIndicators = [
      // Vegetables
      'green beans', 'shallot', 'garlic', 'ginger', 'scallions', 'lime', 'onion', 'carrot',
      'potato', 'tomato', 'pepper', 'celery', 'mushroom', 'spinach', 'broccoli',
      // Proteins
      'tofu', 'chicken', 'beef', 'pork', 'fish', 'egg', 'cheese',
      // Pantry staples
      'oil', 'safflower', 'canola', 'coconut milk', 'soy sauce', 'miso', 'sugar',
      'salt', 'pepper', 'vinegar', 'flour', 'rice', 'pasta', 'bread',
      // General food terms
      'milk', 'cream', 'butter', 'juice', 'sauce', 'stock', 'broth', 'herb', 'spice',
      // Additional terms for missing ingredients
      'scallions', 'lime juice', 'hot sauce', 'steamed rice'
    ];
    
    const hasFoodIndicator = foodIndicators.some(food => lowerLine.includes(food));
    
    // Special handling for common ingredient patterns
    const ingredientPatterns = [
      /\d+(?:\s*\/\s*\d+)?\s*[a-z]*\s*(?:tablespoon|tbsp|teaspoon|tsp|cup|ounce|oz|pound|lb|gram|g|kg|ml|liter|l)/i, // quantity + unit
      /\d+\s*(?:tablespoon|tbsp|teaspoon|tsp|cup|ounce|oz|pound|lb|gram|g|kg|ml|liter|l)/i, // compact format
      /\d+\s*[a-z]*\s*(?:oil|salt|pepper|sugar|flour|milk|cheese|egg|chicken|beef|tofu|scallions|lime)/i, // quantity + food
      /(?:kosher|sea)\s*salt/i, // salt types
      /black\s+pepper/i, // pepper types
      /hot\s+sauce/i, // sauce types
      /chopped\s+scallions/i, // specific ingredients
      /lime\s+juice/i, // specific ingredients
      /steamed\s+rice/i // specific ingredients
    ];
    
    const matchesIngredientPattern = ingredientPatterns.some(pattern => pattern.test(trimmed));
    
    // Line is likely an ingredient if:
    // 1. It matches an ingredient pattern, OR
    // 2. It has quantity + food indicator, OR  
    // 3. It has food indicator + unit (even without quantity)
    
    const isIngredient = matchesIngredientPattern || 
                        (hasQuantity && hasFoodIndicator) ||
                        (hasFoodIndicator && hasUnit);
    
    // Additional filtering for common non-ingredients that might slip through
    const nonIngredientPatterns = [
      /^\d+\s*servings?$/i,
      /^\d+\s*people$/i,
      /^for\s+serving$/i, // Only if line starts with "for serving"
      /^plus\s+more\s+for\s+garnish$/i // Only if entire line is just this
    ];
    
    const isNonIngredient = nonIngredientPatterns.some(pattern => pattern.test(trimmed));
    
    // Special handling: allow ingredients with "plus more for garnish" or "plus wedges for serving"
    const hasServingNote = /plus\s+(?:more\s+)?(?:for\s+garnish|wedges\s+for\s+serving)/i;
    
    return isIngredient && !isNonIngredient;
  }

  /**
   * Basic ingredient extraction for fallbacks with improved filtering and parsing
   */
  extractBasicIngredients(text) {
    const lines = text.split('\n');
    const ingredients = [];
    
    lines.forEach(line => {
      const originalLine = line.trim();
      const cleanedLine = this.cleanIngredientLine(originalLine);
      
      // Skip empty lines
      if (!cleanedLine) return;
      
      // Use our improved ingredient detection
      if (this.looksLikeIngredientLine(cleanedLine)) {
        // Parse the ingredient to extract quantity, unit, and name
        const parsed = this.parseIngredientLine(cleanedLine, originalLine);
        if (parsed) {
          ingredients.push(parsed);
        }
      }
    });
    
    return ingredients.slice(0, 20); // Limit to prevent too many false positives
  }
  
  /**
   * Parse an ingredient line into quantity, unit, and name components
   */
  parseIngredientLine(line, originalLine = line) {
    const trimmedOriginal = originalLine.trim();
    let processedLine = this.cleanIngredientLine(line);
    
    // Replace Unicode fractions with decimal equivalents
    processedLine = processedLine.replace(/[\u00BC\u00BD\u00BE\u2153\u2154\u215B]/g, match => ({
      '\u00BC': '0.25',
      '\u00BD': '0.5',
      '\u00BE': '0.75',
      '\u2153': '0.333',
      '\u2154': '0.667',
      '\u215B': '0.125'
    })[match]);
    
    if (!processedLine) {
      return null;
    }

    let remaining = processedLine.trim();
    let quantity = null;
    let unit = null;

    // Enhanced pattern to match:
    // - Simple numbers: "2", "3.5"
    // - Fractions with whole number: "1 1/2", "2 1/4"
    // - Simple fractions: "1/2", "3/4"
    // - Decimals: "0.5", "1.25"
    const quantityMatch = remaining.match(/^(\d+(?:\s+\d+\/\d+)?|\d+\s*\/\s*\d+|\d*\.\d+)/);
    if (quantityMatch) {
      quantity = this.parseQuantity(quantityMatch[1]);
      // Remove the matched quantity from the beginning
      remaining = remaining.substring(quantityMatch[0].length).trim();
    }

    if (remaining) {
      const unitInfo = this.identifyUnitFromCompact(remaining);
      if (unitInfo) {
        unit = unitInfo.unit;
        remaining = remaining.slice(unitInfo.matched.length).trim();
      }
    }

    // Remove connecting words like "of" or commas that may precede the name
    remaining = remaining
      .replace(/^(of|about|approximately)\s+/i, '')
      .replace(/^[,\.\-:\s]+/, '')
      .trim();

    const name = remaining || processedLine;

    if (!name) {
      return null;
    }

    // If no explicit quantity or unit but line still looks like ingredient, accept it
    if (!quantity && !unit && !this.looksLikeIngredientLine(name)) {
      if (!this.looksLikeIngredientLine(processedLine)) {
        return null;
      }
    }
    
    return {
      name,
      quantity,
      unit,
      original: trimmedOriginal
    };
  }

  /**
   * Clean leading bullets, numbering, and labels from ingredient lines
   */
  cleanIngredientLine(line) {
    if (!line) return '';

    return line
      .replace(/^[\-\*\u2022\u2023\u25CF\u25E6•●◦]+\s*/, '')
      .replace(/^\(?\d+\)?[\.)]\s+/, '')
      .replace(/^[a-z]\)\s+/i, '')
      .replace(/^ingredients?\s*[:\-]\s*/i, '')
      .trim();
  }
  
  /**
   * Identify unit from compact format
   */
  identifyUnitFromCompact(text) {
    const lowerText = (text || '').toLowerCase().trim();
    if (!lowerText) return null;
    
    const unitPatterns = [
      { pattern: /^(fluid\s+ounces?)/, unit: 'fluid ounces' },
      { pattern: /^(fl\s*oz)/, unit: 'fluid ounces' },
      { pattern: /^(tablespoons?)/, unit: 'tablespoons' },
      { pattern: /^(tbsp)/, unit: 'tablespoons' },
      { pattern: /^(teaspoons?)/, unit: 'teaspoons' },
      { pattern: /^(tsp)/, unit: 'teaspoons' },
      { pattern: /^(cups?)/, unit: 'cups' },
      { pattern: /^(ounces?)/, unit: 'ounces' },
      { pattern: /^(oz)/, unit: 'ounces' },
      { pattern: /^(pounds?)/, unit: 'pounds' },
      { pattern: /^(lb)/, unit: 'pounds' },
      { pattern: /^(grams?)/, unit: 'grams' },
      { pattern: /^(g)(?:\s|$)/, unit: 'grams' },  // "g" must be followed by space or end
      { pattern: /^(kilograms?)/, unit: 'kilograms' },
      { pattern: /^(kg)/, unit: 'kilograms' },
      { pattern: /^(milliliters?)/, unit: 'milliliters' },
      { pattern: /^(ml)/, unit: 'milliliters' },
      { pattern: /^(liters?)/, unit: 'liters' },
      { pattern: /^(l)(?:\s|$)/, unit: 'liters' },  // "l" must be followed by space or end
      { pattern: /^(pieces?)/, unit: 'pieces' },
      { pattern: /^(cans?)/, unit: 'cans' },
      { pattern: /^(jars?)/, unit: 'jars' },
      { pattern: /^(packages?)/, unit: 'packages' },
      { pattern: /^(packets?)/, unit: 'packages' },
      { pattern: /^(bags?)/, unit: 'bags' },
      { pattern: /^(bottles?)/, unit: 'bottles' },
      { pattern: /^(cloves?)/, unit: 'cloves' },
      { pattern: /^(slices?)/, unit: 'slices' },
      { pattern: /^(sticks?)/, unit: 'sticks' },
      { pattern: /^(heads?)/, unit: 'heads' },
      { pattern: /^(bunches?)/, unit: 'bunches' },
      { pattern: /^(pinches?)/, unit: 'pinches' },
      { pattern: /^(dashes?)/, unit: 'dashes' },
      { pattern: /^(sprinkles?)/, unit: 'sprinkles' },
      { pattern: /^(inch(?:es)?)/, unit: 'inches' }
    ];
    
    for (const { pattern, unit } of unitPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        return {
          unit,
          matched: match[0]
        };
      }
    }
    
    return null;
  }
  
  /**
   * Extract name from compact format after removing unit
   */
  extractNameFromCompact(text, matchedUnit) {
    if (!matchedUnit) return text.trim();
    
    const trimmedText = text.trim();
    const unitPattern = new RegExp(`^${matchedUnit.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\s*`, 'i');
    return trimmedText.replace(unitPattern, '').trim();
  }
  
  /**
   * Parse quantity string to number
   */
  parseQuantity(quantityStr) {
    if (!quantityStr) return null;
    
    // Handle mixed fractions like "1 1/2"
    const mixedFraction = quantityStr.match(/(\d+)\s+(\d+)\/(\d+)/);
    if (mixedFraction) {
      const whole = parseInt(mixedFraction[1]);
      const numerator = parseInt(mixedFraction[2]);
      const denominator = parseInt(mixedFraction[3]);
      return whole + (numerator / denominator);
    }
    
    // Handle simple fractions like "1/2"
    const simpleFraction = quantityStr.match(/(\d+)\/(\d+)/);
    if (simpleFraction) {
      return parseInt(simpleFraction[1]) / parseInt(simpleFraction[2]);
    }
    
    // Handle decimals and whole numbers
    const decimal = quantityStr.match(/([\d.]+)/);
    if (decimal) {
      return parseFloat(decimal[1]);
    }
    
    return null;
  }
  
  /**
   * Extract ingredient phrases from narrative sentences
   */
  extractIngredientPhrases(sentence) {
    const phrases = [];
    const lowerSentence = sentence.toLowerCase();
    
    // Filter out sentences that are clearly instructions
    const instructionIndicators = [
      'preheat', 'heat the', 'cook for', 'bake for', 'boil for', 'simmer for',
      'fry for', 'grill for', 'roast for', 'mix until', 'stir until', 'cook until',
      'bake until', 'boil until', 'simmer until', 'heat in', 'cook in', 'bake in',
      'start by', 'while that', 'once the', 'when the', 'add to', 'pour into'
    ];
    
    const isInstruction = instructionIndicators.some(indicator => 
      lowerSentence.includes(indicator)
    );
    
    if (isInstruction) {
      return phrases;
    }
    
    // Look for patterns like "you'll need X, Y, and Z" or "gather X, Y, Z"
    const gatheringPatterns = [
      /you'll need (.+?)(?:\.|$)/i,
      /you'll also want (.+?)(?:\.|$)/i,
      /gather (.+?)(?:\.|$)/i,
      /you need (.+?)(?:\.|$)/i,
      /next, gather (.+?)(?:\.|$)/i
    ];
    
    for (const pattern of gatheringPatterns) {
      const match = sentence.match(pattern);
      if (match) {
        const ingredientList = match[1];
        // Split by commas and "and"
        const items = ingredientList.split(/,\s*|\s+and\s+/);
        items.forEach(item => {
          const cleaned = item.trim().replace(/[.,;]$/, '');
          if (cleaned && this.looksLikeIngredientLine(cleaned)) {
            phrases.push(cleaned);
          }
        });
        break; // Only use the first matching pattern
      }
    }
    
    return phrases;
  }

  /**
   * Get extraction statistics
   */
  getExtractionStats() {
    return {
      orchestratorName: this.orchestratorName,
      availableAgents: ['SmartProcessingAgent', 'InformationExtractionAgent', 'ValidationAgent'],
      supportedFormats: ['structured', 'narrative', 'mixed', 'casual', 'unknown'],
      fallbackLevels: ['agent-fallback', 'emergency-fallback']
    };
  }
}

module.exports = RecipeOrchestrator;