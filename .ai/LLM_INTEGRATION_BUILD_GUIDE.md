# LLM Integration Build Guide: Intelligent Kitchen AI

## Executive Summary

This guide outlines the integration of Large Language Models (LLMs) into the Intelligent Kitchen platform using OpenRouter as the inference provider. The system employs a **specialized tiered model architecture** where each model tier has distinct responsibilities:

- **Small Model**: Primary conversational agent handling all user interactions and dialogue management
- **Medium Model**: Logic processor handling complex reasoning, planning, and decision-making
- **Large Model**: Data processor with 1M+ token context for large-scale data analysis and comprehensive processing

Models communicate via a **collaborative inference protocol**, passing data and partial results to each other to create optimal responses. The system includes **comprehensive tooling and skills** to automate data handling and enable models to execute actions autonomously.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Specialized Model Tier Strategy](#2-specialized-model-tier-strategy)
3. [Inter-Model Communication Protocol](#3-inter-model-communication-protocol)
4. [Tool & Skills Framework](#4-tool--skills-framework)
5. [Use Case Mapping](#5-use-case-mapping)
6. [OpenRouter Integration](#6-openrouter-integration)
7. [Collaborative Inference System](#7-collaborative-inference-system)
8. [API Design](#8-api-design)
9. [Implementation Phases](#9-implementation-phases)
10. [Technical Specifications](#10-technical-specifications)
11. [Testing & Validation](#11-testing--validation)
12. [Monitoring & Optimization](#12-monitoring--optimization)

---

## 1. Architecture Overview

### 1.1 High-Level System Design: Collaborative AI Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                                  │
│     (React + TypeScript - Natural Language Input, Image Upload)        │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API Gateway / Router                               │
│                  (Express.js - Request Routing)                         │
└────────┬──────────────────────────────────────────────────┬─────────────┘
         │                                                   │
         ▼                                                   ▼
┌──────────────────────┐                    ┌─────────────────────────────┐
│  Traditional CRUD    │                    │   AI Intelligence Layer     │
│  Controllers         │                    │   (Collaborative System)    │
│  - Pantry            │                    │                             │
│  - Recipes           │                    │  ┌───────────────────────┐  │
│  - Meal Plans        │◄───────────────────┼──┤ Orchestration Engine  │  │
│  - Grocery Lists     │   Tool Execution   │  │ (Multi-Model Router)  │  │
└──────────────────────┘                    │  └──────────┬────────────┘  │
                                            │             │               │
                                            │  ┌──────────▼────────────┐  │
                                            │  │ Inter-Model           │  │
                                            │  │ Communication Bus     │  │
                                            │  └──────────┬────────────┘  │
                                            │             │               │
              ┌─────────────────────────────┼─────────────┼───────────────┤
              │                             │             │               │
    ┌─────────▼──────────┐     ┌───────────▼─────┐    ┌──▼──────────────┐│
    │   SMALL MODEL      │◄───►│  MEDIUM MODEL   │◄──►│  LARGE MODEL    ││
    │   (Conversational) │ data│  (Logic/Planning)│data│  (Data/Context) ││
    │                    │     │                  │    │                 ││
    │ • User Interface   │     │ • Reasoning      │    │ • 1M+ Context   ││
    │ • Dialogue Mgmt    │     │ • Planning       │    │ • Bulk Data     ││
    │ • Intent Extract   │     │ • Decision Trees │    │ • Long Analysis ││
    │ • Quick Response   │     │ • Logic Chains   │    │ • Vision Tasks  ││
    │ • Context Maintain │     │ • Task Breaking  │    │ • Deep Search   ││
    │                    │     │ • Optimization   │    │ • Aggregation   ││
    └──────────┬─────────┘     └──────────┬───────┘    └────────┬────────┘│
               │                          │                     │         │
               └──────────────────────────┼─────────────────────┘         │
                                          │                               │
                        ┌─────────────────▼─────────────────┐             │
                        │      Tool & Skills Framework      │             │
                        │  • Database Tools (CRUD)          │             │
                        │  • API Integration Tools          │             │
                        │  • Calculation Tools              │             │
                        │  • Image Processing Tools         │             │
                        │  • Notification Tools             │             │
                        │  • External Service Tools         │             │
                        └───────────────┬───────────────────┘             │
                                        │                                 │
              ┌─────────────────────────┼─────────────────────────────────┘
              │                         │
    ┌─────────▼─────────┐     ┌─────────▼─────────────┐
    │  Knowledge Base   │     │   Execution Engine    │
    │  - Recipe DB      │     │   - Action Executor   │
    │  - Nutrition Data │     │   - State Manager     │
    │  - User Prefs     │     │   - Result Aggregator │
    │  - Pantry Context │     │   - Error Handler     │
    │  - Vector Store   │     │   - Async Task Queue  │
    └───────────────────┘     └───────────────────────┘
```

### 1.2 Core Components

#### A. **Orchestration Engine**
- **Multi-Model Router**: Analyzes requests and determines which model(s) to engage
- **Inter-Model Communication Bus**: Manages data passing between model tiers
- **Context Manager**: Maintains conversation state and enriches prompts
- **Response Synthesizer**: Combines outputs from multiple models into coherent responses
- **Cache Manager**: Intelligent caching at per-model and response levels

#### B. **Model Tier System** (Specialized Roles)
- **Small Model (Conversational Agent)**: Primary user interface, handles all dialogue
- **Medium Model (Logic Processor)**: Complex reasoning, planning, and optimization
- **Large Model (Data Processor)**: Large-scale data analysis with 1M+ token context

#### C. **Tool & Skills Framework**
- **Database Tools**: Automated CRUD operations on pantry, recipes, meal plans
- **API Integration Tools**: External service calls (nutrition APIs, grocery APIs)
- **Calculation Tools**: Nutrition calculations, unit conversions, cost estimates
- **Image Processing Tools**: Vision analysis, barcode reading, food identification
- **Notification Tools**: User alerts, reminders, proactive suggestions

#### D. **Knowledge & Execution Layer**
- **Knowledge Base**: Recipe database, nutrition data, user preferences, pantry state
- **Execution Engine**: Action executor, state manager, result aggregator
- **Vector Store**: Semantic search for recipes and ingredients
- **Memory System**: Long-term user preference learning

#### E. **Integration Points**
- Traditional CRUD controllers callable as tools by AI models
- New AI-specific endpoints for natural language interaction
- WebSocket support for streaming collaborative inference
- Image upload endpoints for vision capabilities

---

## 2. Specialized Model Tier Strategy

### 2.1 Tier Definitions

#### **SMALL MODEL** - Conversational Agent (Primary User Interface)
**Role**: Main conversational interface handling all user interactions

- **Cost**: $0.10 - $0.50 per 1M tokens
- **Latency**: <500ms (critical for real-time conversation)
- **Context Window**: 128K tokens
- **Primary Responsibilities**:
  - **Dialogue Management**: Manage multi-turn conversations
  - **Intent Extraction**: Understand what the user wants
  - **Quick Responses**: Provide immediate feedback and acknowledgments
  - **Context Maintenance**: Track conversation state
  - **Delegation**: Route complex tasks to Medium/Large models
  - **Response Delivery**: Present final results to user in natural language

**When to Use**:
- All direct user interactions
- Quick factual questions
- Conversation flow management
- Intent classification
- Simple confirmations and clarifications

**Communication Pattern**:
- Receives user input first
- Delegates to Medium model for logic/planning
- Delegates to Large model for data-heavy tasks
- Receives processed results from other models
- Formats and delivers final response to user

**Recommended Models** (User to Select):
- GPT-4o-mini
- Claude 3 Haiku / 3.5 Haiku
- Gemini 1.5 Flash
- Llama 3.1 8B / 3.3 70B

---

#### **MEDIUM MODEL** - Logic & Planning Processor
**Role**: Complex reasoning, decision-making, and task planning

- **Cost**: $1 - $5 per 1M tokens
- **Latency**: 1-3s
- **Context Window**: 200K tokens
- **Primary Responsibilities**:
  - **Reasoning**: Multi-step logical reasoning
  - **Planning**: Break down complex tasks into actionable steps
  - **Decision Trees**: Evaluate options and make optimal choices
  - **Recipe Analysis**: Analyze recipes for adaptations, substitutions
  - **Meal Planning Logic**: Optimize meal plans for nutrition, cost, variety
  - **Constraint Satisfaction**: Balance multiple user requirements
  - **Tool Selection**: Determine which tools/APIs to call

**When to Use**:
- Meal plan generation logic
- Recipe recommendations with multiple constraints
- Ingredient substitution reasoning
- Optimization problems (cost, nutrition, time)
- Multi-step task planning
- Complex decision making

**Communication Pattern**:
- Receives tasks from Small model
- Can request data from Large model
- Uses tools to query/modify database
- Returns structured results to Small model
- May collaborate with Large model for data analysis

**Recommended Models** (User to Select):
- GPT-4o / GPT-4o-mini
- Claude 3.5 Sonnet / Haiku
- Gemini 1.5 Pro
- Mistral Large / Medium

---

#### **LARGE MODEL** - Data Processor & Analyzer (1M Context)
**Role**: Large-scale data processing and comprehensive analysis

- **Cost**: $5 - $15 per 1M tokens
- **Latency**: 2-5s (acceptable for background processing)
- **Context Window**: 1 Million tokens
- **Primary Responsibilities**:
  - **Bulk Data Analysis**: Process entire recipe databases
  - **Long Document Processing**: Analyze full nutrition reports
  - **Comprehensive Search**: Deep search across large datasets
  - **Vision Tasks**: Image analysis, barcode reading
  - **Data Aggregation**: Combine and summarize large data sets
  - **Historical Analysis**: Analyze user's full meal history
  - **Pattern Recognition**: Find trends in eating habits

**When to Use**:
- Analyzing all recipes matching criteria
- Processing entire pantry history
- Vision tasks (image analysis, barcode scanning)
- Comprehensive nutritional analysis
- Large-scale data aggregation
- Deep research queries requiring full context

**Communication Pattern**:
- Receives data-heavy requests from Medium model
- Can process thousands of recipes at once
- Returns summarized findings to Medium model
- Handles vision requests directly
- Provides context for Medium model's reasoning

**Recommended Models** (User to Select):
- GPT-4o (vision, 128K context)
- Claude 3.5 Sonnet (vision, 200K context)
- Gemini 1.5 Pro (vision, 1M context) **← Ideal for data processing**
- Gemini 1.5 Flash (vision, 1M context, faster)
- Gemini 2.0 Flash (vision, 1M context, multimodal)

---

### 2.2 Context Window Strategy

**Understanding the Context Windows:**

| Model | Context Window | What This Means | Example Use Case |
|-------|----------------|-----------------|------------------|
| **Small** | 128K tokens | ~96,000 words or ~300 pages of text | Can hold entire conversation history (50+ turns), all recent user interactions, full pantry state |
| **Medium** | 200K tokens | ~150,000 words or ~460 pages | Can process 100+ recipes at once, analyze full week of meal plans with reasoning |
| **Large** | 1M tokens | ~750,000 words or ~2,300 pages | Can analyze entire recipe database (1000+ recipes), full user history (months of data), comprehensive nutritional analysis |

**Key Implications:**

1. **Small Model (128K) is very capable** - With 128K context, the conversational agent can:
   - Maintain very long conversations without losing context
   - Keep full user profile, preferences, and recent activity in context
   - Reference multiple previous interactions
   - Hold substantial conversation history for coherent multi-turn dialogues

2. **Medium Model (200K) handles substantial logic** - With 200K context, it can:
   - Process and reason about 100+ recipes simultaneously
   - Analyze multiple meal plans and compare options
   - Work with extensive constraint sets and user requirements
   - Keep full planning context for complex multi-step operations

3. **Large Model (1M) is for true bulk processing** - With 1M context, it can:
   - Load entire recipe database into a single inference
   - Analyze months of user meal history
   - Process comprehensive nutritional data across many recipes
   - Perform deep pattern analysis across large datasets
   - Handle vision tasks with extensive supporting context

**When to Escalate Between Models:**

```javascript
// Context window utilization thresholds

SMALL_MODEL_THRESHOLD = 100K tokens  // If conversation + context exceeds this, consider summarization
MEDIUM_MODEL_THRESHOLD = 150K tokens // If reasoning requires more, delegate data gathering to Large
LARGE_MODEL_THRESHOLD = 800K tokens  // If data exceeds this, implement chunking strategy

// Example: Deciding when to use Large model
if (recipesToAnalyze.length > 200 || totalTokens > 150K) {
  // Use Large model for comprehensive analysis
  useModel = 'large';
} else if (needsComplexReasoning || multipleCon straints) {
  // Medium model can handle this
  useModel = 'medium';
} else {
  // Small model is sufficient
  useModel = 'small';
}
```

### 2.3 Collaborative Model Selection Strategy

Unlike traditional single-model systems, the Intelligent Kitchen uses a **collaborative approach** where models work together:

```javascript
// backend/src/services/ai/ModelOrchestrator.js

class ModelOrchestrator {
  async processRequest(userMessage, context) {
    // STEP 1: Small model receives user input (ALWAYS first)
    const conversationalResponse = await this.smallModel.analyzeIntent(userMessage, context);
    
    // STEP 2: Determine if delegation is needed
    if (conversationalResponse.canHandleDirectly) {
      // Simple query, small model responds directly
      return conversationalResponse.message;
    }
    
    // STEP 3: Delegate to appropriate model(s)
    const delegationPlan = conversationalResponse.delegationPlan;
    
    if (delegationPlan.needsDataProcessing) {
      // Large model processes data
      const dataResults = await this.largeModel.processData(delegationPlan.dataRequest);
      
      // Medium model uses data to plan/reason
      const plan = await this.mediumModel.reason(delegationPlan.logicRequest, dataResults);
      
      // Small model presents results
      return await this.smallModel.formatResponse(plan, userMessage);
    }
    
    if (delegationPlan.needsLogic) {
      // Medium model handles reasoning
      const logicResults = await this.mediumModel.reason(delegationPlan.logicRequest);
      
      // Small model formats for user
      return await this.smallModel.formatResponse(logicResults, userMessage);
    }
  }
}
```

**Key Principles**:
1. **Small model is always the entry and exit point** (user interface)
2. **Medium model handles all logic and planning**
3. **Large model processes bulk data and vision**
4. **Models pass structured data between each other**
5. **Each model focuses on its specialty**

---

## 3. Inter-Model Communication Protocol

### 3.1 Communication Architecture

Models communicate via a **message bus** that passes structured data:

```javascript
// backend/src/services/ai/InterModelBus.js

class InterModelBus {
  constructor() {
    this.messageQueue = [];
    this.activeConversations = new Map();
  }

  // Small -> Medium: Delegation
  async delegateToLogic(conversationId, task) {
    return {
      type: 'LOGIC_REQUEST',
      from: 'small',
      to: 'medium',
      conversationId,
      task: {
        intent: task.intent,
        parameters: task.parameters,
        constraints: task.constraints,
        userContext: task.context
      },
      expectsResponse: true
    };
  }

  // Medium -> Large: Data Request
  async requestDataProcessing(conversationId, dataRequest) {
    return {
      type: 'DATA_REQUEST',
      from: 'medium',
      to: 'large',
      conversationId,
      dataRequest: {
        operation: dataRequest.operation, // 'search', 'analyze', 'aggregate'
        dataset: dataRequest.dataset, // 'recipes', 'pantry', 'history'
        filters: dataRequest.filters,
        scope: dataRequest.scope // how much data to process
      },
      expectsResponse: true
    };
  }

  // Large -> Medium: Data Response
  async returnDataResults(conversationId, results) {
    return {
      type: 'DATA_RESPONSE',
      from: 'large',
      to: 'medium',
      conversationId,
      results: {
        summary: results.summary,
        detailedData: results.data,
        metadata: {
          itemsProcessed: results.count,
          processingTime: results.time
        }
      }
    };
  }

  // Medium -> Small: Results
  async returnLogicResults(conversationId, results) {
    return {
      type: 'LOGIC_RESPONSE',
      from: 'medium',
      to: 'small',
      conversationId,
      results: {
        decision: results.decision,
        plan: results.plan,
        reasoning: results.reasoning,
        confidence: results.confidence
      }
    };
  }
}
```

### 3.2 Communication Patterns

#### Pattern 1: Simple Query (Small Model Only)
```
User: "What temperature should I bake chicken?"
  ↓
[Small Model] → Direct response → User
```

#### Pattern 2: Logic Required (Small → Medium → Small)
```
User: "Suggest a recipe using chicken and vegetables"
  ↓
[Small Model] - Extracts intent
  ↓
[Medium Model] - Analyzes constraints, searches recipes, ranks options
  ↓
[Small Model] - Formats recommendations
  ↓
User receives: "Here are 3 recipes..."
```

#### Pattern 3: Data-Heavy (Small → Medium → Large → Medium → Small)
```
User: "Create a 7-day meal plan using mostly what I have"
  ↓
[Small Model] - Identifies complex request
  ↓
[Medium Model] - Creates planning logic, identifies data needs
  ↓
[Large Model] - Processes all pantry items + all recipe database
  ↓
[Medium Model] - Uses data to optimize meal plan
  ↓
[Small Model] - Presents plan conversationally
  ↓
User receives formatted meal plan
```

#### Pattern 4: Vision + Logic (Small → Large → Medium → Small)
```
User: Uploads fridge photo + "What can I make for dinner?"
  ↓
[Small Model] - Identifies image + question
  ↓
[Large Model] - Analyzes image, identifies ingredients
  ↓
[Medium Model] - Reasons about recipes given ingredients
  ↓
[Small Model] - Presents suggestions
  ↓
User receives: "I see you have eggs, milk, cheese... here are 5 recipes"
```

### 3.3 Implementation Example

```javascript
// backend/src/services/ai/CollaborativeInference.js

class CollaborativeInference {
  constructor(smallModel, mediumModel, largeModel, tools) {
    this.small = smallModel;
    this.medium = mediumModel;
    this.large = largeModel;
    this.tools = tools;
    this.bus = new InterModelBus();
  }

  async process(userMessage, context) {
    const conversationId = context.conversationId || uuidv4();
    
    // PHASE 1: Small model analyzes user input
    const analysis = await this.small.chat([
      {
        role: 'system',
        content: `You are the conversational interface for a kitchen AI. 
        Analyze the user's message and determine:
        1. Can you answer directly? (simple facts, greetings, clarifications)
        2. Do you need logic/planning? (recipe selection, meal planning)
        3. Do you need data processing? (analyze pantry, search many recipes)
        4. Do you need vision? (image uploaded)
        
        Respond with JSON:
        {
          "canHandleDirectly": boolean,
          "needsLogic": boolean,
          "needsData": boolean,
          "needsVision": boolean,
          "intent": "string",
          "parameters": {}
        }`
      },
      { role: 'user', content: userMessage }
    ], { tier: 'small', temperature: 0.3 });

    const decision = JSON.parse(analysis.content);

    // PHASE 2: Direct response (small model only)
    if (decision.canHandleDirectly) {
      const response = await this.small.chat([
        { role: 'system', content: 'You are a friendly kitchen assistant.' },
        { role: 'user', content: userMessage }
      ], { tier: 'small' });
      
      return { message: response.content, models: ['small'] };
    }

    // PHASE 3: Vision processing (if needed)
    let visionData = null;
    if (decision.needsVision && context.imageUrl) {
      visionData = await this.large.chatWithImage([
        {
          role: 'user',
          content: 'Identify all food items in this image. Return as JSON array.'
        }
      ], context.imageUrl, { tier: 'large' });
      
      decision.parameters.identifiedItems = JSON.parse(visionData.content);
    }

    // PHASE 4: Data processing (if needed)
    let processedData = null;
    if (decision.needsData) {
      // Large model processes bulk data
      const dataPrompt = this.buildDataPrompt(decision, context);
      processedData = await this.large.chat([
        {
          role: 'system',
          content: 'You are a data processor. Analyze large datasets and return summaries.'
        },
        { role: 'user', content: dataPrompt }
      ], { tier: 'large', maxTokens: 4000 });
    }

    // PHASE 5: Logic/Planning (medium model)
    if (decision.needsLogic) {
      const logicPrompt = this.buildLogicPrompt(decision, processedData, context);
      const plan = await this.medium.chat([
        {
          role: 'system',
          content: `You are a planning and reasoning specialist. 
          Create optimal plans given constraints and data.
          Use available tools to execute actions.`
        },
        { role: 'user', content: logicPrompt }
      ], { 
        tier: 'medium',
        tools: this.getAvailableTools()
      });

      // Execute any tool calls from medium model
      if (plan.toolCalls) {
        const toolResults = await this.executeTools(plan.toolCalls);
        processedData = { ...processedData, toolResults };
      }
    }

    // PHASE 6: Format final response (small model)
    const finalResponse = await this.small.chat([
      {
        role: 'system',
        content: 'Present the following results to the user in a friendly, conversational way.'
      },
      {
        role: 'user',
        content: `Original request: ${userMessage}\n\nResults: ${JSON.stringify(processedData)}`
      }
    ], { tier: 'small' });

    return {
      message: finalResponse.content,
      models: this.getModelsUsed(decision),
      processingSteps: this.getProcessingLog()
    };
  }

  buildDataPrompt(decision, context) {
    // Build prompt for large model data processing
    const { intent, parameters } = decision;
    
    let prompt = `Analyze the following data:\n\n`;
    
    if (intent === 'meal_planning') {
      prompt += `Pantry Items (${context.pantryItems.length}):\n`;
      prompt += JSON.stringify(context.pantryItems, null, 2);
      prompt += `\n\nRecipe Database (${context.allRecipes.length} recipes):\n`;
      prompt += JSON.stringify(context.allRecipes, null, 2);
      prompt += `\n\nFind recipes that maximize pantry usage.`;
    }
    
    return prompt;
  }

  buildLogicPrompt(decision, dataResults, context) {
    // Build prompt for medium model reasoning
    return `Task: ${decision.intent}\n\nConstraints: ${JSON.stringify(decision.parameters)}\n\nAvailable Data: ${JSON.stringify(dataResults)}\n\nCreate an optimal plan.`;
  }

  getAvailableTools() {
    // Return tool definitions for medium model
    return [
      {
        type: 'function',
        function: {
          name: 'search_recipes',
          description: 'Search recipe database with filters',
          parameters: {
            type: 'object',
            properties: {
              ingredients: { type: 'array', items: { type: 'string' } },
              diet: { type: 'string' },
              maxTime: { type: 'number' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'add_to_meal_plan',
          description: 'Add recipe to user meal plan',
          parameters: {
            type: 'object',
            properties: {
              recipeId: { type: 'string' },
              date: { type: 'string' },
              mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner'] }
            }
          }
        }
      }
    ];
  }

  async executeTools(toolCalls) {
    const results = [];
    for (const call of toolCalls) {
      const result = await this.tools.execute(call.name, call.parameters);
      results.push({ tool: call.name, result });
    }
    return results;
  }
}
```

---

## 4. Tool & Skills Framework

### 4.1 Tool Architecture

Tools enable models to interact with the system and external services:

```javascript
// backend/src/services/ai/tools/ToolRegistry.js

class ToolRegistry {
  constructor(database, apiClients) {
    this.db = database;
    this.apis = apiClients;
    this.tools = this.registerTools();
  }

  registerTools() {
    return {
      // Database Tools
      'get_pantry_items': this.getPantryItems.bind(this),
      'add_pantry_item': this.addPantryItem.bind(this),
      'update_pantry_item': this.updatePantryItem.bind(this),
      'remove_pantry_item': this.removePantryItem.bind(this),
      
      'search_recipes': this.searchRecipes.bind(this),
      'get_recipe_details': this.getRecipeDetails.bind(this),
      'create_recipe': this.createRecipe.bind(this),
      
      'get_meal_plans': this.getMealPlans.bind(this),
      'create_meal_plan': this.createMealPlan.bind(this),
      'add_meal_to_plan': this.addMealToPlan.bind(this),
      
      'get_grocery_lists': this.getGroceryLists.bind(this),
      'create_grocery_list': this.createGroceryList.bind(this),
      'add_item_to_list': this.addItemToList.bind(this),
      
      // Calculation Tools
      'calculate_nutrition': this.calculateNutrition.bind(this),
      'convert_units': this.convertUnits.bind(this),
      'estimate_cost': this.estimateCost.bind(this),
      'scale_recipe': this.scaleRecipe.bind(this),
      
      // API Integration Tools
      'lookup_nutrition_data': this.lookupNutritionData.bind(this),
      'search_external_recipes': this.searchExternalRecipes.bind(this),
      'get_ingredient_prices': this.getIngredientPrices.bind(this),
      
      // Notification Tools
      'send_notification': this.sendNotification.bind(this),
      'schedule_reminder': this.scheduleReminder.bind(this),
      
      // Image Processing Tools
      'analyze_food_image': this.analyzeFoodImage.bind(this),
      'read_barcode': this.readBarcode.bind(this),
      'extract_recipe_from_image': this.extractRecipeFromImage.bind(this),
    };
  }

  async execute(toolName, parameters, context) {
    if (!this.tools[toolName]) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    try {
      const result = await this.tools[toolName](parameters, context);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // DATABASE TOOLS
  async getPantryItems(params, context) {
    const { category, sortBy } = params;
    const items = await this.db.query(`
      SELECT * FROM pantry_items 
      WHERE user_id = $1 
      ${category ? 'AND category = $2' : ''}
      ORDER BY ${sortBy || 'name'}
    `, [context.userId, category].filter(Boolean));
    
    return items.rows;
  }

  async addPantryItem(params, context) {
    const { name, quantity, unit, expirationDate, category } = params;
    const result = await this.db.query(`
      INSERT INTO pantry_items (user_id, name, quantity, unit, expiration_date, category)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [context.userId, name, quantity, unit, expirationDate, category]);
    
    return result.rows[0];
  }

  async searchRecipes(params, context) {
    const { ingredients, diet, maxTime, minRating, excludeIngredients } = params;
    
    let query = `
      SELECT r.*, 
             array_agg(ri.name) as ingredients,
             n.calories, n.protein, n.carbohydrates, n.fat
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN nutrition_info n ON r.id = n.recipe_id
      WHERE r.is_public = true
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (ingredients && ingredients.length > 0) {
      query += ` AND EXISTS (
        SELECT 1 FROM recipe_ingredients ri2 
        WHERE ri2.recipe_id = r.id 
        AND ri2.name = ANY(${paramIndex})
      )`;
      queryParams.push(ingredients);
      paramIndex++;
    }
    
    if (maxTime) {
      query += ` AND (r.prep_time + r.cook_time) <= ${paramIndex}`;
      queryParams.push(maxTime);
      paramIndex++;
    }
    
    query += ` GROUP BY r.id, n.id LIMIT 20`;
    
    const result = await this.db.query(query, queryParams);
    return result.rows;
  }

  async createMealPlan(params, context) {
    const { name, startDate, endDate, meals } = params;
    
    // Create meal plan
    const planResult = await this.db.query(`
      INSERT INTO meal_plans (user_id, name, start_date, end_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [context.userId, name, startDate, endDate]);
    
    const mealPlan = planResult.rows[0];
    
    // Add meals to plan
    for (const meal of meals) {
      await this.db.query(`
        INSERT INTO meal_plan_entries (meal_plan_id, recipe_id, meal_date, meal_type)
        VALUES ($1, $2, $3, $4)
      `, [mealPlan.id, meal.recipeId, meal.date, meal.type]);
    }
    
    return mealPlan;
  }

  // CALCULATION TOOLS
  async calculateNutrition(params, context) {
    const { ingredients } = params;
    let totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    for (const ingredient of ingredients) {
      const nutritionData = await this.lookupNutritionData({ 
        ingredient: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit
      }, context);
      
      totalNutrition.calories += nutritionData.calories;
      totalNutrition.protein += nutritionData.protein;
      totalNutrition.carbs += nutritionData.carbs;
      totalNutrition.fat += nutritionData.fat;
    }
    
    return totalNutrition;
  }

  async convertUnits(params, context) {
    const { amount, fromUnit, toUnit } = params;
    const conversions = {
      'cups_to_ml': 236.588,
      'tbsp_to_ml': 14.787,
      'tsp_to_ml': 4.929,
      'oz_to_grams': 28.35,
      'lbs_to_grams': 453.592
    };
    
    const key = `${fromUnit}_to_${toUnit}`;
    if (conversions[key]) {
      return { amount: amount * conversions[key], unit: toUnit };
    }
    
    throw new Error(`Conversion not supported: ${fromUnit} to ${toUnit}`);
  }

  async scaleRecipe(params, context) {
    const { recipeId, newServings } = params;
    const recipe = await this.getRecipeDetails({ recipeId }, context);
    const scaleFactor = newServings / recipe.servings;
    
    const scaledIngredients = recipe.ingredients.map(ing => ({
      ...ing,
      amount: ing.amount * scaleFactor
    }));
    
    return {
      ...recipe,
      servings: newServings,
      ingredients: scaledIngredients
    };
  }

  // API INTEGRATION TOOLS
  async lookupNutritionData(params, context) {
    const { ingredient, amount, unit } = params;
    // Call external nutrition API (e.g., USDA FoodData Central)
    const response = await this.apis.nutrition.search(ingredient);
    
    if (response.foods && response.foods.length > 0) {
      const food = response.foods[0];
      return {
        name: ingredient,
        calories: food.calories * amount,
        protein: food.protein * amount,
        carbs: food.carbohydrates * amount,
        fat: food.fat * amount
      };
    }
    
    return null;
  }

  async getIngredientPrices(params, context) {
    const { ingredients, store } = params;
    // Call grocery price API
    const prices = await this.apis.grocery.getPrices(ingredients, store);
    return prices;
  }

  // IMAGE PROCESSING TOOLS
  async analyzeFoodImage(params, context) {
    const { imageUrl } = params;
    // This would typically call Large model with vision
    // But here it's a tool that can be called by Medium model
    const visionResult = await this.apis.vision.analyze(imageUrl);
    return {
      identifiedItems: visionResult.items,
      confidence: visionResult.confidence
    };
  }

  async readBarcode(params, context) {
    const { imageUrl } = params;
    const barcodeData = await this.apis.barcode.read(imageUrl);
    
    if (barcodeData.code) {
      // Look up product info
      const productInfo = await this.apis.productDB.lookup(barcodeData.code);
      return {
        barcode: barcodeData.code,
        product: productInfo.name,
        brand: productInfo.brand,
        nutrition: productInfo.nutrition
      };
    }
    
    return null;
  }

  // NOTIFICATION TOOLS
  async sendNotification(params, context) {
    const { message, type, priority } = params;
    await this.apis.notifications.send({
      userId: context.userId,
      message,
      type,
      priority
    });
    return { sent: true };
  }

  async scheduleReminder(params, context) {
    const { message, scheduledFor } = params;
    await this.db.query(`
      INSERT INTO scheduled_notifications (user_id, message, scheduled_for)
      VALUES ($1, $2, $3)
    `, [context.userId, message, scheduledFor]);
    return { scheduled: true };
  }
}

module.exports = ToolRegistry;
```

### 4.2 Tool Usage by Model Tier

| Tool Category | Small Model | Medium Model | Large Model |
|--------------|-------------|--------------|-------------|
| **Database CRUD** | ❌ No | ✅ Yes (primary) | ❌ No |
| **Calculations** | ❌ No | ✅ Yes | ❌ No |
| **API Calls** | ❌ No | ✅ Yes | ❌ No |
| **Notifications** | ❌ No | ✅ Yes | ❌ No |
| **Image Processing** | ❌ No | ✅ Can request | ✅ Performs |

**Key Principle**: **Medium model is the primary tool user**. It executes database operations, makes calculations, and calls APIs based on its reasoning.

### 4.3 Tool Call Flow Example

```
User: "Add chicken breast to my pantry and suggest a recipe"
  ↓
[Small Model] - "User wants to add item + get recipe"
  ↓
[Medium Model] receives task:
  1. Calls tool: add_pantry_item({ name: "chicken breast", quantity: 1, unit: "lb" })
  2. Calls tool: get_pantry_items({}) // get all pantry
  3. Calls tool: search_recipes({ ingredients: ["chicken breast"] })
  4. Reasons about which recipe is best
  5. Returns structured result
  ↓
[Small Model] - "I've added chicken breast. Here's a great recipe: Grilled Chicken..."
```

---

## 5. Use Case Mapping

### 3.1 SMALL Model Use Cases

| Use Case | Description | Example Input | Expected Output |
|----------|-------------|---------------|-----------------|
| **Ingredient Classification** | Categorize ingredients by type | "tomato" | "vegetable" |
| **Unit Conversion** | Quick measurement conversions | "2 cups to ml" | "473 ml" |
| **Dietary Tag Extraction** | Extract dietary labels from text | "gluten-free vegan recipe" | ["gluten-free", "vegan"] |
| **Expiry Status Check** | Determine if item is expired | "milk, purchased 2 weeks ago" | "likely expired" |
| **Quick Q&A** | Simple factual questions | "What temperature to bake chicken?" | "375°F (190°C)" |
| **Intent Classification** | Determine user intent | "I need dinner ideas" | "meal_suggestion_request" |

### 3.2 MEDIUM Model Use Cases

| Use Case | Description | Example Input | Expected Output |
|----------|-------------|---------------|-----------------|
| **Recipe Recommendations** | Suggest recipes based on criteria | "quick vegetarian dinner with pasta" | List of 5 recipes with reasoning |
| **Pantry Analysis** | Analyze pantry for meal possibilities | Pantry inventory JSON | Recipes you can make + missing ingredients |
| **Conversational Interface** | Multi-turn conversations | "What can I make?" → "I have chicken" | Contextual recipe suggestions |
| **Recipe Adaptation** | Modify recipes for dietary needs | "Make this recipe vegan" | Modified ingredient list + instructions |
| **Ingredient Substitution** | Suggest alternatives | "What can replace buttermilk?" | "Milk + lemon juice (ratio provided)" |
| **Nutrition Explanation** | Explain nutritional content | "Why is this recipe high in protein?" | Detailed explanation with sources |
| **Grocery List Optimization** | Organize and optimize shopping | Unorganized item list | Grouped by aisle + store layout |

### 3.3 LARGE Model Use Cases

| Use Case | Description | Example Input | Expected Output |
|----------|-------------|---------------|-----------------|
| **Weekly Meal Planning** | Generate complete meal plans | Preferences + goals + pantry | 7-day meal plan with recipes |
| **Image-Based Pantry Scanning** | Identify foods from photos | Photo of open refrigerator | Structured inventory list |
| **Barcode Recognition** | Extract product info from barcode | Barcode image | Product name, nutrition, expiry |
| **Recipe From Image** | Create recipe from dish photo | Photo of meal | Recipe with ingredients + instructions |
| **Complex Dietary Planning** | Multi-constraint optimization | "1500 cal, low-carb, nut allergy, family of 4" | Personalized meal plan meeting all criteria |
| **Nutritional Deep Analysis** | Comprehensive health analysis | Week of meals + health goals | Detailed nutritional report + recommendations |
| **Multi-Recipe Coordination** | Plan meals using pantry efficiently | Pantry + 5 days of dinners | Coordinated plan minimizing waste |

---

## 4. OpenRouter Integration

### 4.1 Service Architecture

```javascript
// backend/src/services/ai/OpenRouterService.js

class OpenRouterService {
  constructor() {
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.models = {
      small: process.env.OPENROUTER_MODEL_SMALL,
      medium: process.env.OPENROUTER_MODEL_MEDIUM,
      large: process.env.OPENROUTER_MODEL_LARGE,
    };
  }

  async chat(messages, options = {}) {
    const {
      tier = 'medium',
      temperature = 0.7,
      maxTokens = 1000,
      stream = false,
      tools = null,
    } = options;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': process.env.APP_URL,
        'X-Title': 'Intelligent Kitchen AI',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.models[tier],
        messages,
        temperature,
        max_tokens: maxTokens,
        stream,
        tools,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    return stream ? response.body : await response.json();
  }

  async chatWithImage(messages, imageUrl, options = {}) {
    // Force large model for vision tasks
    const visionMessages = messages.map((msg, idx) => {
      if (idx === messages.length - 1 && msg.role === 'user') {
        return {
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        };
      }
      return msg;
    });

    return this.chat(visionMessages, { ...options, tier: 'large' });
  }

  async getModelInfo() {
    const response = await fetch(`${this.baseURL}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    return response.json();
  }
}

module.exports = new OpenRouterService();
```

### 4.2 Environment Configuration

```bash
# backend/.env

# OpenRouter Configuration
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL_SMALL=anthropic/claude-3-haiku
OPENROUTER_MODEL_MEDIUM=anthropic/claude-3.5-haiku
OPENROUTER_MODEL_LARGE=anthropic/claude-3.5-sonnet

# AI Service Configuration
AI_ENABLE_CACHING=true
AI_CACHE_TTL=3600
AI_MAX_RETRIES=3
AI_TIMEOUT=30000
AI_ENABLE_STREAMING=true

# Rate Limiting
AI_RATE_LIMIT_REQUESTS=100
AI_RATE_LIMIT_WINDOW=60000
```

### 4.3 Request Router

```javascript
// backend/src/services/ai/RequestRouter.js

class RequestRouter {
  constructor(openRouterService) {
    this.openRouter = openRouterService;
    this.cache = new Map();
  }

  async route(userInput, context = {}) {
    const requestAnalysis = this.analyzeRequest(userInput, context);
    const tier = this.selectTier(requestAnalysis);
    
    // Check cache for similar requests
    const cacheKey = this.generateCacheKey(userInput, tier);
    if (this.cache.has(cacheKey)) {
      return { ...this.cache.get(cacheKey), cached: true };
    }

    // Build context-aware prompt
    const messages = this.buildMessages(userInput, context, tier);

    // Execute inference
    const response = await this.openRouter.chat(messages, {
      tier,
      temperature: requestAnalysis.temperature,
      maxTokens: requestAnalysis.maxTokens,
    });

    // Process and cache response
    const processed = this.processResponse(response, requestAnalysis);
    this.cache.set(cacheKey, processed);

    return processed;
  }

  analyzeRequest(userInput, context) {
    return {
      hasImage: !!context.imageUrl,
      complexity: this.calculateComplexity(userInput, context),
      intents: this.extractIntents(userInput),
      requiresData: this.needsContextData(userInput),
      temperature: this.determineTemperature(userInput),
      maxTokens: this.estimateTokens(userInput, context),
    };
  }

  selectTier(analysis) {
    if (analysis.hasImage) return 'large';
    if (analysis.complexity > 0.7) return 'large';
    if (analysis.complexity < 0.3) return 'small';
    return 'medium';
  }

  calculateComplexity(input, context) {
    let score = 0;
    
    // Multi-step reasoning needed
    if (/plan|schedule|generate|create|design/i.test(input)) score += 0.3;
    
    // Large data processing
    if (context.pantryItems?.length > 20) score += 0.2;
    
    // Multiple constraints
    const constraints = input.match(/and|but|with|without/gi);
    score += (constraints?.length || 0) * 0.1;
    
    // Temporal reasoning
    if (/week|month|tomorrow|next/i.test(input)) score += 0.2;
    
    return Math.min(score, 1);
  }

  extractIntents(input) {
    const intentPatterns = {
      meal_plan: /meal plan|weekly menu|plan.*week/i,
      recipe_search: /recipe|how to cook|how to make/i,
      pantry_add: /add to pantry|bought|purchased/i,
      grocery_list: /grocery list|shopping list|need to buy/i,
      nutrition: /nutrition|calories|protein|healthy/i,
      substitution: /substitute|replace|instead of/i,
    };

    return Object.entries(intentPatterns)
      .filter(([_, pattern]) => pattern.test(input))
      .map(([intent]) => intent);
  }

  buildMessages(userInput, context, tier) {
    const systemPrompt = this.buildSystemPrompt(context, tier);
    const enrichedInput = this.enrichWithContext(userInput, context);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: enrichedInput },
    ];
  }

  buildSystemPrompt(context, tier) {
    const basePrompt = `You are an intelligent kitchen assistant helping users with meal planning, recipes, pantry management, and grocery shopping.`;

    const tierPrompts = {
      small: `Provide concise, factual responses. Focus on speed and accuracy.`,
      medium: `Provide helpful, conversational responses. You can suggest recipes, analyze pantry items, and offer cooking advice.`,
      large: `You can perform complex meal planning, analyze images of food, and provide comprehensive dietary guidance. Think through multi-step problems carefully.`,
    };

    let contextInfo = '';
    if (context.pantryItems?.length > 0) {
      contextInfo += `\n\nUser's Pantry: ${JSON.stringify(context.pantryItems)}`;
    }
    if (context.preferences) {
      contextInfo += `\n\nUser Preferences: ${JSON.stringify(context.preferences)}`;
    }
    if (context.dietaryRestrictions) {
      contextInfo += `\n\nDietary Restrictions: ${context.dietaryRestrictions.join(', ')}`;
    }

    return `${basePrompt}\n\n${tierPrompts[tier]}${contextInfo}`;
  }

  enrichWithContext(input, context) {
    // For now, return input as-is
    // Context is already in system prompt
    return input;
  }

  processResponse(response, analysis) {
    const content = response.choices[0].message.content;
    
    return {
      content,
      tier: this.selectTier(analysis),
      usage: response.usage,
      model: response.model,
      timestamp: new Date().toISOString(),
    };
  }

  generateCacheKey(input, tier) {
    return `${tier}:${input.toLowerCase().slice(0, 100)}`;
  }
}

module.exports = RequestRouter;
```

---

## 5. Agentic Infrastructure

### 5.1 When to Use Agentic Architecture

Agentic infrastructure is recommended when:
- **Multi-step reasoning** is required (e.g., meal planning → pantry check → recipe selection → grocery list)
- **Tool use** is needed (database queries, API calls, calculations)
- **Specialized knowledge** domains need coordination (nutrition + cooking + budgeting)
- **Iterative refinement** based on user feedback

### 5.2 Agent Architecture

```
                    ┌─────────────────────┐
                    │  Coordinator Agent  │
                    │  (GPT-4o / Claude)  │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
        ┌───────▼──────┐  ┌───▼────────┐  ┌─▼──────────┐
        │ Pantry Agent │  │Recipe Agent│  │ Meal Agent │
        │  (Inventory) │  │  (Cooking) │  │ (Planning) │
        └───────┬──────┘  └────┬───────┘  └─────┬──────┘
                │              │                  │
                └──────────────┼──────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Tool Executor     │
                    │  - DB Queries       │
                    │  - API Calls        │
                    │  - Calculations     │
                    └─────────────────────┘
```

### 5.3 Coordinator Agent Implementation

```javascript
// backend/src/services/ai/agents/CoordinatorAgent.js

class CoordinatorAgent {
  constructor(openRouterService, tools) {
    this.openRouter = openRouterService;
    this.tools = tools;
    this.specialists = {
      pantry: new PantryAgent(openRouterService, tools),
      recipe: new RecipeAgent(openRouterService, tools),
      meal: new MealPlanAgent(openRouterService, tools),
      nutrition: new NutritionAgent(openRouterService, tools),
    };
  }

  async execute(userRequest, context = {}) {
    const plan = await this.createPlan(userRequest, context);
    const results = await this.executePlan(plan, context);
    const finalResponse = await this.synthesizeResults(results, userRequest);
    
    return finalResponse;
  }

  async createPlan(userRequest, context) {
    const planningPrompt = `
      You are a task planning agent. Break down the following user request into a sequence of steps.
      Each step should specify which specialist agent to use and what information is needed.
      
      Available agents:
      - pantry: Check inventory, add/remove items, check expiration
      - recipe: Find recipes, analyze recipes, suggest substitutions
      - meal: Create meal plans, optimize for nutrition/budget
      - nutrition: Analyze nutritional content, check dietary compliance
      
      User Request: ${userRequest}
      
      Return a JSON array of steps with format:
      [
        { "agent": "pantry", "action": "check_inventory", "params": {} },
        { "agent": "recipe", "action": "find_matching_recipes", "params": { "ingredients": [...] } }
      ]
    `;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a task planning specialist.' },
      { role: 'user', content: planningPrompt },
    ], { tier: 'large', temperature: 0.3 });

    return JSON.parse(response.choices[0].message.content);
  }

  async executePlan(plan, context) {
    const results = [];
    
    for (const step of plan) {
      const agent = this.specialists[step.agent];
      if (!agent) {
        throw new Error(`Unknown agent: ${step.agent}`);
      }

      const result = await agent.execute(step.action, step.params, context);
      results.push({ step, result });
      
      // Update context with results for next steps
      context = { ...context, [`${step.agent}_result`]: result };
    }

    return results;
  }

  async synthesizeResults(results, originalRequest) {
    const synthesisPrompt = `
      Synthesize the following agent execution results into a coherent response for the user.
      
      Original Request: ${originalRequest}
      
      Agent Results: ${JSON.stringify(results, null, 2)}
      
      Provide a natural, helpful response that addresses the user's request.
    `;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a response synthesis specialist.' },
      { role: 'user', content: synthesisPrompt },
    ], { tier: 'medium' });

    return {
      message: response.choices[0].message.content,
      steps: results,
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 5.4 Specialist Agent Example

```javascript
// backend/src/services/ai/agents/PantryAgent.js

class PantryAgent {
  constructor(openRouterService, tools) {
    this.openRouter = openRouterService;
    this.tools = tools;
  }

  async execute(action, params, context) {
    switch (action) {
      case 'check_inventory':
        return this.checkInventory(params, context);
      case 'find_expiring_items':
        return this.findExpiringItems(params, context);
      case 'suggest_usage':
        return this.suggestUsage(params, context);
      default:
        throw new Error(`Unknown pantry action: ${action}`);
    }
  }

  async checkInventory(params, context) {
    const pantryItems = await this.tools.database.getPantryItems(context.userId);
    
    const analysisPrompt = `
      Analyze this pantry inventory and determine what meals can be made.
      
      Pantry Items: ${JSON.stringify(pantryItems)}
      Required Ingredients: ${JSON.stringify(params.required || [])}
      
      Return a JSON object with:
      - available: ingredients user has
      - missing: ingredients user needs
      - suggestions: meal ideas based on what's available
    `;

    const response = await this.openRouter.chat([
      { role: 'system', content: 'You are a pantry inventory specialist.' },
      { role: 'user', content: analysisPrompt },
    ], { tier: 'medium' });

    return JSON.parse(response.choices[0].message.content);
  }

  async findExpiringItems(params, context) {
    const daysThreshold = params.days || 7;
    const expiringItems = await this.tools.database.getExpiringItems(
      context.userId,
      daysThreshold
    );

    return {
      items: expiringItems,
      count: expiringItems.length,
      urgency: expiringItems.length > 5 ? 'high' : 'medium',
    };
  }

  async suggestUsage(params, context) {
    const item = params.item;
    const recipes = await this.tools.database.findRecipesByIngredient(item);

    const suggestionPrompt = `
      Suggest creative ways to use "${item}" before it expires.
      
      Available Recipes: ${JSON.stringify(recipes)}
      
      Provide 3-5 practical suggestions.
    `;

    const response = await this.openRouter.chat([
      { role: 'user', content: suggestionPrompt },
    ], { tier: 'small' });

    return {
      item,
      suggestions: response.choices[0].message.content,
      recipes: recipes.slice(0, 5),
    };
  }
}
```

---

## 6. API Design

### 6.1 Endpoint Structure

```javascript
// backend/src/routes/ai.js

router.post('/ai/chat', authenticateToken, async (req, res) => {
  // General conversational endpoint
});

router.post('/ai/analyze-pantry', authenticateToken, async (req, res) => {
  // Analyze pantry and suggest recipes
});

router.post('/ai/generate-meal-plan', authenticateToken, async (req, res) => {
  // Generate weekly meal plan
});

router.post('/ai/scan-image', authenticateToken, upload.single('image'), async (req, res) => {
  // Process food/barcode images
});

router.post('/ai/optimize-grocery-list', authenticateToken, async (req, res) => {
  // Optimize grocery list by store layout
});

router.post('/ai/ask', authenticateToken, async (req, res) => {
  // General Q&A endpoint
});

router.get('/ai/suggestions', authenticateToken, async (req, res) => {
  // Get proactive suggestions based on user state
});
```

### 6.2 Request/Response Formats

#### Chat Endpoint

**Request:**
```json
{
  "message": "What can I make for dinner tonight?",
  "context": {
    "includeПantry": true,
    "preferences": ["quick", "healthy"],
    "dietaryRestrictions": ["vegetarian"]
  },
  "conversationId": "optional-for-context"
}
```

**Response:**
```json
{
  "response": "Based on your pantry, I suggest...",
  "suggestions": [
    {
      "recipe": "Vegetarian Pasta Primavera",
      "reason": "Uses tomatoes, pasta, and bell peppers from your pantry",
      "prepTime": "25 minutes",
      "missingIngredients": ["parmesan cheese"]
    }
  ],
  "tier": "medium",
  "usage": {
    "promptTokens": 245,
    "completionTokens": 180,
    "totalTokens": 425
  }
}
```

#### Image Scanning Endpoint

**Request:**
```
POST /ai/scan-image
Content-Type: multipart/form-data

image: [file]
type: "pantry" | "barcode" | "recipe"
```

**Response:**
```json
{
  "items": [
    {
      "name": "Milk",
      "confidence": 0.95,
      "quantity": "1 gallon",
      "suggestedCategory": "dairy"
    },
    {
      "name": "Eggs",
      "confidence": 0.92,
      "quantity": "1 dozen",
      "suggestedCategory": "dairy"
    }
  ],
  "processingTime": 2341,
  "modelUsed": "gpt-4o"
}
```

#### Meal Plan Generation

**Request:**
```json
{
  "duration": 7,
  "mealsPerDay": ["breakfast", "lunch", "dinner"],
  "constraints": {
    "caloriesPerDay": 2000,
    "budget": 50,
    "dietaryRestrictions": ["gluten-free"],
    "usePantryFirst": true
  }
}
```

**Response:**
```json
{
  "mealPlan": {
    "monday": {
      "breakfast": { "recipeId": "123", "name": "Oatmeal", ... },
      "lunch": { "recipeId": "456", "name": "Salad", ... },
      "dinner": { "recipeId": "789", "name": "Grilled Chicken", ... }
    },
    ...
  },
  "summary": {
    "totalCost": 48.50,
    "avgCalories": 1980,
    "pantryUsage": 0.65,
    "newIngredients": 12
  },
  "groceryList": [
    { "item": "Chicken breast", "quantity": "2 lbs", "estimatedCost": 12.00 }
  ]
}
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Basic OpenRouter integration and tier selection

**Tasks:**
1. Set up OpenRouter account and API key
2. Create `OpenRouterService` class
3. Implement basic chat endpoint
4. Build `RequestRouter` with tier selection logic
5. Add caching layer
6. Create unit tests for core services

**Deliverables:**
- Working `/ai/chat` endpoint
- Tier selection working for simple cases
- Basic caching implemented
- Tests with >80% coverage

---

### Phase 2: Core AI Features (Weeks 3-5)

**Goal:** Implement main AI features for existing platform

**Tasks:**
1. **Pantry Analysis**
   - Build context enrichment for pantry data
   - Implement "what can I cook" feature
   - Add expiry alerts with LLM suggestions

2. **Recipe Enhancement**
   - Natural language recipe search
   - Recipe adaptation (dietary, serving size)
   - Ingredient substitution suggestions

3. **Meal Planning**
   - AI-powered meal plan generation
   - Constraint satisfaction (calories, budget, diet)
   - Optimization for pantry usage

4. **Grocery List Intelligence**
   - Automatic list generation from meal plans
   - Store layout optimization
   - Price estimation

**Deliverables:**
- All core AI endpoints functional
- Integration with existing controllers
- Frontend components for AI features
- Performance benchmarks met

---

### Phase 3: Vision & Multimodal (Weeks 6-7)

**Goal:** Add image processing capabilities

**Tasks:**
1. Set up image upload infrastructure
2. Implement barcode scanning
3. Build pantry photo analyzer
4. Create recipe-from-image feature
5. Add nutrition label scanner

**Deliverables:**
- Image upload working
- Vision features accessible via API
- Mobile camera integration ready
- 90%+ accuracy on test images

---

### Phase 4: Agentic Infrastructure (Weeks 8-10)

**Goal:** Add complex multi-step reasoning

**Tasks:**
1. Build `CoordinatorAgent` framework
2. Implement specialist agents:
   - `PantryAgent`
   - `RecipeAgent`
   - `MealPlanAgent`
   - `NutritionAgent`
3. Create tool executor for database/API calls
4. Add memory/context management
5. Implement agent communication protocol

**Deliverables:**
- Agentic system handles complex queries
- Multi-step workflows working
- Tool use functional
- Context persists across turns

---

### Phase 5: Optimization & Polish (Weeks 11-12)

**Goal:** Production readiness

**Tasks:**
1. Performance optimization
2. Cost monitoring and optimization
3. Rate limiting implementation
4. Error handling improvements
5. User feedback loop
6. Analytics and monitoring
7. Documentation

**Deliverables:**
- Production deployment
- Monitoring dashboards
- Complete documentation
- User guide and examples

---

## 8. Technical Specifications

### 8.1 Database Schema Extensions

```sql
-- Store AI conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Store individual messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES ai_conversations(id),
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  model_tier VARCHAR(20), -- 'small', 'medium', 'large'
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Store AI-generated meal plans
CREATE TABLE ai_meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  meal_plan_id UUID REFERENCES meal_plans(id),
  prompt TEXT,
  model_used VARCHAR(100),
  generation_time_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track model usage and costs
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  endpoint VARCHAR(100),
  model_tier VARCHAR(20),
  model_name VARCHAR(100),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost DECIMAL(10, 6),
  latency_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cache frequent queries
CREATE TABLE ai_response_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key VARCHAR(255) UNIQUE,
  response JSONB,
  model_tier VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_ai_usage_logs_user ON ai_usage_logs(user_id, created_at);
CREATE INDEX idx_ai_response_cache_key ON ai_response_cache(cache_key);
```

### 8.2 Environment Variables

```bash
# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL_SMALL=anthropic/claude-3-haiku
OPENROUTER_MODEL_MEDIUM=anthropic/claude-3.5-haiku
OPENROUTER_MODEL_LARGE=anthropic/claude-3.5-sonnet
OPENROUTER_APP_URL=https://intelligent-kitchen.com
OPENROUTER_APP_TITLE=Intelligent Kitchen AI

# Model Configuration
AI_DEFAULT_TEMPERATURE=0.7
AI_DEFAULT_MAX_TOKENS=1000
AI_ENABLE_STREAMING=true
AI_ENABLE_TOOL_USE=true

# Caching
AI_CACHE_ENABLED=true
AI_CACHE_TTL_SECONDS=3600
AI_CACHE_MAX_SIZE=1000

# Rate Limiting (per user)
AI_RATE_LIMIT_REQUESTS_PER_MINUTE=20
AI_RATE_LIMIT_TOKENS_PER_DAY=1000000

# Monitoring
AI_LOG_LEVEL=info
AI_ENABLE_USAGE_TRACKING=true
AI_COST_ALERT_THRESHOLD=100

# Vision Features
AI_MAX_IMAGE_SIZE_MB=5
AI_ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
AI_IMAGE_STORAGE_PATH=/tmp/uploads

# Agentic Features
AI_ENABLE_AGENTS=true
AI_MAX_AGENT_ITERATIONS=10
AI_AGENT_TIMEOUT_SECONDS=60
```

### 8.3 Cost Monitoring

```javascript
// backend/src/services/ai/CostMonitor.js

class CostMonitor {
  constructor() {
    this.costs = {
      small: 0.0005,  // $ per 1K tokens (example)
      medium: 0.002,
      large: 0.01,
    };
  }

  async logUsage(userId, tier, usage) {
    const cost = this.calculateCost(tier, usage);
    
    await query(`
      INSERT INTO ai_usage_logs (user_id, model_tier, prompt_tokens, completion_tokens, total_tokens, estimated_cost)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, tier, usage.promptTokens, usage.completionTokens, usage.totalTokens, cost]);

    // Check if user exceeds budget
    const monthlyUsage = await this.getMonthlyUsage(userId);
    if (monthlyUsage > process.env.AI_COST_ALERT_THRESHOLD) {
      await this.sendCostAlert(userId, monthlyUsage);
    }

    return cost;
  }

  calculateCost(tier, usage) {
    const costPerToken = this.costs[tier] / 1000;
    return usage.totalTokens * costPerToken;
  }

  async getMonthlyUsage(userId) {
    const result = await query(`
      SELECT SUM(estimated_cost) as total
      FROM ai_usage_logs
      WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())
    `, [userId]);

    return parseFloat(result.rows[0]?.total || 0);
  }

  async getUserStats(userId, period = '30 days') {
    const result = await query(`
      SELECT 
        model_tier,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        AVG(latency_ms) as avg_latency
      FROM ai_usage_logs
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL $2
      GROUP BY model_tier
    `, [userId, period]);

    return result.rows;
  }
}

module.exports = new CostMonitor();
```

---

## 9. Testing & Validation

### 9.1 Test Strategy

#### Unit Tests
```javascript
// backend/tests/ai/RequestRouter.test.js

describe('RequestRouter', () => {
  test('should select SMALL tier for simple classification', () => {
    const router = new RequestRouter(mockOpenRouter);
    const analysis = router.analyzeRequest('Is tomato a vegetable?', {});
    expect(router.selectTier(analysis)).toBe('small');
  });

  test('should select LARGE tier for meal planning', () => {
    const router = new RequestRouter(mockOpenRouter);
    const analysis = router.analyzeRequest('Create a weekly meal plan', {});
    expect(router.selectTier(analysis)).toBe('large');
  });

  test('should select LARGE tier for image inputs', () => {
    const router = new RequestRouter(mockOpenRouter);
    const analysis = router.analyzeRequest('What food is this?', { imageUrl: 'test.jpg' });
    expect(router.selectTier(analysis)).toBe('large');
  });
});
```

#### Integration Tests
```javascript
// backend/tests/ai/integration/OpenRouter.integration.test.js

describe('OpenRouter Integration', () => {
  test('should successfully call small model', async () => {
    const response = await openRouter.chat([
      { role: 'user', content: 'Classify: tomato' }
    ], { tier: 'small' });

    expect(response.choices[0].message.content).toBeDefined();
    expect(response.usage.total_tokens).toBeLessThan(100);
  });

  test('should handle vision requests', async () => {
    const response = await openRouter.chatWithImage([
      { role: 'user', content: 'What ingredients are in this image?' }
    ], 'https://example.com/food.jpg');

    expect(response.choices[0].message.content).toBeDefined();
  });
});
```

#### End-to-End Tests
```javascript
// backend/tests/ai/e2e/MealPlanning.e2e.test.js

describe('AI Meal Planning E2E', () => {
  test('should generate meal plan from natural language', async () => {
    const response = await request(app)
      .post('/api/ai/generate-meal-plan')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Create a 7-day vegetarian meal plan for 2000 calories per day',
        context: { usePantryFirst: true }
      });

    expect(response.status).toBe(200);
    expect(response.body.mealPlan).toBeDefined();
    expect(Object.keys(response.body.mealPlan)).toHaveLength(7);
  });
});
```

### 9.2 Validation Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Response Accuracy** | >85% | User feedback + manual review |
| **Tier Selection Accuracy** | >90% | Automated testing against labeled dataset |
| **Small Model Latency** | <500ms | P95 measurement |
| **Medium Model Latency** | <2s | P95 measurement |
| **Large Model Latency** | <5s | P95 measurement |
| **Vision Accuracy** | >90% | Test image dataset |
| **Cost Per Request (avg)** | <$0.01 | Usage tracking |
| **User Satisfaction** | >4/5 | In-app ratings |

---

## 10. Monitoring & Optimization

### 10.1 Monitoring Dashboard

Key metrics to track:
- **Request Volume**: By tier, by endpoint, by user
- **Latency**: P50, P95, P99 for each tier
- **Cost**: Daily/weekly/monthly spend, cost per user
- **Error Rates**: By tier, by error type
- **Cache Hit Rate**: Effectiveness of response caching
- **Model Performance**: Accuracy, user feedback scores

### 10.2 Optimization Strategies

#### Cost Optimization
1. **Aggressive Caching**: Cache common queries (recipe searches, simple Q&A)
2. **Tier Demotion**: If large model isn't needed, route to medium
3. **Batch Processing**: Combine multiple small requests
4. **Prompt Engineering**: Reduce token usage with concise prompts

#### Latency Optimization
1. **Response Streaming**: Stream responses for better UX
2. **Predictive Preloading**: Pre-cache likely next queries
3. **Parallel Agent Execution**: Run independent agent tasks concurrently
4. **Edge Caching**: Cache at CDN level for common responses

#### Quality Optimization
1. **Feedback Loop**: Collect user ratings on AI responses
2. **A/B Testing**: Test different models and prompts
3. **Fine-tuning**: If needed, fine-tune models on kitchen domain
4. **Prompt Libraries**: Maintain optimized prompts for common tasks

### 10.3 Logging & Observability

```javascript
// backend/src/services/ai/Logger.js

class AILogger {
  async logRequest(req, tier, latency, usage, error = null) {
    const log = {
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      endpoint: req.path,
      tier,
      latency,
      usage,
      error: error?.message,
      userAgent: req.headers['user-agent'],
    };

    // Send to logging service (e.g., CloudWatch, Datadog)
    await logger.info('AI Request', log);

    // Store in database for analytics
    await this.storeLog(log);
  }

  async logAgentExecution(agentName, action, duration, result) {
    await logger.info('Agent Execution', {
      agent: agentName,
      action,
      duration,
      success: !result.error,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 11. Security & Privacy

### 11.1 Data Privacy
- **User Data**: Never send PII unless absolutely necessary for context
- **Prompt Sanitization**: Remove sensitive data from prompts
- **Response Filtering**: Check responses for accidental data leakage
- **Audit Logs**: Maintain logs of all AI interactions for compliance

### 11.2 API Security
- **Rate Limiting**: Prevent abuse and control costs
- **API Key Rotation**: Regular rotation of OpenRouter keys
- **Request Validation**: Validate all inputs before sending to LLM
- **Output Validation**: Sanitize LLM outputs before sending to users

---

## 12. Future Enhancements

### 12.1 Advanced Features
- **Voice Interface**: Integrate STT/TTS for hands-free cooking
- **Real-time Cooking Assistant**: Step-by-step voice guidance
- **Social Features**: Share AI-generated meal plans
- **Personalization**: Fine-tune models on user preferences over time

### 12.2 Model Improvements
- **Custom Fine-tuning**: Train domain-specific models
- **Hybrid Approach**: Combine traditional ML with LLMs
- **Agentic Workflows**: More sophisticated multi-agent systems
- **Reinforcement Learning**: Learn from user feedback

---

## Appendix A: Model Selection Guide

### For User Reference (To Fill In)

| Tier | Recommended Model | Context Window | Vision Support | Estimated Cost |
|------|------------------|----------------|----------------|----------------|
| **Small** | _____________ | _____________ | Yes / No | $ per 1M tokens |
| **Medium** | _____________ | _____________ | Yes / No | $ per 1M tokens |
| **Large** | _____________ | _____________ | Yes / No | $ per 1M tokens |

### OpenRouter Model Examples

**Small Tier Options:**
- `anthropic/claude-3-haiku`
- `google/gemini-flash-1.5`
- `meta-llama/llama-3.1-8b-instruct`
- `mistralai/mistral-7b-instruct`

**Medium Tier Options:**
- `anthropic/claude-3.5-haiku`
- `openai/gpt-4o-mini`
- `google/gemini-pro-1.5`
- `mistralai/mistral-medium`

**Large Tier Options:**
- `anthropic/claude-3.5-sonnet` (vision)
- `openai/gpt-4o` (vision)
- `google/gemini-pro-1.5` (vision)
- `meta-llama/llama-3.2-90b-vision-instruct` (vision)

---

## Appendix B: Prompt Templates

### Recipe Suggestion Template
```
You are a helpful cooking assistant. Based on the user's pantry inventory and preferences, suggest recipes.

**Pantry Items:** {{pantryItems}}
**Dietary Restrictions:** {{dietaryRestrictions}}
**Preferences:** {{preferences}}

Suggest 3-5 recipes that:
1. Use mostly items from the pantry
2. Respect dietary restrictions
3. Match user preferences
4. Include prep/cook time
5. List any missing ingredients

Format response as JSON.
```

### Meal Planning Template
```
Create a {{days}}-day meal plan for a user with the following requirements:

**Nutritional Goals:**
- Calories per day: {{caloriesPerDay}}
- Protein: {{proteinGrams}}g
- Dietary restrictions: {{restrictions}}

**Constraints:**
- Budget: ${{budget}}
- Available pantry items: {{pantryItems}}
- Cooking skill level: {{skillLevel}}
- Time available: {{maxCookTime}} minutes per meal

Generate a meal plan that optimizes for variety, nutrition, and pantry usage.
Include a shopping list for missing ingredients.
```

---

**End of LLM Integration Build Guide**

*Version 1.0 | Last Updated: [Current Date]*
*This is a living document and should be updated as the implementation progresses.*
