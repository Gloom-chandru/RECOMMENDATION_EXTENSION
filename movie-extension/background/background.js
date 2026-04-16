/**
 * Background Service Worker
 * Handles background tasks, alarms, and cross-tab communication
 */

// Import shared utility modules
importScripts('../utils/cache.js', '../utils/api.js', '../utils/storage.js', '../utils/recommender.js');

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
          const profile = await Storage.getProfileSummary();
          sendResponse({ profile });
          break;

        case 'clearAllData':
          await chrome.storage.local.clear();
          sendResponse({ success: true });
          break;

        case 'getHistory':
          const history = await Storage.getHistory();
          sendResponse({ history });
          break;

        case 'getBookmarks':
          const bookmarks = await Storage.getBookmarks();
          sendResponse({ bookmarks });
          break;

        case 'exportData':
          const exported = await Storage.exportData();
          sendResponse({ data: exported });
          break;

        case 'getCacheStats':
          const stats = await Cache.getStats();
          sendResponse({ stats });
          break;

        case 'clearCache':
          await Cache.clearAll();
          sendResponse({ success: true });
          break;

        case 'trackView':
          if (request.movie) {
            await Storage.addToHistory(request.movie);
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
 * Set up periodic cache cleanup (every 6 hours)
 */
chrome.alarms.create('cleanupCache', { periodInMinutes: 360 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanupCache') {
    console.log('[Background] Running cache cleanup');
    Cache.clearAll();
  }
});

/**
 * Handle tab updates
 * Could be used for analytics or auto-tracking
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  // tab.url can be undefined if we don't have permissions
  if (!tab.url) return;

  try {
    const url = new URL(tab.url);
    const isSupported = url.hostname.includes('hotstar.com') || 
                       url.hostname.includes('primevideo.com');

    if (!isSupported) return;

    // Could emit notification that extension is ready on this tab
    console.log('[Background] Tab updated on supported platform:', url.hostname);
  } catch (error) {
    // Ignore invalid URLs
  }
});

console.log('[Background] Service worker registered');
