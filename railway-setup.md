# Railway PostgreSQL Setup Guide

## Database Configuration

Since the Railway environment variables aren't available in the current CLI environment, you'll need to manually configure the database connection. Here's how to set up your Railway PostgreSQL database:

### Step 1: Get Railway Database Credentials

1. Go to your Railway dashboard
2. Select your PostgreSQL service
3. Click on the "Connect" tab
4. Copy the connection string or individual connection details

### Step 2: Update Environment Variables

Choose one of these methods:

#### Method A: Use DATABASE_URL (Recommended)
Replace the DATABASE_URL in your `.env` file with your Railway connection string:
```env
DATABASE_URL=postgresql://username:password@host:port/database
```

#### Method B: Use Individual Variables
Update these variables in your `.env` file:
```env
DB_HOST=your-railway-host.railway.app
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=your-railway-password
```

### Step 3: Generate Secure JWT Secret

Generate a cryptographically secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update your `.env` file:
```env
JWT_SECRET=your-generated-secret-here
```

### Step 4: Set Up Database Schema

The current database schema contains hardcoded test data that should be removed. Use the clean schema:

```bash
# Apply the clean schema to your Railway database
psql $DATABASE_URL -f database/clean-schema.sql
```

### Step 5: Remove Hardcoded Test Data

The original schema contains:
- Hardcoded admin user (`admin@intelligentkitchen.com`)
- Sample recipe data
- Test nutrition information

The clean schema (`database/clean-schema.sql`) removes all this test data and provides a production-ready database structure.

### Step 6: Test Connection

Run the database connection test:
```bash
cd backend
node simple-db-check.js
```

## Configuration Templates

### Development Environment (.env)
```env
NODE_ENV=development
DATABASE_URL=postgresql://kitchen_user:kitchen_password@localhost:5432/intelligent_kitchen
JWT_SECRET=your-development-secret-here
FRONTEND_URL=http://localhost:3000
```

### Production Environment (.env)
```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host.railway.app:5432/railway
JWT_SECRET=your-production-secret-here
FRONTEND_URL=https://your-app-domain.com
```

## Database Schema Requirements

The application requires these tables:
- `users` - User accounts and preferences
- `pantry_items` - Kitchen inventory management
- `recipes` - Recipe storage and sharing
- `recipe_ingredients` - Recipe ingredient lists
- `meal_plans` - Weekly meal planning
- `meal_plan_entries` - Individual meal entries
- `grocery_lists` - Shopping list management
- `grocery_list_items` - Individual shopping items
- `nutrition_info` - Nutritional data for recipes
- `user_preferences` - User-specific settings

## Security Notes

1. **Never commit actual credentials to version control**
2. **Use Railway's environment variables for sensitive data**
3. **Generate unique JWT secrets for each environment**
4. **Use SSL connections for production databases**
5. **Implement proper database connection pooling**

## Next Steps

1. Update your Railway environment variables with the database credentials
2. Run the clean database schema on your Railway database
3. Test the application connection
4. Remove any hardcoded test data from the frontend code
5. Implement proper authentication throughout the application

## Troubleshooting

### Connection Issues
- Verify Railway PostgreSQL service is running
- Check connection string format
- Ensure firewall allows connections
- Validate SSL certificate settings

### Schema Issues
- Run `database/clean-schema.sql` to set up proper tables
- Remove any hardcoded test data
- Verify all required indexes exist
- Check foreign key constraints

### Application Issues
- Check environment variables are properly set
- Verify JWT secret is properly configured
- Ensure CORS settings allow your frontend domain
- Test API endpoints individually
