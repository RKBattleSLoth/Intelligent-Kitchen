/**
 * Cost Monitor Service
 * Tracks AI usage, estimates costs, and provides analytics
 */

const { query } = require('../../config/database');

class CostMonitor {
  constructor() {
    // Cost estimates per 1M tokens (adjust based on actual OpenRouter pricing)
    this.costs = {
      small: 0.0005,   // $0.50 per 1M tokens
      medium: 0.003,   // $3.00 per 1M tokens
      large: 0.010,    // $10.00 per 1M tokens
    };

    // Alert thresholds
    this.alertThresholds = {
      dailyUser: parseFloat(process.env.AI_COST_ALERT_USER_DAILY) || 1.00,    // $1 per user per day
      dailyTotal: parseFloat(process.env.AI_COST_ALERT_TOTAL_DAILY) || 50.00, // $50 total per day
      monthlyTotal: parseFloat(process.env.AI_COST_ALERT_TOTAL_MONTHLY) || 500.00 // $500 per month
    };
  }

  /**
   * Log AI usage
   * @param {Object} usageData
   * @returns {Promise<Object>}
   */
  async logUsage(usageData) {
    const {
      userId,
      endpoint,
      modelTier,
      modelName,
      promptTokens = 0,
      completionTokens = 0,
      latencyMs = 0,
      success = true,
      errorMessage = null
    } = usageData;

    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = this.calculateCost(modelTier, totalTokens);

    try {
      const result = await query(`
        INSERT INTO ai_usage_logs (
          user_id, endpoint, model_tier, model_name,
          prompt_tokens, completion_tokens, total_tokens,
          estimated_cost, latency_ms, success, error_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, estimated_cost
      `, [
        userId, endpoint, modelTier, modelName,
        promptTokens, completionTokens, totalTokens,
        estimatedCost, latencyMs, success, errorMessage
      ]);

      // Check for alerts
      await this.checkAlerts(userId);

      return {
        logId: result.rows[0].id,
        cost: result.rows[0].estimated_cost,
        tokens: totalTokens
      };
    } catch (error) {
      console.error('Failed to log AI usage:', error);
      // Don't throw - logging failures shouldn't break the app
      return { logId: null, cost: estimatedCost, tokens: totalTokens };
    }
  }

  /**
   * Calculate estimated cost
   * @param {String} tier - Model tier
   * @param {Number} tokens - Total tokens used
   * @returns {Number} - Estimated cost in USD
   */
  calculateCost(tier, tokens) {
    const costPerToken = (this.costs[tier] || this.costs.medium) / 1000000;
    return tokens * costPerToken;
  }

  /**
   * Get user usage statistics
   * @param {String} userId
   * @param {String} period - '24h', '7d', '30d', 'all'
   * @returns {Promise<Object>}
   */
  async getUserStats(userId, period = '30d') {
    const interval = this.periodToInterval(period);

    const result = await query(`
      SELECT 
        model_tier,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        AVG(latency_ms) as avg_latency_ms,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
        SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_requests
      FROM ai_usage_logs
      WHERE user_id = $1 
        AND created_at >= NOW() - $2::interval
      GROUP BY model_tier
      ORDER BY total_cost DESC
    `, [userId, interval]);

    const totalStats = await query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost
      FROM ai_usage_logs
      WHERE user_id = $1 
        AND created_at >= NOW() - $2::interval
    `, [userId, interval]);

    return {
      period,
      byTier: result.rows,
      totals: totalStats.rows[0],
      averageCostPerRequest: totalStats.rows[0].total_cost / totalStats.rows[0].total_requests || 0
    };
  }

  /**
   * Get global usage statistics
   * @param {String} period
   * @returns {Promise<Object>}
   */
  async getGlobalStats(period = '24h') {
    const interval = this.periodToInterval(period);

    const result = await query(`
      SELECT 
        model_tier,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        COUNT(DISTINCT user_id) as unique_users
      FROM ai_usage_logs
      WHERE created_at >= NOW() - $1::interval
      GROUP BY model_tier
      ORDER BY total_cost DESC
    `, [interval]);

    const totalStats = await query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        COUNT(DISTINCT user_id) as total_users
      FROM ai_usage_logs
      WHERE created_at >= NOW() - $1::interval
    `, [interval]);

    const popularEndpoints = await query(`
      SELECT 
        endpoint,
        COUNT(*) as request_count,
        SUM(estimated_cost) as total_cost
      FROM ai_usage_logs
      WHERE created_at >= NOW() - $1::interval
      GROUP BY endpoint
      ORDER BY request_count DESC
      LIMIT 10
    `, [interval]);

