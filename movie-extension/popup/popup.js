/**
 * Popup Script
 * Handles UI interactions and data display
 */

// DOM Elements
const tabButtons = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.querySelector('.close-settings-btn');

const showRecommendationsBtn = document.getElementById('show-recommendations-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const clearBookmarksBtn = document.getElementById('clear-bookmarks-btn');
const resetAllBtn = document.getElementById('reset-all-btn');
const exportDataBtn = document.getElementById('export-data-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    console.log('[Popup] Initializing');

    // Initialize storage
    await Storage.init();

    // Load initial data
    await loadDashboard();
    await loadHistory();
    await loadBookmarks();
    await loadSettings();

    // Attach event listeners
    attachEventListeners();

    console.log('[Popup] Ready');
  } catch (error) {
    console.error('[Popup] Initialization error:', error);
  }
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // Settings panel
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });

  settingsPanel.addEventListener('click', (e) => {
    if (e.target === settingsPanel) {
      settingsPanel.classList.add('hidden');
    }
  });

  // Action buttons
  showRecommendationsBtn.addEventListener('click', showRecommendations);
  clearHistoryBtn.addEventListener('click', clearHistory);
  clearBookmarksBtn.addEventListener('click', clearBookmarks);
  resetAllBtn.addEventListener('click', resetAllData);
  exportDataBtn.addEventListener('click', exportData);
  clearCacheBtn.addEventListener('click', clearCache);

  // Settings inputs
  document.getElementById('extension-enabled').addEventListener('change', (e) => {
    Storage.updateSettings({ enabled: e.target.checked });
  });

  document.getElementById('auto-track').addEventListener('change', (e) => {
    Storage.updateSettings({ autoTrack: e.target.checked });
  });

  document.getElementById('show-notifications').addEventListener('change', (e) => {
    Storage.updateSettings({ showNotifications: e.target.checked });
  });

  document.getElementById('max-history').addEventListener('change', (e) => {
    Storage.updateSettings({ maxHistoryItems: parseInt(e.target.value) });
  });

  document.getElementById('recommendation-count').addEventListener('change', (e) => {
    Storage.updateSettings({ recommendationCount: parseInt(e.target.value) });
  });
}

/**
 * Switch between tabs
 * @param {string} tabName
 */
function switchTab(tabName) {
  // Update buttons
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update content
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `tab-content-${tabName}`);
  });
}

/**
 * Load dashboard data
 */
async function loadDashboard() {
  try {
    const profile = await Storage.getProfileSummary();
    const history = await Storage.getHistory();
    
    // Update stats
    document.getElementById('stat-watches').textContent = profile.historyCount;
    document.getElementById('stat-bookmarks').textContent = profile.bookmarkCount;

    // Update genres
    const genresContainer = document.getElementById('genres-list');
    if (profile.topGenres.length > 0) {
      genresContainer.innerHTML = profile.topGenres
        .map(genre => `<span class="genre-pill">${escapeHtml(genre)}</span>`)
        .join('');
    } else {
      genresContainer.innerHTML = '<span class="genre-pill">No data yet</span>';
    }

    // Update current movie
    const currentMovieInfo = document.getElementById('current-movie-info');
    if (history.length > 0) {
      const lastMovie = history[0];
      const date = new Date(lastMovie.timestamp);
      currentMovieInfo.innerHTML = `
        <div class="current-movie-title">${escapeHtml(lastMovie.title)}</div>
        <div class="current-movie-platform">
          On ${escapeHtml(lastMovie.platform)} • ${formatDate(date)}
        </div>
      `;
    } else {
      currentMovieInfo.innerHTML = '<p class="empty-message">Not on a movie page</p>';
    }
  } catch (error) {
    console.error('[Popup] Error loading dashboard:', error);
  }
}

/**
 * Load history
 */
async function loadHistory() {
  try {
    const history = await Storage.getHistory();
    const historyList = document.getElementById('history-list');

    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-message">No history yet</p>';
      return;
    }

    historyList.innerHTML = history
      .map((movie, index) => {
        const date = new Date(movie.timestamp);
        return `
          <div class="list-item">
            <div>
              <div class="list-item-title">${escapeHtml(movie.title)}</div>
              <div class="list-item-meta">${movie.platform} • ${formatDate(date)}</div>
            </div>
            <button class="list-item-remove" data-index="${index}" title="Remove">
              ✕
            </button>
          </div>
        `;
      })
      .join('');

    // Attach remove listeners
    document.querySelectorAll('.list-item-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        await removeFromHistory(index);
        await loadHistory();
      });
    });
  } catch (error) {
    console.error('[Popup] Error loading history:', error);
  }
}

/**
 * Load bookmarks
 */
