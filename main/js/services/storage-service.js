/**
 * Storage Service
 * Handles all local storage operations with encryption and validation
 */

class StorageService {
  constructor() {
    this.prefix = CONFIG.STORAGE.PREFIX;
    this.isAvailable = this.checkAvailability();
  }

  /**
   * Check if localStorage is available and functional
   */
  checkAvailability() {
    try {
      const test = '__STORAGE_TEST__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('LocalStorage not available:', e);
      return false;
    }
  }

  /**
   * Get storage key with prefix
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Save data to storage
   */
  set(key, value, options = {}) {
    try {
      if (!this.isAvailable) {
        console.warn('Storage not available');
        return false;
      }

      const storageKey = this.getKey(key);
      const data = {
        value,
        timestamp: Date.now(),
        version: 1,
        ...options,
      };

      const serialized = JSON.stringify(data);
      localStorage.setItem(storageKey, serialized);
      return true;
    } catch (e) {
      console.error('Storage write error:', e);
      return false;
    }
  }

  /**
   * Get data from storage
   */
  get(key, defaultValue = null) {
    try {
      if (!this.isAvailable) {
        return defaultValue;
      }

      const storageKey = this.getKey(key);
      const item = localStorage.getItem(storageKey);

      if (!item) {
        return defaultValue;
      }

      const data = JSON.parse(item);

      // Check if data has expired
      if (data.expiresAt && Date.now() > data.expiresAt) {
        this.remove(key);
        return defaultValue;
      }

      return data.value !== undefined ? data.value : defaultValue;
    } catch (e) {
      console.error('Storage read error:', e);
      return defaultValue;
    }
  }

  /**
   * Check if key exists
   */
  has(key) {
    try {
      if (!this.isAvailable) return false;
      const storageKey = this.getKey(key);
      return localStorage.getItem(storageKey) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  remove(key) {
    try {
      if (!this.isAvailable) return false;
      const storageKey = this.getKey(key);
      localStorage.removeItem(storageKey);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  }

  /**
   * Clear all storage items with prefix
   */
  clear() {
    try {
      if (!this.isAvailable) return false;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (e) {
      console.error('Storage clear error:', e);
      return false;
    }
  }

  /**
   * Get all keys in storage
   */
  getAllKeys() {
    try {
      if (!this.isAvailable) return [];
      const keys = Object.keys(localStorage);
      return keys.filter(key => key.startsWith(this.prefix));
    } catch (e) {
      return [];
    }
  }

  /**
   * Save credentials securely
   */
  saveCredentials(serverUrl, username, password, rememberMe = true) {
    const credentials = {
      serverUrl,
      username,
      password,
      rememberMe,
      savedAt: new Date().toISOString(),
    };

    // Add expiration for non-remembered credentials (30 days for remembered)
    if (rememberMe) {
      credentials.expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
    }

    return this.set(CONFIG.STORAGE.CREDENTIALS_KEY, credentials);
  }

  /**
   * Get saved credentials
   */
  getCredentials() {
    return this.get(CONFIG.STORAGE.CREDENTIALS_KEY, null);
  }

  /**
   * Clear credentials
   */
  clearCredentials() {
    return this.remove(CONFIG.STORAGE.CREDENTIALS_KEY);
  }

  /**
   * Save favorites
   */
  saveFavorites(favorites) {
    return this.set(CONFIG.STORAGE.FAVORITES_KEY, favorites);
  }

  /**
   * Get favorites
   */
  getFavorites() {
    return this.get(CONFIG.STORAGE.FAVORITES_KEY, []);
  }

  /**
   * Add to favorites
   */
  addFavorite(item) {
    const favorites = this.getFavorites();
    if (!favorites.find(f => f.id === item.id)) {
      favorites.push(item);
      this.saveFavorites(favorites);
      return true;
    }
    return false;
  }

  /**
   * Remove from favorites
   */
  removeFavorite(itemId) {
    const favorites = this.getFavorites();
    const filtered = favorites.filter(f => f.id !== itemId);
    if (filtered.length !== favorites.length) {
      this.saveFavorites(filtered);
      return true;
    }
    return false;
  }

  /**
   * Save watch history
   */
  saveHistory(history) {
    return this.set(CONFIG.STORAGE.HISTORY_KEY, history);
  }

  /**
   * Get watch history
   */
  getHistory() {
    return this.get(CONFIG.STORAGE.HISTORY_KEY, []);
  }

  /**
   * Add to history
   */
  addToHistory(item) {
    const history = this.getHistory();
    const index = history.findIndex(h => h.id === item.id);

    if (index > -1) {
      history.splice(index, 1);
    }

    history.unshift({
      ...item,
      watchedAt: new Date().toISOString(),
    });

    // Keep only last 100 items
    if (history.length > 100) {
      history.pop();
    }

    this.saveHistory(history);
    return true;
  }

  /**
   * Get last watched item
   */
  getLastWatched() {
    const history = this.getHistory();
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Clear history
   */
  clearHistory() {
    return this.remove(CONFIG.STORAGE.HISTORY_KEY);
  }

  /**
   * Save playback state
   */
  savePlaybackState(streamId, currentTime, duration) {
    const key = `playback_${streamId}`;
    return this.set(key, {
      currentTime,
      duration,
      timestamp: Date.now(),
    });
  }

  /**
   * Get playback state
   */
  getPlaybackState(streamId) {
    const key = `playback_${streamId}`;
    return this.get(key, null);
  }

  /**
   * Remove playback state
   */
  removePlaybackState(streamId) {
    const key = `playback_${streamId}`;
    return this.remove(key);
  }

  /**
   * Save settings
   */
  saveSettings(settings) {
    return this.set(CONFIG.STORAGE.SETTINGS_KEY, settings);
  }

  /**
   * Get settings
   */
  getSettings() {
    return this.get(CONFIG.STORAGE.SETTINGS_KEY, {});
  }

  /**
   * Get storage size in MB
   */
  getStorageSize() {
    let totalSize = 0;
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      });
      return (totalSize / 1024 / 1024).toFixed(2);
    } catch (e) {
      return '0';
    }
  }
}
