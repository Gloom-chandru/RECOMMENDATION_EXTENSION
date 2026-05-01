/**
 * Overlay UI Manager — Premium Sidebar v2.0
 * Floating trigger button + glassmorphism panel
 * Refined card layout with micro-animations
 */

const Overlay = {
  // State
  isVisible: false,
  currentRecommendations: [],
  container: null,
  triggerBtn: null,
  currentMovieData: null,

  /**
   * Initialize overlay — creates trigger button + panel
   */
  init() {
    if (this.container) return;

    this._injectStyles();

    // Create overlay panel
    this.container = document.createElement('div');
    this.container.id = 'mr-overlay';
    this.container.className = 'mr-overlay';
    document.body.appendChild(this.container);

    // Create floating trigger button
    this.triggerBtn = document.createElement('button');
    this.triggerBtn.id = 'mr-trigger-btn';
    this.triggerBtn.className = 'mr-trigger';
    this.triggerBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
        <line x1="7" y1="2" x2="7" y2="22"></line>
        <line x1="17" y1="2" x2="17" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
      </svg>
      <span class="mr-trigger-badge" id="mr-badge" style="display:none;">0</span>
    `;
    this.triggerBtn.title = 'Movie Recommendations (Alt+R)';
    this.triggerBtn.setAttribute('aria-label', 'Open movie recommendations');
    this.triggerBtn.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.triggerBtn);

    console.log('[Overlay] Initialized');
  },

  /**
   * Show overlay with recommendations
   */
  async show(recommendations = [], currentMovie = null) {
    try {
      if (!this.container) this.init();

      this.currentMovieData = currentMovie;
      this.currentRecommendations = recommendations;

      if (recommendations.length === 0) {
        this._renderLoading();
        this._openPanel();

        let recs = await Recommender.getRecommendations(this.currentMovieData);
        this.currentRecommendations = recs;

        // Fallback to trending if no recommendations
        if (recs.length === 0) {
          console.log('[Overlay] No recommendations, showing trending movies as fallback');
          recs = await Recommender._getTrendingMovies();
          this.currentRecommendations = recs;
        }

        if (recs.length === 0) {
          this._renderEmpty();
          return;
        }
      }

      this._render(false); // Regular recommendations
      this._openPanel();
      this._updateBadge(this.currentRecommendations.length);
    } catch (error) {
      console.error('[Overlay] Error:', error);
      this._renderError();
      this._openPanel();
    }
  },

  /**
   * Show overlay with platform-specific recommendations
   * @param {Array} recommendations
   */
  showPlatformSpecific(recommendations = []) {
    try {
      if (!this.container) this.init();

      if (recommendations.length === 0) {
        console.log('[Overlay] No platform-specific recommendations to show');
        return;
      }

      this.currentRecommendations = recommendations;
      this._render(true); // Pass true to indicate platform-specific
      this._openPanel();
      this._updateBadge(recommendations.length);

      console.log('[Overlay] Showing platform-specific recommendations:', recommendations.length);
    } catch (error) {
      console.error('[Overlay] Error showing platform-specific:', error);
      this._renderError();
      this._openPanel();
    }
  },

  hide() {
    if (!this.container) return;
    this.container.classList.remove('mr-open');
    this.isVisible = false;
  },

  toggle() {
    this.isVisible ? this.hide() : this.show();
  },

  _openPanel() {
    this.isVisible = true;
    requestAnimationFrame(() => {
      this.container.classList.add('mr-open');
    });
  },

  _updateBadge(count) {
    const badge = document.getElementById('mr-badge');
    if (badge && count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    }
  },

  /**
   * Get human-readable language name
   * @param {string} langCode
   * @returns {string}
   */
  _getLanguageName(langCode) {
    const languageNames = {
      'en': 'English',
      'hi': 'Hindi',
      'te': 'Telugu',
      'ta': 'Tamil',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'bn': 'Bengali',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'pa': 'Punjabi',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ru': 'Russian',
      'ar': 'Arabic'
    };
    
    return languageNames[langCode] || langCode.toUpperCase();
  },

  /**
   * Build header HTML (shared across all panel states)
   */
  _buildHeader(subtitle = '') {
    let movieTypeInfo = '';
    
    if (this.currentMovieData) {
      const genres = this.currentMovieData.genres?.map(g => g.name || g).join(', ') || 'Unknown';
      const language = this._getLanguageName(this.currentMovieData.originalLanguage) || 'Unknown';
      const year = this.currentMovieData.releaseDate ? new Date(this.currentMovieData.releaseDate).getFullYear() : 'Unknown';
      
      // Content type badge
      const contentType = this.currentMovieData.contentType || 'movie';
      const isAnime = this.currentMovieData.isAnime;
      let typeBadge = '';
      if (isAnime) {
        typeBadge = '<span class="mr-type-badge mr-badge-anime">🎌 Anime</span>';
      } else if (contentType === 'tv') {
        typeBadge = '<span class="mr-type-badge mr-badge-tv">📺 TV Show</span>';
      } else {
        typeBadge = '<span class="mr-type-badge mr-badge-movie">🎬 Movie</span>';
      }

      const seasons = this.currentMovieData.numberOfSeasons 
        ? ` • ${this.currentMovieData.numberOfSeasons} Season${this.currentMovieData.numberOfSeasons > 1 ? 's' : ''}`
        : '';

      movieTypeInfo = `
        <div class="mr-current-movie">
          <div class="mr-current-movie-header">
            <div class="mr-current-movie-title">${I18n.t('currentlyWatching')}: ${this.currentMovieData.title}</div>
            ${typeBadge}
          </div>
          <div class="mr-current-movie-type">${genres} • ${language} • ${year}${seasons}</div>
        </div>
      `;
    }

    return `
      <div class="mr-head">
        ${movieTypeInfo}
        <div class="mr-head-left">
          <div class="mr-head-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#mr-logo-g)" stroke-width="2.2">
              <defs>
                <linearGradient id="mr-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#a78bfa"/>
                  <stop offset="100%" stop-color="#818cf8"/>
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
          </div>
          <div class="mr-head-text">
            <span class="mr-head-title">${I18n.t('movieBuddy')}</span>
            ${subtitle ? `<span class="mr-head-sub">${subtitle}</span>` : ''}
          </div>
        </div>
        <button class="mr-close-btn" aria-label="Close panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  },


  /**
   * Main render — card list
   * @param {boolean} isPlatformSpecific
   */
  _render(isPlatformSpecific = false) {
    const recs = this.currentRecommendations;
    const headerText = isPlatformSpecific 
      ? I18n.t('availableOnPlatform')
      : I18n.t('picksForYou', { count: recs.length });

    this.container.innerHTML = `
      <div class="mr-panel">
        ${this._buildHeader(headerText)}
        <div class="mr-cards">
          ${recs.map((m, i) => this._renderCard(m, i, isPlatformSpecific)).join('')}
        </div>
        <div class="mr-foot">
          <span class="mr-foot-brand">${I18n.t('poweredBy')}</span>
          <span class="mr-foot-shortcut"><kbd>Alt</kbd>+<kbd>R</kbd></span>
        </div>
      </div>
    `;

    this._attachEvents();
  },

  /**
   * Movie card — horizontal layout
   * @param {Object} movie
   * @param {number} index
   * @param {boolean} isPlatformSpecific
   */
  _renderCard(movie, index, isPlatformSpecific = false) {
    const poster = API.getPosterUrl(movie.posterPath, 'w185');
    const rating = movie.rating ? movie.rating.toFixed(1) : '—';
    const year = movie.releaseDate ? movie.releaseDate.split('-')[0] : '';
    const ratingClass = movie.rating >= 7 ? 'high' : movie.rating >= 5 ? 'mid' : 'low';

    // Map genre IDs to names
    const genreMap = {28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',53:'Thriller',10752:'War',37:'Western'};

    let genreTags = '';
    if (movie.genres && movie.genres.length > 0) {
      const genres = movie.genres.slice(0, 2).map(g => {
        if (typeof g === 'object' && g.name) return g.name;
        if (typeof g === 'number') return genreMap[g] || '';
        return String(g);
      }).filter(Boolean);
      genreTags = genres.map(g => `<span class="mr-tag">${this._esc(g)}</span>`).join('');
    }

    const explanation = movie.explanation || movie.source || I18n.t('popularChoice');
    const desc = movie.description ? movie.description.substring(0, 80) + (movie.description.length > 80 ? '...' : '') : '';

    // Content type mini-badge
    const cType = movie.contentType || 'movie';
    const isAnime = movie.isAnime || false;
    let miniType = '';
    if (isAnime) miniType = '<span class="mr-mini-type anime">Anime</span>';
    else if (cType === 'tv') miniType = '<span class="mr-mini-type tv">TV</span>';

    return `
      <div class="mr-card" data-id="${movie.id}" style="--i:${index}">
        <div class="mr-poster-wrap">
          <img class="mr-poster-img" src="${poster}" alt="${this._esc(movie.title)}" loading="lazy">
          <div class="mr-rating-badge ${ratingClass}">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            ${rating}
          </div>
          ${miniType}
        </div>
        <div class="mr-info">
          <h4 class="mr-title">${this._esc(movie.title)}</h4>
          <div class="mr-meta">
            ${year ? `<span class="mr-year">${year}</span>` : ''}
            ${genreTags}
          </div>
          ${desc ? `<p class="mr-desc">${this._esc(desc)}</p>` : ''}
          <p class="mr-why">${this._esc(explanation)}</p>
        </div>
        <button class="mr-save" data-movie-id="${movie.id}" title="${I18n.t('bookmark')}" aria-label="Bookmark ${this._esc(movie.title)}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>
    `;
  },

  _renderLoading() {
    this.container.innerHTML = `
      <div class="mr-panel">
        ${this._buildHeader(I18n.t('findingMovies'))}
        <div class="mr-cards">
          ${[1,2,3,4].map((_, i) => `
            <div class="mr-card mr-skel" style="--i:${i}">
              <div class="mr-poster-wrap mr-shimmer"></div>
              <div class="mr-info">
                <div class="mr-shimmer" style="width:75%;height:14px;border-radius:4px;margin-bottom:8px"></div>
                <div class="mr-shimmer" style="width:55%;height:10px;border-radius:4px;margin-bottom:6px"></div>
                <div class="mr-shimmer" style="width:90%;height:10px;border-radius:4px"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    this._attachEvents();
  },

  _renderEmpty() {
    this.container.innerHTML = `
      <div class="mr-panel">
        ${this._buildHeader()}
        <div class="mr-empty">
          <div class="mr-empty-visual">
            <div class="mr-empty-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
              </svg>
            </div>
          </div>
          <p class="mr-empty-title">${I18n.t('noRecsYet')}</p>
          <p class="mr-empty-desc">${I18n.t('noRecsDesc')}</p>
        </div>
      </div>
    `;
    this._attachEvents();
  },

  _renderError() {
    this.container.innerHTML = `
      <div class="mr-panel">
        ${this._buildHeader()}
        <div class="mr-empty">
          <div class="mr-empty-visual">
            <div class="mr-empty-circle mr-error-circle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
          </div>
          <p class="mr-empty-title">${I18n.t('somethingWrong')}</p>
          <p class="mr-empty-desc">${I18n.t('checkConnection')}</p>
        </div>
      </div>
    `;
    this._attachEvents();
  },

  _attachEvents() {
    // Close
    const closeBtn = this.container.querySelector('.mr-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

    // Bookmark
    this.container.querySelectorAll('.mr-save').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const movieId = parseInt(btn.dataset.movieId);
        const movie = this.currentRecommendations.find(m => m.id === movieId);
        if (movie) {
          await Storage.addBookmark(movie);
          btn.classList.add('mr-saved');
          btn.querySelector('svg').setAttribute('fill', 'currentColor');
          btn.title = 'Saved!';

          // Brief pulse animation
          btn.style.transform = 'scale(1.3)';
          setTimeout(() => { btn.style.transform = ''; }, 200);
        }
      });
    });

    // Card click → open TMDb
    this.container.querySelectorAll('.mr-card:not(.mr-skel)').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.mr-save')) return;
        const id = card.dataset.id;
        if (id) window.open(`https://www.themoviedb.org/movie/${id}`, '_blank');
      });
    });
  },

  _esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  },

  _injectStyles() {
    if (document.getElementById('mr-styles')) return;

    const s = document.createElement('style');
    s.id = 'mr-styles';
    s.textContent = `
      /* =============================================
         Movie Buddy — Overlay Styles v2.0
         ============================================= */

      /* ========== FLOATING TRIGGER ========== */
      .mr-trigger {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999998;
        width: 48px;
        height: 48px;
        border-radius: 14px;
        border: 1px solid rgba(167, 139, 250, 0.2);
        background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow:
          0 4px 20px rgba(99, 102, 241, 0.4),
          0 0 0 0 rgba(99, 102, 241, 0.3),
          inset 0 1px 0 rgba(255,255,255,0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        animation: mr-breathe 3s ease-in-out infinite;
      }
      .mr-trigger:hover {
        transform: scale(1.08) translateY(-2px);
        box-shadow:
          0 8px 28px rgba(99, 102, 241, 0.5),
          inset 0 1px 0 rgba(255,255,255,0.15);
        animation: none;
      }
      .mr-trigger:active {
        transform: scale(1);
      }
      @keyframes mr-breathe {
        0%, 100% { box-shadow: 0 4px 20px rgba(99,102,241,0.4), 0 0 0 0 rgba(99,102,241,0.25); }
        50% { box-shadow: 0 4px 20px rgba(99,102,241,0.4), 0 0 0 8px rgba(99,102,241,0); }
      }
      .mr-trigger-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 5px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        border: 2px solid var(--mr-bg, #0a0a1a);
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
      }

      /* ========== OVERLAY PANEL ========== */
      .mr-overlay {
        --mr-bg: rgba(10, 10, 26, 0.95);
        --mr-surface: rgba(255, 255, 255, 0.03);
        --mr-border: rgba(255, 255, 255, 0.06);
        --mr-border-hover: rgba(255, 255, 255, 0.12);
        --mr-primary: #a78bfa;
        --mr-primary-dim: rgba(167, 139, 250, 0.12);
        --mr-text: #f0f0f5;
        --mr-text-sec: rgba(255, 255, 255, 0.55);
        --mr-text-muted: rgba(255, 255, 255, 0.3);

        position: fixed;
        top: 0;
        right: -400px;
        width: 380px;
        height: 100vh;
        z-index: 999999;
        transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
        pointer-events: none;
      }
      .mr-overlay.mr-open {
        right: 0;
        pointer-events: auto;
      }

      .mr-panel {
        width: 100%;
        height: 100%;
        background: var(--mr-bg);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border-left: 1px solid var(--mr-border);
        display: flex;
        flex-direction: column;
        box-shadow: -12px 0 48px rgba(0, 0, 0, 0.5);
      }

      /* Top gradient accent */
      .mr-panel::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--mr-primary), #818cf8, transparent);
        opacity: 0.6;
        z-index: 1;
      }

      /* ========== HEADER ========== */
      .mr-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px 14px;
        border-bottom: 1px solid var(--mr-border);
        flex-shrink: 0;
        position: relative;
      }
      .mr-head-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .mr-head-icon {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: var(--mr-primary-dim);
        border: 1px solid rgba(167, 139, 250, 0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .mr-head-text {
        display: flex;
        flex-direction: column;
      }
      .mr-head-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--mr-text);
        letter-spacing: -0.3px;
        line-height: 1.2;
      }
      .mr-head-sub {
        font-size: 10px;
        color: var(--mr-primary);
        font-weight: 600;
        letter-spacing: 0.2px;
        margin-top: 1px;
      }
      .mr-close-btn {
        background: var(--mr-surface);
        border: 1px solid var(--mr-border);
        color: var(--mr-text-muted);
        width: 30px;
        height: 30px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .mr-close-btn:hover {
        background: var(--mr-border-hover);
        color: var(--mr-text);
        transform: scale(1.05);
      }

      /* Current Movie Display */
      .mr-current-movie {
        width: 100%;
        padding: 12px 18px;
        background: linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(129, 140, 248, 0.06) 100%);
        border-bottom: 1px solid var(--mr-border);
        margin-bottom: 8px;
      }
      .mr-current-movie-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--mr-text);
        margin-bottom: 4px;
        display: block;
      }
      .mr-current-movie-type {
        font-size: 11px;
        color: var(--mr-primary);
        font-weight: 500;
        opacity: 0.9;
      }

      /* ========== CARDS CONTAINER ========== */
      .mr-cards {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .mr-cards::-webkit-scrollbar { width: 4px; }
      .mr-cards::-webkit-scrollbar-track { background: transparent; }
      .mr-cards::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      .mr-cards::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }

      /* ========== MOVIE CARD ========== */
      .mr-card {
        display: flex;
        align-items: stretch;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--mr-surface);
        border: 1px solid var(--mr-border);
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        animation: mr-cardIn 0.4s ease-out both;
        animation-delay: calc(var(--i, 0) * 60ms);
        position: relative;
      }
      .mr-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(167, 139, 250, 0.2);
        transform: translateX(-3px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      }
      @keyframes mr-cardIn {
        from { opacity: 0; transform: translateX(24px); }
        to { opacity: 1; transform: translateX(0); }
      }

      /* ========== POSTER ========== */
      .mr-poster-wrap {
        width: 54px;
        min-height: 78px;
        border-radius: 7px;
        overflow: hidden;
        flex-shrink: 0;
        position: relative;
        background: var(--mr-surface);
        border: 1px solid var(--mr-border);
      }
      .mr-poster-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .mr-rating-badge {
        position: absolute;
        bottom: 3px;
        left: 3px;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 5px;
        border-radius: 5px;
        color: #fff;
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        gap: 2px;
        letter-spacing: 0.2px;
      }
      .mr-rating-badge.high { background: rgba(16, 185, 129, 0.85); }
      .mr-rating-badge.mid  { background: rgba(245, 158, 11, 0.85); }
      .mr-rating-badge.low  { background: rgba(239, 68, 68, 0.85); }

      /* ========== INFO ========== */
      .mr-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        padding: 2px 0;
      }
      .mr-title {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--mr-text);
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mr-meta {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-wrap: wrap;
      }
      .mr-year {
        font-size: 11px;
        color: var(--mr-text-muted);
        font-weight: 500;
      }
      .mr-tag {
        font-size: 9px;
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--mr-primary-dim);
        color: #c4b5fd;
        font-weight: 600;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .mr-why {
        margin: 0;
        font-size: 10.5px;
        color: var(--mr-text-muted);
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ========== SAVE BUTTON ========== */
      .mr-save {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: var(--mr-text-muted);
        cursor: pointer;
        padding: 5px;
        border-radius: 6px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
      }
      .mr-card:hover .mr-save { opacity: 1; }
      .mr-save:hover {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
        transform: scale(1.1);
      }
      .mr-save.mr-saved {
        color: #f59e0b;
        opacity: 1;
      }

      /* ========== FOOTER ========== */
      .mr-foot {
        padding: 10px 18px;
        border-top: 1px solid var(--mr-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        background: rgba(0, 0, 0, 0.15);
      }
      .mr-foot-brand {
        font-size: 10px;
        color: var(--mr-text-muted);
        letter-spacing: 0.3px;
      }
      .mr-foot-shortcut {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .mr-foot-shortcut kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1px 5px;
        min-width: 18px;
        height: 16px;
        border-radius: 3px;
        background: var(--mr-surface);
        border: 1px solid var(--mr-border);
        font-family: inherit;
        font-size: 9px;
        font-weight: 600;
        color: var(--mr-text-muted);
        box-shadow: 0 1px 0 rgba(255,255,255,0.03);
      }

      /* ========== EMPTY STATE ========== */
      .mr-empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 28px;
        text-align: center;
      }
      .mr-empty-visual {
        margin-bottom: 16px;
      }
      .mr-empty-circle {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--mr-primary-dim);
        border: 1px solid rgba(167, 139, 250, 0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--mr-primary);
      }
      .mr-error-circle {
        background: rgba(248, 113, 113, 0.08);
        border-color: rgba(248, 113, 113, 0.12);
        color: #f87171;
      }
      .mr-empty-title {
        color: rgba(255, 255, 255, 0.65);
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 4px;
      }
      .mr-empty-desc {
        color: var(--mr-text-muted);
        font-size: 12px;
        line-height: 1.4;
        margin: 0;
        max-width: 240px;
      }

      /* ========== SKELETON ========== */
      .mr-skel { pointer-events: none; }
      .mr-skel .mr-poster-wrap { min-height: 78px; border: none; }
      .mr-shimmer {
        background: linear-gradient(90deg,
          rgba(255,255,255,0.03) 25%,
          rgba(255,255,255,0.08) 50%,
          rgba(255,255,255,0.03) 75%
        );
        background-size: 300% 100%;
        animation: mr-shimmerMove 1.8s ease-in-out infinite;
      }
      @keyframes mr-shimmerMove {
        0% { background-position: 300% 0; }
        100% { background-position: -300% 0; }
      }

      /* ========== RESPONSIVE ========== */
      @media (max-width: 500px) {
        .mr-overlay { width: 100%; right: -100%; }
        .mr-trigger { bottom: 16px; right: 16px; width: 44px; height: 44px; border-radius: 12px; }
      }

      /* ========== FOCUS ========== */
      .mr-close-btn:focus-visible,
      .mr-save:focus-visible,
      .mr-trigger:focus-visible {
        outline: 2px solid rgba(167, 139, 250, 0.5);
        outline-offset: 2px;
      }
    `;

    document.head.appendChild(s);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Overlay;
}