    return {
      period,
      byTier: result.rows,
      totals: totalStats.rows[0],
      popularEndpoints: popularEndpoints.rows
    };
  }

  /**
   * Get cost breakdown by time
   * @param {String} userId
   * @param {Number} days
   * @returns {Promise<Array>}
   */
  async getCostTrend(userId, days = 30) {
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        model_tier,
        COUNT(*) as requests,
        SUM(estimated_cost) as cost
      FROM ai_usage_logs
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE - $2::integer
      GROUP BY DATE(created_at), model_tier
      ORDER BY date DESC, cost DESC
    `, [userId, days]);

    return result.rows;
  }

  /**
   * Get top users by cost
   * @param {Number} limit
   * @param {String} period
   * @returns {Promise<Array>}
   */
  async getTopUsers(limit = 10, period = '30d') {
    const interval = this.periodToInterval(period);

    const result = await query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(*) as request_count,
        SUM(l.total_tokens) as total_tokens,
        SUM(l.estimated_cost) as total_cost
      FROM ai_usage_logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.created_at >= NOW() - $1::interval
      GROUP BY u.id, u.email, u.first_name, u.last_name
      ORDER BY total_cost DESC
      LIMIT $2
    `, [interval, limit]);

    return result.rows;
  }

  /**
   * Check if user exceeds cost thresholds
   * @param {String} userId
   * @returns {Promise<Object>}
   */
  async checkAlerts(userId) {
    // Check daily user cost
    const dailyUserCost = await query(`
      SELECT SUM(estimated_cost) as total
      FROM ai_usage_logs
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE
    `, [userId]);

    const userDailyCost = parseFloat(dailyUserCost.rows[0]?.total || 0);

    if (userDailyCost > this.alertThresholds.dailyUser) {
      console.warn(`⚠️  User ${userId} exceeded daily cost threshold: $${userDailyCost.toFixed(2)}`);
      // TODO: Send notification, email, or take action
    }

    // Check total daily cost
    const dailyTotalCost = await query(`
      SELECT SUM(estimated_cost) as total
      FROM ai_usage_logs
      WHERE created_at >= CURRENT_DATE
    `);

    const totalDaily = parseFloat(dailyTotalCost.rows[0]?.total || 0);

    if (totalDaily > this.alertThresholds.dailyTotal) {
      console.warn(`⚠️  Total daily cost exceeded threshold: $${totalDaily.toFixed(2)}`);
    }

    return {
      userDailyCost,
      totalDailyCost: totalDaily,
      alerts: {
        userExceeded: userDailyCost > this.alertThresholds.dailyUser,
        totalExceeded: totalDaily > this.alertThresholds.dailyTotal
      }
    };
  }

  /**
   * Get current month projection
   * @returns {Promise<Object>}
   */
  async getMonthlyProjection() {
    const monthStart = await query(`
      SELECT SUM(estimated_cost) as total
      FROM ai_usage_logs
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `);

    const currentMonthCost = parseFloat(monthStart.rows[0]?.total || 0);

    // Calculate days in month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();

    // Project to end of month
    const projectedCost = (currentMonthCost / dayOfMonth) * daysInMonth;

    return {
      currentMonthCost,
      dayOfMonth,
      daysInMonth,
      projectedMonthCost: projectedCost,
      onTrackFor: projectedCost,
      exceedsThreshold: projectedCost > this.alertThresholds.monthlyTotal
    };
  }

  /**
   * Clean up old logs
   * @param {Number} daysToKeep
   * @returns {Promise<Number>}
   */
  async cleanupOldLogs(daysToKeep = 90) {
    const result = await query(`
      DELETE FROM ai_usage_logs
      WHERE created_at < CURRENT_DATE - $1::integer
      RETURNING id
    `, [daysToKeep]);

    console.log(`🧹 Cleaned up ${result.rowCount} old AI usage logs`);
    return result.rowCount;
  }

  /**
   * Convert period string to PostgreSQL interval
   * @param {String} period
   * @returns {String}
   */
  periodToInterval(period) {
    const intervals = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      'all': '10 years'
    };
    return intervals[period] || '30 days';
  }

  /**
   * Get cost summary for display
   * @param {String} userId
   * @returns {Promise<Object>}
   */
  async getCostSummary(userId) {
    const today = await this.getUserStats(userId, '24h');
    const week = await this.getUserStats(userId, '7d');
    const month = await this.getUserStats(userId, '30d');

    return {
      today: {
        requests: today.totals.total_requests,
        cost: parseFloat(today.totals.total_cost || 0),
        tokens: today.totals.total_tokens
      },
      week: {
        requests: week.totals.total_requests,
        cost: parseFloat(week.totals.total_cost || 0),
        tokens: week.totals.total_tokens
      },
      month: {
        requests: month.totals.total_requests,
        cost: parseFloat(month.totals.total_cost || 0),
        tokens: month.totals.total_tokens
      }
    };
  }
}

module.exports = new CostMonitor();
