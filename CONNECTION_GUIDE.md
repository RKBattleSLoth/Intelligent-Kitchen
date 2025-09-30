# Browser Connection Guide

## ✅ Current Status
Both servers are running and connected correctly:

- **Backend Server**: `http://localhost:3002` ✅ Running
- **Frontend Server**: `http://localhost:3000` ✅ Running
- **API Proxy**: Working correctly ✅

## How to Access the Application

### 1. Open Your Browser
Navigate to: **http://localhost:3000**

This is the main frontend application where you can interact with the Intelligent Kitchen AI interface.

### 2. API Endpoints
The backend API is accessible at:
- Direct: `http://localhost:3002/api/*`
- Through frontend proxy: `http://localhost:3000/api/*`

### 3. Test the Connection
You can verify everything is working by:
1. Opening http://localhost:3000 in your browser
2. Opening browser dev tools (F12) and checking the Network tab
3. You should see API calls to `/api/meal-plans`, `/api/recipes`, etc.

## Server Commands

### Start Both Servers
```bash
# Terminal 1 - Start Backend
cd "/Users/edwardbeshers/SuperMom/Intelligent Kitchen/backend"
npm start

# Terminal 2 - Start Frontend  
cd "/Users/edwardbeshers/SuperMom/Intelligent Kitchen/frontend"
npm run dev
```

### Or Use the Root Package Script
```bash
cd "/Users/edwardbeshers/SuperMom/Intelligent Kitchen"
npm run dev
```

## Troubleshooting

### If Browser Shows "Cannot Connect"
1. **Check both servers are running**:
   ```bash
   lsof -i :3000  # Frontend
   lsof -i :3002  # Backend
   ```

2. **Check server logs** for any errors

3. **Verify ports are available** - no other apps using 3000/3002

4. **Clear browser cache** and try again

### If API Calls Fail
1. Check the browser Network tab for error details
2. Verify CORS is configured correctly (should be)
3. Check that both servers are running

## Available Features

### Meal Planning
- Create/view meal plans
- Add meal entries (breakfast, lunch, dinner, snack, dessert)
- Date range management

### Recipe Management  
- Create recipes with ingredients and nutrition
- Public/private recipe visibility
- Search and filter recipes

### API Testing
You can test endpoints directly:
```bash
# Health check
curl http://localhost:3002/health

# Get meal plans
curl http://localhost:3000/api/meal-plans

# Get recipes  
curl http://localhost:3000/api/recipes
```

## Development Notes

- Frontend runs on Vite dev server (port 3000)
- Backend runs on Express (port 3002)  
- API proxy configured in `frontend/vite.config.ts`
- CORS configured for `http://localhost:3000`

The application is fully functional and ready for use! 🎉