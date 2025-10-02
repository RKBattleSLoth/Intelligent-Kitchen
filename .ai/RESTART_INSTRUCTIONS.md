# Backend Restart Instructions

## Issue
The backend server needs to be restarted to load the new AI agent architecture and specialized endpoints.

## Solution

### 1. Stop the Backend (if running)
```bash
# Find and kill any running backend process
pkill -f "node.*backend"

# OR if using npm
cd backend
npm run stop  # if you have a stop script
```

### 2. Restart the Backend
```bash
cd backend
npm run dev
```

### 3. Verify AI Routes Are Loaded
You should see messages like:
```
✓ Routes loaded successfully
🔧 Initializing database connection...
✅ Database initialized successfully
```

### 4. Test the AI Endpoint
```bash
# First, get an auth token by logging in
# Then test the AI status endpoint:
curl -X GET http://localhost:3001/api/ai/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

You should get a response like:
```json
{
  "success": true,
  "configured": true,
  "hasApiKey": true,
  "models": {
    "small": "google/gemma-3-27b-it",
    "medium": "z-ai/glm-4.6",
    "large": "meta-llama/llama-4-maverick"
  },
  "ready": true,
  "cache": { ... }
}
```

### 5. Test Chat from Frontend
Once backend is running:
1. Open frontend (http://localhost:5173 or wherever it's running)
2. Login
3. Click the floating chat button (bottom-right)
4. Try: "What can I make for dinner?"

## New AI Endpoints Available

After restart, these endpoints will be active:

### Core Endpoints
- `POST /api/ai/chat` - General chat
- `POST /api/ai/chat/image` - Chat with image
- `GET /api/ai/status` - Service status
- `GET /api/ai/usage` - Usage statistics
- `GET /api/ai/usage/trend` - Cost trends
- `POST /api/ai/cache/clear` - Clear cache

### Specialized Endpoints (NEW)
- `POST /api/ai/analyze-pantry` - Analyze pantry and suggest recipes
- `POST /api/ai/generate-meal-plan` - Generate meal plans
- `POST /api/ai/suggest-recipes` - Get recipe suggestions
- `POST /api/ai/agent` - Use multi-agent architecture
- `GET /api/ai/suggestions` - Proactive suggestions
- `POST /api/ai/optimize-grocery-list` - Optimize grocery lists
- `GET /api/ai/agents` - List available agents

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 3001
lsof -i :3001

# Kill it
kill -9 <PID>
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL if needed
sudo systemctl restart postgresql
```

### Module Not Found Errors
```bash
cd backend
npm install
```

### OpenRouter API Errors
Check your `.env` file has:
```bash
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL_SMALL=google/gemma-3-27b-it
OPENROUTER_MODEL_MEDIUM=z-ai/glm-4.6
OPENROUTER_MODEL_LARGE=meta-llama/llama-4-maverick
```

## What Was Added

### New Services
- `RequestRouter` - Complexity analysis and tier selection
- `CoordinatorAgent` - Multi-agent orchestration
- `PantryAgent` - Pantry management specialist
- `RecipeAgent` - Recipe operations specialist
- `MealPlanAgent` - Meal planning specialist
- `NutritionAgent` - Nutritional analysis specialist

### Enhanced Features
- Intelligent request routing based on complexity
- Multi-agent collaboration for complex tasks
- Specialized endpoints for specific operations
- Proactive suggestions system
- Grocery list optimization

## Testing the Agents

### Test Pantry Agent
```bash
curl -X POST http://localhost:3001/api/ai/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"request": "Check my pantry inventory and suggest what I can make"}'
```

### Test Recipe Agent
```bash
curl -X POST http://localhost:3001/api/ai/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"request": "Find quick vegetarian recipes"}'
```

### Test Meal Plan Agent
```bash
curl -X POST http://localhost:3001/api/ai/generate-meal-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"duration": 7, "mealsPerDay": ["breakfast", "lunch", "dinner"]}'
```

## Expected Behavior

### Simple Chat
```
User: "What temperature to bake chicken?"
→ Small model responds directly (fast, ~400ms)
```

### With Tools
```
User: "Add chicken to my pantry"
→ Coordinator creates plan
→ Pantry agent executes add_pantry_item tool
→ Response with confirmation (1-2s)
```

### Complex Task
```
User: "Plan my meals for next week"
→ Coordinator orchestrates:
  1. Pantry agent checks inventory
  2. Recipe agent finds suitable recipes
  3. Meal plan agent creates 7-day plan
→ Detailed response with full plan (3-5s)
```

---

**After restarting, your AI system should be fully operational with the new agent architecture!**
