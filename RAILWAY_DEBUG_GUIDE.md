# Railway Meal Planning Debug Guide

## Quick Debug Steps

### 1. Check Deployment Status
Visit your Railway deployment and check:
- Health endpoint: `https://your-app-url.railway.app/health`
- Debug endpoint: `https://your-app-url.railway.app/debug/railway-meal-planning`

### 2. Environment Variables
Ensure these are set in Railway dashboard:

**Required:**
- `DATABASE_URL` - Railway PostgreSQL connection string
- `JWT_SECRET` - At least 32 characters long
- `OPENROUTER_API_KEY` - Your OpenRouter API key

**Optional but recommended:**
- `NODE_ENV=production`
- `FRONTEND_URL` - Your frontend URL
- `OPENROUTER_MODEL=anthropic/claude-3-5-haiku`

### 3. Common Issues & Fixes

#### Issue: AI not working on Railway
**Symptoms:** Fallback meal plans only
**Fix:** Ensure `OPENROUTER_API_KEY` is set correctly in Railway environment

#### Issue: Authentication failures
**Symptoms:** 401 errors on meal planning endpoints
**Fix:** Check that JWT_SECRET is set and users exist in database

#### Issue: Database connection failures
**Symptoms:** 503 errors, connection timeouts
**Fix:** Verify DATABASE_URL format and SSL settings

### 4. Test Meal Planning Directly

```bash
curl -X POST https://your-app-url.railway.app/api/meal-plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "startDate": "2024-10-23",
    "endDate": "2024-10-25",
    "mealTypes": ["breakfast", "lunch", "dinner"],
    "preferences": {"dietary": "none"},
    "peopleCount": 4
  }'
```

### 5. Enhanced Logging

The following logging has been added to debug Railway issues:
- `🍳 [MEAL_PLAN_GENERATE]` - Meal plan controller logs
- `🤖 [SMART_MEAL_PLANNER]` - AI service logs  
- `❌` - Error logs with full context
- `✅` - Success logs with timing

Check Railway logs for these patterns to identify issues.

### 6. Railway vs Local Differences

| Component | Local | Railway | Fix |
|-----------|-------|---------|-----|
| Database | `postgres:5432` | Railway PostgreSQL | Set `DATABASE_URL` |
| Environment | `.env` file | Railway env vars | Add all required vars |
| Authentication | Dev fallback | Production auth | Ensure users exist |
| AI Service | Direct API | Railway network | Check API key and timeout |

### 7. Debug Response Analysis

Check the `/debug/railway-meal-planning` endpoint response:

```json
{
  "environment": "production",
  "platform": "Railway",
  "environment_vars": {
    "DATABASE_URL": "SET",
    "OPENROUTER_API_KEY": "SET"
  },
  "database_test": {
    "healthy": true,
    "user_count": 1
  },
  "ai_test": {
    "status": "success"
  }
}
```

All values should be "SET" or "success" for proper operation.

### 8. Emergency Fallback

If AI continues to fail, the system will automatically use high-quality fallback meal plans. These are better than basic fallbacks and include:
- Detailed step-by-step instructions
- Proper ingredient quantities
- Multiple cuisine options
- Scalable serving sizes

Monitor logs for "fallback: true" to see when this happens.

### 9. Next Steps

1. Deploy with enhanced logging
2. Test debug endpoint
3. Check environment variables
4. Verify database connectivity
5. Test meal planning endpoint
6. Monitor logs for error patterns

If issues persist, the enhanced logging will provide specific error messages and stack traces to identify the root cause.
