# Development Guide

Comprehensive guide for developers working on the extension.

## 🏗️ Architecture Overview

### Modular Design Pattern

Each module has a single responsibility:

```
┌─────────────────────────────────────────────────────┐
│              manifest.json (Config)                 │
└─────────────────────────────────────────────────────┘
              ↓                      ↓
┌──────────────────────┐    ┌──────────────────────┐
│  Content Script      │    │  Background Worker   │
│  (Runs on Pages)     │    │  (Background Tasks)  │
└──────────────────────┘    └──────────────────────┘
         ↓                          ↓
┌──────────────────────┐    ┌──────────────────────┐
│  Platform Detectors  │    │  Message Router      │
│  Movie Detection     │    │  Data Sync           │
└──────────────────────┘    └──────────────────────┘
         ↓
┌──────────────────────────────────────────────────┐
│           Utility Modules (Shared)               │
├──────────────────────────────────────────────────┤
│  • API.js (TMDb integration)                     │
│  • Storage.js (Data persistence)                │
│  • Cache.js (Response caching)                  │
│  • Recommender.js (Recommendation logic)        │
└──────────────────────────────────────────────────┘
         ↓
┌──────────────────────┐    ┌──────────────────────┐
│  Overlay UI          │    │  Popup UI            │
│  (Recommendations)   │    │  (Settings/Dashboard)│
└──────────────────────┘    └──────────────────────┘
```

## 📚 API Reference

### Storage API

```javascript
// Initialize
await Storage.init();

// History
await Storage.addToHistory(movieObject);
const history = await Storage.getHistory();

// Bookmarks
await Storage.addBookmark(movieObject);
await Storage.removeBookmark(movieId);
const bookmarks = await Storage.getBookmarks();

// Genres
const genreCount = await Storage.getGenreCount();
const topGenres = await Storage.getTopGenres(5);

// Settings
const settings = await Storage.getSettings();
await Storage.updateSettings({ enabled: true });

// Profile
const profile = await Storage.getProfileSummary();

// Data Management
const backup = await Storage.exportData();
await Storage.importData(backup);
await Storage.clearAllData();
```

### API (TMDb) Module

```javascript
// Search
const movie = await API.searchMovie('Inception');
// Returns: { id, title, rating, genres, posterPath, ... }

// Details
const details = await API.getMovieDetails(550);
// Returns: { ...movie, runtime, budget, revenue }

// Similar Movies
const similar = await API.getSimilarMovies(550);
// Returns: Array of movie objects

// Recommendations
const recommended = await API.getRecommendations(550);
// Returns: Array of movie objects

// By Genre
const byGenre = await API.getMoviesByGenre(28); // Action
// Returns: Array of movie objects

// Utilities
const url = API.getPosterUrl(posterPath);
const status = API.getStatus();
const configured = API.isConfigured();
```

### Cache API

```javascript
// Get item (returns null if expired)
const cached = await Cache.get('movie', 'Inception');

// Set item with optional TTL
await Cache.set('movie', 'Inception', movieData);
await Cache.set('movie', 'Inception', movieData, 12 * 60 * 60 * 1000); // 12 hours

// Remove
await Cache.remove('movie', 'Inception');

// Clear type
await Cache.clearType('movie');

// Clear all
await Cache.clearAll();

// Stats
const stats = await Cache.getStats();
// Returns: { totalItems, totalSize, expiredItems, timestamp }
```

### Recommender API

```javascript
// Get personalized recommendations
const recommendations = await Recommender.getRecommendations();
// Returns: Array of [{ id, title, score, explanation, ... }]

// Get recommendations for specific movie
const similar = await Recommender.getMovieSpecificRecommendations(550, 'Fight Club');

// Config
const config = Recommender.getConfig();
```

### Overlay API

```javascript
// Initialize
Overlay.init();

// Show recommendations
await Overlay.show();
await Overlay.show(recommendationsArray); // With custom array

// Hide
Overlay.hide();

// Toggle
Overlay.toggle();

// Properties
console.log(Overlay.isVisible);
console.log(Overlay.currentRecommendations);
```

### Platform Detectors API

