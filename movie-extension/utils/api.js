/**
 * TMDb API Module
 * Handles all interactions with The Movie Database API
 * Includes error handling, retries, and caching integration
 */

const API = {
  // Replace with your actual TMDb API key
  // Get key from: https://www.themoviedb.org/settings/api
  API_KEY: '60c9c200e666f53e911be8af138ccddb',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
  
  // Configuration
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000, // 1 second

  /**
   * Generic fetch with error handling and retries
   */
  async _fetchWithRetry(url, attempt = 1) {
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

      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (attempt < this.RETRY_ATTEMPTS) {
        console.warn(`[API] Retry attempt ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this._fetchWithRetry(url, attempt + 1);
      }

      throw error;
    }
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
        .filter(movie => movie.vote_average >= 5.0)
        .slice(0, 10)
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

      await Cache.set('similar_movies', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error getting similar movies:', error);
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

      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=en-US&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      const movies = data.results
        .filter(movie => movie.vote_average >= 4.0)
        .slice(0, 10)
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
        .filter(movie => movie.vote_average >= 4.0)
        .slice(0, 10)
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
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;