async function loadBookmarks() {
  try {
    const bookmarks = await Storage.getBookmarks();
    const bookmarksList = document.getElementById('bookmarks-list');

    if (bookmarks.length === 0) {
      bookmarksList.innerHTML = '<p class="empty-message">No bookmarks yet</p>';
      return;
    }

    bookmarksList.innerHTML = bookmarks
      .map((movie, index) => {
        const date = new Date(movie.timestamp);
        return `
          <div class="list-item">
            <div>
              <div class="list-item-title">${escapeHtml(movie.title)}</div>
              <div class="list-item-meta">⭐ ${movie.rating.toFixed(1)} • ${formatDate(date)}</div>
            </div>
            <button class="list-item-remove" data-movie-id="${movie.id}" title="Remove">
              ✕
            </button>
          </div>
        `;
      })
      .join('');

    // Attach remove listeners
    document.querySelectorAll('#bookmarks-list .list-item-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.target.closest('.list-item-remove');
        const movieId = parseInt(target.dataset.movieId);
        await Storage.removeBookmark(movieId);
        await loadBookmarks();
      });
    });
  } catch (error) {
    console.error('[Popup] Error loading bookmarks:', error);
  }
}

/**
 * Load settings
 */
async function loadSettings() {
  try {
    const settings = await Storage.getSettings();

    document.getElementById('extension-enabled').checked = settings.enabled !== false;
    document.getElementById('auto-track').checked = settings.autoTrack !== false;
    document.getElementById('show-notifications').checked = settings.showNotifications !== false;
    document.getElementById('max-history').value = settings.maxHistoryItems || 20;
    document.getElementById('recommendation-count').value = settings.recommendationCount || 6;
  } catch (error) {
    console.error('[Popup] Error loading settings:', error);
  }
}

/**
 * Show recommendations on current page
 */
async function showRecommendations() {
  try {
    showRecommendationsBtn.disabled = true;
    showRecommendationsBtn.textContent = 'Loading...';

    // Send message to content script to show overlay
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'showRecommendations' }, (response) => {
      showRecommendationsBtn.disabled = false;
      showRecommendationsBtn.textContent = 'Show Recommendations';

      if (!response || response.error) {
        alert('Unable to show recommendations on this page');
      }
    });
  } catch (error) {
    console.error('[Popup] Error showing recommendations:', error);
    showRecommendationsBtn.disabled = false;
    showRecommendationsBtn.textContent = 'Show Recommendations';
  }
}

/**
 * Clear watch history
 */
async function clearHistory() {
  if (!confirm('Are you sure you want to clear your watch history?')) {
    return;
  }

  try {
    await chrome.storage.local.set({
      user_history: [],
      genre_count: {}
    });

    await loadHistory();
    await loadDashboard();
  } catch (error) {
    console.error('[Popup] Error clearing history:', error);
    alert('Error clearing history');
  }
}

/**
 * Clear bookmarks
 */
async function clearBookmarks() {
  if (!confirm('Are you sure you want to clear all bookmarks?')) {
    return;
  }

  try {
    await chrome.storage.local.set({
      bookmarks: []
    });

    await loadBookmarks();
    await loadDashboard();
  } catch (error) {
    console.error('[Popup] Error clearing bookmarks:', error);
    alert('Error clearing bookmarks');
  }
}

/**
 * Reset all extension data
 */
async function resetAllData() {
  if (!confirm('This will delete all your data (history, bookmarks, settings). Are you sure?')) {
    return;
  }

  try {
    resetAllBtn.disabled = true;
    resetAllBtn.textContent = 'Resetting...';

    await chrome.storage.local.clear();
    await Storage.init();

    await loadDashboard();
    await loadHistory();
    await loadBookmarks();
    await loadSettings();

    resetAllBtn.disabled = false;
    resetAllBtn.textContent = 'Reset All Data';

    alert('All data has been reset');
  } catch (error) {
    console.error('[Popup] Error resetting data:', error);
    alert('Error resetting data');
    resetAllBtn.disabled = false;
    resetAllBtn.textContent = 'Reset All Data';
  }
}

/**
 * Export user data
 */
async function exportData() {
  try {
    exportDataBtn.disabled = true;
    exportDataBtn.textContent = 'Exporting...';

    const backup = await Storage.exportData();

    if (backup) {
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `movie-buddy-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }

    exportDataBtn.disabled = false;
    exportDataBtn.textContent = 'Export Data';
  } catch (error) {
    console.error('[Popup] Error exporting data:', error);
    alert('Error exporting data');
    exportDataBtn.disabled = false;
    exportDataBtn.textContent = 'Export Data';
  }
}

/**
 * Clear cache
 */
async function clearCache() {
  try {
    clearCacheBtn.disabled = true;
    clearCacheBtn.textContent = 'Clearing...';

    await Cache.clearAll();

    clearCacheBtn.disabled = false;
    clearCacheBtn.textContent = 'Clear Cache';

    alert('Cache cleared successfully');
  } catch (error) {
    console.error('[Popup] Error clearing cache:', error);
    alert('Error clearing cache');
    clearCacheBtn.disabled = false;
    clearCacheBtn.textContent = 'Clear Cache';
  }
}

/**
 * Remove item from history
 * @param {number} index
 */
async function removeFromHistory(index) {
  try {
    const history = await Storage.getHistory();
    history.splice(index, 1);

    await chrome.storage.local.set({ user_history: history });
    await loadDashboard();
  } catch (error) {
    console.error('[Popup] Error removing from history:', error);
  }
}

/**
 * Escape HTML
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format date
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

console.log('[Popup] Script loaded');
