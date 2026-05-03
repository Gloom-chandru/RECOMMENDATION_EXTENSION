/**
 * TMDb API Module
 * Handles all interactions with The Movie Database API
 * Includes error handling, retries, rate limiting, and caching integration
 */

/**
 * RateLimiter — Concurrency-limited request queue with 429 backoff
 * 
 * TMDb free tier allows ~40 requests per 10 seconds.
 * This limiter enforces:
 *   - Max 4 concurrent in-flight requests
 *   - 100ms minimum gap between request starts
 *   - Exponential backoff on 429 (1s → 2s → 4s)
 */
const RateLimiter = {
  MAX_CONCURRENT: 4,
  MIN_DELAY_MS: 100,        // minimum gap between requests
  BACKOFF_BASE_MS: 1000,    // initial backoff on 429
  MAX_BACKOFF_MS: 8000,     // cap backoff at 8 seconds

  _activeCount: 0,
  _queue: [],
  _lastRequestTime: 0,
  _consecutiveRateLimits: 0,

  /**
   * Enqueue a fetch task. Returns a Promise that resolves
   * when the task completes (after waiting for a concurrency slot).
   * @param {Function} fetchFn — async function that performs the actual fetch
   * @returns {Promise<any>}
   */
  enqueue(fetchFn) {
    return new Promise((resolve, reject) => {
      this._queue.push({ fetchFn, resolve, reject });
      this._processQueue();
    });
  },

  /**
   * Process queued tasks up to MAX_CONCURRENT
   */
  async _processQueue() {
    if (this._activeCount >= this.MAX_CONCURRENT || this._queue.length === 0) {
      return;
    }

    const { fetchFn, resolve, reject } = this._queue.shift();
    this._activeCount++;

    try {
      // Enforce minimum delay between requests
      const now = Date.now();
      const elapsed = now - this._lastRequestTime;
      if (elapsed < this.MIN_DELAY_MS) {
        await new Promise(r => setTimeout(r, this.MIN_DELAY_MS - elapsed));
      }
      this._lastRequestTime = Date.now();

      const result = await fetchFn();

      // Successful request — reset rate limit counter
      this._consecutiveRateLimits = 0;
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this._activeCount--;
      // Process next item in queue
      if (this._queue.length > 0) {
        this._processQueue();
      }
    }
  },

  /**
   * Calculate backoff delay for 429 responses
   * Uses exponential backoff with jitter
   * @returns {number} delay in ms
   */
  getBackoffDelay() {
    this._consecutiveRateLimits++;
    const baseDelay = this.BACKOFF_BASE_MS * Math.pow(2, this._consecutiveRateLimits - 1);
    const cappedDelay = Math.min(baseDelay, this.MAX_BACKOFF_MS);
    // Add ±20% jitter to prevent thundering herd
    const jitter = cappedDelay * (0.8 + Math.random() * 0.4);
    return Math.round(jitter);
  },

  /**
   * Reset the limiter state (useful for testing or cache clear)
   */
  reset() {
    this._activeCount = 0;
    this._queue = [];
    this._lastRequestTime = 0;
    this._consecutiveRateLimits = 0;
  }
};

