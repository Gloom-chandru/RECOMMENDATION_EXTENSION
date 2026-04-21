/**
 * Popup Script — v2.0
 * Handles UI interactions, data display, and animations
 */

// DOM Elements
const tabButtons = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const tabIndicator = document.getElementById('tab-indicator');
const settingsBtn = document.getElementById('settings-btn');
const reloadBtn = document.getElementById('reload-btn');
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

    // Set up tab indicator position
    updateTabIndicator();

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
 * Update the animated tab indicator position
 */
function updateTabIndicator() {
  if (!tabIndicator) return;

  const activeTab = document.querySelector('.tab.active');
  if (!activeTab) return;

  const tabTrack = activeTab.parentElement;
  const tabs = Array.from(tabTrack.querySelectorAll('.tab'));
  const activeIndex = tabs.indexOf(activeTab);

  if (activeIndex >= 0) {
    // Calculate position based on which tab is active
    const translateX = activeIndex * 100;
    tabIndicator.style.transform = `translateX(${translateX}%)`;
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
 * Switch between tabs with animated indicator
 * @param {string} tabName
 */
function switchTab(tabName) {
  // Update buttons
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Move indicator
  updateTabIndicator();

  // Update content with staggered animation
  tabContents.forEach(content => {
    const isTarget = content.id === `tab-content-${tabName}`;
    if (isTarget) {
      content.classList.add('active');
      content.style.animation = 'none';
      content.offsetHeight; // Force reflow
      content.style.animation = '';
    } else {
      content.classList.remove('active');
    }
  });
}

/**
 * Load dashboard data
 */
async function loadDashboard() {
  try {
    const profile = await Storage.getProfileSummary();
    const history = await Storage.getHistory();

    // Animate stat counters
    animateCounter('stat-watches', profile.historyCount);
    animateCounter('stat-bookmarks', profile.bookmarkCount);

    // Update genres
    const genresContainer = document.getElementById('genres-list');
    if (profile.topGenres.length > 0) {
      genresContainer.innerHTML = profile.topGenres
        .map((genre, i) => `<span class="genre-pill" style="animation-delay:${i * 50}ms">${escapeHtml(genre)}</span>`)
        .join('');
    } else {
      genresContainer.innerHTML = '<span class="genre-pill placeholder">No data yet</span>';
    }

    // Update current movie
    const currentMovieInfo = document.getElementById('current-movie-info');
    if (history.length > 0) {
      const lastMovie = history[0];
      const date = new Date(lastMovie.timestamp);
      const platformIcon = getPlatformIcon(lastMovie.platform);
      currentMovieInfo.innerHTML = `
        <div class="current-movie-title">${escapeHtml(lastMovie.title)}</div>
        <div class="current-movie-platform">
          ${platformIcon} ${escapeHtml(lastMovie.platform || 'Unknown')} · ${formatDate(date)}
        </div>
      `;
    } else {
      currentMovieInfo.innerHTML = '<p class="muted-text">Browse a movie to start tracking</p>';
    }
  } catch (error) {
    console.error('[Popup] Error loading dashboard:', error);
  }
}

/**
 * Animate a stat counter from 0 to target
 * @param {string} elementId
 * @param {number} target
 */
function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (target === 0) {
    el.textContent = '0';
    return;
  }

  const duration = 600;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

/**
 * Get platform emoji icon
 * @param {string} platform
 * @returns {string}
 */
function getPlatformIcon(platform) {
  const icons = {
    hotstar: '🟢',
    primevideo: '🔵',
    unknown: '🎬'
  };
  return icons[platform] || icons.unknown;
}

/**
 * Load history
 */
async function loadHistory() {
  try {
    const history = await Storage.getHistory();
    const historyList = document.getElementById('history-list');

    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No history yet</p>
          <small>Movies you browse will appear here</small>
        </div>
      `;
      return;
    }

    historyList.innerHTML = history
      .map((movie, index) => {
        const date = new Date(movie.timestamp);
        const platformIcon = getPlatformIcon(movie.platform);
        return `
          <div class="list-item" style="animation: listItemIn 0.3s ease-out ${index * 30}ms both">
            <div class="list-item-content">
              <div class="list-item-title">${escapeHtml(movie.title)}</div>
              <div class="list-item-meta">${platformIcon} ${escapeHtml(movie.platform || 'Unknown')} · ${formatDate(date)}</div>
            </div>
            <button class="list-item-remove" data-index="${index}" title="Remove" aria-label="Remove ${escapeHtml(movie.title)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        `;
      })
      .join('');

    // Attach remove listeners
    document.querySelectorAll('#history-list .list-item-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.target.closest('.list-item-remove');
        const index = parseInt(target.dataset.index);
        // Animate removal
        const item = target.closest('.list-item');
        item.style.transition = 'all 0.25s ease-out';
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
        setTimeout(async () => {
          await removeFromHistory(index);
          await loadHistory();
        }, 250);
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
      bookmarksList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔖</div>
          <p>No bookmarks yet</p>
          <small>Save movies from recommendations to watch later</small>
        </div>
      `;
      return;
    }

    bookmarksList.innerHTML = bookmarks
      .map((movie, index) => {
        const date = new Date(movie.timestamp);
        const rating = movie.rating ? movie.rating.toFixed(1) : '—';
        return `
          <div class="list-item" style="animation: listItemIn 0.3s ease-out ${index * 30}ms both">
            <div class="list-item-content">
              <div class="list-item-title">${escapeHtml(movie.title)}</div>
              <div class="list-item-meta">⭐ ${rating} · ${formatDate(date)}</div>
            </div>
            <button class="list-item-remove" data-movie-id="${movie.id}" title="Remove" aria-label="Remove ${escapeHtml(movie.title)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
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
        const item = target.closest('.list-item');
        item.style.transition = 'all 0.25s ease-out';
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
        setTimeout(async () => {
          await Storage.removeBookmark(movieId);
          await loadBookmarks();
          await loadDashboard();
        }, 250);
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
    const label = showRecommendationsBtn.querySelector('.cta-label');
    if (label) label.textContent = 'Loading...';

    // Send message to content script to show overlay
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: 'showRecommendations' }, (response) => {
      showRecommendationsBtn.disabled = false;
      if (label) label.textContent = 'Get Recommendations';

      if (!response || response.error) {
        showToast('Unable to show recommendations on this page', 'warning');
      }
    });
  } catch (error) {
    console.error('[Popup] Error showing recommendations:', error);
    showRecommendationsBtn.disabled = false;
    const label = showRecommendationsBtn.querySelector('.cta-label');
    if (label) label.textContent = 'Get Recommendations';
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
    showToast('History cleared', 'success');
  } catch (error) {
    console.error('[Popup] Error clearing history:', error);
    showToast('Error clearing history', 'error');
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
    showToast('Bookmarks cleared', 'success');
  } catch (error) {
    console.error('[Popup] Error clearing bookmarks:', error);
    showToast('Error clearing bookmarks', 'error');
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
    resetAllBtn.innerHTML = `
      <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
      Resetting...
    `;

    await chrome.storage.local.clear();
    await Storage.init();

    await loadDashboard();
    await loadHistory();
    await loadBookmarks();
    await loadSettings();

    resetAllBtn.disabled = false;
    resetAllBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      Reset All Data
    `;

    showToast('All data has been reset', 'success');
  } catch (error) {
    console.error('[Popup] Error resetting data:', error);
    showToast('Error resetting data', 'error');
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
    const originalHTML = exportDataBtn.innerHTML;
    exportDataBtn.innerHTML = `
      <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
      Exporting...
    `;

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
      showToast('Data exported successfully', 'success');
    }

    exportDataBtn.disabled = false;
    exportDataBtn.innerHTML = originalHTML;
  } catch (error) {
    console.error('[Popup] Error exporting data:', error);
    showToast('Error exporting data', 'error');
    exportDataBtn.disabled = false;
  }
}

/**
 * Clear cache
 */
async function clearCache() {
  try {
    clearCacheBtn.disabled = true;
    const originalHTML = clearCacheBtn.innerHTML;
    clearCacheBtn.innerHTML = `
      <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
      Clearing...
    `;

    await Cache.clearAll();

    clearCacheBtn.disabled = false;
    clearCacheBtn.innerHTML = originalHTML;
    showToast('Cache cleared', 'success');
  } catch (error) {
    console.error('[Popup] Error clearing cache:', error);
    showToast('Error clearing cache', 'error');
    clearCacheBtn.disabled = false;
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
 * Show a toast notification
 * @param {string} message
 * @param {string} type - 'success', 'error', 'warning'
 */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const icons = {
    success: '✓',
    error: '✕',
    warning: '!'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '✓'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  // Inject toast styles if not already present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast {
        position: fixed;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 200;
        animation: toastIn 0.3s ease-out forwards;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        font-family: inherit;
        white-space: nowrap;
      }
      .toast-success {
        background: rgba(16, 185, 129, 0.9);
        color: #fff;
      }
      .toast-error {
        background: rgba(239, 68, 68, 0.9);
        color: #fff;
      }
      .toast-warning {
        background: rgba(245, 158, 11, 0.9);
        color: #fff;
      }
      .toast-icon {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        flex-shrink: 0;
      }
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes listItemIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .spin {
        animation: spinAnim 0.8s linear infinite;
      }
      @keyframes spinAnim {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .empty-state {
        text-align: center;
        padding: 28px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .empty-icon { font-size: 28px; margin-bottom: 4px; }
      .empty-state p { color: rgba(255,255,255,0.45); font-size: 13px; font-weight: 500; margin: 0; }
      .empty-state small { color: rgba(255,255,255,0.25); font-size: 11px; }
      .list-item-content { min-width: 0; }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto-remove after 2.5s
  setTimeout(() => {
    toast.style.transition = 'all 0.25s ease-out';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 2500);
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
 * Format date to relative time
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