```javascript
// Detect platform
const platform = PlatformDetectors.getCurrentPlatform();
// Returns: 'hotstar' | 'primevideo' | null

// Check if on movie page
const isMovie = PlatformDetectors.isMovieDetailPage();

// Extract title
const title = PlatformDetectors.extractMovieTitle();

// Observe changes
const observer = PlatformDetectors.observeTitleChanges((newTitle) => {
  console.log('Movie changed to:', newTitle);
});

// Check if loading
const loading = PlatformDetectors.isPageTransitioning();

// Stop observing
observer.disconnect();
```

## 🔄 Message Passing API

### Content Script → Background

```javascript
// Send message
chrome.runtime.sendMessage({
  action: 'trackView',
  movie: { title, genres, rating, ... }
}, (response) => {
  console.log(response);
});
```

### Content Script ↔ Popup

```javascript
// From Popup to Content
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
chrome.tabs.sendMessage(tab.id, {
  action: 'showRecommendations'
}, (response) => {
  if (response.success) console.log('Shown');
});

// Content → Popup
chrome.runtime.sendMessage({
  action: 'getMovieStatus'
}, (response) => {
  console.log(response.currentMovie);
});
```

### Available Actions

| Action | From | To | Payload | Response |
|--------|------|----|---------| ---------|
| getMovieStatus | Popup | Content | - | { onMoviePage, currentMovie, platform } |
| showRecommendations | Popup | Content | - | { success } |
| hideRecommendations | Popup | Content | - | { success } |
| getRecommendations | Popup | Content | - | { recommendations } |
| trackMovie | Popup | Content | { movie } | { success } |
| toggleExtension | Popup | Content | - | { enabled } |
| getProfile | Background | - | - | { profile } |
| clearAllData | Background | - | - | { success } |
| getHistory | Background | - | - | { history } |
| getBookmarks | Background | - | - | { bookmarks } |
| exportData | Background | - | - | { data } |
| getCacheStats | Background | - | - | { stats } |
| clearCache | Background | - | - | { success } |

## 🧪 Testing Guide

### Unit Testing Pattern

```javascript
// Test Storage
async function testStorage() {
  await Storage.init();
  
  // Test add history
  const movie = { title: 'Test', id: 123, genres: [] };
  await Storage.addToHistory(movie);
  
  // Test retrieve
  const history = await Storage.getHistory();
  console.assert(history.length > 0, 'History should not be empty');
  
  // Test cleanup
  await Storage.clearAllData();
}
```

### Integration Testing Pattern

```javascript
// Test full flow
async function testFullFlow() {
  // 1. API Search
  const movie = await API.searchMovie('Inception');
  console.assert(movie.id === 550, 'Should find Inception');
  
  // 2. Storage
  await Storage.addToHistory(movie);
  
  // 3. Recommender
  const recs = await Recommender.getRecommendations();
  console.assert(recs.length > 0, 'Should get recommendations');
  
  // 4. Overlay
  await Overlay.show(recs);
  console.assert(Overlay.isVisible, 'Overlay should be visible');
}
```

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Settings popup appears
- [ ] Movie detection works on Hotstar
- [ ] Movie detection works on Prime Video
- [ ] Recommendations load correctly
- [ ] Overlay animations smooth
- [ ] Alt+R keyboard shortcut works
- [ ] Bookmarks save/remove correctly
- [ ] History tracks movies
- [ ] Cache clears without errors
- [ ] Settings persist after refresh
- [ ] No console errors (F12)

## 🐛 Debugging

### Enable Debug Logging

All modules log with prefixes:

```
[Content]    - Content script logs
[API]        - API calls
[Storage]    - Storage operations
[Cache]      - Cache operations
[Recommender] - Recommendation logic
[Overlay]    - UI overlay
[Popup]      - Popup UI
[Background] - Service worker
```

### Chrome DevTools

**Content Script Console**:
```
Open any Hotstar/Prime Video page
→ Press F12
→ Console tab shows [Content] logs
```

**Popup Console**:
```
Click extension icon
→ Right-click "Inspect popup"
→ Shows [Popup] logs
```

**Background Service Worker**:
```
Go to chrome://extensions
→ Click "Inspect views: background.html"
→ Shows [Background] logs
```

**Network Tab**:
```
F12 → Network tab
→ Filter by "themoviedb.org"
→ See all API calls and responses
```

