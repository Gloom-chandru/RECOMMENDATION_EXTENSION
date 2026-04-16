╔════════════════════════════════════════════════════════════════════════════╗
║                   EXTENSION ARCHITECTURE GUIDE                            ║
║                 Complete Visual System Overview                           ║
╚════════════════════════════════════════════════════════════════════════════╝


🏗️ SYSTEM ARCHITECTURE
════════════════════════════════════════════════════════════════════════════

                           Chrome Browser
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            Hotstar.com    Prime Video    Other Sites
                    │            │
                    └────────────┼────────────┘
                                 │
                    ┌────────────────────────┐
                    │  Content Script        │
                    │  (content.js)          │
                    └────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   ┌─────────────┐      ┌─────────────────┐      ┌──────────────┐
   │ Platform    │      │  Movie          │      │  Overlay     │
   │ Detectors   │      │  Tracking       │      │  UI Manager  │
   │ (DOM)       │      │  (History)      │      │  (Display)   │
   └─────────────┘      └─────────────────┘      └──────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
            ┌────────────────────────────────┐
            │  Shared Utility Modules        │
            ├────────────────────────────────┤
            │  • API.js (TMDb integration)   │
            │  • Storage.js (Data mgmt)      │
            │  • Cache.js (TTL caching)      │
            │  • Recommender.js (Engine)     │
            └────────────────────────────────┘
                                 │
            ┌────────────────────────────────┐
            │  Background Service Worker     │
            │  (background.js)               │
            │  • Message routing             │
            │  • Alarms & cleanup            │
            │  • Data sync                   │
            └────────────────────────────────┘
                                 │
            ┌────────────────────────────────┐
            │  Chrome Storage API            │
            │  (Local Data Persistence)      │
            │  • History                     │
            │  • Bookmarks                   │
            │  • Settings                    │
            │  • Cache                       │
            └────────────────────────────────┘
                                 │
            ┌────────────────────────────────┐
            │  Popup UI (popup.html/js)      │
            │  • Dashboard tab               │
            │  • History tab                 │
            │  • Bookmarks tab               │
            │  • Settings panel              │
            └────────────────────────────────┘


📊 DATA FLOW DIAGRAM
════════════════════════════════════════════════════════════════════════════

User visits movie page
         │
         ▼
Content script detects page
         │
         ▼
PlatformDetectors.extractMovieTitle()
         │
         ▼
Movie title extracted from DOM
         │
         ▼
API.searchMovie() → TMDb API call
         │
         ▼
Movie data returned (with genres, rating, etc)
         │
         ▼
Storage.addToHistory() → Chrome storage
         │
         ├─► Cache movie data (24h TTL)
         ├─► Update genre frequency count
         └─► Increment watch history
         │
         ▼
Recommender.getRecommendations()
         │
         ├─► Get last 3 watched movies (60% weight)
         │   └─► API.getSimilarMovies() for each
         │
         └─► Get top 3 genres (40% weight)
             └─► API.getMoviesByGenre() for each
         │
         ▼
Merge, deduplicate, score, and rank recommendations
         │
         ▼
Overlay.show(recommendations)
         │
         ▼
Beautiful recommendation panel appears (slide-in animation)
         │
         ▼
User sees 6 personalized movies with:
├─► Poster image
├─► Title
├─► Rating
├─► Explanation ("Because you watched...")
└─► Bookmark button


🔄 RECOMMENDATION ALGORITHM
════════════════════════════════════════════════════════════════════════════

