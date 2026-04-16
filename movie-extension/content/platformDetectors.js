/**
 * Platform Detectors
 * Identifies when user is on a movie detail page and extracts movie title
 * Handles DOM mutations for dynamic content
 */

const PlatformDetectors = {
  /**
   * Detect current platform from URL
   * @returns {string|null} Platform identifier or null
   */
  getCurrentPlatform() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('hotstar.com')) return 'hotstar';
    if (hostname.includes('primevideo.com')) return 'primevideo';
    
    return null;
  },

  /**
   * Check if current page is a movie detail page
   * @returns {boolean}
   */
  isMovieDetailPage() {
    const platform = this.getCurrentPlatform();
    
    if (!platform) return false;
    
    const detectors = {
      hotstar: () => {
        // Hotstar: /detail/<id> or /movie/<title>
        const pathMatch = /\/(detail|movie)\//.test(window.location.pathname);
        return pathMatch && this._hasMovieElements('hotstar');
      },
      primevideo: () => {
        // Prime Video: /detail/<id>
        const pathMatch = /\/detail\//.test(window.location.pathname);
        return pathMatch && this._hasMovieElements('primevideo');
      }
    };

    return detectors[platform]?.() || false;
  },

  /**
   * Check if page has expected movie detail elements
   * @param {string} platform
   * @returns {boolean}
   */
  _hasMovieElements(platform) {
    const checks = {
      hotstar: () => {
        // Check for common Hotstar movie detail page elements
        return !!document.querySelector('[data-testid="detailTitle"]') ||
               !!document.querySelector('h1');
      },
      primevideo: () => {
        // Check for common Prime Video elements
        return !!document.querySelector('[data-a-target="hero-atf-title"]') ||
               !!document.querySelector('h1');
      }
    };

    return checks[platform]?.() || false;
  },

  /**
   * Extract movie title from page
   * Handles dynamic content with fallback selectors
   * @returns {string|null}
   */
  extractMovieTitle() {
    const platform = this.getCurrentPlatform();
    if (!platform) return null;

    const extractors = {
      hotstar: () => {
        // Try multiple selectors for robustness
        const selectors = [
          '[data-testid="detailTitle"]',
          'h1[data-testid]',
          'h1.title',
          'h1:not(.logo):not(.navbar-brand)'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element?.textContent?.trim()) {
            return element.textContent.trim();
          }
        }

        // Fallback: extract from URL
        const match = window.location.pathname.match(/\/(?:detail|movie)\/([^/]+)/);
        return match ? decodeURIComponent(match[1]).replace(/[_-]/g, ' ') : null;
      },

      primevideo: () => {
        const selectors = [
          '[data-a-target="hero-atf-title"]',
          'h1[data-a-target]',
          'h1.title',
          '.hero-title h1'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element?.textContent?.trim()) {
            return element.textContent.trim();
          }
        }

        return null;
      }
    };

    const title = extractors[platform]?.();
    return title ? title.substring(0, 150) : null; // Cap title length
  },

  /**
   * Set up MutationObserver to watch for DOM changes
   * Calls callback when movie title changes
   * @param {Function} callback
   * @returns {MutationObserver}
   */
  observeTitleChanges(callback) {
    const observer = new MutationObserver(() => {
      const title = this.extractMovieTitle();
      if (title) {
        callback(title);
      }
    });

    // Watch for changes in main content area
    const targetElements = [
      document.documentElement,
      document.body
    ];

    for (const target of targetElements) {
      if (target) {
        observer.observe(target, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['data-testid', 'title', 'aria-label']
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

    const detectors = {
      hotstar: () => {
        return !!document.querySelector('[data-testid="loading"]') ||
               !!document.querySelector('.loading');
      },
      primevideo: () => {
        return !!document.querySelector('[data-a-target="loading"]') ||
               !!document.querySelector('.loading');
      }
    };

    return detectors[platform]?.() || false;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlatformDetectors;
}