### Common Debugging Patterns

```javascript
// Check if API is configured
if (!API.isConfigured()) {
  console.error('API key not set!');
}

// Check storage state
chrome.storage.local.get(null, data => {
  console.log('Storage contents:', data);
});

// Check cache state
Cache.getStats().then(stats => {
  console.log('Cache stats:', stats);
});

// Test API call
API.searchMovie('Inception').then(result => {
  console.log('API response:', result);
});

// Test recommender
Recommender.getRecommendations().then(recs => {
  console.log('Recommendations:', recs);
});
```

## 📝 Code Style Guide

### Naming Conventions

```javascript
// Constants: UPPER_SNAKE_CASE
const API_KEY = 'xxx';
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

// Variables: camelCase
let movieTitle = 'Inception';
const userData = {};

// Functions: camelCase
function detectMoviePage() {}
async function fetchRecommendations() {}

// Classes/Objects: PascalCase
const Storage = { ... };
const Recommender = { ... };

// Private methods: _camelCase (by convention)
const _privateMethod = () => {};
const _generateKey = () => {};

// DOM selectors: store in constants
const SELECTORS = {
  HOTSTAR: {
    TITLE: '[data-testid="detailTitle"]',
    LOADING: '[data-testid="loading"]'
  }
};
```

### Comment Style

```javascript
/**
 * Multi-line function description
 * Explains what it does and why
 * @param {type} paramName - Description
 * @returns {type} Description
 */
function myFunction(paramName) {
  // Single-line comment for complex logic
  const result = expensiveCalculation();
  
  return result;
}
```

### Error Handling

```javascript
// Always use try-catch for async operations
async function safeFetch() {
  try {
    const result = await API.searchMovie('Test');
    return result;
  } catch (error) {
    console.error('[Module] Descriptive error message:', error);
    return null; // Always return fallback
  }
}

// Use descriptive error messages
console.error('[API] Failed to fetch movie (retry 2/2):', error.message);

// Log in structured format
console.log('[Storage] Movie added to history:', {
  title: movie.title,
  timestamp: Date.now(),
  genres: movie.genres
});
```

## 🚀 Performance Tips

### Avoid These

```javascript
// ❌ DOM queries in loops
for (let i = 0; i < 100; i++) {
  document.querySelector('.item'); // BAD
}

// ❌ Synchronous blocking operations
const result = chrome.storage.local.get(...); // BAD

// ❌ Hardcoded magic numbers
const timeout = 10000; // What does this mean?

// ❌ Not caching DOM references
const el1 = document.querySelector('.class');
// ... later ...
const el2 = document.querySelector('.class'); // BAD
```

### Do This

```javascript
// ✅ Cache DOM queries
const element = document.querySelector('.item');
for (let i = 0; i < 100; i++) {
  element.doSomething();
}

// ✅ Use async operations
const result = await chrome.storage.local.get(...); // GOOD

// ✅ Named constants
const REQUEST_TIMEOUT = 10000; // Clear meaning

// ✅ Reuse DOM references
const element = document.querySelector('.class');
// Reuse later in code
```

## 📦 Dependencies

The extension has **zero npm dependencies** (intentionally).

All required functionality is implemented using:
- Chrome Extension APIs (manifest v3)
- Vanilla JavaScript (ES6+)
- Fetch API for HTTP requests
- localStorage/IndexedDB for storage

This keeps the extension lightweight and dependency-free.

## 🔄 Release Workflow

### Semantic Versioning

```
MAJOR.MINOR.PATCH
1.2.3

1: Breaking changes
2: New features (backward compatible)
3: Bug fixes
```

### Release Checklist

- [ ] Update version in `manifest.json`
- [ ] Update `CHANGELOG.md` with changes
- [ ] Test on both platforms
- [ ] Run through debugging checklist
- [ ] Commit with message: "Release v1.2.3"
- [ ] Create git tag: `git tag v1.2.3`
- [ ] Build zip file: `zip -r movie-extension.zip movie-extension/`
- [ ] Upload to Chrome Web Store
- [ ] Wait for review and approval
- [ ] Announce release

## 📖 Further Reading

- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [TMDb API Documentation](https://www.themoviedb.org/settings/api)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

---

Last Updated: 2024
