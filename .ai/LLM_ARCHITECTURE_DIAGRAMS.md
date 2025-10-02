# LLM Integration Architecture Diagrams

Complete visual guide to the Intelligent Kitchen AI system.

---

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Any Page in App                       │  │
│  │                                                          │  │
│  │  ┌─────────────┐                      ┌──────────────┐  │  │
│  │  │   Content   │                      │  Chat Window │  │  │
│  │  │             │                      │              │  │  │
│  │  │  - Pantry   │                      │ ┌──────────┐ │  │  │
│  │  │  - Recipes  │                      │ │ Messages │ │  │  │
│  │  │  - Meals    │                      │ └──────────┘ │  │  │
│  │  │  - Grocery  │                      │ ┌──────────┐ │  │  │
│  │  │             │                      │ │  Input   │ │  │  │
│  │  └─────────────┘                      │ └──────────┘ │  │  │
│  │                                       └──────────────┘  │  │
│  │                                            ●  Chat      │  │
│  │                                               Button    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/S
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND LAYER                            │
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   AI Slice   │◄────►│  AI Service  │◄────►│   Redux      │  │
│  │   (State)    │      │ (API Client) │      │    Store     │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│        │                      │                      │          │
│        └──────────────────────┼──────────────────────┘          │
└───────────────────────────────┼─────────────────────────────────┘
                                │ REST API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND LAYER                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    AI Routes                             │  │
│  │  - POST /api/ai/chat                                     │  │
│  │  - POST /api/ai/chat/image                              │  │
│  │  - GET  /api/ai/status                                   │  │
│  │  - GET  /api/ai/usage                                    │  │
│  └──────────────┬───────────────────────────────────────────┘  │
│                 │                                               │
│                 ▼                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Collaborative Inference Service                │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  1. Parse Intent                                   │  │  │
│  │  │  2. Select Models                                  │  │  │
│  │  │  3. Execute Tools                                  │  │  │
│  │  │  4. Coordinate Communication                       │  │  │
│  │  │  5. Format Response                                │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────┬───────────────┬───────────────┬───────────────────┘  │
│         │               │               │                       │
│         ▼               ▼               ▼                       │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐              │
│  │  Cost    │   │ Response │   │     Tool     │              │
│  │ Monitor  │   │  Cache   │   │   Registry   │              │
│  │          │   │          │   │  (33 tools)  │              │
│  └──────────┘   └──────────┘   └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ API Calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI SERVICE LAYER                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              OpenRouter Service                          │  │
│  │                                                          │  │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐           │  │
│  │  │  Small   │   │  Medium  │   │  Large   │           │  │
│  │  │  Model   │   │  Model   │   │  Model   │           │  │
│  │  │  128K    │   │  200K    │   │   1M     │           │  │
│  │  └──────────┘   └──────────┘   └──────────┘           │  │
│  │       │               │               │                 │  │
│  │       └───────────────┼───────────────┘                 │  │
│  │                       │                                  │  │
│  │              ┌────────┴────────┐                        │  │
│  │              │ Inter-Model Bus │                        │  │
│  │              │ (Communication) │                        │  │
│  │              └─────────────────┘                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OpenRouter API                             │
│               (Claude, GPT-4, Gemini, etc.)                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Pantry     │  │   Recipes    │  │  Meal Plans  │         │
│  │    Items     │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │     AI       │  │      AI      │  │     AI       │         │
│  │ Conversations│  │   Messages   │  │   Cache      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │     AI       │  │      AI      │                           │
│  │  Cost Logs   │  │  User Stats  │                           │
│  └──────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow Diagram

### Simple Query (Cached)
```
User: "What temperature to bake chicken?"
  │
  ▼
[Frontend] Chat Window
  │ dispatch(sendMessage)
  ▼
[Redux] AI Slice
  │ aiService.chat()
  ▼
[Service] API Call
  │ POST /api/ai/chat
  ▼
[Backend] AI Routes
  │
  ▼
[Cache] Check Cache
  │ ✓ HIT!
  ▼
[Response] 375°F (190°C)
  │ <50ms, $0.00
  ▼
[Frontend] Display
  
Total Time: <50ms
Total Cost: $0.00
Models Used: None (cached)
```

