/**
 * Content Script
 * Runs on streaming platform pages
 * Detects movies, tracks history, and shows recommendations
 */

// Global state
let lastTrackedMovie = null;
let movieTitleObserver = null;
let extensionEnabled = true;
let debounceTimer = null;

/**
 * Initialize content script
 * Sets up platform detection and observers
 */
async function init() {
  try {
    console.log('[Content] Initializing on', window.location.hostname);

    // Initialize storage
    await Storage.init();

    // Check if extension is enabled
    const settings = await Storage.getSettings();
    extensionEnabled = settings.enabled !== false;

    if (!extensionEnabled) {
      console.log('[Content] Extension is disabled');
      return;
    }

    // Check if on supported platform
    const platform = PlatformDetectors.getCurrentPlatform();
    if (!platform) {
      console.log('[Content] Not on supported platform');
      return;
    }

    // Initialize overlay
    Overlay.init();

    // Set up movie detection
    setupMovieDetection();

    // Listen for settings changes
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(handleMessages);

    console.log('[Content] Ready on', platform);
  } catch (error) {
    console.error('[Content] Initialization error:', error);
  }
}

/**
 * Set up movie detection and tracking
 */
function setupMovieDetection() {
  // Check if currently on movie detail page
  if (PlatformDetectors.isMovieDetailPage()) {
    const title = PlatformDetectors.extractMovieTitle();
    if (title) {
      handleMovieDetected(title);
    }
  }

  // Watch for page transitions
  movieTitleObserver = PlatformDetectors.observeTitleChanges((title) => {
    if (title && title !== lastTrackedMovie) {
      handleMovieDetected(title);
    }
  });

  // Also watch for navigation
  window.addEventListener('hashchange', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (PlatformDetectors.isMovieDetailPage()) {
        const title = PlatformDetectors.extractMovieTitle();
        if (title && title !== lastTrackedMovie) {
          handleMovieDetected(title);
        }
      }
    }, 800);
  });

  window.addEventListener('popstate', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (PlatformDetectors.isMovieDetailPage()) {
        const title = PlatformDetectors.extractMovieTitle();
        if (title && title !== lastTrackedMovie) {
          handleMovieDetected(title);
        }
      }
    }, 800);
  });
}

/**
 * Handle when movie is detected
 * @param {string} movieTitle
 */
async function handleMovieDetected(movieTitle) {
  try {
    console.log('[Content] Movie detected:', movieTitle);
    lastTrackedMovie = movieTitle;

    // Fetch movie details from TMDb
    const movieData = await API.searchMovie(movieTitle);

    if (!movieData) {
      console.warn('[Content] Could not find movie details:', movieTitle);
      return;
    }

    // Fetch full details to get genre names (searchMovie only returns genre_ids)
    let fullDetails = null;
    if (movieData.id) {
      fullDetails = await API.getMovieDetails(movieData.id);
    }

    // Add to history with full genre names
    const movieWithPlatform = {
      ...movieData,
      genres: fullDetails?.genres || movieData.genres,
      platform: PlatformDetectors.getCurrentPlatform()
    };

    await Storage.addToHistory(movieWithPlatform);

    // Show overlay with recommendations
    if (extensionEnabled) {
      Overlay.show();
    }
  } catch (error) {
    console.error('[Content] Error handling movie detection:', error);
  }
}

/**
 * Handle storage changes (settings updates)
 * @param {Object} changes
 * @param {string} areaName
 */
async function handleStorageChange(changes, areaName) {
  if (areaName !== 'local') return;

  // Check if settings changed
  if (changes.settings) {
    const newSettings = changes.settings.newValue;
    extensionEnabled = newSettings.enabled !== false;

    if (!extensionEnabled && Overlay.isVisible) {
      Overlay.hide();
    }
  }

  // Check if history was cleared
  if (changes.user_history && changes.user_history.newValue === undefined) {
    lastTrackedMovie = null;
    console.log('[Content] History cleared');
  }
}

/**
 * Handle messages from popup/background
 * @param {Object} message
 * @param {Object} sender
 * @param {Function} sendResponse
 */
function handleMessages(message, sender, sendResponse) {
  (async () => {
    try {
      switch (message.action) {
        case 'getMovieStatus':
          const isOnMovie = PlatformDetectors.isMovieDetailPage();
          const title = isOnMovie ? PlatformDetectors.extractMovieTitle() : null;
          
          sendResponse({
            onMoviePage: isOnMovie,
            currentMovie: title,
            platform: PlatformDetectors.getCurrentPlatform()
          });
          break;

        case 'showRecommendations':
          Overlay.show();
          sendResponse({ success: true });
          break;

        case 'hideRecommendations':
          Overlay.hide();
          sendResponse({ success: true });
          break;

        case 'getRecommendations':
          const recs = await Recommender.getRecommendations();
          sendResponse({ recommendations: recs });
          break;

        case 'trackMovie':
          if (message.movie) {
            await Storage.addToHistory(message.movie);
            sendResponse({ success: true });
          }
          break;

        case 'toggleExtension':
          extensionEnabled = !extensionEnabled;
          await Storage.updateSettings({ enabled: extensionEnabled });
          sendResponse({ enabled: extensionEnabled });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Content] Message handling error:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true; // Keep channel open for async response
}

/**
 * Add keyboard shortcut to toggle overlay
 */
document.addEventListener('keydown', (e) => {
  // Alt + R to toggle recommendations
  if (e.altKey && e.key === 'r' && extensionEnabled) {
    e.preventDefault();
    Overlay.toggle();
  }
});

/**
 * Clean up on page unload
 */
window.addEventListener('beforeunload', () => {
  if (movieTitleObserver) {
    movieTitleObserver.disconnect();
  }
  clearTimeout(debounceTimer);
  Overlay.hide();
});

/**
 * Start the extension
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[Content] Script loaded');
