/**
 * Response Cache Service
 * Caches common AI responses to reduce API costs and improve performance
 */

const { query } = require('../../config/database');
const crypto = require('crypto');

class ResponseCache {
  constructor() {
    this.enabled = process.env.AI_ENABLE_CACHING !== 'false';
    this.defaultTTL = parseInt(process.env.AI_CACHE_TTL) || 3600; // 1 hour default
    this.inMemoryCache = new Map();
    this.maxInMemorySize = 100;
  }

  /**
   * Generate cache key from request
   * @param {String} message
   * @param {Object} context
   * @returns {String}
   */
  generateKey(message, context = {}) {
    // Create a normalized key that ignores user-specific data for common queries
    const normalized = message.toLowerCase().trim();
    const contextKey = context.intent || 'general';
    
    return crypto
      .createHash('sha256')
      .update(`${contextKey}:${normalized}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Get cached response
   * @param {String} message
   * @param {Object} context
   * @returns {Promise<Object|null>}
   */
  async get(message, context = {}) {
    if (!this.enabled) return null;

    const cacheKey = this.generateKey(message, context);

    // Try in-memory cache first
    if (this.inMemoryCache.has(cacheKey)) {
      const cached = this.inMemoryCache.get(cacheKey);
      if (cached.expiresAt > Date.now()) {
        console.log('💨 Cache HIT (memory):', cacheKey);
        await this.incrementAccessCount(cacheKey);
        return cached.response;
      } else {
        this.inMemoryCache.delete(cacheKey);
      }
    }

    // Try database cache
    try {
      const result = await query(`
        SELECT response, model_tier, created_at
        FROM ai_response_cache
        WHERE cache_key = $1
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        LIMIT 1
      `, [cacheKey]);

      if (result.rows.length > 0) {
        console.log('💨 Cache HIT (database):', cacheKey);
        const cached = result.rows[0];
        
        // Update access count
        await this.incrementAccessCount(cacheKey);
        
        // Store in memory for faster future access
        this.storeInMemory(cacheKey, cached.response);
        
        return cached.response;
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    console.log('❌ Cache MISS:', cacheKey);
    return null;
  }

  /**
   * Store response in cache
   * @param {String} message
   * @param {Object} response
   * @param {Object} context
   * @param {Number} ttl - Time to live in seconds
   * @returns {Promise<Boolean>}
   */
  async set(message, response, context = {}, ttl = null) {
    if (!this.enabled) return false;

    const cacheKey = this.generateKey(message, context);
    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : new Date(Date.now() + this.defaultTTL * 1000);

    // Store in memory
    this.storeInMemory(cacheKey, response, expiresAt.getTime());

    // Store in database
    try {
      await query(`
        INSERT INTO ai_response_cache (cache_key, response, model_tier, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cache_key) 
        DO UPDATE SET 
          response = EXCLUDED.response,
          expires_at = EXCLUDED.expires_at,
          accessed_count = ai_response_cache.accessed_count + 1,
          last_accessed_at = CURRENT_TIMESTAMP
      `, [cacheKey, response, context.modelTier || 'unknown', expiresAt]);

      console.log('💾 Cached response:', cacheKey);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Store in memory cache
   * @param {String} key
   * @param {Object} response
   * @param {Number} expiresAt
   */
  storeInMemory(key, response, expiresAt = null) {
    // Limit memory cache size
    if (this.inMemoryCache.size >= this.maxInMemorySize) {
      const firstKey = this.inMemoryCache.keys().next().value;
      this.inMemoryCache.delete(firstKey);
    }

    this.inMemoryCache.set(key, {
      response,
      expiresAt: expiresAt || Date.now() + this.defaultTTL * 1000
    });
  }

  /**
   * Increment access count
   * @param {String} cacheKey
   */
  async incrementAccessCount(cacheKey) {
    try {
      await query(`
        UPDATE ai_response_cache
        SET accessed_count = accessed_count + 1,
            last_accessed_at = CURRENT_TIMESTAMP
        WHERE cache_key = $1
      `, [cacheKey]);
    } catch (error) {
      // Non-critical, don't throw
      console.warn('Failed to update cache access count:', error.message);
    }
  }

  /**
   * Invalidate cache for specific key or pattern
   * @param {String} pattern
   * @returns {Promise<Number>}
   */
  async invalidate(pattern) {
    try {
      const result = await query(`
        DELETE FROM ai_response_cache
        WHERE cache_key LIKE $1
        RETURNING id
      `, [`%${pattern}%`]);

      // Clear from memory too
      for (const [key] of this.inMemoryCache) {
        if (key.includes(pattern)) {
          this.inMemoryCache.delete(key);
        }
      }

      console.log(`🗑️  Invalidated ${result.rowCount} cache entries matching: ${pattern}`);
      return result.rowCount;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return 0;
    }
  }

  /**
   * Clean up expired entries
   * @returns {Promise<Number>}
   */
  async cleanupExpired() {
    try {
      const result = await query(`
        DELETE FROM ai_response_cache
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING id
      `);

      // Clean memory cache
      const now = Date.now();
      for (const [key, value] of this.inMemoryCache) {
        if (value.expiresAt < now) {
          this.inMemoryCache.delete(key);
        }
      }

      console.log(`🧹 Cleaned up ${result.rowCount} expired cache entries`);
      return result.rowCount;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(accessed_count) as total_accesses,
          AVG(accessed_count) as avg_accesses,
          MAX(accessed_count) as max_accesses,
          COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_entries,
          COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_entries
        FROM ai_response_cache
      `);

      const topCached = await query(`
        SELECT 
          cache_key,
          accessed_count,
          created_at,
          last_accessed_at
        FROM ai_response_cache
        WHERE expires_at > CURRENT_TIMESTAMP
        ORDER BY accessed_count DESC
        LIMIT 10
      `);

      return {
        database: result.rows[0],
        memory: {
          size: this.inMemoryCache.size,
          maxSize: this.maxInMemorySize
        },
        enabled: this.enabled,
        topCached: topCached.rows
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        database: {},
        memory: { size: this.inMemoryCache.size },
        enabled: this.enabled,
        error: error.message
      };
    }
  }

  /**
   * Check if response should be cached
   * Determines cacheability based on request type
   * @param {Object} analysis
   * @returns {Boolean}
   */
  shouldCache(analysis) {
    // Don't cache user-specific queries
    const nonCacheable = [
      'add_pantry_item',
      'check_pantry',
      'meal_planning',
      'create_grocery_list'
    ];

    if (nonCacheable.includes(analysis.intent)) {
      return false;
    }

    // Cache general queries and simple facts
    const cacheable = [
      'greeting',
      'nutrition_info',
      'cooking_help',
      'recipe_suggestion',
      'general_query'
    ];

    return cacheable.includes(analysis.intent);
  }

  /**
   * Clear all cache
   * @returns {Promise<Boolean>}
   */
  async clearAll() {
    try {
      await query(`DELETE FROM ai_response_cache`);
      this.inMemoryCache.clear();
      console.log('🗑️  Cleared all cache');
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }
}

module.exports = new ResponseCache();