const API = {
  // Replace with your actual TMDb API key
  // Get key from: https://www.themoviedb.org/settings/api
  API_KEY: '60c9c200e666f53e911be8af138ccddb',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
  
  // Configuration
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second (base delay for non-429 retries)

  /**
   * Generic fetch with error handling, rate limiting, and retries
   * All requests go through RateLimiter to enforce concurrency limits.
   * 429 responses trigger exponential backoff before retry.
   * 
   * @param {string} url — full API URL
   * @param {number} attempt — current retry attempt (1-indexed)
   * @returns {Promise<Response>}
   */
  async _fetchWithRetry(url, attempt = 1) {
    return RateLimiter.enqueue(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });

        clearTimeout(timeoutId);

        // Handle 429 Too Many Requests with exponential backoff
        if (response.status === 429) {
          if (attempt < this.RETRY_ATTEMPTS) {
            // Use Retry-After header if provided, otherwise use backoff
            const retryAfterHeader = response.headers.get('Retry-After');
            const backoffDelay = retryAfterHeader
              ? parseInt(retryAfterHeader, 10) * 1000
              : RateLimiter.getBackoffDelay();

            console.warn(`[API] Rate limited (429). Backing off ${backoffDelay}ms before retry ${attempt + 1}/${this.RETRY_ATTEMPTS}...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            return this._fetchWithRetry(url, attempt + 1);
          }
          throw new Error('API rate limit exceeded — too many requests. Please wait a moment.');
        }

        // Handle other HTTP errors
        if (!response.ok) {
          throw new Error(`API Error ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        // Retry on network/timeout errors (not on 429, handled above)
        if (error.name === 'AbortError') {
          error.message = 'API request timed out';
        }

        if (attempt < this.RETRY_ATTEMPTS && error.message !== 'API rate limit exceeded — too many requests. Please wait a moment.') {
          const delay = this.RETRY_DELAY * attempt; // linear backoff for non-429
          console.warn(`[API] Retry attempt ${attempt + 1}/${this.RETRY_ATTEMPTS} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this._fetchWithRetry(url, attempt + 1);
        }

        throw error;
      }
    });
  },

  /**
   * Search for movie by title
   */
  async searchMovie(title) {
    if (!title || !title.trim()) {
      return null;
    }

    try {
      const cached = await Cache.get('movie', title);
      if (cached) {
        console.log('[API] Cache hit for movie:', title);
        return cached;
      }

      const url = `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(title)}&language=en-US`
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return null;
      }

      const movie = data.results[0];
      const movieData = {
        id: movie.id,
        title: movie.title,
        releaseDate: movie.release_date,
        rating: movie.vote_average,
        description: movie.overview,
        genres: movie.genre_ids || [],
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path
      };

      await Cache.set('movie', title, movieData);
      return movieData;
    } catch (error) {
      console.error('[API] Error searching movie:', error);
      return null;
    }
  },

  /**
   * Get similar movies
   */
  async getSimilarMovies(movieId, page = 1) {
    if (!movieId) return null;

    try {
      const cacheKey = `${movieId}_page_`;
      const cached = await Cache.get('similar_movies', cacheKey);
      if (cached) {
        return cached;
      }

      const url = `${this.BASE_URL}/movie/${movieId}/similar?api_key=${this.API_KEY}&language=en-US&page=${page}`;
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      const movies = data.results
        .filter(movie => movie.vote_average >= 5.0 && movie.vote_count >= 50)
        .slice(0, 15)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          rating: movie.vote_average,
          voteCount: movie.vote_count,
          description: movie.overview,
          genres: movie.genre_ids || [],
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          originalLanguage: movie.original_language
        }));

      await Cache.set('similar_movies', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error getting similar movies:', error);
      return [];
    }
  },

  /**
   * Get TMDb collaborative-filtering recommendations for a movie
   * Different from /similar — uses user behavior patterns on TMDb
   * @param {number} movieId
   * @param {number} page
   * @returns {Promise<Array>}
   */
  async getMovieRecommendations(movieId, page = 1) {
    if (!movieId) return [];

    try {
      const cacheKey = `recs_${movieId}_page_${page}`;
      const cached = await Cache.get('movie_recs', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/movie/${movieId}/recommendations?api_key=${this.API_KEY}&language=en-US&page=${page}`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) return [];

      const movies = data.results
        .filter(movie => movie.vote_average >= 5.0 && movie.vote_count >= 50)
        .slice(0, 15)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          rating: movie.vote_average,
          voteCount: movie.vote_count,
          description: movie.overview,
          genres: movie.genre_ids || [],
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          originalLanguage: movie.original_language
        }));

      await Cache.set('movie_recs', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error getting movie recommendations:', error);
      return [];
    }
  },

  /**
   * Get movie keywords (themes like "heist", "time travel", "dystopia")
   * @param {number} movieId
   * @returns {Promise<Array>}
   */
  async getMovieKeywords(movieId) {
    if (!movieId) return [];

    try {
      const cacheKey = `keywords_${movieId}`;
      const cached = await Cache.get('movie_keywords', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/movie/${movieId}/keywords?api_key=${this.API_KEY}`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      const keywords = (data.keywords || []).map(k => ({ id: k.id, name: k.name }));

      await Cache.set('movie_keywords', cacheKey, keywords);
      return keywords;
    } catch (error) {
      console.error('[API] Error getting movie keywords:', error);
      return [];
    }
  },

  /**
   * Get movie credits (cast + crew — directors, lead actors)
   * @param {number} movieId
   * @returns {Promise<Object>}
   */
  async getMovieCredits(movieId) {
    if (!movieId) return { directors: [], topCast: [] };

    try {
      const cacheKey = `credits_${movieId}`;
      const cached = await Cache.get('movie_credits', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/movie/${movieId}/credits?api_key=${this.API_KEY}`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      const directors = (data.crew || [])
        .filter(c => c.job === 'Director')
        .map(c => ({ id: c.id, name: c.name }));

      const topCast = (data.cast || [])
        .slice(0, 5)
        .map(c => ({ id: c.id, name: c.name, character: c.character }));

      const credits = { directors, topCast };

      await Cache.set('movie_credits', cacheKey, credits);
      return credits;
    } catch (error) {
      console.error('[API] Error getting movie credits:', error);
      return { directors: [], topCast: [] };
    }
  },

  /**
   * Discover movies by multiple genre IDs (intersection)
   * Much more precise than single-genre discover
   * @param {Array<number>} genreIds - Array of genre IDs to intersect
   * @param {Object} options - Additional filter options
   * @returns {Promise<Array>}
   */
  async discoverByMultipleGenres(genreIds, options = {}) {
    if (!genreIds || genreIds.length === 0) return [];

    try {
      const genreStr = genreIds.join(',');
      const page = options.page || 1;
      const sortBy = options.sortBy || 'vote_average.desc';
      const voteCountGte = options.voteCountGte || 200;
      const language = options.withLanguage || '';

      const cacheKey = `multig_${genreStr}_${sortBy}_${voteCountGte}_${language}_p${page}`;
      const cached = await Cache.get('multi_genre_discover', cacheKey);
      if (cached) return cached;

      let url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=en-US&with_genres=${genreStr}&sort_by=${sortBy}&vote_count.gte=${voteCountGte}&page=${page}`;
      if (language) {
        url += `&with_original_language=${language}`;
      }

      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) return [];

      const movies = data.results
        .slice(0, 15)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          rating: movie.vote_average,
          voteCount: movie.vote_count,
          description: movie.overview,
          genres: movie.genre_ids || [],
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          originalLanguage: movie.original_language
        }));

      await Cache.set('multi_genre_discover', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error discovering by multiple genres:', error);
      return [];
    }
  },

  /**
   * Discover movies by a specific person (director or actor)
   * @param {number} personId
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async discoverByPerson(personId, options = {}) {
    if (!personId) return [];

    try {
      const page = options.page || 1;
      const sortBy = options.sortBy || 'vote_average.desc';
      const voteCountGte = options.voteCountGte || 100;

      const cacheKey = `person_${personId}_${sortBy}_p${page}`;
      const cached = await Cache.get('person_discover', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=en-US&with_people=${personId}&sort_by=${sortBy}&vote_count.gte=${voteCountGte}&page=${page}`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) return [];

      const movies = data.results
        .slice(0, 10)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          rating: movie.vote_average,
          voteCount: movie.vote_count,
          description: movie.overview,
          genres: movie.genre_ids || [],
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          originalLanguage: movie.original_language
        }));

      await Cache.set('person_discover', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error discovering by person:', error);
      return [];
    }
  },

  /**
   * Discover movies by keyword IDs
   * @param {Array<number>} keywordIds
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async discoverByKeywords(keywordIds, options = {}) {
    if (!keywordIds || keywordIds.length === 0) return [];

    try {
      const kwStr = keywordIds.slice(0, 5).join(',');
      const page = options.page || 1;
      const voteCountGte = options.voteCountGte || 100;

      const cacheKey = `kw_${kwStr}_p${page}`;
      const cached = await Cache.get('keyword_discover', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=en-US&with_keywords=${kwStr}&sort_by=vote_average.desc&vote_count.gte=${voteCountGte}&page=${page}`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) return [];

      const movies = data.results
        .slice(0, 10)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          rating: movie.vote_average,
          voteCount: movie.vote_count,
          description: movie.overview,
          genres: movie.genre_ids || [],
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          originalLanguage: movie.original_language
        }));

      await Cache.set('keyword_discover', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error discovering by keywords:', error);
      return [];
    }
  },

  /**
   * Get movies by genre
   */
  async getMoviesByGenre(genreId, page = 1) {
    if (!genreId) return null;

    try {
      const cacheKey = `${genreId}_page_`;
      const cached = await Cache.get('genre_movies', cacheKey);
      if (cached) {
        return cached;
      }

      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=en-US&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=100&page=${page}`
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      const movies = data.results
        .filter(movie => movie.vote_average >= 5.0)
        .slice(0, 10)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          rating: movie.vote_average,
          voteCount: movie.vote_count,
          description: movie.overview,
          genres: movie.genre_ids || [],
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          originalLanguage: movie.original_language
        }));

      await Cache.set('genre_movies', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error getting movies by genre:', error);
      return [];
    }
  },

  /**
   * Get movies by language
   * Enhanced to properly filter by original language
   * Supports all ISO 639-1 language codes
   */
  async getMoviesByLanguage(languageCode, page = 1) {
    if (!languageCode) return null;

    try {
      const cacheKey = `${languageCode}_page_${page}`;
      const cached = await Cache.get('language_movies', cacheKey);
      if (cached) {
        return cached;
      }

      // Use with_original_language parameter to filter by language
      // This properly filters movies by their original language
      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=en-US&with_original_language=${languageCode}&sort_by=popularity.desc&page=${page}`;
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      const movies = data.results
        .filter(movie => movie.vote_average >= 5.0 && movie.vote_count >= 50)
        .slice(0, 10)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          rating: movie.vote_average,
          voteCount: movie.vote_count,
          description: movie.overview,
          genres: movie.genre_ids || [],
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          originalLanguage: movie.original_language
        }));

      await Cache.set('language_movies', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error getting movies by language:', error);
      return [];
    }
  },

  /**
   * Get popular movies
   */
  async getPopularMovies(page = 1) {
    try {
      const cacheKey = `popular_page_${page}`;
      const cached = await Cache.get('popular_movies', cacheKey);
      if (cached) {
        return cached;
      }
      
      const url = `${this.BASE_URL}/movie/popular?api_key=${this.API_KEY}&language=en-US&page=${page}`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        return [];
      }
      
      const movies = data.results
        .filter(movie => movie.vote_average >= 4.0)
        .slice(0, 20)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          rating: movie.vote_average,
          description: movie.overview,
          genres: movie.genre_ids || [],
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          originalLanguage: movie.original_language
        }));
      
      await Cache.set('popular_movies', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error getting popular movies:', error);
      return [];
    }
  },

  /**
   * Get poster URL
   */
  getPosterUrl(posterPath, size = 'w342') {
    if (!posterPath) {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 342 513'%3E%3Crect fill='%23444' width='342' height='513'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23fff' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
    }
    return `${this.IMAGE_BASE_URL}/${size}${posterPath}`;
  },

  /**
   * Get trending movies by language
   * Fetches movies that are trending in a specific language region
   * Supports all languages for comprehensive global coverage
   * @param {string} languageCode ISO 639-1 language code
   * @param {number} page pagination
   * @returns {Promise<Array>}
   */
  async getTrendingByLanguage(languageCode, page = 1) {
    if (!languageCode) return [];

    try {
      const cacheKey = `trending_${languageCode}_page_${page}`;
      const cached = await Cache.get('trending_by_language', cacheKey);
      if (cached) {
        return cached;
      }

      // Get trending movies filtered by language
      const url = `${this.BASE_URL}/trending/movie/week?api_key=${this.API_KEY}&language=en-US&with_original_language=${languageCode}&sort_by=popularity.desc&page=${page}`;
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        // Fallback to discover if trending endpoint doesn't return results
        return await this.getMoviesByLanguage(languageCode, page);
      }

      const movies = data.results
        .filter(movie => movie.vote_average >= 4.0)
        .slice(0, 15)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          rating: movie.vote_average,
          description: movie.overview,
          genres: movie.genre_ids || [],
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          originalLanguage: movie.original_language
        }));

      await Cache.set('trending_by_language', cacheKey, movies);
      return movies;
    } catch (error) {
      console.warn('[API] Error getting trending movies by language, falling back to general language query:', error);
      return await this.getMoviesByLanguage(languageCode, page);
    }
  },

  /**
   * Get all supported languages
   * Returns a list of languages that have movies available
   * Useful for UI language selection and filtering
   * @returns {Promise<Array>}
   */
  async getSupportedLanguages() {
    try {
      const cached = await Cache.get('supported_languages', 'list');
      if (cached) {
        return cached;
      }

      // Get languages from configuration endpoint
      const url = `${this.BASE_URL}/configuration/languages?api_key=${this.API_KEY}`;
      
      const response = await this._fetchWithRetry(url);
      const languages = await response.json();

      // Extract language codes
      const languageCodes = languages
        .map(lang => ({
          code: lang.iso_639_1,
          name: lang.english_name,
          nativeName: lang.name
        }))
        .filter(lang => lang.code) // Filter out entries without codes
        .sort((a, b) => a.name.localeCompare(b.name));

      await Cache.set('supported_languages', 'list', languageCodes);
      return languageCodes;
    } catch (error) {
      console.warn('[API] Error getting supported languages:', error);
      return [];
    }
  },

  /**
   * Get movie details by ID
   * Fetches full details including genres names and spoken languages
   * @param {number} movieId
   * @returns {Promise<Object|null>}
   */
  async getMovieDetails(movieId) {
    if (!movieId) return null;

    try {
      const cacheKey = `details_${movieId}`;
      const cached = await Cache.get('movie_details', cacheKey);
      if (cached) {
        console.log('[API] Cache hit for movie details:', movieId);
        return cached;
      }

      const url = `${this.BASE_URL}/movie/${movieId}?api_key=${this.API_KEY}&language=en-US`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data || !data.id) {
        return null;
      }

      const details = {
        id: data.id,
        title: data.title,
        releaseDate: data.release_date,
        rating: data.vote_average,
        description: data.overview,
        genres: (data.genres || []).map(g => ({ id: g.id, name: g.name })),
        posterPath: data.poster_path,
        backdropPath: data.backdrop_path,
        originalLanguage: data.original_language,
        spokenLanguages: (data.spoken_languages || []).map(l => l.iso_639_1),
        runtime: data.runtime,
        popularity: data.popularity
      };

      await Cache.set('movie_details', cacheKey, details);
      return details;
    } catch (error) {
      console.error('[API] Error getting movie details:', error);
      return null;
    }
  },

  /**
   * Check if the API is configured with a valid key
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.API_KEY && this.API_KEY.length > 0 && this.API_KEY !== 'YOUR_API_KEY_HERE');
  },

  // ==========================================
  //  TV SHOW ENDPOINTS
  // ==========================================

  /**
   * Search for TV show by title
   */
  async searchTV(title) {
    if (!title || !title.trim()) return null;
    try {
      const cached = await Cache.get('tv_search', title);
      if (cached) return cached;

      const url = `${this.BASE_URL}/search/tv?api_key=${this.API_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();
      if (!data.results || data.results.length === 0) return null;

      const show = data.results[0];
      const tvData = {
        id: show.id, contentType: 'tv',
        title: show.name, releaseDate: show.first_air_date,
        rating: show.vote_average, voteCount: show.vote_count,
        description: show.overview, genres: show.genre_ids || [],
        posterPath: show.poster_path, backdropPath: show.backdrop_path,
        originalLanguage: show.original_language
      };
      await Cache.set('tv_search', title, tvData);
      return tvData;
    } catch (error) {
      console.error('[API] Error searching TV:', error);
      return null;
    }
  },

  /**
   * Get TV show details
   */
  async getTVDetails(tvId) {
    if (!tvId) return null;
    try {
      const cacheKey = `tv_details_${tvId}`;
      const cached = await Cache.get('tv_details', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/tv/${tvId}?api_key=${this.API_KEY}&language=en-US`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();
      if (!data || !data.id) return null;

      const details = {
        id: data.id, contentType: 'tv',
        title: data.name, releaseDate: data.first_air_date,
        rating: data.vote_average, voteCount: data.vote_count,
        description: data.overview,
        genres: (data.genres || []).map(g => ({ id: g.id, name: g.name })),
        posterPath: data.poster_path, backdropPath: data.backdrop_path,
        originalLanguage: data.original_language,
        spokenLanguages: (data.spoken_languages || []).map(l => l.iso_639_1),
        numberOfSeasons: data.number_of_seasons,
        numberOfEpisodes: data.number_of_episodes,
        status: data.status, popularity: data.popularity
      };
      await Cache.set('tv_details', cacheKey, details);
      return details;
    } catch (error) {
      console.error('[API] Error getting TV details:', error);
      return null;
    }
  },

  /**
   * Get similar TV shows
   */
  async getSimilarTV(tvId) {
    if (!tvId) return [];
    try {
      const cacheKey = `similar_tv_${tvId}`;
      const cached = await Cache.get('similar_tv', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/tv/${tvId}/similar?api_key=${this.API_KEY}&language=en-US`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();
      if (!data.results) return [];

      const shows = data.results
        .filter(s => s.vote_average >= 5.0 && s.vote_count >= 30)
        .slice(0, 15)
        .map(s => ({
          id: s.id, contentType: 'tv', title: s.name,
          releaseDate: s.first_air_date, rating: s.vote_average,
          voteCount: s.vote_count, description: s.overview,
          genres: s.genre_ids || [], posterPath: s.poster_path,
          backdropPath: s.backdrop_path, popularity: s.popularity,
          originalLanguage: s.original_language
        }));
      await Cache.set('similar_tv', cacheKey, shows);
      return shows;
    } catch (error) {
      console.error('[API] Error getting similar TV:', error);
      return [];
    }
  },

  /**
   * Get TV show recommendations (collaborative filtering)
   */
  async getTVRecommendations(tvId) {
    if (!tvId) return [];
    try {
      const cacheKey = `tv_recs_${tvId}`;
      const cached = await Cache.get('tv_recs', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/tv/${tvId}/recommendations?api_key=${this.API_KEY}&language=en-US`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();
      if (!data.results) return [];

      const shows = data.results
        .filter(s => s.vote_average >= 5.0 && s.vote_count >= 30)
        .slice(0, 15)
        .map(s => ({
          id: s.id, contentType: 'tv', title: s.name,
          releaseDate: s.first_air_date, rating: s.vote_average,
          voteCount: s.vote_count, description: s.overview,
          genres: s.genre_ids || [], posterPath: s.poster_path,
          backdropPath: s.backdrop_path, popularity: s.popularity,
          originalLanguage: s.original_language
        }));
      await Cache.set('tv_recs', cacheKey, shows);
      return shows;
    } catch (error) {
      console.error('[API] Error getting TV recommendations:', error);
      return [];
    }
  },

  /**
   * Get TV show credits
   */
  async getTVCredits(tvId) {
    if (!tvId) return { creators: [], topCast: [] };
    try {
      const cacheKey = `tv_credits_${tvId}`;
      const cached = await Cache.get('tv_credits', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/tv/${tvId}/credits?api_key=${this.API_KEY}`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      const creators = (data.crew || [])
        .filter(c => c.job === 'Executive Producer' || c.department === 'Writing')
        .slice(0, 3)
        .map(c => ({ id: c.id, name: c.name }));
      const topCast = (data.cast || [])
        .slice(0, 5)
        .map(c => ({ id: c.id, name: c.name, character: c.character }));

      const credits = { creators, topCast };
      await Cache.set('tv_credits', cacheKey, credits);
      return credits;
    } catch (error) {
      console.error('[API] Error getting TV credits:', error);
      return { creators: [], topCast: [] };
    }
  },

  /**
   * Get TV show keywords
   */
  async getTVKeywords(tvId) {
    if (!tvId) return [];
    try {
      const cacheKey = `tv_keywords_${tvId}`;
      const cached = await Cache.get('tv_keywords', cacheKey);
      if (cached) return cached;

      const url = `${this.BASE_URL}/tv/${tvId}/keywords?api_key=${this.API_KEY}`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();
      const keywords = (data.results || []).map(k => ({ id: k.id, name: k.name }));
      await Cache.set('tv_keywords', cacheKey, keywords);
      return keywords;
    } catch (error) {
      console.error('[API] Error getting TV keywords:', error);
      return [];
    }
  },

  // ==========================================
  //  ANIME-SPECIFIC DISCOVERY
  // ==========================================

  /**
   * Discover anime content (Animation genre, Japanese language)
   */
  async discoverAnime(options = {}) {
    try {
      const page = options.page || 1;
      const sortBy = options.sortBy || 'popularity.desc';
      const cacheKey = `anime_${sortBy}_p${page}`;
      const cached = await Cache.get('anime_discover', cacheKey);
      if (cached) return cached;

      // Animation genre (16) + Japanese language for anime
      const url = `${this.BASE_URL}/discover/${options.type || 'tv'}?api_key=${this.API_KEY}&language=en-US&with_genres=16&with_original_language=ja&sort_by=${sortBy}&vote_count.gte=50&page=${page}`;
      const response = await this._fetchWithRetry(url);
      const data = await response.json();
      if (!data.results) return [];

      const isTV = (options.type || 'tv') === 'tv';
      const results = data.results.slice(0, 15).map(item => ({
        id: item.id,
        contentType: isTV ? 'tv' : 'movie',
        title: isTV ? item.name : item.title,
        releaseDate: isTV ? item.first_air_date : item.release_date,
        rating: item.vote_average, voteCount: item.vote_count,
        description: item.overview, genres: item.genre_ids || [],
        posterPath: item.poster_path, backdropPath: item.backdrop_path,
        popularity: item.popularity, originalLanguage: item.original_language,
        isAnime: true
      }));

      await Cache.set('anime_discover', cacheKey, results);
      return results;
    } catch (error) {
      console.error('[API] Error discovering anime:', error);
      return [];
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}








