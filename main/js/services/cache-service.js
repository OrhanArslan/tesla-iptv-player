/**
 * Cache Service
 * Handles caching of API responses and content
 */

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.maxSize = CONFIG.CACHE.MAX_SIZE;
    this.ttl = CONFIG.CACHE.TTL;
    this.enabled = CONFIG.CACHE.ENABLED;
  }

  /**
   * Get cache key
   */
  getCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');

    return `${endpoint}${paramString ? '|' + paramString : ''}`;
  }

  /**
   * Set cache
   */
  set(endpoint, data, params = {}) {
    if (!this.enabled) return;

    const key = this.getCacheKey(endpoint, params);
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.ttl,
    };

    this.memoryCache.set(key, cacheEntry);
    this.storeToLocalStorage(key, cacheEntry);
  }

  /**
   * Get from cache
   */
  get(endpoint, params = {}) {
    if (!this.enabled) return null;

    const key = this.getCacheKey(endpoint, params);

    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      if (this.isValid(entry)) {
        return entry.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check localStorage
    const stored = this.getFromLocalStorage(key);
    if (stored && this.isValid(stored)) {
      this.memoryCache.set(key, stored);
      return stored.data;
    }

    return null;
  }

  /**
   * Check if cache entry is valid
   */
  isValid(entry) {
    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }

  /**
   * Store to localStorage
   */
  storeToLocalStorage(key, entry) {
    try {
      const serialized = JSON.stringify(entry);
      if (this.getLocalStorageSize() + serialized.length < this.maxSize) {
        storageService.set(`cache_${key}`, entry);
      }
    } catch (e) {
      console.warn('Cache storage failed:', e);
    }
  }

  /**
   * Get from localStorage
   */
  getFromLocalStorage(key) {
    try {
      return storageService.get(`cache_${key}`, null);
    } catch (e) {
      return null;
    }
  }

  /**
   * Remove from cache
   */
  remove(endpoint, params = {}) {
    const key = this.getCacheKey(endpoint, params);
    this.memoryCache.delete(key);
    storageService.remove(`cache_${key}`);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.memoryCache.clear();
    const keys = storageService.getAllKeys();
    keys.forEach(key => {
      if (key.includes('cache_')) {
        storageService.remove(key);
      }
    });
  }

  /**
   * Get cache hits count
   */
  getCacheStats() {
    return {
      memoryItems: this.memoryCache.size,
      maxSize: this.maxSize,
      enabled: this.enabled,
    };
  }

  /**
   * Get localStorage cache size
   */
  getLocalStorageSize() {
    let size = 0;
    const keys = storageService.getAllKeys();
    keys.forEach(key => {
      if (key.includes('cache_')) {
        const item = localStorage.getItem(key);
        if (item) {
          size += item.length;
        }
      }
    });
    return size;
  }

  /**
   * Cache wrapper for API calls
   */
  async withCache(endpoint, apiFn, params = {}, cacheTime = null) {
    // Check cache first
    const cached = this.get(endpoint, params);
    if (cached) {
      console.log(`Cache hit for ${endpoint}`);
      return cached;
    }

    try {
      // Make API call if not cached
      const data = await apiFn();
      
      // Store in cache
      if (cacheTime) {
        const entry = {
          data,
          timestamp: Date.now(),
          ttl: cacheTime,
        };
        this.memoryCache.set(this.getCacheKey(endpoint, params), entry);
        this.storeToLocalStorage(this.getCacheKey(endpoint, params), entry);
      } else {
        this.set(endpoint, data, params);
      }

      return data;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Preload cache for offline mode
   */
  async preloadCache() {
    try {
      if (!apiService.isReady()) return false;

      // Cache live categories and streams
      const liveCategories = await apiService.getLiveCategories();
      this.set(CONFIG.XTREAM_ENDPOINTS.GET_LIVE_CATEGORIES, liveCategories);

      // Cache VOD categories
      const vodCategories = await apiService.getVodCategories();
      this.set(CONFIG.XTREAM_ENDPOINTS.GET_VOD_CATEGORIES, vodCategories);

      // Cache series categories
      const seriesCategories = await apiService.getSeriesCategories();
      this.set(CONFIG.XTREAM_ENDPOINTS.GET_SERIES_CATEGORIES, seriesCategories);

      return true;
    } catch (error) {
      console.error('Preload cache failed:', error);
      return false;
    }
  }

  /**
   * Invalidate specific cache
   */
  invalidate(pattern) {
    const keysToDelete = [];
    this.memoryCache.forEach((value, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
    });
  }
}
