# 🍳 Intelligent Kitchen Development Setup

## 🚀 Quick Start (Permanent Fix)

**STOP using individual `npm start` commands!** Use the robust startup script instead:

```bash
cd "/Users/edwardbeshers/SuperMom/Intelligent Kitchen"
./start-dev.sh
```

This script:
- ✅ Cleans up any existing processes
- ✅ Installs dependencies if needed
- ✅ Starts servers in correct order
- ✅ Waits for servers to be ready
- ✅ Verifies API connection
- ✅ Provides detailed logging
- ✅ Saves process IDs for clean shutdown

## 🛑 Stop Development Servers

```bash
./stop-dev.sh
```

## 🔧 What Was Fixed

### Root Problems:
1. **Port conflicts** - Old processes weren't properly killed
2. **Race conditions** - Frontend starting before backend
3. **No verification** - No way to know if servers actually started
4. **Manual process management** - Easy to forget running processes

### Solutions:
1. **Automatic cleanup** - Kills all related processes on startup
2. **Sequential startup** - Backend first, then frontend
3. **Health checks** - Waits and verifies each server is ready
4. **Process tracking** - Saves PIDs for clean shutdown
5. **Comprehensive logging** - Detailed output for debugging

## 📋 Development Commands

| Command | Description |
|---------|-------------|
| `./start-dev.sh` | Start both servers with verification |
| `./stop-dev.sh` | Stop all development servers cleanly |
| `tail -f backend.log` | Monitor backend logs |
| `tail -f frontend.log` | Monitor frontend logs |
| `curl http://localhost:3002/health` | Check backend health |
| `curl http://localhost:3000/api/recipes` | Test API connection |

## 🐛 Troubleshooting

### If servers still don't start:

1. **Check logs:**
   ```bash
   cat backend.log
   cat frontend.log
   ```

2. **Manual port check:**
   ```bash
   lsof -i :3000
   lsof -i :3002
   ```

3. **Force cleanup:**
   ```bash
   ./stop-dev.sh
   sleep 5
   ./start-dev.sh
   ```

4. **Database issues:**
   ```bash
   cd backend && npm run migrate
   ```

### Common Issues:

- **Port already in use**: Script handles this automatically
- **Database connection**: Check database is running
- **Dependencies**: Script installs them automatically
- **Permission issues**: Make sure scripts are executable

## 🔄 Development Workflow

1. **Start development:**
   ```bash
   ./start-dev.sh
   ```

2. **Make code changes**

3. **Restart if needed:**
   ```bash
   ./stop-dev.sh
   ./start-dev.sh
   ```

4. **View logs while developing:**
   ```bash
   tail -f backend.log frontend.log
   ```

## 🌐 Access Points

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:3002
- **API Documentation**: http://localhost:3002/api/recipes
- **Health Check**: http://localhost:3002/health

## 📝 Notes

- Scripts handle all process management automatically
- No more manual port checking or process killing
- Servers start in correct order every time
- Comprehensive error reporting and logging
- Works consistently across system restarts

**This is the PERMANENT FIX for connection issues!** 🎉