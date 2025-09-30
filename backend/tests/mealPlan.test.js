const request = require('supertest');
const express = require('express');
const { query, pool } = require('../src/config/database');
const mealPlanRoutes = require('../src/controllers/mealPlanController');

// Test setup
const app = express();
app.use(express.json());
app.use('/api/meal-plans', mealPlanRoutes);

// Test data
const testUserId = '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3';
const testRecipeId = 'test-recipe-id';

describe('Meal Planning API', () => {
  let mealPlanId;
  let entryId;

  beforeAll(async () => {
    // Clean up any existing test data
    await query('DELETE FROM meal_plan_entries WHERE meal_plan_id IN (SELECT id FROM meal_plans WHERE user_id = $1)', [testUserId]);
    await query('DELETE FROM meal_plans WHERE user_id = $1 AND name LIKE $2', [testUserId, 'Test%']);
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM meal_plan_entries WHERE meal_plan_id IN (SELECT id FROM meal_plans WHERE user_id = $1)', [testUserId]);
    await query('DELETE FROM meal_plans WHERE user_id = $1 AND name LIKE $2', [testUserId, 'Test%']);
    await pool.end();
  });

  describe('POST /api/meal-plans', () => {
    it('should create a new meal plan', async () => {
      const mealPlanData = {
        name: 'Test Weekly Plan',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        notes: 'Test meal plan'
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .send(mealPlanData)
        .expect(201);

      expect(response.body.message).toBe('Meal plan created successfully');
      expect(response.body.mealPlan.name).toBe(mealPlanData.name);
      expect(response.body.mealPlan.start_date).toContain('2024-01-01');
      expect(response.body.mealPlan.end_date).toContain('2024-01-07');
      
      mealPlanId = response.body.mealPlan.id;
    });

    it('should reject meal plan with invalid date range', async () => {
      const mealPlanData = {
        name: 'Invalid Plan',
        startDate: '2024-01-07',
        endDate: '2024-01-01',
        notes: 'Invalid date range'
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .send(mealPlanData)
        .expect(400);

      expect(response.body.error).toBe('Start date must be before end date');
    });

    it('should reject meal plan with missing required fields', async () => {
      const mealPlanData = {
        name: 'Incomplete Plan'
        // Missing startDate and endDate
      };

      const response = await request(app)
        .post('/api/meal-plans')
        .send(mealPlanData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/meal-plans', () => {
    it('should get all meal plans for user', async () => {
      const response = await request(app)
        .get('/api/meal-plans')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const testPlan = response.body.find(plan => plan.name === 'Test Weekly Plan');
      expect(testPlan).toBeDefined();
      expect(parseInt(testPlan.total_meals)).toBe(0);
    });
  });

  describe('GET /api/meal-plans/:id', () => {
    it('should get specific meal plan with entries', async () => {
      const response = await request(app)
        .get(`/api/meal-plans/${mealPlanId}`)
        .expect(200);

      expect(response.body.id).toBe(mealPlanId);
      expect(response.body.name).toBe('Test Weekly Plan');
      expect(Array.isArray(response.body.entries)).toBe(true);
    });

    it('should return 404 for non-existent meal plan', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/meal-plans/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Meal plan not found');
    });
  });

  describe('POST /api/meal-plans/:id/entries', () => {
    it('should add meal entry to meal plan', async () => {
      const entryData = {
        mealDate: '2024-01-01',
        mealType: 'breakfast',
        recipeId: null,
        notes: 'Test breakfast entry'
      };

      const response = await request(app)
        .post(`/api/meal-plans/${mealPlanId}/entries`)
        .send(entryData)
        .expect(201);

      expect(response.body.message).toBe('Meal entry added successfully');
      expect(response.body.entry.meal_type).toBe('breakfast');
      expect(response.body.entry.meal_date).toContain('2024-01-01');
      
      entryId = response.body.entry.id;
    });

    it('should reject duplicate meal entry for same date and type', async () => {
      const entryData = {
        mealDate: '2024-01-01',
        mealType: 'breakfast',
        recipeId: null,
        notes: 'Duplicate breakfast entry'
      };

      const response = await request(app)
        .post(`/api/meal-plans/${mealPlanId}/entries`)
        .send(entryData)
        .expect(409);

      expect(response.body.error).toBe('Meal entry already exists for this date and meal type');
    });

    it('should reject entry outside meal plan date range', async () => {
      const entryData = {
        mealDate: '2024-02-01',
        mealType: 'lunch',
        recipeId: null,
        notes: 'Outside range entry'
      };

      const response = await request(app)
        .post(`/api/meal-plans/${mealPlanId}/entries`)
        .send(entryData)
        .expect(400);

      expect(response.body.error).toBe('Meal date must be within meal plan date range');
    });

    it('should reject invalid meal type', async () => {
      const entryData = {
        mealDate: '2024-01-02',
        mealType: 'invalid-meal',
        recipeId: null,
        notes: 'Invalid meal type'
      };

      const response = await request(app)
        .post(`/api/meal-plans/${mealPlanId}/entries`)
        .send(entryData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/meal-plans/entries/:entryId', () => {
    it('should update meal entry', async () => {
      const updateData = {
        mealType: 'lunch', // Changed to valid meal type
        notes: 'Updated lunch entry'
      };

      const response = await request(app)
        .put(`/api/meal-plans/entries/${entryId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Meal entry updated successfully');
      expect(response.body.entry.meal_type).toBe('lunch');
      expect(response.body.entry.notes).toBe('Updated lunch entry');
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/meal-plans/entries/${fakeId}`)
        .send({ mealType: 'lunch' })
        .expect(404);

      expect(response.body.error).toBe('Meal entry not found');
    });
  });

  describe('GET /api/meal-plans/range/:startDate/:endDate', () => {
    it('should get meal plans for date range', async () => {
      const response = await request(app)
        .get('/api/meal-plans/range/2024-01-01/2024-01-07')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const testEntry = response.body.find(entry => entry.meal_type === 'lunch');
      expect(testEntry).toBeDefined();
      expect(testEntry.meal_plan_name).toBe('Test Weekly Plan');
    });
  });

  describe('PUT /api/meal-plans/:id', () => {
    it('should update meal plan', async () => {
      const updateData = {
        name: 'Updated Test Plan',
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/meal-plans/${mealPlanId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Meal plan updated successfully');
      expect(response.body.mealPlan.name).toBe('Updated Test Plan');
      expect(response.body.mealPlan.notes).toBe('Updated notes');
    });
  });

  describe('DELETE /api/meal-plans/entries/:entryId', () => {
    it('should delete meal entry', async () => {
      const response = await request(app)
        .delete(`/api/meal-plans/entries/${entryId}`)
        .expect(200);

      expect(response.body.message).toBe('Meal entry deleted successfully');
    });

    it('should return 404 when deleting non-existent entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/meal-plans/entries/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Meal entry not found');
    });
  });

  describe('DELETE /api/meal-plans/:id', () => {
    it('should delete meal plan', async () => {
      const response = await request(app)
        .delete(`/api/meal-plans/${mealPlanId}`)
        .expect(200);

      expect(response.body.message).toBe('Meal plan deleted successfully');
    });

    it('should return 404 when deleting non-existent meal plan', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/meal-plans/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Meal plan not found');
    });
  });
});