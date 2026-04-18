/**
 * Storage Manager
 * Manages user profile, history, bookmarks, and settings
 * All data stored in chrome.storage.local (privacy-first)
 */

const Storage = {
  // Storage keys
  KEYS: {
    HISTORY: 'user_history',
    GENRE_COUNT: 'genre_count',
    BOOKMARKS: 'bookmarks',
    SETTINGS: 'settings',
    LAST_UPDATED: 'last_updated'
  },

  // Default settings
  DEFAULT_SETTINGS: {
    enabled: true,
    autoTrack: true,
    showNotifications: true,
    maxHistoryItems: 20,
    recommendationCount: 6
  },

  /**
   * Initialize storage with defaults if empty
   * @returns {Promise<void>}
   */
  async init() {
    try {
      const data = await chrome.storage.local.get(Object.values(this.KEYS));
      
      if (!data[this.KEYS.HISTORY]) {
        await chrome.storage.local.set({
          [this.KEYS.HISTORY]: [],
          [this.KEYS.GENRE_COUNT]: {},
          [this.KEYS.BOOKMARKS]: [],
          [this.KEYS.SETTINGS]: this.DEFAULT_SETTINGS,
          [this.KEYS.LAST_UPDATED]: Date.now()
        });
      }
    } catch (error) {
      console.error('[Storage] Initialization error:', error);
    }
  },

  /**
   * Add movie to watch history
   * Automatically tracks genre and timestamp
   * @param {Object} movie
   * @returns {Promise<void>}
   */
  async addToHistory(movie) {
    try {
      if (!movie || !movie.title) {
        console.warn('[Storage] Invalid movie object');
        return;
      }

      const data = await chrome.storage.local.get([
        this.KEYS.HISTORY,
        this.KEYS.GENRE_COUNT,
        this.KEYS.SETTINGS
      ]);

      let history = data[this.KEYS.HISTORY] || [];
      let genreCount = data[this.KEYS.GENRE_COUNT] || {};
      const settings = data[this.KEYS.SETTINGS] || this.DEFAULT_SETTINGS;

      // Create history entry
      const historyEntry = {
        title: movie.title,
        genres: movie.genres || [],
        tmdbId: movie.id,
        posterPath: movie.posterPath,
        originalLanguage: movie.originalLanguage || null,
        spokenLanguages: Array.isArray(movie.spokenLanguages) ? movie.spokenLanguages : [],
        timestamp: Date.now(),
        platform: movie.platform || 'unknown',
        rating: movie.rating || 0
      };

      // Check if already in history (avoid duplicates by tmdbId)
      const existingIndex = history.findIndex(
        h => h.tmdbId && movie.id && h.tmdbId === movie.id
      );

      if (existingIndex !== -1) {
        // Update timestamp for existing entry (move to top)
        history.splice(existingIndex, 1);
        history.unshift(historyEntry);
      } else {
        history.unshift(historyEntry);
      }

      // Limit history size
      const maxItems = settings.maxHistoryItems || 20;
      history = history.slice(0, maxItems);

      // Update genre count
      if (movie.genres && Array.isArray(movie.genres)) {
        movie.genres.forEach(genre => {
          if (typeof genre === 'object' && genre.name) {
            genreCount[genre.name] = (genreCount[genre.name] || 0) + 1;
          }
        });
      }

      await chrome.storage.local.set({
        [this.KEYS.HISTORY]: history,
        [this.KEYS.GENRE_COUNT]: genreCount,
        [this.KEYS.LAST_UPDATED]: Date.now()
      });

      console.log('[Storage] Movie added to history:', movie.title);
    } catch (error) {
      console.error('[Storage] Error adding to history:', error);
    }
  },

  /**
   * Get watch history
   * @returns {Promise<Array>}
   */
  async getHistory() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.HISTORY);
      return data[this.KEYS.HISTORY] || [];
    } catch (error) {
      console.error('[Storage] Error getting history:', error);
      return [];
    }
  },

  /**
   * Get genre frequency count
   * @returns {Promise<Object>}
   */
  async getGenreCount() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.GENRE_COUNT);
      return data[this.KEYS.GENRE_COUNT] || {};
    } catch (error) {
      console.error('[Storage] Error getting genre count:', error);
      return {};
    }
  },

  /**
   * Get top N genres by frequency
   * @param {number} count
   * @returns {Promise<Array>}
   */
  async getTopGenres(count = 5) {
    try {
      const genreCount = await this.getGenreCount();
      
      return Object.entries(genreCount)
        .map(([genre, freq]) => ({ genre, frequency: freq }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, count)
        .map(item => item.genre);
    } catch (error) {
      console.error('[Storage] Error getting top genres:', error);
      return [];
    }
  },

  /**
   * Add movie to bookmarks
   * @param {Object} movie
   * @returns {Promise<void>}
   */
  async addBookmark(movie) {
    try {
      const data = await chrome.storage.local.get(this.KEYS.BOOKMARKS);
      let bookmarks = data[this.KEYS.BOOKMARKS] || [];

      // Avoid duplicates
      if (!bookmarks.some(b => b.id === movie.id || b.title === movie.title)) {
        bookmarks.push({
          id: movie.id,
          title: movie.title,
          posterPath: movie.posterPath,
          rating: movie.rating,
          genres: movie.genres,
          timestamp: Date.now()
        });

        await chrome.storage.local.set({
          [this.KEYS.BOOKMARKS]: bookmarks
        });

        console.log('[Storage] Bookmark added:', movie.title);
      }
    } catch (error) {
      console.error('[Storage] Error adding bookmark:', error);
    }
  },

  /**
   * Remove bookmark
   * @param {number|string} movieId
   * @returns {Promise<void>}
   */
  async removeBookmark(movieId) {
    try {
      const data = await chrome.storage.local.get(this.KEYS.BOOKMARKS);
      let bookmarks = data[this.KEYS.BOOKMARKS] || [];

      bookmarks = bookmarks.filter(b => b.id !== movieId);

      await chrome.storage.local.set({
        [this.KEYS.BOOKMARKS]: bookmarks
      });

      console.log('[Storage] Bookmark removed:', movieId);
    } catch (error) {
      console.error('[Storage] Error removing bookmark:', error);
    }
  },

  /**
   * Get all bookmarks
   * @returns {Promise<Array>}
   */
  async getBookmarks() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.BOOKMARKS);
      return data[this.KEYS.BOOKMARKS] || [];
    } catch (error) {
      console.error('[Storage] Error getting bookmarks:', error);
      return [];
    }
  },

  /**
   * Get settings
   * @returns {Promise<Object>}
   */
  async getSettings() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.SETTINGS);
      return { ...this.DEFAULT_SETTINGS, ...data[this.KEYS.SETTINGS] };
    } catch (error) {
      console.error('[Storage] Error getting settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  },

  /**
   * Update settings
   * @param {Object} updates
   * @returns {Promise<void>}
   */
  async updateSettings(updates) {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...updates };

      await chrome.storage.local.set({
        [this.KEYS.SETTINGS]: updated
      });

      console.log('[Storage] Settings updated:', updates);
    } catch (error) {
      console.error('[Storage] Error updating settings:', error);
    }
  },

  /**
   * Clear all user data
   * @returns {Promise<void>}
   */
  async clearAllData() {
    try {
      await chrome.storage.local.remove([
        this.KEYS.HISTORY,
        this.KEYS.GENRE_COUNT,
        this.KEYS.BOOKMARKS
      ]);

      console.log('[Storage] All user data cleared');
    } catch (error) {
      console.error('[Storage] Error clearing data:', error);
    }
  },

  /**
   * Get user profile summary
   * @returns {Promise<Object>}
   */
  async getProfileSummary() {
    try {
      const history = await this.getHistory();
      const bookmarks = await this.getBookmarks();
      const topGenres = await this.getTopGenres();

      return {
        historyCount: history.length,
        bookmarkCount: bookmarks.length,
        topGenres: topGenres,
        lastActivity: history[0]?.timestamp || null
      };
    } catch (error) {
      console.error('[Storage] Error getting profile summary:', error);
      return {
        historyCount: 0,
        bookmarkCount: 0,
        topGenres: [],
        lastActivity: null
      };
    }
  },

  /**
   * Export user data (for backup)
   * @returns {Promise<Object>}
   */
  async exportData() {
    try {
      const data = await chrome.storage.local.get();
      const userDataKeys = Object.values(this.KEYS);
      
      const exportData = {};
      userDataKeys.forEach(key => {
        if (data[key]) {
          exportData[key] = data[key];
        }
      });

      return {
        version: '1.0.0',
        exportedAt: Date.now(),
        data: exportData
      };
    } catch (error) {
      console.error('[Storage] Error exporting data:', error);
      return null;
    }
  },

  /**
   * Import user data (from backup)
   * @param {Object} backup
   * @returns {Promise<void>}
   */
  async importData(backup) {
    try {
      if (!backup || typeof backup !== 'object' || !backup.data || typeof backup.data !== 'object') {
        throw new Error('Invalid backup format: missing or malformed data');
      }

      const userDataKeys = Object.values(this.KEYS);
      const importData = {};

      // Validate and sanitize each key
      userDataKeys.forEach(key => {
        if (backup.data[key] !== undefined) {
          const value = backup.data[key];

          // Type validation per key
          if (key === this.KEYS.HISTORY && !Array.isArray(value)) return;
          if (key === this.KEYS.BOOKMARKS && !Array.isArray(value)) return;
          if (key === this.KEYS.GENRE_COUNT && typeof value !== 'object') return;
          if (key === this.KEYS.SETTINGS && typeof value !== 'object') return;

          // Limit array sizes to prevent storage abuse
          if (Array.isArray(value)) {
            importData[key] = value.slice(0, 100);
          } else {
            importData[key] = value;
          }
        }
      });

      if (Object.keys(importData).length === 0) {
        throw new Error('No valid data found in backup');
      }

      await chrome.storage.local.set(importData);
      console.log('[Storage] Data imported successfully');
    } catch (error) {
      console.error('[Storage] Error importing data:', error);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
