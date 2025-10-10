/**
 * Cost Monitor
 * Tracks AI usage and costs for budget management and user limits
 */

class CostMonitor {
  constructor() {
    this.isEnabled = process.env.AI_ENABLE_COST_MONITORING === 'true';
    this.dailyLimit = parseFloat(process.env.AI_COST_ALERT_THRESHOLD) || 100;
    this.monthlyUserLimit = parseFloat(process.env.AI_MAX_COST_PER_USER_MONTHLY) || 50;
    this.dailyTokenLimit = parseInt(process.env.AI_RATE_LIMIT_TOKENS_PER_DAY) || 1000000;
    
    // In-memory storage for demo (in production, use database)
    this.usage = new Map(); // userId -> usage data
    this.globalUsage = {
      daily: { cost: 0, tokens: 0, date: new Date().toDateString() },
      monthly: { cost: 0, tokens: 0, month: new Date().getMonth() }
    };
  }

  /**
   * Get user usage data
   */
  getUserUsage(userId) {
    if (!this.usage.has(userId)) {
      this.usage.set(userId, {
        daily: { cost: 0, tokens: 0, date: new Date().toDateString() },
        monthly: { cost: 0, tokens: 0, month: new Date().getMonth() },
        requests: []
      });
    }
    return this.usage.get(userId);
  }

  /**
   * Track AI request and calculate cost
   */
  async trackRequest(userId, requestInfo) {
    if (!this.isEnabled) {
      return { allowed: true, cost: 0 };
    }

    const {
      model,
      inputTokens,
      outputTokens,
      taskType,
      routing
    } = requestInfo;

    // Calculate cost
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;

    // Check limits
    const limitCheck = this.checkLimits(userId, cost, totalTokens);
    if (!limitCheck.allowed) {
      return limitCheck;
    }

    // Update usage
    this.updateUsage(userId, {
      cost,
      tokens: totalTokens,
      model,
      taskType,
      timestamp: new Date(),
      routing
    });

    // Update global usage
    this.updateGlobalUsage(cost, totalTokens);

    console.log(`💰 Cost tracked: $${cost.toFixed(4)} for ${totalTokens} tokens (${taskType})`);

    return {
      allowed: true,
      cost,
      tokens: totalTokens,
      dailyRemaining: this.getDailyRemaining(userId),
      monthlyRemaining: this.getMonthlyRemaining(userId)
    };
  }

