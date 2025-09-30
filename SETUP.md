# Intelligent Kitchen AI - Setup & Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Docker Development Setup](#docker-development-setup)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [API Integration](#api-integration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Docker** and **Docker Compose** (for containerized setup)
- **PostgreSQL** (v15 or higher) - if not using Docker
- **Redis** (v7 or higher) - if not using Docker
- **Git**

## Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "SuperMom/Intelligent Kitchen"
```

### 2. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment
```bash
cd backend
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://kitchen_user:kitchen_password@localhost:5432/intelligent_kitchen
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment
```bash
cd ../frontend
cp .env.example .env
```

Edit the `.env` file:
```env
VITE_API_URL=http://localhost:3001
VITE_NODE_ENV=development
```

### 4. Database Setup

#### Using Local PostgreSQL
1. Create a database:
```sql
CREATE DATABASE intelligent_kitchen;
CREATE USER kitchen_user WITH PASSWORD 'kitchen_password';
GRANT ALL PRIVILEGES ON DATABASE intelligent_kitchen TO kitchen_user;
```

2. Run migrations:
```bash
cd backend
npm run migrate
```

#### Using Docker (Recommended)
See [Docker Development Setup](#docker-development-setup)

### 5. Start Development Servers

#### Start Backend
```bash
cd backend
npm run dev
```

#### Start Frontend
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Docker Development Setup

### 1. Environment Configuration
```bash
cp .env.example .env
```

Edit the `.env` file with your preferred configuration.

### 2. Start Development Environment
```bash
docker-compose -f docker-compose.dev.yml up --build
```

This will start:
- PostgreSQL database on port 5432
- Redis cache on port 6379
- Backend API on port 3001
- Frontend development server on port 5173

### 3. Stop Services
```bash
docker-compose -f docker-compose.dev.yml down
```

### 4. Clean Up (Remove Volumes)
```bash
docker-compose -f docker-compose.dev.yml down -v
```

## Production Deployment

### Using Docker Compose

#### 1. Environment Configuration
```bash
cp .env.example .env
```

Update the `.env` file with production values:
```env
NODE_ENV=production
POSTGRES_DB=intelligent_kitchen
POSTGRES_USER=kitchen_user
POSTGRES_PASSWORD=secure_production_password
JWT_SECRET=your-very-secure-production-jwt-secret
```

#### 2. Build and Start Services
```bash
docker-compose up --build -d
```

#### 3. View Logs
```bash
docker-compose logs -f
```

#### 4. Stop Services
```bash
docker-compose down
```

### Manual Production Deployment

#### 1. Build Frontend
```bash
cd frontend
npm run build
```

#### 2. Setup Production Database
```bash
# Create production database
createdb intelligent_kitchen_prod

# Run migrations
cd backend
NODE_ENV=production npm run migrate
```

#### 3. Start Backend in Production
```bash
cd backend
NODE_ENV=production npm start
```

#### 4. Serve Frontend
Use a web server like Nginx to serve the built frontend files.

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production) | development | Yes |
| `PORT` | Backend server port | 3001 | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `REDIS_URL` | Redis connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_EXPIRES_IN` | Token expiration time | 7d | No |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 | Yes |
| `SPOONACULAR_API_KEY` | Spoonacular API key | - | No |
| `GOOGLE_CLOUD_API_KEY` | Google Cloud API key | - | No |

### Frontend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | http://localhost:3001 | Yes |
| `VITE_NODE_ENV` | Frontend environment | development | No |
| `VITE_ENABLE_VOICE_COMMANDS` | Enable voice commands | true | No |
| `VITE_ENABLE_BARCODE_SCANNING` | Enable barcode scanning | true | No |

## Database Setup

### Schema Overview

The application uses the following main tables:

- `users` - User accounts and profiles
- `pantry_items` - Pantry inventory management
- `recipes` - Recipe collection and management
- `meal_plans` - Weekly meal planning
- `grocery_lists` - Shopping list management
- `grocery_items` - Individual grocery list items

### Running Migrations

#### Development
```bash
cd backend
npm run migrate
```

#### Production
```bash
cd backend
NODE_ENV=production npm run migrate
```

#### Creating New Migrations
```bash
cd backend
npm run create-migration <migration-name>
```

### Database Seeding

To seed the database with initial data:
```bash
cd backend
npm run seed
```

## API Integration

### External APIs

#### Spoonacular API
1. Sign up at [spoonacular.com](https://spoonacular.com/food-api)
2. Get your API key
3. Add to backend `.env`:
```env
SPOONACULAR_API_KEY=your-api-key
```

#### Google Cloud Services
1. Create a project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Speech-to-Text API
3. Create service account and download credentials
4. Add to backend `.env`:
```env
GOOGLE_CLOUD_API_KEY=your-api-key
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

### Internal API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Pantry Management
- `GET /api/pantry` - Get pantry items
- `POST /api/pantry` - Add pantry item
- `PUT /api/pantry/:id` - Update pantry item
- `DELETE /api/pantry/:id` - Delete pantry item

#### Recipes
- `GET /api/recipes` - Get recipes
- `POST /api/recipes` - Create recipe
- `GET /api/recipes/:id` - Get recipe details
- `PUT /api/recipes/:id` - Update recipe

#### Meal Planning
- `GET /api/meal-plans` - Get meal plans
- `POST /api/meal-plans` - Create meal plan
- `PUT /api/meal-plans/:id` - Update meal plan

#### Grocery Lists
- `GET /api/grocery-lists` - Get grocery lists
- `POST /api/grocery-lists` - Create grocery list
- `POST /api/grocery-lists/:id/items` - Add item to list

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check if PostgreSQL is running
pg_isready

# Check database logs
docker-compose logs postgres
```

#### 2. Port Already in Use
```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
kill -9 <PID>
```

#### 3. Docker Build Issues
```bash
# Clean build
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v
docker system prune -a
```

#### 4. Frontend Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 5. JWT Authentication Issues
- Ensure `JWT_SECRET` is set in environment
- Check token expiration in frontend localStorage
- Verify CORS settings match frontend URL

### Health Checks

#### Backend Health
```bash
curl http://localhost:3001/health
```

#### Database Health
```bash
# Check PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1"

# Check Redis connection
redis-cli ping
```

### Performance Optimization

#### Database
- Add indexes to frequently queried columns
- Use connection pooling
- Enable query caching with Redis

#### Frontend
- Implement code splitting
- Use lazy loading for components
- Optimize images and assets

#### Backend
- Implement rate limiting
- Use caching for frequently accessed data
- Optimize database queries

## Support

For additional support:
1. Check the [troubleshooting section](#troubleshooting)
2. Review the [MVP build plan](./mvp-build-plan.md)
3. Check the [PRD document](./prd.md)
4. Create an issue in the project repository

---

**Note**: This is a living document. Please keep it updated as the project evolves.