### Simple Query (Uncached)
```
User: "How long to bake salmon?"
  │
  ▼
[Frontend] Chat Window → Redux → API
  │
  ▼
[Backend] AI Routes
  │
  ▼
[Cache] Check Cache
  │ ✗ MISS
  ▼
[Inference] Collaborative Inference
  │ 1. Parse intent: simple_query
  │ 2. Select model: Small
  │ 3. No tools needed
  ▼
[OpenRouter] Small Model (128K)
  │ "Bake salmon at 400°F for 12-15 min"
  ▼
[Cache] Store response (TTL: 1hr)
  │
  ▼
[Cost Monitor] Log: $0.00025
  │
  ▼
[Response] Return to user
  
Total Time: 400ms
Total Cost: $0.00025
Models Used: Small
```

### Tool Execution
```
User: "Add chicken breast to my pantry"
  │
  ▼
[Frontend] Chat Window → Redux → API
  │
  ▼
[Backend] AI Routes
  │
  ▼
[Inference] Collaborative Inference
  │ 1. Parse intent: needs_tools
  │ 2. Select model: Medium
  │
  ▼
[OpenRouter] Medium Model (200K)
  │ Analyzes request
  │ Decides: Need to call add_pantry_item()
  │
  ▼
[Tool Registry] Execute add_pantry_item
  │ Parameters:
  │   - name: "Chicken Breast"
  │   - category: "Meat"
  │   - quantity: 1
  │   - unit: "package"
  │
  ▼
[Database] INSERT into pantry_items
  │ ✓ Success
  │
  ▼
[Medium Model] Format response
  │ "I've added chicken breast to your pantry!"
  │
  ▼
[Small Model] User-friendly message
  │
  ▼
[Cost Monitor] Log: $0.005
  │
  ▼
[Response] Return to user
  
Total Time: 1.5s
Total Cost: $0.005
Models Used: Medium + Small
Tools Used: add_pantry_item
```

### Complex Workflow (Meal Planning)
```
User: "Plan my meals for next week"
  │
  ▼
[Frontend] Chat Window → Redux → API
  │
  ▼
[Inference] Collaborative Inference
  │ 1. Parse intent: needs_complex_workflow
  │ 2. Select models: Medium + Large
  │
  ▼
[Medium Model] Plan workflow
  │ Step 1: Get pantry items
  │ Step 2: Get user preferences
  │ Step 3: Search recipes
  │ Step 4: Create meal plan
  │ Step 5: Generate grocery list
  │
  ▼
[Tool Registry] Execute 25+ tools:
  │ - get_pantry_items()          [DB Query]
  │ - get_user_preferences()      [DB Query]
  │ - search_recipes(...)         [DB Query × 21]
  │ - create_meal_plan(...)       [DB Insert]
  │ - add_meal_to_plan(...) × 21  [DB Insert × 21]
  │ - generate_grocery_list(...)  [Complex Calc]
  │
  ▼
[Large Model] Process bulk data
  │ - Analyze 50+ recipes
  │ - Balance nutrition
  │ - Optimize variety
  │ - Calculate totals
  │
  ▼
[Medium Model] Structure results
  │ Format meal plan JSON
  │
  ▼
[Small Model] User-friendly message
  │ "Created 7-day meal plan with:
  │  - 21 meals
  │  - Balanced nutrition
  │  - 15-item grocery list
  │  - Total cost: $87.50"
  │
  ▼
[Cost Monitor] Log: $0.015
  │
  ▼
[Response] Return to user
  
Total Time: 4s
Total Cost: $0.015
Models Used: Small + Medium + Large
Tools Used: 25+ tools
Database Ops: 43 queries + inserts
```

### Image Analysis
```
User: [uploads fridge photo] "What do I have?"
  │
  ▼
[Frontend] Image upload via FormData
  │
  ▼
[Backend] POST /api/ai/chat/image
  │
  ▼
[Inference] Collaborative Inference
  │ 1. Parse intent: needs_vision
  │ 2. Select model: Large (vision)
  │
  ▼
[OpenRouter] Large Model (1M context)
  │ Analyzes image
  │ Identifies:
  │   - Milk (1 gallon)
  │   - Eggs (dozen)
  │   - Cheese (cheddar block)
  │   - Lettuce (head)
  │   - Tomatoes (4)
  │   - Apples (6)
  │
  ▼
[Medium Model] Structure data
  │ Create item list
  │
  ▼
[Small Model] User-friendly message
  │ "I can see in your fridge:
  │  - Dairy: Milk, eggs, cheese
  │  - Vegetables: Lettuce, tomatoes
  │  - Fruit: 6 apples
  │  
  │  Would you like me to add these
  │  to your pantry?"
  │
  ▼
[Cost Monitor] Log: $0.012
  │
  ▼
[Response] Return to user
  
Total Time: 2.5s
Total Cost: $0.012
Models Used: Large + Medium + Small
```

