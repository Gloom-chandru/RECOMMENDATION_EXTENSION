/**
 * Cache Manager
 * Stores API responses with TTL to reduce API calls
 */

const Cache = {
  // Default TTL: 24 hours in milliseconds
  DEFAULT_TTL: 24 * 60 * 60 * 1000,

  /**
   * Generate cache key from parameters
   * @param {string} type - Cache type (e.g., 'movie', 'recommendations')
   * @param {string} key - Identifier
   * @returns {string}
   */
  _generateKey(type, key) {
    return `cache:${type}:${key.toLowerCase().replace(/\s+/g, '-')}`;
  },

  /**
   * Get item from cache
   * Returns null if expired or missing
   * @param {string} type
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(type, key) {
    try {
      const cacheKey = this._generateKey(type, key);
      const data = await chrome.storage.local.get(cacheKey);
      
      if (!data[cacheKey]) return null;

      const cached = data[cacheKey];
      const now = Date.now();

      // Check if expired
      if (cached.expiresAt && cached.expiresAt < now) {
        await this.remove(type, key);
        return null;
      }

      return cached.value;
    } catch (error) {
      console.error('[Cache] Error getting item:', error);
      return null;
    }
  },

  /**
   * Set item in cache with TTL
   * @param {string} type
   * @param {string} key
   * @param {any} value
   * @param {number} ttl - TTL in milliseconds (default: 24h)
   * @returns {Promise<void>}
   */
  async set(type, key, value, ttl = this.DEFAULT_TTL) {
    try {
      const cacheKey = this._generateKey(type, key);
      const expiresAt = Date.now() + ttl;

      await chrome.storage.local.set({
        [cacheKey]: {
          value,
          expiresAt,
          createdAt: Date.now()
        }
      });
    } catch (error) {
      console.error('[Cache] Error setting item:', error);
    }
  },

  /**
   * Remove item from cache
   * @param {string} type
   * @param {string} key
   * @returns {Promise<void>}
   */
  async remove(type, key) {
    try {
      const cacheKey = this._generateKey(type, key);
      await chrome.storage.local.remove(cacheKey);
    } catch (error) {
      console.error('[Cache] Error removing item:', error);
    }
  },

  /**
   * Clear all cache items of a specific type
   * @param {string} type
   * @returns {Promise<void>}
   */
  async clearType(type) {
    try {
      const allData = await chrome.storage.local.get();
      const keysToRemove = Object.keys(allData).filter(key => 
        key.startsWith(`cache:${type}:`)
      );
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
    } catch (error) {
      console.error('[Cache] Error clearing cache type:', error);
    }
  },

  /**
   * Clear all cache
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      const allData = await chrome.storage.local.get();
      const keysToRemove = Object.keys(allData).filter(key => 
        key.startsWith('cache:')
      );
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
    } catch (error) {
      console.error('[Cache] Error clearing all cache:', error);
    }
  },

  /**
   * Get cache statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheItems = Object.entries(allData).filter(([key]) => 
        key.startsWith('cache:')
      );

      let totalSize = 0;
      let expiredCount = 0;
      const now = Date.now();

      cacheItems.forEach(([, item]) => {
        totalSize += JSON.stringify(item).length;
        if (item.expiresAt && item.expiresAt < now) {
          expiredCount++;
        }
      });

      return {
        totalItems: cacheItems.length,
        totalSize: totalSize,
        expiredItems: expiredCount,
        timestamp: now
      };
    } catch (error) {
      console.error('[Cache] Error getting stats:', error);
      return null;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Cache;
}
