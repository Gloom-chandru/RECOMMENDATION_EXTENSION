/**
 * Content Script
 * Runs on streaming platform pages
 * Detects movies, tracks history, and shows recommendations
 */

// Global state
let lastTrackedMovie = null;
let lastTrackedMovieId = null;
let movieTitleObserver = null;
let extensionEnabled = true;
let debounceTimer = null;
let playbackObserver = null;
let currentMovieData = null;
let platformSpecificRecommendations = null;

/**
 * Initialize content script
 * Sets up platform detection and observers
 */
async function init() {
  try {
    console.log('[Content] Initializing on', window.location.hostname);

    // Initialize i18n and storage
    await I18n.init();
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

    // Set up playback detection for platform-specific recommendations
    setupPlaybackDetection();

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
    }, 300);
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
    }, 300);
  });
}

/**
 * Handle when movie is detected
 * @param {string} movieTitle
 */
async function handleMovieDetected(movieTitle) {
  try {
    console.log('[Content] Movie detected:', movieTitle);

    // Check if this is live content - don't track or recommend for live streams
    if (PlatformDetectors.isLiveContent()) {
      console.log('[Content] Live content detected, skipping movie tracking and recommendations');
      return;
    }

    // Detect content type (movie vs TV show vs anime)
    const contentType = PlatformDetectors.getContentType() || 'movie';
    const isAnime = PlatformDetectors.isAnimeContent();
    const isTV = contentType === 'tv';

    console.log('[Content] Content type:', contentType, isAnime ? '(anime)' : '');

    // Search using the appropriate API
    const movieData = isTV
      ? await API.searchTV(movieTitle)
      : await API.searchMovie(movieTitle);

    if (movieData && lastTrackedMovieId && movieData.id === lastTrackedMovieId) {
      console.log('[Content] Same content detected, skipping:', movieTitle);
      return;
    }

    if (!movieData) {
      console.warn('[Content] Could not find details:', movieTitle);
      return;
    }

    // Fetch full details, credits, and keywords in parallel
    let fullDetails = null;
    let credits = { directors: [], topCast: [] };
    let keywords = [];

    if (movieData.id) {
      try {
        if (isTV) {
          const [details, creds, kws] = await Promise.all([
            API.getTVDetails(movieData.id),
            API.getTVCredits(movieData.id),
            API.getTVKeywords(movieData.id)
          ]);
          fullDetails = details;
          credits = creds ? { directors: creds.creators || [], topCast: creds.topCast || [] } : credits;
          keywords = kws || [];
        } else {
          const [details, creds, kws] = await Promise.all([
            API.getMovieDetails(movieData.id),
            API.getMovieCredits(movieData.id),
            API.getMovieKeywords(movieData.id)
          ]);
          fullDetails = details;
          credits = creds || credits;
          keywords = kws || [];
        }
      } catch (e) {
        console.warn('[Content] Error fetching enriched data:', e);
        fullDetails = isTV ? await API.getTVDetails(movieData.id) : await API.getMovieDetails(movieData.id);
      }
    }

    // Build enriched data object
    const movieWithPlatform = {
      ...movieData,
      contentType: isTV ? 'tv' : 'movie',
      isAnime,
      genres: fullDetails?.genres || movieData.genres,
      originalLanguage: fullDetails?.originalLanguage || null,
      spokenLanguages: fullDetails?.spokenLanguages || [],
      directors: credits.directors || [],
      keywords: keywords,
      platform: PlatformDetectors.getCurrentPlatform(),
      numberOfSeasons: fullDetails?.numberOfSeasons || null
    };

    await Storage.addToHistory(movieWithPlatform);

    currentMovieData = movieWithPlatform;
    lastTrackedMovie = movieTitle;
    lastTrackedMovieId = movieData.id;

    if (extensionEnabled) {
      Overlay.show([], movieWithPlatform);
    }
  } catch (error) {
    console.error('[Content] Error handling movie detection:', error);
  }
}

/**
 * Set up playback detection for platform-specific recommendations
 */
function setupPlaybackDetection() {
  const platform = PlatformDetectors.getCurrentPlatform();
  
  if (!platform) return;

  // Set up video element observers based on platform
  setupVideoObservers(platform);
}

/**
 * Set up video element observers for different platforms
 * @param {string} platform
 */
function setupVideoObservers(platform) {
  let videoSelectors = [];

  switch (platform) {
    case 'hotstar':
      videoSelectors = ['video', '.player-video', '[data-testid="player-video"]'];
      break;
    case 'primevideo':
      videoSelectors = ['video', '.renderer', '[data-testid="video-player"]'];
      break;
    case 'netflix':
      videoSelectors = ['video', '.VideoContainer video', '.player-video'];
      break;
    default:
      videoSelectors = ['video'];
  }

  // Observe for video elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if it's a video element
          if (node.tagName === 'VIDEO') {
            setupVideoPlaybackListener(node, platform);
          }
          // Check for video elements in added subtree
          const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
          videos.forEach(video => setupVideoPlaybackListener(video, platform));
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also check for existing video elements
  videoSelectors.forEach(selector => {
    const videos = document.querySelectorAll(selector);
    videos.forEach(video => setupVideoPlaybackListener(video, platform));
  });

  playbackObserver = observer;
}

