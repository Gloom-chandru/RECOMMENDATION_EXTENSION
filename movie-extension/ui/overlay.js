/**
 * Overlay UI Manager — BuyHatke-inspired Design
 * Compact sidebar with horizontal card layout
 * Floating trigger button + glassmorphism panel
 */

const Overlay = {
  // State
  isVisible: false,
  currentRecommendations: [],
  container: null,
  triggerBtn: null,

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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
        <line x1="7" y1="2" x2="7" y2="22"></line>
        <line x1="17" y1="2" x2="17" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
      </svg>
      <span class="mr-trigger-badge" id="mr-badge" style="display:none;">0</span>
    `;
    this.triggerBtn.title = 'Movie Recommendations';
    this.triggerBtn.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.triggerBtn);

    console.log('[Overlay] Initialized');
  },

  /**
   * Show overlay with recommendations
   */
  async show(recommendations = []) {
    try {
      if (!this.container) this.init();

      this.currentRecommendations = recommendations;

      if (recommendations.length === 0) {
        this._renderLoading();
        this._openPanel();

        const recs = await Recommender.getRecommendations();
        this.currentRecommendations = recs;

        if (recs.length === 0) {
          this._renderEmpty();
          return;
        }
      }

      this._render();
      this._openPanel();
      this._updateBadge(this.currentRecommendations.length);
    } catch (error) {
      console.error('[Overlay] Error:', error);
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
   * Main render — horizontal card layout
   */
  _render() {
    const recs = this.currentRecommendations;

    this.container.innerHTML = `
      <div class="mr-panel">
        <div class="mr-head">
          <div class="mr-head-left">
            <svg class="mr-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
            <span class="mr-head-title">Movie Buddy</span>
            <span class="mr-head-count">${recs.length} picks</span>
          </div>
          <button class="mr-close-btn" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="mr-cards">
          ${recs.map((m, i) => this._renderCard(m, i)).join('')}
        </div>

        <div class="mr-foot">
          <span>Powered by TMDb</span>
          <span>Alt+R to toggle</span>
        </div>
      </div>
    `;

    this._attachEvents();
  },

  /**
   * Horizontal movie card
   */
  _renderCard(movie, index) {
    const poster = API.getPosterUrl(movie.posterPath, 'w185');
    const rating = movie.rating ? movie.rating.toFixed(1) : '—';
    const year = movie.releaseDate ? movie.releaseDate.split('-')[0] : '';
    const ratingClass = movie.rating >= 7 ? 'high' : movie.rating >= 5 ? 'mid' : 'low';

    // Map genre IDs to names for display
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

    const explanation = movie.explanation || movie.source || 'Recommended for you';

    return `
      <div class="mr-card" data-id="${movie.id}" style="--delay:${index * 60}ms">
        <div class="mr-poster">
          <img src="${poster}" alt="${this._esc(movie.title)}" loading="lazy">
          <div class="mr-rating ${ratingClass}">★ ${rating}</div>
        </div>
        <div class="mr-info">
          <h4 class="mr-title">${this._esc(movie.title)}</h4>
          <div class="mr-meta">
            ${year ? `<span class="mr-year">${year}</span>` : ''}
            ${genreTags}
          </div>
          <p class="mr-why">${this._esc(explanation)}</p>
        </div>
        <button class="mr-save" data-movie-id="${movie.id}" title="Bookmark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>
    `;
  },

  _renderLoading() {
    this.container.innerHTML = `
      <div class="mr-panel">
        <div class="mr-head">
          <div class="mr-head-left">
            <svg class="mr-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
            <span class="mr-head-title">Movie Buddy</span>
          </div>
          <button class="mr-close-btn" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="mr-cards">
          ${[1,2,3,4].map(() => `
            <div class="mr-card mr-skeleton-card">
              <div class="mr-poster mr-shimmer"></div>
              <div class="mr-info">
                <div class="mr-shimmer" style="width:70%;height:14px;border-radius:4px;margin-bottom:8px"></div>
                <div class="mr-shimmer" style="width:50%;height:10px;border-radius:4px;margin-bottom:6px"></div>
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
        <div class="mr-head">
          <div class="mr-head-left">
            <svg class="mr-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
            <span class="mr-head-title">Movie Buddy</span>
          </div>
          <button class="mr-close-btn" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="mr-empty">
          <div class="mr-empty-icon">🎬</div>
          <p>No recommendations yet</p>
          <small>Browse some movies and we'll suggest what to watch next!</small>
        </div>
      </div>
    `;
    this._attachEvents();
  },

  _renderError() {
    this.container.innerHTML = `
      <div class="mr-panel">
        <div class="mr-head">
          <div class="mr-head-left">
            <svg class="mr-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
            <span class="mr-head-title">Movie Buddy</span>
          </div>
          <button class="mr-close-btn" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="mr-empty">
          <div class="mr-empty-icon">⚠️</div>
          <p>Couldn't load recommendations</p>
          <small>Check your connection and try again.</small>
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
        }
      });
    });

    // Card click → open TMDb
    this.container.querySelectorAll('.mr-card').forEach(card => {
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
      /* ========== FLOATING TRIGGER ========== */
      .mr-trigger {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999998;
        width: 48px;
        height: 48px;
        border-radius: 14px;
        border: none;
        background: linear-gradient(135deg, #7c3aed, #6366f1);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5), 0 0 0 0 rgba(99,102,241,0.3);
        transition: all 0.3s cubic-bezier(.4,0,.2,1);
        animation: mr-pulse 2.5s ease-in-out infinite;
      }
      .mr-trigger:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 28px rgba(99, 102, 241, 0.6);
        animation: none;
      }
      @keyframes mr-pulse {
        0%,100% { box-shadow: 0 4px 20px rgba(99,102,241,0.5), 0 0 0 0 rgba(99,102,241,0.3); }
        50% { box-shadow: 0 4px 20px rgba(99,102,241,0.5), 0 0 0 8px rgba(99,102,241,0); }
      }
      .mr-trigger-badge {
        position: absolute;
        top: -4px;
        right: -4px;
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
        padding: 0 4px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      /* ========== OVERLAY PANEL ========== */
      .mr-overlay {
        position: fixed;
        top: 0;
        right: -400px;
        width: 380px;
        height: 100vh;
        z-index: 999999;
        transition: right 0.35s cubic-bezier(.4,0,.2,1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        pointer-events: none;
      }
      .mr-overlay.mr-open {
        right: 0;
        pointer-events: auto;
      }

      .mr-panel {
        width: 100%;
        height: 100%;
        background: rgba(15, 15, 30, 0.92);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-left: 1px solid rgba(255,255,255,0.08);
        display: flex;
        flex-direction: column;
        box-shadow: -8px 0 40px rgba(0,0,0,0.5);
      }

      /* ========== HEADER ========== */
      .mr-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        flex-shrink: 0;
      }
      .mr-head-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mr-head-title {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
        letter-spacing: -0.3px;
      }
      .mr-head-count {
        font-size: 11px;
        color: #a78bfa;
        background: rgba(167,139,250,0.12);
        padding: 2px 8px;
        border-radius: 10px;
        font-weight: 600;
      }
      .mr-close-btn {
        background: rgba(255,255,255,0.06);
        border: none;
        color: rgba(255,255,255,0.5);
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .mr-close-btn:hover {
        background: rgba(255,255,255,0.12);
        color: #fff;
      }

      /* ========== CARDS CONTAINER ========== */
      .mr-cards {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .mr-cards::-webkit-scrollbar { width: 4px; }
      .mr-cards::-webkit-scrollbar-track { background: transparent; }
      .mr-cards::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
      .mr-cards::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

      /* ========== CARD ========== */
      .mr-card {
        display: flex;
        align-items: stretch;
        gap: 12px;
        padding: 10px;
        border-radius: 10px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.05);
        cursor: pointer;
        transition: all 0.25s cubic-bezier(.4,0,.2,1);
        animation: mr-slideIn 0.35s ease-out forwards;
        animation-delay: var(--delay, 0ms);
        opacity: 0;
        position: relative;
      }
      .mr-card:hover {
        background: rgba(255,255,255,0.07);
        border-color: rgba(167,139,250,0.25);
        transform: translateX(-3px);
        box-shadow: 0 2px 12px rgba(0,0,0,0.2);
      }
      @keyframes mr-slideIn {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
      }

      /* ========== POSTER ========== */
      .mr-poster {
        width: 56px;
        min-height: 80px;
        border-radius: 6px;
        overflow: hidden;
        flex-shrink: 0;
        position: relative;
        background: rgba(255,255,255,0.05);
      }
      .mr-poster img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .mr-rating {
        position: absolute;
        bottom: 3px;
        left: 3px;
        font-size: 9px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 4px;
        color: #fff;
        backdrop-filter: blur(6px);
        letter-spacing: 0.3px;
      }
      .mr-rating.high { background: rgba(16,185,129,0.85); }
      .mr-rating.mid  { background: rgba(245,158,11,0.85); }
      .mr-rating.low  { background: rgba(239,68,68,0.85); }

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
        color: #f0f0f0;
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
        color: rgba(255,255,255,0.45);
        font-weight: 500;
      }
      .mr-tag {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        background: rgba(167,139,250,0.12);
        color: #c4b5fd;
        font-weight: 500;
        white-space: nowrap;
      }
      .mr-why {
        margin: 0;
        font-size: 11px;
        color: rgba(255,255,255,0.35);
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
        color: rgba(255,255,255,0.25);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
      }
      .mr-card:hover .mr-save { opacity: 1; }
      .mr-save:hover { color: #f59e0b; background: rgba(245,158,11,0.1); }
      .mr-save.mr-saved { color: #f59e0b; opacity: 1; }

      /* ========== FOOTER ========== */
      .mr-foot {
        padding: 10px 16px;
        border-top: 1px solid rgba(255,255,255,0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      .mr-foot span {
        font-size: 10px;
        color: rgba(255,255,255,0.25);
        letter-spacing: 0.3px;
      }

      /* ========== EMPTY STATE ========== */
      .mr-empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 24px;
        text-align: center;
      }
      .mr-empty-icon { font-size: 40px; margin-bottom: 12px; }
      .mr-empty p { color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 6px; }
      .mr-empty small { color: rgba(255,255,255,0.35); font-size: 12px; }

      /* ========== SKELETON ========== */
      .mr-skeleton-card { pointer-events: none; }
      .mr-skeleton-card .mr-poster { min-height: 80px; }
      .mr-shimmer {
        background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%);
        background-size: 300% 100%;
        animation: mr-shimmerAnim 1.8s ease-in-out infinite;
      }
      @keyframes mr-shimmerAnim {
        0% { background-position: 300% 0; }
        100% { background-position: -300% 0; }
      }

      /* ========== RESPONSIVE ========== */
      @media (max-width: 500px) {
        .mr-overlay { width: 100%; right: -100%; }
        .mr-trigger { bottom: 16px; right: 16px; width: 44px; height: 44px; }
      }

      /* ========== FOCUS ========== */
      .mr-close-btn:focus-visible,
      .mr-save:focus-visible,
      .mr-trigger:focus-visible {
        outline: 2px solid rgba(167,139,250,0.6);
        outline-offset: 2px;
      }
    `;

    document.head.appendChild(s);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Overlay;
}
