/**
 * Overlay UI Manager
 * Injects recommendation panel into the webpage
 * Handles animations, interactions, and state
 */

const Overlay = {
  // State
  isVisible: false,
  currentRecommendations: [],
  container: null,

  /**
   * Initialize overlay
   * Creates DOM structure
   * @returns {void}
   */
  init() {
    if (this.container) return; // Already initialized

    // Inject CSS
    this._injectStyles();

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'movie-recommendation-overlay';
    this.container.className = 'mr-overlay';
    
    document.body.appendChild(this.container);

    console.log('[Overlay] Initialized');
  },

  /**
   * Show recommendations in overlay
   * @param {Array} recommendations
   * @returns {void}
   */
  async show(recommendations = []) {
    try {
      if (!this.container) {
        this.init();
      }

      this.currentRecommendations = recommendations;

      if (recommendations.length === 0) {
        this._showLoadingState();
        
        // Fetch recommendations if not provided
        const recs = await Recommender.getRecommendations();
        this.currentRecommendations = recs;
        
        if (recs.length === 0) {
          this._showEmptyState();
          this.isVisible = true;
          return;
        }
      }

      this._render();
      this.isVisible = true;

      // Animate in
      setTimeout(() => {
        this.container.classList.add('mr-visible');
      }, 10);

    } catch (error) {
      console.error('[Overlay] Error showing overlay:', error);
      this._showErrorState();
    }
  },

  /**
   * Hide overlay
   * @returns {void}
   */
  hide() {
    if (!this.container) return;

    this.container.classList.remove('mr-visible');
    
    setTimeout(() => {
      this.isVisible = false;
      this.currentRecommendations = [];
    }, 300);
  },

  /**
   * Toggle overlay visibility
   * @returns {void}
   */
  toggle() {
    this.isVisible ? this.hide() : this.show();
  },

  /**
   * Render recommendations
   * @returns {void}
   */
  _render() {
    const recommendations = this.currentRecommendations;

    const html = `
      <div class="mr-panel">
        <div class="mr-header">
          <h2 class="mr-title">For You</h2>
          <button class="mr-close" aria-label="Close recommendations">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="mr-scroll">
          ${recommendations.map((movie, index) => this._renderMovieCard(movie, index)).join('')}
        </div>

        <div class="mr-footer">
          <small>Personalized just for you</small>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
  },

  /**
   * Render individual movie card
   * @param {Object} movie
   * @param {number} index
   * @returns {string}
   */
  _renderMovieCard(movie, index) {
    const posterUrl = API.getPosterUrl(movie.posterPath);
    const ratingColor = movie.rating >= 7 ? '#10b981' : movie.rating >= 5 ? '#f59e0b' : '#ef4444';

    return `
      <div class="mr-card" data-movie-id="${movie.id}" style="animation-delay: ${index * 50}ms">
        <div class="mr-card-image">
          <img src="${posterUrl}" alt="${movie.title}" loading="lazy">
          <div class="mr-card-overlay">
            <button class="mr-bookmark-btn" title="Save for later">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10l5 5v11a2 2 0 0 1-2 2z"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="mr-card-content">
          <h3 class="mr-card-title">${this._escapeHtml(movie.title)}</h3>
          
          <div class="mr-card-meta">
            <span class="mr-rating" style="background-color: ${ratingColor}">
              ${movie.rating.toFixed(1)}
            </span>
            ${movie.releaseDate ? `<span class="mr-year">${movie.releaseDate.split('-')[0]}</span>` : ''}
          </div>

          <p class="mr-explanation">
            ${this._escapeHtml(movie.explanation || 'Recommended for you')}
          </p>

          ${movie.genres && movie.genres.length > 0 ? `
            <div class="mr-genres">
              ${movie.genres.slice(0, 2).map(g => `<span class="mr-genre-tag">${this._escapeHtml(typeof g === 'object' ? g.name : g)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Show loading state
   * @returns {void}
   */
  _showLoadingState() {
    const html = `
      <div class="mr-panel">
        <div class="mr-header">
          <h2 class="mr-title">Recommendations</h2>
          <button class="mr-close" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="mr-scroll">
          ${[...Array(3)].map(() => `
            <div class="mr-card-skeleton">
              <div class="mr-skeleton-image"></div>
              <div class="mr-skeleton-content">
                <div class="mr-skeleton-line" style="width: 80%;"></div>
                <div class="mr-skeleton-line" style="width: 60%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
  },

  /**
   * Show empty state
   * @returns {void}
   */
  _showEmptyState() {
    const html = `
      <div class="mr-panel">
        <div class="mr-header">
          <h2 class="mr-title">Recommendations</h2>
          <button class="mr-close" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="mr-empty-state">
          <p>No recommendations available right now.</p>
          <small>Start watching movies to get personalized suggestions!</small>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
  },

  /**
   * Show error state
   * @returns {void}
   */
  _showErrorState() {
    const html = `
      <div class="mr-panel">
        <div class="mr-header">
          <h2 class="mr-title">Recommendations</h2>
          <button class="mr-close" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="mr-empty-state">
          <p>Unable to load recommendations.</p>
          <small>Please check your connection and try again.</small>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
  },

  /**
   * Attach event listeners to interactive elements
   * @returns {void}
   */
  _attachEventListeners() {
    // Close button
    const closeBtn = this.container.querySelector('.mr-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Bookmark buttons
    const bookmarkBtns = this.container.querySelectorAll('.mr-bookmark-btn');
    bookmarkBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const card = btn.closest('.mr-card');
        const movieId = card?.dataset.movieId;

        if (movieId) {
          const movie = this.currentRecommendations.find(m => m.id === parseInt(movieId));
          if (movie) {
            await Storage.addBookmark(movie);
            btn.classList.add('mr-bookmarked');
            btn.title = 'Saved!';
          }
        }
      });
    });

    // Card click to open (could be extended for detailed view)
    const cards = this.container.querySelectorAll('.mr-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.mr-bookmark-btn')) return;
        // Could open movie details or external link here
        console.log('Card clicked:', card.dataset.movieId);
      });
    });
  },

  /**
   * Inject CSS styles
   * @returns {void}
   */
  _injectStyles() {
    if (document.getElementById('movie-recommendation-styles')) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'movie-recommendation-styles';
    style.textContent = this._getStyles();

    document.head.appendChild(style);
  },

  /**
   * Get CSS styles
   * @returns {string}
   */
  _getStyles() {
    return `
      /* Overlay Container */
      #movie-recommendation-overlay {
        position: fixed;
        right: -450px;
        top: 0;
        width: 420px;
        height: 100vh;
        z-index: 999999;
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      #movie-recommendation-overlay.mr-visible {
        right: 0;
      }

      /* Panel */
      .mr-panel {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        display: flex;
        flex-direction: column;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      }

      /* Header */
      .mr-header {
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .mr-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: -0.5px;
      }

      .mr-close {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .mr-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }

      /* Scrollable content */
      .mr-scroll {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .mr-scroll::-webkit-scrollbar {
        width: 6px;
      }

      .mr-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .mr-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }

      .mr-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Footer */
      .mr-footer {
        padding: 12px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
        flex-shrink: 0;
      }

      /* Movie Card */
      .mr-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        border: 1px solid rgba(255, 255, 255, 0.08);
        animation: slideIn 0.3s ease-out forwards;
        opacity: 0;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .mr-card:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
      }

      /* Card Image */
      .mr-card-image {
        position: relative;
        width: 100%;
        padding-bottom: 150%;
        overflow: hidden;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4));
      }

      .mr-card-image img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .mr-card-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0);
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 8px;
        opacity: 0;
        transition: all 0.3s;
      }

      .mr-card:hover .mr-card-overlay {
        background: rgba(0, 0, 0, 0.4);
        opacity: 1;
      }

      .mr-bookmark-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: #ffffff;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        backdrop-filter: blur(10px);
      }

      .mr-bookmark-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      .mr-bookmark-btn.mr-bookmarked {
        background: #10b981;
      }

      /* Card Content */
      .mr-card-content {
        padding: 12px;
      }

      .mr-card-title {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Card Meta */
      .mr-card-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
      }

      .mr-rating {
        font-size: 12px;
        font-weight: 700;
        color: #ffffff;
        padding: 2px 6px;
        border-radius: 3px;
      }

      .mr-year {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      /* Explanation */
      .mr-explanation {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.4;
      }

      /* Genres */
      .mr-genres {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .mr-genre-tag {
        font-size: 11px;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border-radius: 3px;
      }

      /* Skeletons */
      .mr-card-skeleton {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .mr-skeleton-image {
        width: 100%;
        padding-bottom: 150%;
        background: linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2), rgba(255,255,255,0.1));
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      .mr-skeleton-content {
        padding: 12px;
      }

      .mr-skeleton-line {
        height: 8px;
        background: linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2), rgba(255,255,255,0.1));
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      /* Empty State */
      .mr-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 40px 20px;
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
      }

      .mr-empty-state p {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
      }

      .mr-empty-state small {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }

      /* Responsive */
      @media (max-width: 768px) {
        #movie-recommendation-overlay {
          right: -100%;
          width: 100%;
        }

        #movie-recommendation-overlay.mr-visible {
          right: 0;
        }
      }

      /* Accessibility */
      .mr-close:focus-visible,
      .mr-bookmark-btn:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.5);
        outline-offset: 2px;
      }
    `;
  },

  /**
   * Escape HTML special characters
   * @param {string} text
   * @returns {string}
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Overlay;
}