/**
 * Set up playback listener for a video element
 * @param {HTMLVideoElement} video
 * @param {string} platform
 */
function setupVideoPlaybackListener(video, platform) {
  if (video.hasPlaybackListener) return;
  video.hasPlaybackListener = true;

  let hasStartedPlayback = false;

  const handlePlay = async () => {
    if (hasStartedPlayback || !currentMovieData) return;
    
    // Check if this is live content - don't show recommendations for live streams
    if (PlatformDetectors.isLiveContent()) {
      console.log('[Content] Live content detected, skipping recommendations');
      return;
    }
    
    hasStartedPlayback = true;

    console.log('[Content] User started watching:', currentMovieData.title, 'on', platform);

    // Show platform-specific recommendations
    await showPlatformSpecificRecommendations(currentMovieData, platform);
  };

  video.addEventListener('play', handlePlay);
  video.addEventListener('playing', handlePlay);

  // Also listen for timeupdate as backup
  video.addEventListener('timeupdate', () => {
    if (!hasStartedPlayback && video.currentTime > 5 && currentMovieData) {
      hasStartedPlayback = true;
      console.log('[Content] User started watching (timeupdate):', currentMovieData.title, 'on', platform);
      showPlatformSpecificRecommendations(currentMovieData, platform);
    }
  });
}

/**
 * Show platform-specific recommendations for similar movies
 * @param {Object} movieData
 * @param {string} platform
 */
async function showPlatformSpecificRecommendations(movieData, platform) {
  try {
    console.log('[Content] Getting platform-specific recommendations for:', movieData.title, 'on', platform);

    // Merge both similar and collaborative recommendations for better accuracy
    const [similarMovies, collabRecs] = await Promise.all([
      API.getSimilarMovies(movieData.id),
      API.getMovieRecommendations(movieData.id)
    ]);

    // Deduplicate by ID
    const seen = new Set();
    const allMovies = [];
    [...(similarMovies || []), ...(collabRecs || [])].forEach(m => {
      if (m.id && !seen.has(m.id) && m.id !== movieData.id &&
          m.title.trim().toLowerCase() !== movieData.title.trim().toLowerCase()) {
        seen.add(m.id);
        allMovies.push(m);
      }
    });

    if (allMovies.length === 0) {
      console.log('[Content] No similar movies found');
      return;
    }

    // Sort by Bayesian rating and take top 5
    const BAYESIAN_M = 200;
    const BAYESIAN_C = 6.5;
    const sorted = allMovies
      .filter(m => m.rating >= 6.0 && (m.voteCount || 0) >= 50)
      .sort((a, b) => {
        const wrA = ((a.voteCount || 0) / ((a.voteCount || 0) + BAYESIAN_M)) * a.rating +
                     (BAYESIAN_M / ((a.voteCount || 0) + BAYESIAN_M)) * BAYESIAN_C;
        const wrB = ((b.voteCount || 0) / ((b.voteCount || 0) + BAYESIAN_M)) * b.rating +
                     (BAYESIAN_M / ((b.voteCount || 0) + BAYESIAN_M)) * BAYESIAN_C;
        return wrB - wrA;
      })
      .slice(0, 5);

    const platformRecommendations = sorted.map(movie => ({
      ...movie,
      explanation: `Similar to "${movieData.title}" \u2014 on ${getPlatformDisplayName(platform)}`,
      platformSpecific: true,
      currentPlatform: platform
    }));

    platformSpecificRecommendations = platformRecommendations;

    if (extensionEnabled) {
      Overlay.showPlatformSpecific(platformRecommendations);
    }

    console.log('[Content] Showing', platformRecommendations.length, 'platform-specific recommendations');

  } catch (error) {
    console.error('[Content] Error showing platform-specific recommendations:', error);
  }
}

/**
 * Get display name for platform
 * @param {string} platform
 * @returns {string}
 */
function getPlatformDisplayName(platform) {
  const names = {
    'hotstar': 'Hotstar',
    'primevideo': 'Prime Video',
    'netflix': 'Netflix',
    'disneyplus': 'Disney+',
    'hulu': 'Hulu',
    'jiocinema': 'JioCinema',
    'zee5': 'Zee5',
    'sonyliv': 'SonyLIV',
    'crunchyroll': 'Crunchyroll'
  };
  return names[platform] || platform;
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