START: User's Watch History
│
├─────────────────────────────────────────────────┐
│                                                 │
▼ (60% WEIGHT)                        ▼ (40% WEIGHT)
Recent Movies (Last 3)                Genre Frequency
│                                      │
├─ Movie 1 (weight: 1.0)              ├─ Action (freq: 5)
├─ Movie 2 (weight: 0.5)              ├─ Drama (freq: 3)
└─ Movie 3 (weight: 0.33)             └─ Comedy (freq: 2)
│                                      │
▼                                      ▼
For each movie:                        For each genre:
API.getSimilarMovies()                API.getMoviesByGenre()
└─ Fetch 10-20 similar movies         └─ Fetch 10-20 movies
│                                      │
├─────────────────────────────────────┤
│                                     │
▼ MERGING STEP                        │
All Similar Movies + Genre Movies    │
│                                     │
▼ DEDUPLICATION                       │
Remove duplicates, keep only unique   │
│                                     │
▼ SCORING                             │
For each movie:                        │
  score = (recent_weight × similarity) + (genre_weight × popularity)
│
▼ RANKING
Sort by score descending

▼ RETURN TOP 6
With explanations attached

EXAMPLE OUTPUT:
┌─────────────────────────────────────┐
│ Movie: "Inception"                  │
│ Rating: 8.8/10                      │
│ Explanation: "Because you watched   │
│  Fight Club and Interstellar"       │
│ Score: 8.5                          │
└─────────────────────────────────────┘


📂 FILE STRUCTURE & RESPONSIBILITIES
════════════════════════════════════════════════════════════════════════════

manifest.json (48 lines)
└─ Extension configuration
   ├─ Permissions: storage, activeTab, scripting
   ├─ Host permissions: Hotstar, Prime Video, TMDb
   ├─ Content scripts for Hotstar & Prime
   ├─ Background service worker registration
   └─ Popup UI definition


content/
├─ content.js (220 lines)
│  ├─ Main entry point for content script
│  ├─ Movie detection setup
│  ├─ MutationObserver for DOM changes
│  ├─ Message handler for popup/background
│  └─ Keyboard shortcut handler (Alt+R)
│
└─ platformDetectors.js (180 lines)
   ├─ Platform detection (Hotstar vs Prime Video)
   ├─ Movie detail page detection
   ├─ DOM selector management
   ├─ Movie title extraction logic
   ├─ MutationObserver setup
   └─ Page transition detection


background/
└─ background.js (210 lines)
   ├─ Service worker initialization
   ├─ Message routing from content/popup
   ├─ Profile summary generation
   ├─ History & bookmark management
   ├─ Data export/import functions
   ├─ Cache cleanup alarms
   └─ Tab update tracking


popup/
├─ popup.html (180 lines)
│  ├─ Dashboard tab (profile stats, current movie)
│  ├─ History tab (watch history list)
│  ├─ Bookmarks tab (saved movies)
│  ├─ Settings panel (toggles, inputs)
│  └─ Tab navigation structure
│
├─ popup.css (650 lines)
│  ├─ Modern dark theme colors
│  ├─ Responsive layout for popup
│  ├─ Tab switching animations
│  ├─ List styling (history, bookmarks)
│  ├─ Settings panel styling
│  ├─ Button & form styling
│  └─ Mobile responsiveness
│
└─ popup.js (320 lines)
   ├─ Initialization & storage loading
   ├─ Tab switching logic
   ├─ Settings panel management
   ├─ Data display (history, bookmarks)
   ├─ Action handlers (clear, export, reset)
   └─ Message sending to content script


ui/
└─ overlay.js (550 lines)
   ├─ Overlay initialization
   ├─ Recommendation card rendering
   ├─ Animation management (slide-in)
   ├─ Loading skeleton states
   ├─ Error state handling
   ├─ Empty state messages
   ├─ Bookmark functionality
   ├─ CSS injection
   └─ Event listener attachment


