-- Intelligent Kitchen AI Database Schema
-- PostgreSQL Schema for MVP

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE dietary_preference AS ENUM ('none', 'vegetarian', 'vegan', 'gluten-free', 'keto', 'paleo', 'dairy-free');
CREATE TYPE health_goal AS ENUM ('maintain', 'weight_loss', 'weight_gain', 'muscle_gain', 'fitness');
CREATE TYPE unit_of_measure AS ENUM ('pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds', 'grams', 'kilograms', 'liters', 'milliliters');
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'dessert');
CREATE TYPE store_aisle AS ENUM ('produce', 'dairy', 'meat', 'bakery', 'frozen', 'canned', 'dry_goods', 'beverages', 'snacks', 'household', 'other');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dietary_preference dietary_preference DEFAULT 'none',
    health_goal health_goal DEFAULT 'maintain',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Pantry items table
CREATE TABLE pantry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit unit_of_measure NOT NULL DEFAULT 'pieces',
    purchase_date DATE,
    expiration_date DATE,
    barcode VARCHAR(50),
    category VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipes table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    prep_time INTEGER, -- in minutes
    cook_time INTEGER, -- in minutes
    servings INTEGER NOT NULL DEFAULT 4,
    difficulty VARCHAR(50) DEFAULT 'medium',
    meal_type meal_type,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipe ingredients table
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit unit_of_measure NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Meal plans table
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Meal plan entries table
CREATE TABLE meal_plan_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    meal_date DATE NOT NULL,
    meal_type meal_type NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meal_plan_id, meal_date, meal_type)
);

-- Grocery lists table
CREATE TABLE grocery_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grocery list items table
CREATE TABLE grocery_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grocery_list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit unit_of_measure NOT NULL DEFAULT 'pieces',
    aisle store_aisle DEFAULT 'other',
    is_purchased BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Nutritional information table (for recipes)
CREATE TABLE nutrition_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    calories DECIMAL(10,2),
    protein DECIMAL(10,2), -- in grams
    carbohydrates DECIMAL(10,2), -- in grams
    fat DECIMAL(10,2), -- in grams
    fiber DECIMAL(10,2), -- in grams
    sugar DECIMAL(10,2), -- in grams
    sodium DECIMAL(10,2), -- in milligrams
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

-- Create indexes for performance
CREATE INDEX idx_pantry_items_user_id ON pantry_items(user_id);
CREATE INDEX idx_pantry_items_expiration_date ON pantry_items(expiration_date);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX idx_meal_plan_entries_meal_plan_id ON meal_plan_entries(meal_plan_id);
CREATE INDEX idx_meal_plan_entries_meal_date ON meal_plan_entries(meal_date);
CREATE INDEX idx_grocery_lists_user_id ON grocery_lists(user_id);
CREATE INDEX idx_grocery_list_items_grocery_list_id ON grocery_list_items(grocery_list_id);
CREATE INDEX idx_nutrition_info_recipe_id ON nutrition_info(recipe_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pantry_items_updated_at BEFORE UPDATE ON pantry_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipe_ingredients_updated_at BEFORE UPDATE ON recipe_ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plan_entries_updated_at BEFORE UPDATE ON meal_plan_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grocery_lists_updated_at BEFORE UPDATE ON grocery_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grocery_list_items_updated_at BEFORE UPDATE ON grocery_list_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nutrition_info_updated_at BEFORE UPDATE ON nutrition_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default admin user (password should be changed immediately)
-- Password: 'admin123' (hashed with bcrypt)
INSERT INTO users (email, password_hash, first_name, last_name) 
VALUES ('admin@intelligentkitchen.com', '$2a$10$rOZXp7mGXmHWK7vJtxB7uO5D3Q7J8Y.rKJ5L9nK8W7vJ8Y.rKJ5L9', 'Admin', 'User');

-- Create sample recipe for testing
INSERT INTO recipes (user_id, name, description, instructions, prep_time, cook_time, servings, meal_type) 
VALUES (
    (SELECT id FROM users WHERE email = 'admin@intelligentkitchen.com'),
    'Simple Scrambled Eggs',
    'Classic scrambled eggs perfect for breakfast',
    '1. Crack eggs into a bowl and whisk with salt and pepper.
2. Heat butter in a non-stick pan over medium heat.
3. Pour in eggs and let sit for 20 seconds.
4. Gently stir eggs until cooked to desired consistency.
5. Serve hot.',
    5, 5, 2, 'breakfast'
);

-- Add ingredients for sample recipe
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit)
VALUES (
    (SELECT id FROM recipes WHERE name = 'Simple Scrambled Eggs'),
    'Eggs', 2, 'pieces'
),
(
    (SELECT id FROM recipes WHERE name = 'Simple Scrambled Eggs'),
    'Butter', 1, 'tablespoons'
),
(
    (SELECT id FROM recipes WHERE name = 'Simple Scrambled Eggs'),
    'Salt', 0.25, 'teaspoons'
),
(
    (SELECT id FROM recipes WHERE name = 'Simple Scrambled Eggs'),
    'Black Pepper', 0.25, 'teaspoons'
);

-- Add nutritional information for sample recipe
INSERT INTO nutrition_info (recipe_id, calories, protein, carbohydrates, fat)
VALUES (
    (SELECT id FROM recipes WHERE name = 'Simple Scrambled Eggs'),
    180, 12, 2, 14
);