/**
 * Validation & Enhancement Agent
 * 
 * This agent performs post-processing validation and enhancement of extracted ingredients.
 * It cross-validates the data, optimizes measurements, detects potential issues, and
 * enhances the ingredient information with additional context.
 */

const RequestRouter = require('../RequestRouter');
const { extractAndParseJSON } = require('../../../utils/jsonParser');

class ValidationAgent {
  constructor(openRouterClient) {
    this.client = openRouterClient;
    this.router = new (require('../RequestRouter'))();
    this.agentName = 'ValidationAgent';
  }

  /**
   * Validate and enhance extracted ingredients
   * @param {Object} extractedData - Data from Information Extraction Agent
   * @param {Object} preprocessingData - Data from Smart Processing Agent
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} - Validated and enhanced ingredient data
   */
  async validateAndEnhance(extractedData, preprocessingData, options = {}) {
    const startTime = Date.now();
    try {
      console.log(`${this.agentName}: Starting validation and enhancement process`);
      
      const validationPrompt = this.buildValidationPrompt(extractedData, preprocessingData, options);

      // Try with primary model first, then fallback
      const fallbackModel = process.env.OPENROUTER_VALIDATION_FALLBACK_MODEL || 'google/gemini-flash-1.5-8b';
      let response;
      
      try {
        response = await this.router.route('validation', {
          extractedData,
          preprocessingData
        }, {
          prompt: validationPrompt,
          maxTokens: 1200,
          temperature: 0.2,
          forceModelName: process.env.OPENROUTER_MODEL_SMALL,
          priority: 'speed'
        });
      } catch (primaryError) {
        console.warn(`${this.agentName}: Primary model failed, using fallback model`);
        response = await this.router.route('validation', {
          extractedData,
          preprocessingData
        }, {
          prompt: validationPrompt,
          maxTokens: 1200,
          temperature: 0.2,
          forceModelName: fallbackModel,
          priority: 'speed'
        });
      }

      const validationResult = this.parseValidationResponse(response.content);
      
      // Apply additional validation rules
      const finalResult = this.applyBusinessRules(validationResult, extractedData);
      
      const processingTime = Date.now() - startTime;
      console.log(`${this.agentName}: Validation complete in ${processingTime}ms. Found ${finalResult.validatedIngredients.length} validated ingredients`);
      
      return {
        ...finalResult,
        validationMetadata: {
          originalCount: (extractedData.categorizedIngredients?.length
            || extractedData.ingredients?.length
            || 0),
          validatedCount: finalResult.validatedIngredients.length,
          issuesDetected: finalResult.issues.length,
          enhancementsApplied: finalResult.enhancements.length,
          confidence: this.calculateOverallConfidence(finalResult.validatedIngredients),
          processingTime
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`${this.agentName}: Validation failed after ${processingTime}ms:`, error);
      return this.createFallbackValidation(extractedData);
    }
  }

  /**
   * Build validation prompt
   */
  buildValidationPrompt(extractedData, preprocessingData, options) {
    return `
Please validate and enhance the following extracted ingredient data:

## Preprocessing Analysis:
${JSON.stringify(preprocessingData, null, 2)}

## Extracted Ingredients:
${JSON.stringify(extractedData, null, 2)}

## Validation Requirements:
1. **Cross-Validation**: Verify consistency between preprocessing and extraction results
2. **Measurement Optimization**: Standardize and optimize measurements
3. **Issue Detection**: Identify potential problems (duplicates, conflicts, missing info)
4. **Enhancement**: Add valuable context (substitutions, storage info, prep notes)
5. **Confidence Scoring**: Assign confidence levels to each ingredient

## Output Format:
Return a JSON object with:
{
  "validatedIngredients": [
    {
      "name": "ingredient name",
      "quantity": number,
      "unit": "standardized unit",
      "category": "ingredient category",
      "preparation": "preparation method",
      "notes": "additional notes",
      "substitutions": ["alternative 1", "alternative 2"],
      "storageInfo": "storage guidance",
      "allergens": ["allergen1", "allergen2"],
      "confidence": 0.95,
      "validationIssues": ["issue1", "issue2"],
      "source": "original text reference"
    }
  ],
  "issues": [
    {
      "type": "duplicate|conflict|missing|unclear",
      "description": "issue description",
      "severity": "low|medium|high",
      "affectedIngredients": ["ingredient1", "ingredient2"]
    }
  ],
  "enhancements": [
    {
      "type": "substitution|storage|preparation",
      "description": "enhancement description",
      "ingredient": "ingredient name"
    }
  ],
  "duplicatesResolved": [
    {
      "original": ["duplicate1", "duplicate2"],
      "resolved": "consolidated ingredient"
    }
  ]
}

Focus on accuracy, consistency, and practical usability.
`;
  }

  /**
   * Get system prompt for validation
   */
  getSystemPrompt() {
    return `
You are a Validation and Enhancement Agent for recipe ingredient extraction. Your role is to:

1. **Validate Data Quality**: Ensure accuracy and consistency of extracted ingredients
2. **Cross-Reference**: Compare preprocessing and extraction results for discrepancies
3. **Optimize Measurements**: Convert to practical, standard units
4. **Detect Issues**: Identify duplicates, conflicts, and missing information
5. **Enhance Information**: Add valuable context like substitutions and storage tips
6. **Score Confidence**: Assess reliability of each extracted ingredient

Key Principles:
- Prioritize accuracy over speculation
- Flag uncertainties clearly
- Provide practical, actionable information
- Maintain consistency with original recipe intent
- Consider common cooking practices and substitutions

Validation Rules:
- Standardize units (cups, tbsp, tsp, oz, lb, g, kg)
- Resolve duplicate ingredients intelligently
- Detect measurement conflicts
- Identify missing critical information
- Suggest realistic substitutions
- Provide storage guidance where relevant

Be thorough but practical. Focus on information that helps users successfully execute the recipe.
`;
  }

  /**
   * Parse validation response
   */
  parseValidationResponse(responseContent) {
    try {
      // Use robust JSON extraction that handles nested structures
      return extractAndParseJSON(responseContent);
    } catch (error) {
      console.error(`${this.agentName}: Failed to parse validation response:`, error.message);
      throw error;
    }
  }

  /**
   * Apply business rules and additional validation
   */
  applyBusinessRules(validationResult, originalData) {
    const validatedIngredients = Array.isArray(validationResult.validatedIngredients)
      ? validationResult.validatedIngredients
      : [];
    
    // Apply business rules
    const enhancedIngredients = validatedIngredients.map(ingredient => {
      // Rule 1: Ensure reasonable quantities
      if (ingredient.quantity && ingredient.quantity > 1000 && ingredient.unit === 'cup') {
        ingredient.validationIssues = ingredient.validationIssues || [];
        ingredient.validationIssues.push('Unusually large quantity - verify units');
        ingredient.confidence = Math.min(ingredient.confidence || 1, 0.7);
      }
      
      // Rule 2: Standardize common abbreviations
      if (ingredient.unit) {
        ingredient.unit = this.standardizeUnit(ingredient.unit);
      }
      
      // Rule 3: Add common allergen warnings
      if (!ingredient.allergens || ingredient.allergens.length === 0) {
        ingredient.allergens = this.detectCommonAllergens(ingredient.name);
      }
      
      // Rule 4: Ensure category consistency
      if (!ingredient.category) {
        ingredient.category = this.inferCategory(ingredient.name);
      }
      
      return ingredient;
    });
    
    return {
      ...validationResult,
      validatedIngredients: enhancedIngredients
    };
  }

  /**
   * Standardize units
   */
  standardizeUnit(unit) {
    const unitMap = {
      'tbl': 'tbsp',
      'tbs': 'tbsp',
      'tablespoon': 'tbsp',
      'tspn': 'tsp',
      'teaspoon': 'tsp',
      'oz': 'oz',
      'ounce': 'oz',
      'lb': 'lb',
      'pound': 'lb',
      'g': 'g',
      'gram': 'g',
      'kg': 'kg',
      'kilogram': 'kg',
      'c': 'cup',
      'cups': 'cup'
    };
    
    return unitMap[unit.toLowerCase()] || unit;
  }

  /**
   * Detect common allergens
   */
  detectCommonAllergens(ingredientName) {
    const allergenMap = {
      'milk': ['dairy'],
      'cheese': ['dairy'],
      'butter': ['dairy'],
      'cream': ['dairy'],
      'yogurt': ['dairy'],
      'wheat': ['gluten'],
      'flour': ['gluten'],
      'bread': ['gluten'],
      'egg': ['egg'],
      'eggs': ['egg'],
      'peanut': ['peanut'],
      'peanuts': ['peanut'],
      'tree nut': ['tree nut'],
      'almond': ['tree nut'],
      'walnut': ['tree nut'],
      'pecan': ['tree nut'],
      'cashew': ['tree nut'],
      'soy': ['soy'],
      'soybean': ['soy'],
      'tofu': ['soy'],
      'shrimp': ['shellfish'],
      'crab': ['shellfish'],
      'lobster': ['shellfish'],
      'fish': ['fish']
    };
    
    const name = ingredientName.toLowerCase();
    for (const [key, allergens] of Object.entries(allergenMap)) {
      if (name.includes(key)) {
        return allergens;
      }
    }
    
    return [];
  }

  /**
   * Infer ingredient category
   */
  inferCategory(ingredientName) {
    const categoryMap = {
      'produce': ['tomato', 'onion', 'garlic', 'carrot', 'celery', 'lettuce', 'spinach', 'potato', 'bell pepper'],
      'protein': ['chicken', 'beef', 'pork', 'fish', 'tofu', 'egg', 'beans'],
      'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt'],
      'grains': ['flour', 'rice', 'pasta', 'bread', 'oats'],
      'spices': ['salt', 'pepper', 'cinnamon', 'cumin', 'paprika'],
      'oils': ['oil', 'olive oil', 'vegetable oil', 'butter'],
      'baking': ['sugar', 'baking powder', 'baking soda', 'vanilla']
    };
    
    const name = ingredientName.toLowerCase();
    for (const [category, items] of Object.entries(categoryMap)) {
      if (items.some(item => name.includes(item))) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(ingredients) {
    if (!ingredients || ingredients.length === 0) return 0;
    
    const totalConfidence = ingredients.reduce((sum, ingredient) => {
      return sum + (ingredient.confidence || 0.5);
    }, 0);
    
    return Math.round((totalConfidence / ingredients.length) * 100) / 100;
  }

  /**
   * Create fallback validation when AI fails
   */
  createFallbackValidation(extractedData) {
    console.log(`${this.agentName}: Using fallback validation`);
    
    const ingredients = extractedData.categorizedIngredients
      || extractedData.ingredients
      || [];
    const validatedIngredients = ingredients.map(ingredient => ({
      ...ingredient,
      confidence: 0.6,
      validationIssues: ['AI validation unavailable - using basic validation'],
      allergens: this.detectCommonAllergens(ingredient.name),
      category: ingredient.category || this.inferCategory(ingredient.name)
    }));
    
    return {
      validatedIngredients,
      issues: [
        {
          type: 'system',
          description: 'AI validation unavailable - using basic validation only',
          severity: 'medium',
          affectedIngredients: ingredients.map(i => i.name)
        }
      ],
      enhancements: [],
      duplicatesResolved: [],
      validationMetadata: {
        originalCount: ingredients.length,
        validatedCount: validatedIngredients.length,
        issuesDetected: 1,
        enhancementsApplied: 0,
        confidence: this.calculateOverallConfidence(validatedIngredients)
      }
    };
  }
}

module.exports = ValidationAgent;