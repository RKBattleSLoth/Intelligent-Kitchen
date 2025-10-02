# AI End-to-End Test Suite

Comprehensive testing suite for the Intelligent Kitchen AI system.

## 🚀 Quick Start

### Prerequisites
1. Backend server running (`cd backend && npm run dev`)
2. OpenRouter API key configured in `backend/.env`
3. Database migrated (`npm run migrate`)
4. Node.js 16+ installed

### Install Dependencies
```bash
cd tests/ai
npm install
```

### Run Tests

#### All Tests
```bash
npm test
# or
node run-tests.js
```

#### Specific Test Suites
```bash
npm run test:basic        # Basic chat functionality
npm run test:tools        # Tool execution
npm run test:agents       # Multi-agent workflows
npm run test:endpoints    # Specialized endpoints
npm run test:performance  # Performance tests
npm run test:error        # Error handling
npm run test:quick        # Basic + Tools (quick check)
```

## 📊 Test Coverage

### Basic Chat Tests ✅
- Simple conversations
- Conversation context maintenance
- Response caching
- Model selection
- Image upload

### Tool Execution Tests ✅
- Pantry operations (add, update, remove, check)
- Recipe operations (search, details, scaling)
- Calculation tools (nutrition, units, time)
- Complex workflows
- Error handling in tools

### Multi-Agent Tests ✅
- Agent capabilities discovery
- Individual agent workflows
- Agent coordination
- Data passing between agents
- Specialized endpoints

### Endpoint Tests ✅
- Core chat endpoints
- Vision capabilities
- Analytics and usage stats
- Utility endpoints
- Security and validation

### Error Handling Tests ✅
- Input validation
- Resource errors
- API errors
- Edge cases
- Timeout handling
- Error recovery

### Performance Tests ✅
- Concurrent requests
- Response time distribution
- Memory usage
- Scalability
- Cache performance

## 🧪 Test Scenarios

### Simple Queries (< 2s)
```
"What temperature to bake chicken?"
"Hello, how are you?"
"How do I make scrambled eggs?"
```

### Tool Operations (2-5s)
```
"Add chicken to my pantry"
"Find vegetarian recipes"
"Calculate nutrition for 2 eggs, 1 cup milk"
```

### Complex Workflows (5-15s)
```
"Plan my meals for next week"
"Create meal plan using pantry items"
"Generate grocery list from meal plan"
```

### Multi-Agent Coordination (5-20s)
```
"Check pantry, find recipes, and optimize for nutrition"
"Analyze my dietary preferences and create custom plan"
```

## 📈 Performance Benchmarks

### Response Time Expectations
| Query Type | Expected | Critical |
|------------|----------|----------|
| Simple query | < 2s | < 3s |
| Tool execution | < 5s | < 8s |
| Complex workflow | < 15s | < 20s |
| Multi-agent | < 20s | < 30s |

### Success Rate Requirements
- Overall: ≥ 95%
- Individual suites: ≥ 90%
- Critical functions: ≥ 98%

### Concurrency Support
- Light load: 5 concurrent (80%+ success)
- Medium load: 10 concurrent (80%+ success)
- Heavy load: 20 concurrent (75%+ success)

## 🔧 Configuration

### Environment Variables
```bash
# Test configuration
TEST_API_URL=http://localhost:3001
NODE_ENV=test

# OpenRouter (from backend/.env)
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL_SMALL=google/gemma-3-27b-it
OPENROUTER_MODEL_MEDIUM=z-ai/glm-4.6
OPENROUTER_MODEL_LARGE=meta-llama/llama-4-maverick
```

### Test User
Tests automatically create/use a test user:
- Email: `ai-test@example.com`
- Password: `testpassword123`

## 📋 Test Data

### Default Pantry Items
- Chicken Breast (2 lbs, Meat)
- Rice (5 cups, Grains)
- Tomatoes (4 pieces, Vegetables)
- Onion (2 pieces, Vegetables)
- Olive Oil (1 bottle, Oils)

### Default Recipes
- Grilled Chicken
- Fried Rice

## 🚨 Troubleshooting