---

## 🎯 Model Selection Flow

```
Request arrives
     │
     ▼
┌─────────────────────────────────┐
│   Parse Intent & Complexity     │
└────────┬────────────────────────┘
         │
         ├─► Simple Query? ────────► Small Model
         │   (definitions, facts)
         │
         ├─► Needs Tools? ─────────► Medium Model
         │   (database ops)          + Tool Registry
         │
         ├─► Bulk Data? ───────────► Large Model
         │   (many items)            + Medium (structure)
         │                           + Small (present)
         │
         └─► Has Image? ───────────► Large Model (vision)
             (photo analysis)        + Medium (parse)
                                     + Small (present)
```

---

## 🛠️ Tool Execution Flow

```
User Request: "Add chicken to pantry"
     │
     ▼
┌─────────────────────────────────┐
│   Medium Model Analyzes         │
│   "Need: add_pantry_item()"     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│      Tool Registry Lookup       │
│   Find: add_pantry_item         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Validate Parameters           │
│   ✓ name: "Chicken Breast"     │
│   ✓ category: "Meat"            │
│   ✓ quantity: 1                 │
│   ✓ unit: "package"             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Execute Tool Function         │
│   → Database INSERT              │
└────────┬────────────────────────┘
         │
         ├─► Success? ──► Return result
         │                   │
         │                   ▼
         │              Format response
         │                   │
         │                   ▼
         │              User sees:
         │              "Added chicken
         │               to pantry!"
         │
         └─► Error? ────► Log error
                          Retry once
                          If fail: User-friendly
                          error message
```

---

## 💾 Caching Strategy

```
Request arrives
     │
     ▼
┌─────────────────────────────────┐
│    Generate Cache Key           │
│    hash(message + context)      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Check Memory Cache (100)     │
└────────┬────────────────────────┘
         │
         ├─► HIT? ──► Return (<50ms, $0.00)
         │
         ▼
┌─────────────────────────────────┐
│    Check Database Cache         │
└────────┬────────────────────────┘
         │
         ├─► HIT? ──► Return (100ms, $0.00)
         │           Promote to memory
         │
         ▼
┌─────────────────────────────────┐
│    MISS - Execute Request       │
│    → OpenRouter API call        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Store in Both Caches         │
│    Memory: 100 recent           │
│    DB: Unlimited (TTL-based)    │
└────────┬────────────────────────┘
         │
         ▼
     Return result
```

**Cache Invalidation:**
- Time-based: TTL of 1 hour (configurable)
- Event-based: Clear on data changes
- Manual: Clear cache API endpoint

---

## 📊 Cost Monitoring Flow

```
Every AI Request
     │
     ▼
┌─────────────────────────────────┐
│    Before Request               │
│    Start timer                  │
│    Note: user, model, intent    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Execute Request              │
│    OpenRouter API call          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    After Request                │
│    Stop timer                   │
│    Get: tokens, cost from API   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Cost Monitor Logs            │
│    INSERT into ai_cost_logs:    │
│    - user_id                    │
│    - model_used                 │
│    - tokens_used                │
│    - cost_usd                   │
│    - processing_time_ms         │
│    - tools_used []              │
│    - cached (true/false)        │
│    - timestamp                  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Update User Stats            │
│    UPDATE ai_user_stats:        │
│    - total_requests++           │
│    - total_cost += cost         │
│    - total_tokens += tokens     │
│    - avg_processing_time        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Check Thresholds             │
└────────┬────────────────────────┘
         │
         ├─► Over daily limit? ──► Log warning
         ├─► Over weekly limit? ─► Email alert
         └─► Normal ─────────────► Continue
```

**Queryable Analytics:**
- Per-user costs (today/week/month)
- Per-model usage
- Tool execution frequency
- Cache hit rates
- Average response times
- Cost trends over time

---

## 🔐 Authentication Flow

