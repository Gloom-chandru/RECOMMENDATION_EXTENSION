/**
 * Background Service Worker
 * Handles background tasks, alarms, and cross-tab communication
 */

// Initialize on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Background] Extension installed');
    
    // Open welcome page
    chrome.tabs.create({
      url: 'popup/popup.html?welcome=true'
    });

    // Initialize storage
    chrome.storage.local.get(['settings'], (result) => {
      if (!result.settings) {
        chrome.storage.local.set({
          settings: {
            enabled: true,
            autoTrack: true,
            showNotifications: true,
            maxHistoryItems: 20,
            recommendationCount: 6
          }
        });
      }
    });
  }

  if (details.reason === 'update') {
    console.log('[Background] Extension updated');
  }
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      console.log('[Background] Message received:', request.action);

      switch (request.action) {
        case 'getProfile':
          const profile = await getProfileSummary();
          sendResponse({ profile });
          break;

        case 'clearAllData':
          await chrome.storage.local.clear();
          sendResponse({ success: true });
          break;

        case 'getHistory':
          const history = await getHistory();
          sendResponse({ history });
          break;

        case 'getBookmarks':
          const bookmarks = await getBookmarks();
          sendResponse({ bookmarks });
          break;

        case 'exportData':
          const exported = await exportUserData();
          sendResponse({ data: exported });
          break;

        case 'getCacheStats':
          const stats = await getCacheStats();
          sendResponse({ stats });
          break;

        case 'clearCache':
          await clearCache();
          sendResponse({ success: true });
          break;

        case 'trackView':
          if (request.movie) {
            await trackMovieView(request.movie);
            sendResponse({ success: true });
          }
          break;

        case 'getAPIStatus':
          const status = {
            configured: API.isConfigured(),
            baseUrl: API.BASE_URL,
            timeout: API.TIMEOUT
          };
          sendResponse(status);
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Background] Error:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

/**
 * Get user profile summary
 * @returns {Promise<Object>}
 */
async function getProfileSummary() {
  try {
    const data = await chrome.storage.local.get([
      'user_history',
      'bookmarks',
      'genre_count'
    ]);

    const history = data.user_history || [];
    const bookmarks = data.bookmarks || [];
    const genreCount = data.genre_count || {};

    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    return {
      totalWatches: history.length,
      totalBookmarks: bookmarks.length,
      topGenres: topGenres,
      lastActivity: history[0]?.timestamp || null,
      accountCreated: data.account_created || Date.now()
    };
  } catch (error) {
    console.error('[Background] Error getting profile:', error);
    return null;
  }
}

/**
 * Get watch history
 * @returns {Promise<Array>}
 */
async function getHistory() {
  try {
    const data = await chrome.storage.local.get('user_history');
    return data.user_history || [];
  } catch (error) {
    console.error('[Background] Error getting history:', error);
    return [];
  }
}

/**
 * Get bookmarks
 * @returns {Promise<Array>}
 */
async function getBookmarks() {
  try {
    const data = await chrome.storage.local.get('bookmarks');
    return data.bookmarks || [];
  } catch (error) {
    console.error('[Background] Error getting bookmarks:', error);
    return [];
  }
}

/**
 * Export user data for backup
 * @returns {Promise<Object>}
 */
async function exportUserData() {
  try {
    const data = await chrome.storage.local.get();
    
    const userDataKeys = ['user_history', 'bookmarks', 'genre_count', 'settings'];
    const exportData = {};

    userDataKeys.forEach(key => {
      if (data[key]) {
        exportData[key] = data[key];
      }
    });

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: exportData
    };
  } catch (error) {
    console.error('[Background] Error exporting data:', error);
    return null;
  }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>}
 */
async function getCacheStats() {
  try {
    const data = await chrome.storage.local.get();
    
    const cacheItems = Object.entries(data).filter(([key]) => 
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
    console.error('[Background] Error getting cache stats:', error);
    return null;
  }
}

/**
 * Clear expired cache items
 * @returns {Promise<void>}
 */
async function clearCache() {
  try {
    const data = await chrome.storage.local.get();
    const now = Date.now();
    const keysToRemove = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('cache:') && value.expiresAt && value.expiresAt < now) {
        keysToRemove.push(key);
      }
    });

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`[Background] Cleared ${keysToRemove.length} expired cache items`);
    }
  } catch (error) {
    console.error('[Background] Error clearing cache:', error);
  }
}

/**
 * Track movie view
 * @param {Object} movie
 * @returns {Promise<void>}
 */
async function trackMovieView(movie) {
  try {
    const data = await chrome.storage.local.get(['user_history', 'genre_count']);
    
    let history = data.user_history || [];
    let genreCount = data.genre_count || {};

    const entry = {
      title: movie.title,
      tmdbId: movie.id,
      posterPath: movie.posterPath,
      timestamp: Date.now(),
      platform: movie.platform || 'unknown',
      genres: movie.genres || []
    };

    history.unshift(entry);
    history = history.slice(0, 20); // Keep last 20

    if (movie.genres) {
      movie.genres.forEach(genre => {
        const genreName = typeof genre === 'object' ? genre.name : genre;
        genreCount[genreName] = (genreCount[genreName] || 0) + 1;
      });
    }

    await chrome.storage.local.set({
      user_history: history,
      genre_count: genreCount
    });

    console.log('[Background] Movie tracked:', movie.title);
  } catch (error) {
    console.error('[Background] Error tracking movie:', error);
  }
}

/**
 * Set up periodic cache cleanup (every 6 hours)
 */
chrome.alarms.create('cleanupCache', { periodInMinutes: 360 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanupCache') {
    console.log('[Background] Running cache cleanup');
    clearCache();
  }
});

/**
 * Handle tab updates
 * Could be used for analytics or auto-tracking
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  const url = new URL(tab.url);
  const isSupported = url.hostname.includes('hotstar.com') || 
                     url.hostname.includes('primevideo.com');

  if (!isSupported) return;

  // Could emit notification that extension is ready on this tab
  console.log('[Background] Tab updated on supported platform:', url.hostname);
});

console.log('[Background] Service worker registered');