### Common Issues

#### "Backend not running"
```bash
cd backend
npm run dev
```

#### "OpenRouter API key not configured"
```bash
# Edit backend/.env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

#### "Database connection failed"
```bash
cd backend
npm run migrate
```

#### "Tests failing consistently"
1. Check backend logs
2. Verify OpenRouter API key is valid
3. Ensure database is migrated
4. Check network connectivity

#### "Slow test performance"
1. Check OpenRouter model availability
2. Monitor server resources
3. Verify database performance
4. Consider running fewer concurrent tests

### Debug Mode
Set environment variable for verbose logging:
```bash
DEBUG=true npm test
```

### Test Isolation
Each test run:
1. Creates/uses test user
2. Sets up test data
3. Runs tests
4. Cleans up data
5. Generates report

## 📊 Reports

### Console Output
- Real-time test progress
- Individual test results
- Performance metrics
- Error summaries
- Recommendations

### JSON Reports
- Saved to `tests/ai/test-results-[timestamp].json`
- Detailed results with assertions
- Performance metrics
- Error details
- Warnings and recommendations

### Report Structure
```json
{
  "timestamp": "2025-10-02T...",
  "duration": 45678,
  "summary": {
    "total": 150,
    "passed": 142,
    "failed": 8,
    "successRate": "94.7"
  },
  "results": [...],
  "warnings": [...],
  "recommendations": [...]
}
```

## 🎯 Success Criteria

### Test Pass Requirements
- ✅ Overall success rate ≥ 95%
- ✅ All basic chat tests pass
- ✅ All tool execution tests pass
- ✅ All agent tests pass
- ✅ Response times within acceptable limits
- ✅ No critical failures

### Performance Requirements
- ✅ Simple queries < 2s average
- ✅ Tool operations < 5s average
- ✅ 95%+ of requests complete successfully
- ✅ Cache hit rate ≥ 30% for repeated queries
- ✅ System handles 10 concurrent requests

### Error Handling Requirements
- ✅ Graceful error handling for invalid inputs
- ✅ No server crashes on errors
- ✅ User-friendly error messages
- ✅ Recovery from transient errors

## 🔄 Continuous Integration

### GitHub Actions (Example)
```yaml
name: AI Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: |
          cd backend && npm install
          npm run dev &
          sleep 10
          cd tests/ai && npm install
          npm test
```

### Pre-commit Hook
```bash
#!/bin/sh
cd tests/ai
npm run test:quick
```

## 📚 API Reference

### Key Endpoints Tested
- `POST /api/ai/chat` - Main chat endpoint
- `POST /api/ai/agent` - Multi-agent orchestration
- `GET /api/ai/status` - Service status
- `GET /api/ai/usage` - Usage statistics
- `POST /api/ai/analyze-pantry` - Pantry analysis
- `POST /api/ai/generate-meal-plan` - Meal planning
- `GET /api/ai/suggestions` - Proactive suggestions

### Test Assertions
- Response time validation
- Success status validation
- Model/agent usage verification
- Tool execution verification
- Error handling validation
- Performance benchmarks

## 🛠️ Development

### Adding New Tests
1. Create test scenario in appropriate test file
2. Add to `test-config.js` if needed
3. Include assertions for validation
4. Update documentation

### Test Structure
```javascript
async executeTest(scenario) {
  const startTime = Date.now();
  try {
    const response = await this.utils.authenticatedRequest(...);
    const duration = Date.now() - startTime;
    
    // Assertions
    const assertions = {
      responseTime: { passed: duration < expectedMax },
      success: response.data.success,
      // ... more assertions
    };
    
    this.utils.results.push({
      name: scenario.name,
      success: response.data.success && duration < expectedMax,
      duration,
      response: response.data,
      assertions,
    });
  } catch (error) {
    // Error handling
  }
}
```

### Best Practices
- Keep tests focused and isolated
- Use descriptive test names
- Include performance assertions
- Test both success and failure scenarios
- Provide meaningful error messages
- Document expected behavior

---

**🎉 The AI system is ready for production when all tests pass!**
