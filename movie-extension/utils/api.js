/**
 * TMDb API Module
 * Handles all interactions with The Movie Database API
 * Includes error handling, retries, and caching integration
 */

const API = {
  // Replace with your actual TMDb API key
  // Get key from: https://www.themoviedb.org/settings/api
  API_KEY: 'YOUR_TMDB_API_KEY_HERE',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
  
  // Configuration
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000, // 1 second

  /**
   * Generic fetch with error handling and retries
   * @param {string} url
   * @param {number} attempt
   * @returns {Promise<Response>}
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
   * @param {string} title
   * @returns {Promise<Object|null>}
   */
  async searchMovie(title) {
    if (!title || !title.trim()) {
      return null;
    }

    try {
      // Check cache first
      const cached = await Cache.get('movie', title);
      if (cached) {
        console.log('[API] Cache hit for movie:', title);
        return cached;
      }

      const url = `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return null;
      }

      // Get best match (first result is usually most relevant)
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

      // Cache for 24 hours
      await Cache.set('movie', title, movieData);

      return movieData;
    } catch (error) {
      console.error('[API] Error searching movie:', error);
      return null;
    }
  },

  /**
   * Get movie details including genres
   * @param {number} movieId
   * @returns {Promise<Object|null>}
   */
  async getMovieDetails(movieId) {
    if (!movieId) return null;

    try {
      const cached = await Cache.get('movie_details', movieId.toString());
      if (cached) {
        return cached;
      }

      const url = `${this.BASE_URL}/movie/${movieId}?api_key=${this.API_KEY}&language=en-US`;
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      const movieDetails = {
        id: data.id,
        title: data.title,
        releaseDate: data.release_date,
        rating: data.vote_average,
        description: data.overview,
        genres: data.genres.map(g => ({ id: g.id, name: g.name })),
        posterPath: data.poster_path,
        backdropPath: data.backdrop_path,
        runtime: data.runtime,
        budget: data.budget,
        revenue: data.revenue
      };

      await Cache.set('movie_details', movieId.toString(), movieDetails);
      return movieDetails;
    } catch (error) {
      console.error('[API] Error getting movie details:', error);
      return null;
    }
  },

  /**
   * Get similar movies
   * @param {number} movieId
   * @param {number} page
   * @returns {Promise<Array|null>}
   */
  async getSimilarMovies(movieId, page = 1) {
    if (!movieId) return null;

    try {
      const cacheKey = `${movieId}_page_${page}`;
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

      const movies = data.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        releaseDate: movie.release_date,
        rating: movie.vote_average,
        description: movie.overview,
        genres: movie.genre_ids || [],
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        popularity: movie.popularity
      }));

      await Cache.set('similar_movies', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error getting similar movies:', error);
      return null;
    }
  },

  /**
   * Get recommendations for a movie
   * @param {number} movieId
   * @param {number} page
   * @returns {Promise<Array|null>}
   */
  async getRecommendations(movieId, page = 1) {
    if (!movieId) return null;

    try {
      const cacheKey = `${movieId}_page_${page}`;
      const cached = await Cache.get('recommendations', cacheKey);
      if (cached) {
        return cached;
      }

      const url = `${this.BASE_URL}/movie/${movieId}/recommendations?api_key=${this.API_KEY}&language=en-US&page=${page}`;
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      const movies = data.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        releaseDate: movie.release_date,
        rating: movie.vote_average,
        description: movie.overview,
        genres: movie.genre_ids || [],
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        popularity: movie.popularity
      }));

      await Cache.set('recommendations', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error getting recommendations:', error);
      return null;
    }
  },

  /**
   * Get movies by genre
   * @param {number} genreId
   * @param {number} page
   * @returns {Promise<Array|null>}
   */
  async getMoviesByGenre(genreId, page = 1) {
    if (!genreId) return null;

    try {
      const cacheKey = `${genreId}_page_${page}`;
      const cached = await Cache.get('genre_movies', cacheKey);
      if (cached) {
        return cached;
      }

      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=en-US&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`;
      
      const response = await this._fetchWithRetry(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      const movies = data.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        releaseDate: movie.release_date,
        rating: movie.vote_average,
        description: movie.overview,
        genres: movie.genre_ids || [],
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        popularity: movie.popularity
      }));

      await Cache.set('genre_movies', cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('[API] Error getting movies by genre:', error);
      return null;
    }
  },

  /**
   * Get poster URL
   * @param {string} posterPath
   * @param {string} size
   * @returns {string}
   */
  getPosterUrl(posterPath, size = 'w342') {
    if (!posterPath) {
      return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 342 513'%3E%3Crect fill='%23444' width='342' height='513'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23fff' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E`;
    }
    return `${this.IMAGE_BASE_URL}/${size}${posterPath}`;
  },

  /**
   * Validate API key is set
   * @returns {boolean}
   */
  isConfigured() {
    return this.API_KEY && this.API_KEY !== 'YOUR_TMDB_API_KEY_HERE';
  },

  /**
   * Get API configuration status
   * @returns {Object}
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      baseUrl: this.BASE_URL,
      timeout: this.TIMEOUT,
      retryAttempts: this.RETRY_ATTEMPTS
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