utils/
├─ api.js (280 lines)
│  ├─ TMDb API wrapper
│  ├─ searchMovie() - Find movie by title
│  ├─ getMovieDetails() - Fetch full details
│  ├─ getSimilarMovies() - Find similar
│  ├─ getRecommendations() - Get recommendations
│  ├─ getMoviesByGenre() - Genre-based search
│  ├─ Retry logic with exponential backoff
│  ├─ Error handling & timeouts
│  ├─ Image URL generator
│  └─ Configuration status checks
│
├─ cache.js (180 lines)
│  ├─ TTL-based caching system
│  ├─ get() - Retrieve cached items
│  ├─ set() - Store with TTL
│  ├─ remove() - Delete specific items
│  ├─ clearType() - Clear by type
│  ├─ clearAll() - Full cache clear
│  ├─ getStats() - Cache statistics
│  └─ Automatic expiration handling
│
├─ storage.js (350 lines)
│  ├─ Local data management
│  ├─ addToHistory() - Track movies
│  ├─ getHistory() - Retrieve history
│  ├─ addBookmark() - Save movies
│  ├─ removeBookmark() - Delete saved
│  ├─ getGenreCount() - Genre frequency
│  ├─ getTopGenres() - Top genres
│  ├─ Settings management
│  ├─ Data export for backup
│  ├─ Data import from backup
│  └─ Full data reset
│
└─ recommender.js (320 lines)
   ├─ Recommendation engine
   ├─ getRecommendations() - Main entry
   ├─ _getRecommendationsFromRecent() - 60% logic
   ├─ _getRecommendationsFromGenres() - 40% logic
   ├─ _mergeRecommendations() - Merge & score
   ├─ _generateExplanation() - Human-readable text
   ├─ _getTrendingMovies() - Fallback
   ├─ getMovieSpecificRecommendations() - For hover
   ├─ Genre name to ID mapping
   └─ Configuration getters


assets/icons/
└─ README.md
   └─ Icon specifications & guidelines


════════════════════════════════════════════════════════════════════════════

🔌 MODULE RELATIONSHIPS
════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────┐
                    │  manifest.json  │
                    └─────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────────────┐    ┌─────────────┐    ┌─────────┐
   │ content.js │    │background.js│    │popup.js │
   └────────────┘    └─────────────┘    └─────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌──────────┐    ┌──────────────┐    ┌──────────┐
   │  api.js  │    │ storage.js   │    │overlay.js│
   └──────────┘    └──────────────┘    └──────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌──────────┐    ┌─────────────┐    ┌──────────────────┐
   │cache.js  │    │recommender.js   │platform.js
   └──────────┘    └─────────────┘    └──────────────────┘


💾 STORAGE SCHEMA
════════════════════════════════════════════════════════════════════════════

chrome.storage.local {
  
  user_history: [
    {
      title: "Inception",
      genres: [{id: 28, name: "Action"}, ...],
      tmdbId: 550,
      posterPath: "/...",
      timestamp: 1713000000000,
      platform: "hotstar",
      rating: 8.8
    },
    ...
  ],
  
  genre_count: {
    "Action": 5,
    "Drama": 3,
    "Comedy": 2,
    ...
  },
  
  bookmarks: [
    {
      id: 550,
      title: "Inception",
      posterPath: "/...",
      rating: 8.8,
      genres: [...],
      timestamp: 1713000000000
    },
    ...
  ],
  
  settings: {
    enabled: true,
    autoTrack: true,
    showNotifications: true,
    maxHistoryItems: 20,
    recommendationCount: 6
  },
  
  cache:movie:inception: {
    value: { id: 550, title: "Inception", ... },
    expiresAt: 1713086400000,
    createdAt: 1713000000000
  },
  
  cache:recommendations:550_page_1: {
    value: [ { id: ..., title: ... }, ... ],
    expiresAt: 1713086400000,
    createdAt: 1713000000000
  },
  
  ...more cache entries...
}


🎯 KEY ALGORITHMS
════════════════════════════════════════════════════════════════════════════

1. MOVIE DETECTION
   ─────────────────
   if (platformDetectors.isMovieDetailPage()) {
     movieTitle = platformDetectors.extractMovieTitle();
     if (movieTitle !== lastTrackedMovie) {
       handleMovieDetected(movieTitle);
     }
   }