```
User logs in
     │
     ▼
┌─────────────────────────────────┐
│    Auth Controller              │
│    Issues JWT token             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Frontend Stores Token        │
│    Redux: auth.token            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    AI Service Initialized       │
│    aiService.setToken(token)    │
└────────┬────────────────────────┘
         │
         │
Every AI Request
         │
         ▼
┌─────────────────────────────────┐
│    Add Authorization Header     │
│    "Bearer <token>"             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Backend Validates Token      │
│    Extract: user_id             │
└────────┬────────────────────────┘
         │
         ├─► Valid? ──► Process request
         │              Track costs per user
         │
         └─► Invalid? ─► 401 Unauthorized
                         Frontend refreshes token
```

---

## 📱 Frontend State Management

```
┌─────────────────────────────────────────────────┐
│              Redux Store                        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  AI Slice (state.ai)                    │   │
│  │                                         │   │
│  │  State:                                 │   │
│  │    isOpen: false                        │   │
│  │    isMinimized: false                   │   │
│  │    conversationId: null                 │   │
│  │    messages: []                         │   │
│  │    isLoading: false                     │   │
│  │    error: null                          │   │
│  │    usageStats: null                     │   │
│  │                                         │   │
│  │  Actions:                               │   │
│  │    - openChat()                         │   │
│  │    - closeChat()                        │   │
│  │    - toggleChat()                       │   │
│  │    - sendMessage()                      │   │
│  │    - sendImageMessage()                 │   │
│  │    - addUserMessage()                   │   │
│  │    - clearMessages()                    │   │
│  │    - fetchUsageStats()                  │   │
│  └──────────┬──────────────────────────────┘   │
│             │                                   │
│             │ Subscribe                         │
│             ▼                                   │
│  ┌─────────────────────────────────────────┐   │
│  │  React Components                       │   │
│  │                                         │   │
│  │  - ChatButton (reads: isOpen)           │   │
│  │  - ChatWindow (reads: all state)        │   │
│  │                                         │   │
│  │  User clicks → dispatch(action)         │   │
│  │  State changes → components re-render   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

Component Communication:
ChatButton ◄────► Redux Store ◄────► ChatWindow
    │                                      │
    ▼                                      ▼
  Toggle                              Show messages
  animation                           Send messages
                                      Upload images
```

---

## 🎨 UI Component Structure

```
┌──────────────────────────────────────────┐
│           Layout Component               │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         Header                     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────┬───────────────────────────┐  │
│  │        │                           │  │
│  │ Side   │     Main Content          │  │
│  │ bar    │                           │  │
│  │        │  - Dashboard              │  │
│  │        │  - Pantry                 │  │
│  │        │  - Recipes                │  │
│  │        │  - Meal Planning          │  │
│  │        │  - Grocery                │  │
│  │        │                           │  │
│  └────────┴───────────────────────────┘  │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  ChatButton (Floating)         ●│    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  ChatWindow (Conditional)        │    │
│  │  ┌────────────────────────────┐  │    │
│  │  │  Header [- □ ×]            │  │    │
│  │  ├────────────────────────────┤  │    │
│  │  │  Messages                  │  │    │
│  │  │                            │  │    │
│  │  │  👤 User: Hello!          │  │    │
│  │  │  🤖 AI: Hi! How can I     │  │    │
│  │  │      help you today?      │  │    │
│  │  │                            │  │    │
│  │  ├────────────────────────────┤  │    │
│  │  │  [📷] [Type message...] [▶]│  │    │
│  │  └────────────────────────────┘  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

```
┌──────────────────────────────────────┐
│      ai_conversations                │
├──────────────────────────────────────┤
│ id (PK)                              │
│ user_id (FK → users)                 │
│ started_at                           │
│ last_message_at                      │
│ message_count                        │
│ total_cost                           │
└──────────┬───────────────────────────┘
           │ 1:N
           ▼
