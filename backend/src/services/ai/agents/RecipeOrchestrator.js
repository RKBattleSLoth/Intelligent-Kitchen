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
  async extractIngredients(recipeText, options = {}) {
    const startTime = Date.now();
    const extractionId = this.generateExtractionId();
    
    try {
      console.log(`${this.orchestratorName}: Starting ingredient extraction ${extractionId}`);
      
      // Step 1: Smart Processing (Preprocessing)
      const preprocessingResult = await this.executeWithFallback(
        'smart-processing',
        () => this.smartProcessingAgent.processRecipe({ text: recipeText, ...options }, options),
        this.createFallbackPreprocessing(recipeText)
      );
      
      // Step 2: Information Extraction
      const extractionResult = await this.executeWithFallback(
        'information-extraction',
        () => this.informationExtractionAgent.extractIngredients(preprocessingResult, options),
        this.createFallbackExtraction(preprocessingResult)
      );
      
      // Step 3: Validation & Enhancement
      const validationResult = await this.executeWithFallback(
        'validation',
        () => this.validationAgent.validateAndEnhance(extractionResult, preprocessingResult, options),
        this.createFallbackValidation(extractionResult)
      );
      
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
          agentsExecuted: ['smart-processing', 'information-extraction', 'validation'],
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
      .filter(ingredient => ingredient.confidence > 0.6)
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
      .filter(ingredient => ingredient.confidence > 0.6)
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
    return {
      recipeFormat: 'unknown',
      normalizedText: recipeText,
      rawIngredientMentions: this.extractBasicIngredients(recipeText),
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
    return {
      categorizedIngredients: preprocessingResult.rawIngredientMentions.map(mention => ({
        name: mention,
        quantity: null,
        unit: null,
        category: 'unknown'
      })),
      extractionMetadata: {
        method: 'fallback',
        confidence: 0.3,
        issues: ['AI extraction unavailable']
      }
    };
  }

  /**
   * Create fallback validation result
   */
  createFallbackValidation(extractionResult) {
    return {
      validatedIngredients: extractionResult.categorizedIngredients,
      issues: [{
        type: 'system',
        description: 'AI validation unavailable',
        severity: 'medium',
        affectedIngredients: extractionResult.categorizedIngredients.map(i => i.name)
      }],
      enhancements: [],
      duplicatesResolved: [],
      validationMetadata: {
        originalCount: extractionResult.categorizedIngredients.length,
        validatedCount: extractionResult.categorizedIngredients.length,
        issuesDetected: 1,
        enhancementsApplied: 0,
        confidence: 0.3
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
   * Basic ingredient extraction for fallbacks
   */
  extractBasicIngredients(text) {
    // Simple regex-based extraction for emergency fallback
    const lines = text.split('\n');
    const ingredients = [];
    
    lines.forEach(line => {
      // Look for lines that might be ingredients
      const cleaned = line.trim().toLowerCase();
      if (cleaned.length > 3 && !cleaned.includes('instruction') && !cleaned.includes('direction')) {
        // Very basic extraction - just take the line as potential ingredient
        if (/\d/.test(cleaned) || cleaned.includes('cup') || cleaned.includes('tbsp') || cleaned.includes('tsp')) {
          ingredients.push(line.trim());
        }
      }
    });
    
    return ingredients.slice(0, 20); // Limit to prevent too many false positives
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