2. RECOMMENDATION SCORING
   ──────────────────────
   for each movie in allMovies:
     recent_score = similarity_rating × (60% weight)
     genre_score = popularity × (40% weight)
     total_score = recent_score + genre_score
   sort by total_score descending
   return top 6

3. CACHE KEY GENERATION
   ────────────────────
   key = `cache:${type}:${key.toLowerCase().replace(/\s+/g, '-')}`
   Example: cache:movie:inception
            cache:recommendations:550_page_1

4. GENRE MAPPING
   ─────────────
   Input: "Action" → Output: 28
   Input: "Drama" → Output: 18
   Input: "Comedy" → Output: 35
   (Maps genre names to TMDb genre IDs)


📡 MESSAGE PASSING PROTOCOL
════════════════════════════════════════════════════════════════════════════

Content Script ←→ Background Service Worker:
  {
    action: 'trackView',
    movie: { title, genres, rating, ... }
  }
  → Response: { success: true }

Content Script ←→ Popup:
  {
    action: 'getMovieStatus' | 'showRecommendations' | ...
  }
  → Response varies by action

Background → Popup (on demand):
  {
    action: 'getProfile' | 'getHistory' | 'getBookmarks' | ...
  }
  → Returns data from storage


🔐 SECURITY MEASURES
════════════════════════════════════════════════════════════════════════════

1. Input Validation
   └─ Movie titles checked for length (max 150 chars)
   └─ API responses validated before use

2. XSS Prevention
   └─ textContent used instead of innerHTML
   └─ escapeHtml() for user-facing data
   └─ No eval() or Function() constructors

3. Data Privacy
   └─ All data stored locally in chrome.storage.local
   └─ No external tracking or analytics
   └─ No PII collection
   └─ HTTPS-only for API calls

4. Error Handling
   └─ Try-catch blocks throughout
   └─ Graceful error messages
   └─ Fallback UI states

5. CSP Compliance
   └─ No inline scripts
   └─ No eval()
   └─ No unsafe operations


⚡ PERFORMANCE OPTIMIZATIONS
════════════════════════════════════════════════════════════════════════════

1. Caching
   └─ API responses cached 24 hours
   └─ Cache cleanup every 6 hours
   └─ Avoids redundant API calls

2. Lazy Loading
   └─ Images load lazily in overlay
   └─ Reduces initial page impact

3. Debouncing
   └─ Movie detection waits for stability
   └─ Prevents duplicate detections

4. Efficient DOM Queries
   └─ Selectors cached where possible
   └─ Minimal DOM traversal
   └─ Efficient selector patterns

5. Async Operations
   └─ Storage operations are async
   └─ No UI thread blocking
   └─ Smooth user experience


🧪 TESTING PATTERNS
════════════════════════════════════════════════════════════════════════════

Unit Test Example:
  await Storage.init();
  const movie = { title: 'Test', id: 123 };
  await Storage.addToHistory(movie);
  const history = await Storage.getHistory();
  console.assert(history.length > 0);

Integration Test Example:
  const movie = await API.searchMovie('Inception');
  await Storage.addToHistory(movie);
  const recs = await Recommender.getRecommendations();
  await Overlay.show(recs);

Manual Testing Checklist:
  ☑ Extension loads
  ☑ Movie detection works
  ☑ Recommendations appear
  ☑ Bookmarks save/remove
  ☑ Settings persist
  ☑ No console errors
  ☑ Memory stable
  ☑ UI responsive


════════════════════════════════════════════════════════════════════════════

This complete architecture ensures:
✅ Modularity - Easy to maintain & extend
✅ Performance - Fast & efficient
✅ Security - No vulnerabilities
✅ Privacy - User data protected
✅ Reliability - Comprehensive error handling
✅ Scalability - Easy to add features

════════════════════════════════════════════════════════════════════════════
