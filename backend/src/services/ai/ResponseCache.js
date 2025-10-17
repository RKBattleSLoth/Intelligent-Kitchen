/**
 * Response Cache
 * Redis-based caching system for AI responses to reduce costs and improve performance
 */

const redis = require('redis');
const crypto = require('crypto');

class ResponseCache {
  constructor() {
    this.isEnabled = process.env.AI_ENABLE_CACHING === 'true';
    this.ttl = parseInt(process.env.AI_CACHE_TTL) || 3600; // 1 hour default
    
    if (this.isEnabled) {
      this.initRedis();
    } else {
      console.log('🚫 AI caching is disabled');
    }
  }

  /**
   * Initialize Redis connection
   */
  async initRedis() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isEnabled = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected for AI caching');
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to initialize Redis for caching:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Generate cache key from request parameters
   */
  generateCacheKey(taskType, input, options = {}) {
    const keyData = {
      taskType,
      input: typeof input === 'string' ? input : JSON.stringify(input),
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    };

    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    
    return `ai_cache:${taskType}:${hash}`;
  }

  /**
   * Get cached response
   */
  async get(taskType, input, options = {}) {
    if (!this.isEnabled || !this.client) {
      return null;
    }

    try {
      const key = this.generateCacheKey(taskType, input, options);
      const cached = await this.client.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        console.log(`🎯 Cache hit for ${taskType}: ${key.substring(0, 20)}...`);
        
        return {
          ...data,
          fromCache: true,
          cacheKey: key
        };
      }
      
      console.log(`❌ Cache miss for ${taskType}: ${key.substring(0, 20)}...`);
      return null;
      
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cache response
   */
  async set(taskType, input, response, options = {}) {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      const key = this.generateCacheKey(taskType, input, options);
      
      const cacheData = {
        response,
        timestamp: new Date().toISOString(),
        taskType,
        ttl: this.ttl
      };

      await this.client.setEx(key, this.ttl, JSON.stringify(cacheData));
      console.log(`💾 Cached response for ${taskType}: ${key.substring(0, 20)}...`);
      
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate cache for a specific task type
   */
  async invalidate(taskType) {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      const pattern = `ai_cache:${taskType}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️ Invalidated ${keys.length} cache entries for ${taskType}`);
      }
      
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  /**
   * Clear all AI cache
   */
  async clear() {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      const pattern = 'ai_cache:*';
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️ Cleared ${keys.length} AI cache entries`);
      }
      
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isEnabled || !this.client) {
      return { enabled: false };
    }

    try {
      const pattern = 'ai_cache:*';
      const keys = await this.client.keys(pattern);
      
      const stats = {
        enabled: true,
        totalEntries: keys.length,
        ttl: this.ttl,
        connected: this.client.isOpen
      };

      // Get breakdown by task type
      const taskTypes = {};
      for (const key of keys) {
        const taskType = key.split(':')[2];
        taskTypes[taskType] = (taskTypes[taskType] || 0) + 1;
      }
      
      stats.taskTypes = taskTypes;
      
      return stats;
      
    } catch (error) {
      console.error('Cache stats error:', error);
      return { enabled: true, error: error.message };
    }
  }

  /**
   * Cache wrapper for AI requests
   */
  async wrap(taskType, input, requestFunction, options = {}) {
    // Sensitive tasks should bypass cache entirely
    const shouldBypassCache = (
      process.env.AI_DISABLE_CACHE === 'true' ||
      options.priority === 'fresh'
    );

    if (!shouldBypassCache) {
      const cached = await this.get(taskType, input, options);
      if (cached) {
        if (cached.response && typeof cached.response === 'object') {
          return {
            ...cached.response,
            fromCache: true,
            cacheKey: cached.cacheKey,
            cachedAt: cached.timestamp
          };
        }
        return cached;
      }
    }

    const response = await requestFunction();

    if (!shouldBypassCache) {
      await this.set(taskType, input, response, options);
    }
    
    return response;
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isEnabled) {
      return { status: 'disabled' };
    }

    try {
      if (!this.client || !this.client.isOpen) {
        return { status: 'disconnected' };
      }

      await this.client.ping();
      return { status: 'connected' };
      
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

module.exports = ResponseCache;