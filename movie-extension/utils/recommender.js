/**
 * Recommendation Engine
 * Implements hybrid rule-based recommendation system
 * No machine learning - pure rule-based logic
 * 
 * Weighting:
 * - 60% Recent movies (last 3 watched)
 * - 40% Genre frequency (top genres)
 */

const Recommender = {
  // Configuration
  RECENT_MOVIE_WEIGHT: 0.6,
  GENRE_WEIGHT: 0.4,
  RECENT_MOVIE_COUNT: 3,
  TOP_GENRE_COUNT: 3,
  TARGET_RECOMMENDATION_COUNT: 6,

  /**
   * Get personalized recommendations
   * Main entry point for recommendation algorithm
   * @returns {Promise<Array>}
   */
  async getRecommendations() {
    try {
      const history = await Storage.getHistory();
      
      if (history.length === 0) {
        console.log('[Recommender] No history available, returning trending movies');
        return await this._getTrendingMovies();
      }

      const recommendations = {
        fromRecent: await this._getRecommendationsFromRecent(history),
        fromGenres: await this._getRecommendationsFromGenres()
      };

      // Merge and score recommendations
      const merged = await this._mergeRecommendations(recommendations, history);
      
      return merged.slice(0, this.TARGET_RECOMMENDATION_COUNT);
    } catch (error) {
      console.error('[Recommender] Error generating recommendations:', error);
      return [];
    }
  },

  /**
   * Get recommendations based on recently watched movies (60% weight)
   * Fetches similar movies for last N viewed films
   * @param {Array} history
   * @returns {Promise<Array>}
   */
  async _getRecommendationsFromRecent(history) {
    try {
      const recentMovies = history.slice(0, this.RECENT_MOVIE_COUNT);
      const allSimilar = [];

      for (const movie of recentMovies) {
        if (movie.tmdbId) {
          const similar = await API.getSimilarMovies(movie.tmdbId);
          
          if (similar && similar.length > 0) {
            // Weight by recency - more recent movies get higher weight
            const weight = 1 / (recentMovies.indexOf(movie) + 1);
            
            similar.forEach(s => {
              allSimilar.push({
                ...s,
                source: `Based on "${movie.title}"`,
                weight: weight,
                reason: 'similar'
              });
            });
          }
        }
      }

      return allSimilar;
    } catch (error) {
      console.error('[Recommender] Error getting recent recommendations:', error);
      return [];
    }
  },

  /**
   * Get recommendations based on genre frequency (40% weight)
   * Finds movies in favorite genres
   * @returns {Promise<Array>}
   */
  async _getRecommendationsFromGenres() {
    try {
      const topGenres = await Storage.getTopGenres(this.TOP_GENRE_COUNT);
      
      if (topGenres.length === 0) {
        return [];
      }

      const allByGenre = [];

      for (const genre of topGenres) {
        // Try to fetch movies by genre
        // This would require mapping genre names to IDs
        const genreId = this._mapGenreNameToId(genre);
        
        if (genreId) {
          const movies = await API.getMoviesByGenre(genreId);
          
          if (movies && movies.length > 0) {
            movies.forEach(m => {
              allByGenre.push({
                ...m,
                source: `Because you like "${genre}" movies`,
                weight: 0.5,
                reason: 'genre'
              });
            });
          }
        }
      }

      return allByGenre;
    } catch (error) {
      console.error('[Recommender] Error getting genre recommendations:', error);
      return [];
    }
  },

  /**
   * Map genre names to TMDb genre IDs
   * Extended mapping for common genres
   * @param {string} genreName
   * @returns {number|null}
   */
  _mapGenreNameToId(genreName) {
    const genreMap = {
      'Action': 28,
      'Adventure': 12,
      'Animation': 16,
      'Comedy': 35,
      'Crime': 80,
      'Documentary': 99,
      'Drama': 18,
      'Family': 10751,
      'Fantasy': 14,
      'History': 36,
      'Horror': 27,
      'Music': 10402,
      'Mystery': 9648,
      'Romance': 10749,
      'Science Fiction': 878,
      'Sci-Fi': 878,
      'Television': 10770,
      'Thriller': 53,
      'War': 10752,
      'Western': 37
    };

    return genreMap[genreName] || null;
  },

  /**
   * Merge recommendations from different sources
   * Apply weights and scoring
   * Deduplicate and rank
   * @param {Object} recommendations
   * @param {Array} history
   * @returns {Promise<Array>}
   */
  async _mergeRecommendations(recommendations, history) {
    try {
      const scoreMap = new Map();
      const historyTitles = new Set(history.map(h => h.title.toLowerCase()));

      // Process recent movie recommendations (60% weight)
      (recommendations.fromRecent || []).forEach(movie => {
        const key = `${movie.id}`;
        
        // Skip if already in history
        if (historyTitles.has(movie.title.toLowerCase())) {
          return;
        }

        const existing = scoreMap.get(key) || {
          ...movie,
          score: 0,
          sources: []
        };

        existing.score += (this.RECENT_MOVIE_WEIGHT * movie.weight * movie.rating / 10);
        existing.sources.push(movie.source);

        scoreMap.set(key, existing);
      });

      // Process genre recommendations (40% weight)
      (recommendations.fromGenres || []).forEach(movie => {
        const key = `${movie.id}`;
        
        // Skip if already in history
        if (historyTitles.has(movie.title.toLowerCase())) {
          return;
        }

        const existing = scoreMap.get(key) || {
          ...movie,
          score: 0,
          sources: []
        };

        existing.score += (this.GENRE_WEIGHT * movie.weight * movie.rating / 10);
        existing.sources.push(movie.source);

        scoreMap.set(key, existing);
      });

      // Sort by score and prepare output
      const sorted = Array.from(scoreMap.values())
        .sort((a, b) => b.score - a.score)
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          posterPath: movie.posterPath,
          rating: movie.rating,
          genres: movie.genres,
          description: movie.description,
          score: parseFloat(movie.score.toFixed(2)),
          explanation: this._generateExplanation(movie.sources),
          backdropPath: movie.backdropPath
        }));

      return sorted;
    } catch (error) {
      console.error('[Recommender] Error merging recommendations:', error);
      return [];
    }
  },

  /**
   * Generate human-readable explanation for recommendation
   * @param {Array} sources
   * @returns {string}
   */
  _generateExplanation(sources) {
    if (!sources || sources.length === 0) {
      return 'Popular choice';
    }

    // De-duplicate sources
    const unique = [...new Set(sources)];
    
    if (unique.length === 1) {
      return unique[0];
    }

    return `${unique[0]} and ${unique.length - 1} other reason${unique.length > 2 ? 's' : ''}`;
  },

  /**
   * Get trending movies when no history available
   * @returns {Promise<Array>}
   */
  async _getTrendingMovies() {
    try {
      const cached = await Cache.get('trending', 'movies');
      if (cached) {
        return cached;
      }

      // Use popular endpoint as fallback
      const url = `${API.BASE_URL}/movie/popular?api_key=${API.API_KEY}&language=en-US`;
      const response = await API._fetchWithRetry(url);
      const data = await response.json();

      const movies = (data.results || []).slice(0, this.TARGET_RECOMMENDATION_COUNT).map(m => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path,
        rating: m.vote_average,
        genres: m.genre_ids || [],
        description: m.overview,
        explanation: 'Trending now',
        backdropPath: m.backdrop_path
      }));

      await Cache.set('trending', 'movies', movies, 12 * 60 * 60 * 1000); // 12 hours
      return movies;
    } catch (error) {
      console.error('[Recommender] Error getting trending movies:', error);
      return [];
    }
  },

  /**
   * Get recommendations for a specific movie
   * Used when hovering/clicking on a movie
   * @param {number} movieId
   * @param {string} movieTitle
   * @returns {Promise<Array>}
   */
  async getMovieSpecificRecommendations(movieId, movieTitle) {
    try {
      const similar = await API.getSimilarMovies(movieId);
      
      if (!similar || similar.length === 0) {
        return [];
      }

      return similar.slice(0, this.TARGET_RECOMMENDATION_COUNT).map(m => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path,
        rating: m.vote_average,
        genres: m.genre_ids || [],
        description: m.overview,
        explanation: `Similar to "${movieTitle}"`,
        backdropPath: m.backdrop_path
      }));
    } catch (error) {
      console.error('[Recommender] Error getting movie-specific recommendations:', error);
      return [];
    }
  },

  /**
   * Get configuration
   * @returns {Object}
   */
  getConfig() {
    return {
      recentMovieWeight: this.RECENT_MOVIE_WEIGHT,
      genreWeight: this.GENRE_WEIGHT,
      recentMovieCount: this.RECENT_MOVIE_COUNT,
      topGenreCount: this.TOP_GENRE_COUNT,
      targetRecommendationCount: this.TARGET_RECOMMENDATION_COUNT
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Recommender;
}