┌──────────────────────────────────────┐
│        ai_messages                   │
├──────────────────────────────────────┤
│ id (PK)                              │
│ conversation_id (FK)                 │
│ role (user/assistant/system)         │
│ content                              │
│ models_used []                       │
│ tools_used []                        │
│ tokens_used                          │
│ processing_time_ms                   │
│ cost_usd                             │
│ created_at                           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│         ai_cost_logs                 │
├──────────────────────────────────────┤
│ id (PK)                              │
│ user_id (FK)                         │
│ conversation_id (FK)                 │
│ model_used                           │
│ prompt_tokens                        │
│ completion_tokens                    │
│ total_tokens                         │
│ cost_usd                             │
│ cached                               │
│ tools_used []                        │
│ processing_time_ms                   │
│ created_at                           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│          ai_cache                    │
├──────────────────────────────────────┤
│ id (PK)                              │
│ cache_key (UNIQUE)                   │
│ response                             │
│ models_used []                       │
│ tokens_saved                         │
│ cost_saved                           │
│ hit_count                            │
│ created_at                           │
│ expires_at                           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│        ai_user_stats                 │
├──────────────────────────────────────┤
│ id (PK)                              │
│ user_id (FK)                         │
│ total_requests                       │
│ total_tokens                         │
│ total_cost                           │
│ cache_hits                           │
│ cache_misses                         │
│ avg_processing_time                  │
│ last_request_at                      │
│ created_at                           │
│ updated_at                           │
└──────────────────────────────────────┘

Relationships:
users (1) ────► (N) ai_conversations
ai_conversations (1) ────► (N) ai_messages
users (1) ────► (N) ai_cost_logs
users (1) ────► (1) ai_user_stats
```

---

## 🔄 Inter-Model Communication

```
User: "Plan my meals for next week and make a grocery list"

┌─────────────────────────────────────────────────────────┐
│  Step 1: Small Model (Entry Point)                     │
│  "I understand you want meal planning + grocery list"   │
│  Intent: needs_complex_workflow                         │
│  → Pass to Medium Model                                 │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Step 2: Medium Model (Coordinator)                     │
│  "This requires:                                        │
│   1. Get user preferences                               │
│   2. Search recipes (21 meals)                          │
│   3. Create meal plan                                   │
│   4. Generate grocery list"                             │
│                                                         │
│  Executes tools:                                        │
│  - get_user_preferences() → Returns diet/allergies     │
│  - search_recipes(...) → 50 potential recipes          │
│                                                         │
│  50 recipes is too much data for me!                    │
│  → Pass to Large Model                                  │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Step 3: Large Model (Bulk Processor)                  │
│  "Analyzing 50 recipes...                               │
│   - Check nutrition balance                             │
│   - Ensure variety                                      │
│   - Optimize for preferences                            │
│   - Score each recipe"                                  │
│                                                         │
│  Selected 21 recipes:                                   │
│  [structured JSON with scores]                          │
│  → Pass back to Medium                                  │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Step 4: Medium Model (Execution)                       │
│  "Got the 21 recipes, now execute:                      │
│   - create_meal_plan()                                  │
│   - add_meal_to_plan() × 21                             │
│   - generate_grocery_list_from_meal_plan()"             │
│                                                         │
│  Result: Meal plan ID #123, Grocery list ID #45         │
│  → Format for user presentation                         │
│  → Pass to Small                                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Step 5: Small Model (User Interface)                  │
│  "Perfect! I've created your meal plan:                 │
│                                                         │
│   📅 7 days, 21 meals                                   │
│   🍽️  Breakfast, lunch, dinner each day                │
│   🥗 Balanced nutrition                                 │
│   📝 15-item grocery list ready                         │
│   💰 Estimated cost: $87.50                             │
│                                                         │
│   Would you like to see the full plan?"                 │
│  → Display to user                                      │
└─────────────────────────────────────────────────────────┘

Communication Bus Data:
┌──────────────────────────────────────┐
│  Conversation Context (Shared)       │
│  - user_id: 123                      │
│  - conversation_id: "abc123"         │
│  - preferences: {...}                │
│  - pantry_items: [...]               │
│  - selected_recipes: [...]           │
│  - meal_plan_id: 123                 │
│  - grocery_list_id: 45               │
└──────────────────────────────────────┘
```

---

## 🎯 Summary

The architecture features:
1. **Universal Chat UI** - Available on all pages
2. **3-Tier AI System** - Specialized models working together
3. **Smart Caching** - 30-40% cost reduction
4. **Cost Tracking** - Every request logged
5. **Tool Framework** - 33 production tools
6. **Database Integration** - Real CRUD operations
7. **Image Support** - Vision capabilities
8. **State Management** - Redux for predictability

All working together to provide a seamless, intelligent kitchen assistant experience!
