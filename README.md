# 🍳 Intelligent Kitchen AI

A comprehensive kitchen management system that helps users organize recipes, plan meals, manage pantry inventory, and create smart grocery lists with AI-powered features.

## ✨ Features

### 📋 Grocery Lists
- **Smart List Generation**: Automatically generate grocery lists from meal plans
- **Item Management**: Add, edit, and delete grocery items with categories
- **Purchase Tracking**: Mark items as purchased and track progress
- **Aisle Organization**: Items automatically organized by store aisles
- **Recipe Integration**: Create lists from selected recipes

### 📅 Meal Planning
- **Weekly Planning**: Plan meals for the entire week
- **Recipe Integration**: Add recipes directly to meal plans
- **Calendar View**: Visual calendar interface for meal planning
- **Edit & Delete**: Full CRUD operations for meal entries

### 📖 Recipe Management
- **Recipe Library**: Store and organize your favorite recipes
- **Ingredient Tracking**: Automatic ingredient list management
- **Cooking Instructions**: Step-by-step cooking instructions
- **Edit & Delete**: Complete recipe management capabilities

### 🥫 Pantry Management
- **Inventory Tracking**: Keep track of pantry items
- **Quantity Management**: Monitor item quantities and expiration
- **Smart Suggestions**: Get suggestions based on available ingredients

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/intelligent-kitchen.git
   cd intelligent-kitchen
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit the .env files with your configuration
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database and run schema
   createdb intelligent_kitchen
   psql intelligent_kitchen < database/schema.sql
   ```

5. **Start the development servers**
   ```bash
   # Start both frontend and backend
   ./start-dev.sh
   
   # Or start individually:
   npm run dev:backend  # Backend on http://localhost:3002
   npm run dev:frontend # Frontend on http://localhost:3000
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3002

## 🐳 Docker Setup

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose up
```

## 📁 Project Structure

```
intelligent-kitchen/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── config/         # Database configuration
│   │   └── index.js        # Server entry point
│   ├── tests/              # Backend tests
│   └── package.json
├── frontend/               # React TypeScript application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux state management
│   │   └── App.tsx        # Main app component
│   └── package.json
├── database/              # Database schema and migrations
│   └── schema.sql
├── docs/                 # Documentation
└── docker-compose.yml    # Docker configuration
```

## 🔧 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Joi** - Input validation

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **Tailwind CSS** - Styling
- **Vite** - Build tool

### DevOps
- **Docker** - Containerization
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification

### Grocery Lists
- `GET /api/grocery-lists` - Get all grocery lists
- `POST /api/grocery-lists` - Create new grocery list
- `GET /api/grocery-lists/:id` - Get specific grocery list
- `POST /api/grocery-lists/:id/items` - Add item to list
- `PUT /api/grocery-lists/items/:itemId` - Update item
- `DELETE /api/grocery-lists/items/:itemId` - Delete item

### Meal Planning
- `GET /api/meal-plans` - Get all meal plans
- `POST /api/meal-plans` - Create new meal plan
- `GET /api/meal-plans/:id` - Get specific meal plan
- `PUT /api/meal-plans/:id` - Update meal plan
- `DELETE /api/meal-plans/:id` - Delete meal plan

### Recipes
- `GET /api/recipes` - Get all recipes
- `POST /api/recipes` - Create new recipe
- `GET /api/recipes/:id` - Get specific recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Pantry
- `GET /api/pantry-items` - Get all pantry items
- `POST /api/pantry-items` - Add pantry item
- `PUT /api/pantry-items/:id` - Update pantry item
- `DELETE /api/pantry-items/:id` - Delete pantry item

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### End-to-End Tests
```bash
npm run test:e2e
```

## 🔒 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=intelligent_kitchen
DB_USER=kitchen_user
DB_PASSWORD=kitchen_password
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3002
VITE_NODE_ENV=development
VITE_ENABLE_VOICE_COMMANDS=true
VITE_ENABLE_BARCODE_SCANNING=true
```

## 🎯 Current Status

### ✅ Completed Features
- [x] Grocery list management with full CRUD
- [x] Meal planning with calendar integration
- [x] Recipe management system
- [x] Pantry inventory tracking
- [x] User authentication and authorization
- [x] Responsive UI with dark mode
- [x] Docker containerization
- [x] Comprehensive API documentation

### 🚧 In Progress
- [ ] Barcode scanning integration
- [ ] Nutritional analysis
- [ ] Voice command features
- [ ] Mobile app development
- [ ] Advanced meal recommendations

### 📋 Planned Features
- [ ] AI-powered recipe suggestions
- [ ] Meal prep planning
- [ ] Shopping list optimization
- [ ] Social features and sharing
- [ ] Integration with grocery delivery services

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI framework
- [Express.js](https://expressjs.com/) - Backend framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Redux Toolkit](https://redux-toolkit.js.org/) - State management

## 📞 Support

If you have any questions or need support, please:
- Open an issue on GitHub
- Check the [documentation](./docs/)
- Review the [setup guide](./SETUP.md)

---

**Built with ❤️ for home cooks and meal planners everywhere**