  /**
   * Calculate cost based on model and token usage
   */
  calculateCost(model, inputTokens, outputTokens) {
    const pricing = {
      [process.env.OPENROUTER_MODEL_SMALL]: { input: 0.05, output: 0.15 },
      [process.env.OPENROUTER_MODEL_MEDIUM]: { input: 0.50, output: 1.50 },
      [process.env.OPENROUTER_MODEL_LARGE]: { input: 2.50, output: 7.50 }
    };

    const modelPricing = pricing[model];
    if (!modelPricing) {
      console.warn(`Unknown model pricing: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000000) * modelPricing.input;
    const outputCost = (outputTokens / 1000000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Check if user is within limits
   */
  checkLimits(userId, additionalCost, additionalTokens) {
    const userUsage = this.getUserUsage(userId);
    const now = new Date();
    
    // Reset daily counters if needed
    if (userUsage.daily.date !== now.toDateString()) {
      userUsage.daily = { cost: 0, tokens: 0, date: now.toDateString() };
    }
    
    // Reset monthly counters if needed
    if (userUsage.monthly.month !== now.getMonth()) {
      userUsage.monthly = { cost: 0, tokens: 0, month: now.getMonth() };
    }

    // Check daily limits
    if (userUsage.daily.cost + additionalCost > this.monthlyUserLimit) {
      return {
        allowed: false,
        reason: 'daily_cost_limit',
        message: `Daily cost limit of $${this.monthlyUserLimit} exceeded`,
        current: userUsage.daily.cost,
        limit: this.monthlyUserLimit
      };
    }

    if (userUsage.daily.tokens + additionalTokens > this.dailyTokenLimit) {
      return {
        allowed: false,
        reason: 'daily_token_limit',
        message: `Daily token limit of ${this.dailyTokenLimit} exceeded`,
        current: userUsage.daily.tokens,
        limit: this.dailyTokenLimit
      };
    }

    // Check monthly limits
    if (userUsage.monthly.cost + additionalCost > this.monthlyUserLimit * 30) {
      return {
        allowed: false,
        reason: 'monthly_cost_limit',
        message: `Monthly cost limit of $${this.monthlyUserLimit * 30} exceeded`,
        current: userUsage.monthly.cost,
        limit: this.monthlyUserLimit * 30
      };
    }

    return { allowed: true };
  }

  /**
   * Update user usage data
   */
  updateUsage(userId, requestData) {
    const userUsage = this.getUserUsage(userId);
    
    // Update daily
    userUsage.daily.cost += requestData.cost;
    userUsage.daily.tokens += requestData.tokens;
    
    // Update monthly
    userUsage.monthly.cost += requestData.cost;
    userUsage.monthly.tokens += requestData.tokens;
    
    // Add to request history
    userUsage.requests.push({
      ...requestData,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2)
    });

    // Keep only last 100 requests
    if (userUsage.requests.length > 100) {
      userUsage.requests = userUsage.requests.slice(-100);
    }
  }

  /**
   * Update global usage
   */
  updateGlobalUsage(cost, tokens) {
    const now = new Date();
    
    // Reset daily if needed
    if (this.globalUsage.daily.date !== now.toDateString()) {
      this.globalUsage.daily = { cost: 0, tokens: 0, date: now.toDateString() };
    }
    
    // Reset monthly if needed
    if (this.globalUsage.monthly.month !== now.getMonth()) {
      this.globalUsage.monthly = { cost: 0, tokens: 0, month: now.getMonth() };
    }

    this.globalUsage.daily.cost += cost;
    this.globalUsage.daily.tokens += tokens;
    this.globalUsage.monthly.cost += cost;
    this.globalUsage.monthly.tokens += tokens;
  }

  /**
   * Get remaining daily allowance for user
   */
  getDailyRemaining(userId) {
    const userUsage = this.getUserUsage(userId);
    const now = new Date();
    
    if (userUsage.daily.date !== now.toDateString()) {
      return this.monthlyUserLimit;
    }
    
    return Math.max(0, this.monthlyUserLimit - userUsage.daily.cost);
  }

  /**
   * Get remaining monthly allowance for user
   */
  getMonthlyRemaining(userId) {
    const userUsage = this.getUserUsage(userId);
    const now = new Date();
    
    if (userUsage.monthly.month !== now.getMonth()) {
      return this.monthlyUserLimit * 30;
    }
    
    return Math.max(0, (this.monthlyUserLimit * 30) - userUsage.monthly.cost);
  }

  /**
   * Get usage statistics for user
   */
  getUserStats(userId) {
    const userUsage = this.getUserUsage(userId);
    const now = new Date();
    
    // Reset counters if needed
    if (userUsage.daily.date !== now.toDateString()) {
      userUsage.daily = { cost: 0, tokens: 0, date: now.toDateString() };
    }
    
    if (userUsage.monthly.month !== now.getMonth()) {
      userUsage.monthly = { cost: 0, tokens: 0, month: now.getMonth() };
    }

    return {
      daily: {
        ...userUsage.daily,
        remaining: this.getDailyRemaining(userId)
      },
      monthly: {
        ...userUsage.monthly,
        remaining: this.getMonthlyRemaining(userId)
      },
      requests: userUsage.requests.length,
      limits: {
        dailyCost: this.monthlyUserLimit,
        monthlyCost: this.monthlyUserLimit * 30,
        dailyTokens: this.dailyTokenLimit
      }
    };
  }

  /**
   * Get global usage statistics
   */
  getGlobalStats() {
    return {
      ...this.globalUsage,
      users: this.usage.size,
      dailyLimit: this.dailyLimit,
      enabled: this.isEnabled
    };
  }

  /**
   * Get cost breakdown by model
   */
  getCostBreakdown(userId) {
    const userUsage = this.getUserUsage(userId);
    const breakdown = {};
    
    userUsage.requests.forEach(request => {
      if (!breakdown[request.model]) {
        breakdown[request.model] = { cost: 0, tokens: 0, count: 0 };
      }
      
      breakdown[request.model].cost += request.cost;
      breakdown[request.model].tokens += request.tokens;
      breakdown[request.model].count += 1;
    });
    
    return breakdown;
  }

  /**
   * Check if daily cost alert should be sent
   */
  shouldSendDailyAlert() {
    return this.globalUsage.daily.cost >= this.dailyLimit;
  }

  /**
   * Reset user usage (for testing or admin)
   */
  resetUserUsage(userId) {
    this.usage.delete(userId);
  }

  /**
   * Export usage data for reporting
   */
  exportUsageData() {
    const data = {
      timestamp: new Date().toISOString(),
      global: this.globalUsage,
      users: {}
    };
    
    this.usage.forEach((usage, userId) => {
      data.users[userId] = this.getUserStats(userId);
    });
    
    return data;
  }
}

module.exports = CostMonitor;