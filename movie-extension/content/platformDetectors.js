/**
 * Platform Detectors v2.0
 * Supports: Hotstar, Prime Video, Netflix, Disney+, Hulu, JioCinema, Zee5, SonyLIV, Crunchyroll
 * Detects both Movies and TV Shows
 */

const PlatformDetectors = {
  /**
   * Detect current platform from URL
   * @returns {string|null}
   */
  getCurrentPlatform() {
    const h = window.location.hostname;
    if (h.includes('hotstar.com')) return 'hotstar';
    if (h.includes('primevideo.com')) return 'primevideo';
    if (h.includes('netflix.com')) return 'netflix';
    if (h.includes('disneyplus.com')) return 'disneyplus';
    if (h.includes('hulu.com')) return 'hulu';
    if (h.includes('jiocinema.com')) return 'jiocinema';
    if (h.includes('zee5.com')) return 'zee5';
    if (h.includes('sonyliv.com')) return 'sonyliv';
    if (h.includes('crunchyroll.com')) return 'crunchyroll';
    return null;
  },

  /**
   * Detect content type — 'movie', 'tv', or null
   * @returns {string|null}
   */
  getContentType() {
    const platform = this.getCurrentPlatform();
    if (!platform) return null;
    const path = window.location.pathname.toLowerCase();

    const tvIndicators = {
      hotstar: () => /\/(tv|show|series|episode)\//.test(path) ||
                     !!document.querySelector('[data-testid*="episode"]') ||
                     !!document.querySelector('.episode-list'),
      primevideo: () => /\/(season|episode)/.test(path) ||
                        !!document.querySelector('[data-testid="episodes"]') ||
                        !!document.querySelector('.episodeSelector'),
      netflix: () => !!document.querySelector('[data-uia="episodes-container"]') ||
                     !!document.querySelector('.episodesContainer'),
      disneyplus: () => /\/(series|episode)\//.test(path) ||
                        !!document.querySelector('[data-testid="episodes"]'),
      hulu: () => /\/(series|episode)\//.test(path) ||
                  !!document.querySelector('.EpisodeCollection'),
      jiocinema: () => /\/(tv-show|series|episode)\//.test(path) ||
                       !!document.querySelector('.episode-container'),
      zee5: () => /\/(tv-show|web-series|episode)\//.test(path) ||
                  !!document.querySelector('.episodeList'),
      sonyliv: () => /\/(show|episode)\//.test(path) ||
                     !!document.querySelector('.episode-list'),
      crunchyroll: () => /\/(series|episode)\//.test(path) ||
                         !!document.querySelector('.erc-episodes-container')
    };

    if (tvIndicators[platform]?.()) return 'tv';
    if (this.isMovieDetailPage()) return 'movie';
    return null;
  },

  /**
   * Check if current page is a movie/show detail page
   * @returns {boolean}
   */
  isMovieDetailPage() {
    const platform = this.getCurrentPlatform();
    if (!platform) return false;

    const detectors = {
      hotstar: () => {
        const p = /\/(detail|movie|show|series)\//.test(window.location.pathname);
        return p && this._hasMovieElements('hotstar');
      },
      primevideo: () => {
        const p = /\/detail\//.test(window.location.pathname);
        return p && this._hasMovieElements('primevideo');
      },
      netflix: () => {
        const p = /\/(title|watch)\//.test(window.location.pathname);
        return p && this._hasMovieElements('netflix');
      },
      disneyplus: () => {
        const p = /\/(movies|series|video)\//.test(window.location.pathname);
        return p && this._hasMovieElements('disneyplus');
      },
      hulu: () => {
        const p = /\/(movie|series|watch)\//.test(window.location.pathname);
        return p && this._hasMovieElements('hulu');
      },
      jiocinema: () => {
        const p = /\/(movies|tv-show|web-series)\//.test(window.location.pathname);
        return p && this._hasMovieElements('jiocinema');
      },
      zee5: () => {
        const p = /\/(movies|tv-show|web-series|details)\//.test(window.location.pathname);
        return p && this._hasMovieElements('zee5');
      },
      sonyliv: () => {
        const p = /\/(movies|show|detail)\//.test(window.location.pathname);
        return p && this._hasMovieElements('sonyliv');
      },
      crunchyroll: () => {
        const p = /\/(series|watch)\//.test(window.location.pathname);
        return p && this._hasMovieElements('crunchyroll');
      }
    };

    return detectors[platform]?.() || false;
  },

  /**
   * Check if page has expected detail elements
   * @param {string} platform
   * @returns {boolean}
   */
  _hasMovieElements(platform) {
    const checks = {
      hotstar: () => !!document.querySelector('[data-testid="detailTitle"]') || !!document.querySelector('h1'),
      primevideo: () => !!document.querySelector('[data-a-target="hero-atf-title"]') || !!document.querySelector('h1'),
      netflix: () => !!document.querySelector('[data-uia="hero-title"]') || !!document.querySelector('h1') || !!document.querySelector('.title-info h1'),
      disneyplus: () => !!document.querySelector('[data-testid="title"]') || !!document.querySelector('h1') || !!document.querySelector('.title-field h1'),
      hulu: () => !!document.querySelector('.DetailEntityMasthead__title') || !!document.querySelector('h1'),
      jiocinema: () => !!document.querySelector('.content-title') || !!document.querySelector('h1'),
      zee5: () => !!document.querySelector('.movie-title') || !!document.querySelector('.content-title') || !!document.querySelector('h1'),
      sonyliv: () => !!document.querySelector('.content-detail-title') || !!document.querySelector('h1'),
      crunchyroll: () => !!document.querySelector('.hero-heading-line') || !!document.querySelector('h1.title')
    };
    return checks[platform]?.() || false;
  },

  /**
   * Extract movie/show title from page
   * @returns {string|null}
   */
  extractMovieTitle() {
    const platform = this.getCurrentPlatform();
    if (!platform) return null;

    const extractors = {
      hotstar: () => this._trySelectors([
        '[data-testid="detailTitle"]', 'h1[data-testid]', 'h1.title',
        'h1:not(.logo):not(.navbar-brand)'
      ]) || this._extractFromUrl(/\/(?:detail|movie|show)\/([^/]+)/),

      primevideo: () => this._trySelectors([
        '[data-a-target="hero-atf-title"]', 'h1[data-a-target]', 'h1.title', '.hero-title h1'
      ]),

      netflix: () => this._trySelectors([
        '[data-uia="hero-title"]', '.title-info h1', 'h1[data-uia]',
        '.previewModal--player-titleTreatment h1', 'h1:not(.logo):not(.navbar-brand)'
      ]) || this._extractFromUrl(/\/title\/(\d+)/),

      disneyplus: () => this._trySelectors([
        '[data-testid="title"]', '.title-field h1', 'h1[data-testid]',
        'h1:not(.logo)'
      ]),

      hulu: () => this._trySelectors([
        '.DetailEntityMasthead__title', 'h1.masthead-title', 'h1:not(.logo)'
      ]),

      jiocinema: () => this._trySelectors([
        '.content-title', '.meta-title h1', 'h1.title', 'h1:not(.logo)'
      ]) || this._extractFromUrl(/\/(?:movies|tv-show)\/([^/]+)/),

      zee5: () => this._trySelectors([
        '.movie-title', '.content-title', '.detail-title h1', 'h1:not(.logo)'
      ]) || this._extractFromUrl(/\/(?:movies|tv-show|web-series)\/[^/]+\/([^/]+)/),

      sonyliv: () => this._trySelectors([
        '.content-detail-title', '.detail-title', 'h1.title', 'h1:not(.logo)'
      ]),

      crunchyroll: () => this._trySelectors([
        '.hero-heading-line', 'h1.title', '.erc-series-hero h1',
        'h1:not(.logo)'
      ])
    };

    const title = extractors[platform]?.();
    return title ? title.substring(0, 150) : null;
  },

  /**
   * Try multiple CSS selectors, return first match text
   */
  _trySelectors(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return null;
  },

  /**
   * Extract title from URL path
   */
  _extractFromUrl(regex) {
    const match = window.location.pathname.match(regex);
    return match ? decodeURIComponent(match[1]).replace(/[_-]/g, ' ') : null;
  },

  /**
   * Set up MutationObserver to watch for DOM changes
   * @param {Function} callback
   * @returns {MutationObserver}
   */
  observeTitleChanges(callback) {
    let debounceTimer = null;

    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const title = this.extractMovieTitle();
        if (title) callback(title);
      }, 300);
    });

    const targets = [document.documentElement, document.body];
    for (const target of targets) {
      if (target) {
        observer.observe(target, {
          childList: true, subtree: true, characterData: false,
          attributes: true, attributeFilter: ['data-testid', 'title', 'aria-label']
        });
      }
    }
    return observer;
  },

  /**
   * Detect if page is loading/transitioning
   * @returns {boolean}
   */
  isPageTransitioning() {
    const platform = this.getCurrentPlatform();
    if (!platform) return false;

    return !!document.querySelector('[data-testid="loading"]') ||
           !!document.querySelector('[data-a-target="loading"]') ||
           !!document.querySelector('.loading') ||
           !!document.querySelector('.spinner');
  },

  /**
   * Check if current content is live (not pre-recorded)
   * @returns {boolean}
   */
  isLiveContent() {
    const platform = this.getCurrentPlatform();
    if (!platform) return false;

    // Universal live content checks
    if (document.querySelector('[aria-label*="live" i]') ||
        document.querySelector('.live-badge') ||
        document.querySelector('.live-indicator') ||
        /\/live\//.test(window.location.pathname)) {
      return true;
    }

    // Platform-specific
    const checks = {
      netflix: () => !!document.querySelector('[data-uia*="live"]') ||
                     !!document.querySelector('.player-status--live'),
      hotstar: () => !!document.querySelector('[data-testid*="live"]'),
      primevideo: () => !!document.querySelector('[data-a-target*="live"]'),
      jiocinema: () => !!document.querySelector('.live-tag') ||
                       /\/live-tv\//.test(window.location.pathname),
      zee5: () => !!document.querySelector('.live-label') ||
                  /\/live-tv\//.test(window.location.pathname),
      sonyliv: () => /\/live-tv\//.test(window.location.pathname)
    };

    if (checks[platform]?.()) return true;

    // Fallback: check for LIVE text
    const elements = document.querySelectorAll('span, div');
    for (const el of elements) {
      if (el.children.length === 0 && el.textContent.trim() === 'LIVE') return true;
    }
    return false;
  },

  /**
   * Detect if content is anime (for Crunchyroll and others)
   * @returns {boolean}
   */
  isAnimeContent() {
    const platform = this.getCurrentPlatform();
    
    // Crunchyroll is always anime
    if (platform === 'crunchyroll') return true;

    // Check URL patterns
    if (/\/anime\//.test(window.location.pathname)) return true;

    // Check for anime-related DOM elements
    if (document.querySelector('[data-testid*="anime"]') ||
        document.querySelector('.anime-tag') ||
        document.querySelector('[class*="anime"]')) {
      return true;
    }

    // Check genre tags on the page
    const genreElements = document.querySelectorAll('.genre, .genre-tag, .tag, [class*="genre"]');
    for (const el of genreElements) {
      const text = el.textContent.trim().toLowerCase();
      if (text === 'anime' || text === 'animation' || text === 'アニメ') return true;
    }

    return false;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlatformDetectors;
}
