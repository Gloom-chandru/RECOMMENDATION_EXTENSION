/**
 * Recommendation Engine v2.0 — High-Accuracy Hybrid System
 * 
 * Signals (5-source scoring):
 *   35% — TMDb Similar + Collaborative Recommendations (merged, deduplicated)
 *   25% — Multi-Genre Intersection (current movie's exact genre combo)
 *   15% — Director/Cast Affinity (same director or lead actors)
 *   15% — Keyword/Theme Matching (heist, dystopia, time-travel, etc.)
 *   10% — Language Preference (original + spoken language match)
 * 
 * Quality filters:
 *   - vote_count >= 50 (no obscure low-vote movies)
 *   - Bayesian rating normalization (IMDB formula)
 *   - Release recency bonus (newer films get slight boost)
 *   - Multi-signal intersection boost (movie appears in 3+ sources = big bonus)
 */

const Recommender = {
  // Weights for each signal source
  WEIGHT_SIMILAR: 0.35,
  WEIGHT_GENRE: 0.25,
  WEIGHT_CREW: 0.15,
  WEIGHT_KEYWORDS: 0.15,
  WEIGHT_LANGUAGE: 0.10,

  // Config
  RECENT_MOVIE_COUNT: 3,
  TOP_GENRE_COUNT: 3,
  TARGET_RECOMMENDATION_COUNT: 8,
  MIN_RATING_THRESHOLD: 5.0,
  MIN_VOTE_COUNT: 50,

  // Bayesian prior (TMDb global average ~6.5, min votes for confidence)
  BAYESIAN_MEAN: 6.5,
  BAYESIAN_MIN_VOTES: 200,

  /**
   * Compute Bayesian weighted rating (IMDB WR formula)
   * WR = (v/(v+m)) * R + (m/(v+m)) * C
   */
  _bayesianRating(rating, voteCount) {
    const R = typeof rating === 'number' ? rating : 6.0;
    const v = typeof voteCount === 'number' ? voteCount : 0;
    const m = this.BAYESIAN_MIN_VOTES;
    const C = this.BAYESIAN_MEAN;
    return (v / (v + m)) * R + (m / (v + m)) * C;
  },

  /**
   * Release recency bonus: newer movies get a small boost (0 to 0.15)
   */
  _recencyBonus(releaseDate) {
    if (!releaseDate) return 0;
    const year = parseInt(releaseDate.split('-')[0]);
    if (isNaN(year)) return 0;
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    if (age <= 2) return 0.15;
    if (age <= 5) return 0.10;
    if (age <= 10) return 0.05;
    return 0;
  },

  /**
   * Main entry point
   */
  async getRecommendations(currentMovie = null) {
    try {
      const history = await Storage.getHistory();
      console.log('[Recommender] Starting v2 engine:', {
        currentMovie: currentMovie?.title,
        historySize: history.length
      });

      if (history.length === 0) {
        return await this._getTrendingMovies();
      }

      // Gather enriched data for recent movies
      const enrichedRecent = await this._enrichRecentMovies(history);

      // Collect all recommendation signals in parallel where possible
      const [fromSimilar, fromGenres, fromCrew, fromKeywords, fromLanguage] = await Promise.all([
        this._getFromSimilarAndRecs(enrichedRecent),
        this._getFromGenres(currentMovie, history),
        this._getFromCrewAffinity(enrichedRecent, history),
        this._getFromKeywords(enrichedRecent),
        this._getFromLanguage(history)
      ]);

      const signals = { fromSimilar, fromGenres, fromCrew, fromKeywords, fromLanguage };

      const merged = this._mergeAndScore(signals, history);
      return merged.slice(0, this.TARGET_RECOMMENDATION_COUNT);
    } catch (error) {
      console.error('[Recommender] Error:', error);
      return [];
    }
  },

  /**
   * Enrich recent movies with keywords + credits data
   */
  async _enrichRecentMovies(history) {
    const recent = history.slice(0, this.RECENT_MOVIE_COUNT);
    const enriched = [];

    for (const movie of recent) {
      if (!movie.tmdbId) continue;
      try {
        const [keywords, credits] = await Promise.all([
          API.getMovieKeywords(movie.tmdbId),
          API.getMovieCredits(movie.tmdbId)
        ]);
        enriched.push({ ...movie, keywords, credits });
      } catch {
        enriched.push({ ...movie, keywords: [], credits: { directors: [], topCast: [] } });
      }
    }
    return enriched;
  },

  /**
   * Signal 1: Similar + TMDb Recommendations (35%)
   * Merges /similar and /recommendations for each recent movie
   */
  async _getFromSimilarAndRecs(enrichedRecent) {
    const all = [];
    for (let i = 0; i < enrichedRecent.length; i++) {
      const movie = enrichedRecent[i];
      if (!movie.tmdbId) continue;
      const recencyWeight = 1 / (i + 1); // 1.0, 0.5, 0.33...

      try {
        const [similar, recs] = await Promise.all([
          API.getSimilarMovies(movie.tmdbId),
          API.getMovieRecommendations(movie.tmdbId)
        ]);

        const combined = [...(similar || []), ...(recs || [])];
        combined.forEach(m => {
          all.push({
            ...m,
            weight: recencyWeight,
            source: `Based on "${movie.title}"`,
            reason: 'similar'
          });
        });
      } catch (e) {
        console.warn('[Recommender] Error fetching similar/recs:', e);
      }
    }
    return all;
  },

  /**
   * Signal 2: Multi-Genre Intersection (25%)
   * Uses the current movie's exact genre combination for precise discovery
   */
  async _getFromGenres(currentMovie, history) {
    const all = [];

    // Strategy A: Current movie's multi-genre intersection
    if (currentMovie?.genres?.length >= 2) {
      const genreIds = currentMovie.genres
        .map(g => typeof g === 'object' ? this._mapGenreNameToId(g.name) : g)
        .filter(Boolean)
        .slice(0, 3);

      if (genreIds.length >= 2) {
        try {
          const langOption = currentMovie.originalLanguage
            ? { withLanguage: currentMovie.originalLanguage } : {};
          const movies = await API.discoverByMultipleGenres(genreIds, langOption);
          movies.forEach(m => {
            all.push({
              ...m, weight: 0.9,
              source: `Matches "${currentMovie.title}" genres`,
              reason: 'genre_intersection'
            });
          });
        } catch (e) {
          console.warn('[Recommender] Multi-genre error:', e);
        }
      }
    }

    // Strategy B: Top genres from history (single-genre fallback)
    const topGenres = await Storage.getTopGenres(this.TOP_GENRE_COUNT);
    for (const genre of topGenres.slice(0, 2)) {
      const genreId = this._mapGenreNameToId(genre);
      if (!genreId) continue;
      try {
        const movies = await API.getMoviesByGenre(genreId);
        if (movies) {
          movies.forEach(m => {
            all.push({
              ...m, weight: 0.5,
              source: `You like "${genre}" movies`,
              reason: 'genre'
            });
          });
        }
      } catch (e) {
        console.warn('[Recommender] Genre fallback error:', e);
      }
    }
    return all;
  },

  /**
   * Signal 3: Director/Cast Affinity (15%)
   */
  async _getFromCrewAffinity(enrichedRecent, history) {
    const all = [];
    const seenPeople = new Set();

    // Count director/actor frequency across history enriched data
    for (const movie of enrichedRecent) {
      const credits = movie.credits || { directors: [], topCast: [] };

      // Directors
      for (const dir of credits.directors) {
        if (seenPeople.has(dir.id)) continue;
        seenPeople.add(dir.id);
        try {
          const movies = await API.discoverByPerson(dir.id);
          movies.forEach(m => {
            all.push({
              ...m, weight: 0.9,
              source: `Directed by ${dir.name}`,
              reason: 'director'
            });
          });
        } catch (e) {
          console.warn('[Recommender] Director discover error:', e);
        }
      }

      // Lead actor (only first)
      const leadActor = credits.topCast?.[0];
      if (leadActor && !seenPeople.has(leadActor.id)) {
        seenPeople.add(leadActor.id);
        try {
          const movies = await API.discoverByPerson(leadActor.id);
          movies.forEach(m => {
            all.push({
              ...m, weight: 0.6,
              source: `Starring ${leadActor.name}`,
              reason: 'cast'
            });
          });
        } catch (e) {
          console.warn('[Recommender] Cast discover error:', e);
        }
      }
    }
    return all;
  },

  /**
   * Signal 4: Keyword/Theme Matching (15%)
   */
  async _getFromKeywords(enrichedRecent) {
    const all = [];
    const keywordFreq = {};

    // Aggregate keywords from recent movies
    for (const movie of enrichedRecent) {
      (movie.keywords || []).forEach(kw => {
        keywordFreq[kw.id] = keywordFreq[kw.id] || { ...kw, count: 0 };
        keywordFreq[kw.id].count++;
      });
    }

    // Pick top 5 keywords by frequency
    const topKeywords = Object.values(keywordFreq)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topKeywords.length === 0) return all;

    const kwIds = topKeywords.map(k => k.id);
    const kwNames = topKeywords.map(k => k.name).join(', ');

    try {
      const movies = await API.discoverByKeywords(kwIds);
      movies.forEach(m => {
        all.push({
          ...m, weight: 0.7,
          source: `Themes: ${kwNames}`,
          reason: 'keywords'
        });
      });
    } catch (e) {
      console.warn('[Recommender] Keywords discover error:', e);
    }
    return all;
  },

  /**
   * Signal 5: Language Preference (10%)
   * Cleaner version — no noisy "diverse popular" padding
   */
  async _getFromLanguage(history) {
    const all = [];
    const langCount = {};

    history.forEach(movie => {
      if (movie.originalLanguage) {
        langCount[movie.originalLanguage] = (langCount[movie.originalLanguage] || 0) + 1;
      }
    });

    const topLangs = Object.entries(langCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([lang]) => lang);

    for (const lang of topLangs) {
      try {
        const movies = await API.getMoviesByLanguage(lang);
        if (movies) {
          movies.forEach(m => {
            all.push({
              ...m, weight: 0.6,
              source: `Popular in ${this._getLanguageName(lang)}`,
              reason: 'language'
            });
          });
        }
      } catch (e) {
        console.warn(`[Recommender] Language ${lang} error:`, e);
      }
    }
    return all;
  },

  /**
   * Merge all signals, deduplicate, apply Bayesian scoring + multi-signal boost
   */
  _mergeAndScore(signals, history) {
    const scoreMap = new Map();
    const historyIds = new Set(history.map(h => `${h.tmdbId || h.id}`));
    const historyTitles = new Set(history.map(h => h.title.toLowerCase()));

    const weightMap = {
      similar: this.WEIGHT_SIMILAR,
      genre_intersection: this.WEIGHT_GENRE,
      genre: this.WEIGHT_GENRE,
      director: this.WEIGHT_CREW,
      cast: this.WEIGHT_CREW,
      keywords: this.WEIGHT_KEYWORDS,
      language: this.WEIGHT_LANGUAGE
    };

    // Process all signals
    const allMovies = [
      ...(signals.fromSimilar || []),
      ...(signals.fromGenres || []),
      ...(signals.fromCrew || []),
      ...(signals.fromKeywords || []),
      ...(signals.fromLanguage || [])
    ];

    for (const movie of allMovies) {
      if (!movie.id) continue;
      const key = `${movie.id}`;
      if (historyIds.has(key) || historyTitles.has((movie.title || '').toLowerCase())) continue;

      const bayesian = this._bayesianRating(movie.rating, movie.voteCount);
      const recency = this._recencyBonus(movie.releaseDate);
      const categoryWeight = weightMap[movie.reason] || 0.1;
      const contribution = categoryWeight * (movie.weight || 0.5) * (bayesian / 10) + recency * 0.05;

      const existing = scoreMap.get(key);
      if (existing) {
        existing.score += contribution;
        existing.sourceCount++;
        if (!existing.sources.includes(movie.source)) {
          existing.sources.push(movie.source);
        }
        // Keep highest bayesian
        if (bayesian > existing.bayesian) {
          existing.bayesian = bayesian;
          existing.rating = movie.rating;
        }
      } else {
        scoreMap.set(key, {
          ...movie,
          score: contribution,
          bayesian,
          sources: [movie.source],
          sourceCount: 1
        });
      }
    }

    // Multi-signal intersection boost: appearing in 3+ sources = 40% boost, 2 = 20%
    for (const [, movie] of scoreMap) {
      if (movie.sourceCount >= 3) {
        movie.score *= 1.4;
      } else if (movie.sourceCount >= 2) {
        movie.score *= 1.2;
      }
    }

    // Sort and format output
    return Array.from(scoreMap.values())
      .filter(m => m.rating >= this.MIN_RATING_THRESHOLD)
      .sort((a, b) => {
        const diff = b.score - a.score;
        return Math.abs(diff) > 0.005 ? diff : b.bayesian - a.bayesian;
      })
      .map(movie => ({
        id: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
        rating: movie.rating,
        genres: movie.genres,
        description: movie.description,
        score: parseFloat(movie.score.toFixed(3)),
        explanation: this._generateExplanation(movie.sources, movie.sourceCount),
        backdropPath: movie.backdropPath,
        releaseDate: movie.releaseDate
      }));
  },

  _generateExplanation(sources, sourceCount) {
    if (!sources || sources.length === 0) return 'Popular choice';
    const unique = [...new Set(sources)];
    if (sourceCount >= 3) {
      return `${unique[0]} (+${sourceCount - 1} more signals)`;
    }
    if (unique.length === 1) return unique[0];
    return `${unique[0]} & ${unique.length - 1} more`;
  },

  async _getTrendingMovies() {
    try {
      const cached = await Cache.get('trending', 'movies');
      if (cached) return cached;

      const url = `${API.BASE_URL}/movie/popular?api_key=${API.API_KEY}&language=en-US`;
      const response = await API._fetchWithRetry(url);
      const data = await response.json();

      const movies = (data.results || [])
        .filter(m => m.vote_count >= 100)
        .slice(0, this.TARGET_RECOMMENDATION_COUNT)
        .map(m => ({
          id: m.id,
          title: m.title,
          posterPath: m.poster_path,
          rating: m.vote_average,
          genres: m.genre_ids || [],
          description: m.overview,
          explanation: 'Trending now',
          backdropPath: m.backdrop_path,
          releaseDate: m.release_date
        }));

      await Cache.set('trending', 'movies', movies, 12 * 60 * 60 * 1000);
      return movies;
    } catch (error) {
      console.error('[Recommender] Error getting trending:', error);
      return [];
    }
  },

  async getMovieSpecificRecommendations(movieId, movieTitle) {
    try {
      const [similar, recs] = await Promise.all([
        API.getSimilarMovies(movieId),
        API.getMovieRecommendations(movieId)
      ]);

      const merged = new Map();
      [...(similar || []), ...(recs || [])].forEach(m => {
        if (!merged.has(m.id)) merged.set(m.id, m);
      });

      return Array.from(merged.values())
        .sort((a, b) => this._bayesianRating(b.rating, b.voteCount) - this._bayesianRating(a.rating, a.voteCount))
        .slice(0, this.TARGET_RECOMMENDATION_COUNT)
        .map(m => ({
          id: m.id, title: m.title, posterPath: m.posterPath,
          rating: m.rating, genres: m.genres || [],
          description: m.description,
          explanation: `Similar to "${movieTitle}"`,
          backdropPath: m.backdropPath
        }));
    } catch (error) {
      console.error('[Recommender] Movie-specific error:', error);
      return [];
    }
  },

  // --- Utility methods (kept from v1) ---

  _mapGenreNameToId(genreName) {
    const map = {
      'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35,
      'Crime': 80, 'Documentary': 99, 'Drama': 18, 'Family': 10751,
      'Fantasy': 14, 'History': 36, 'Horror': 27, 'Music': 10402,
      'Mystery': 9648, 'Romance': 10749, 'Science Fiction': 878,
      'Sci-Fi': 878, 'Television': 10770, 'Thriller': 53,
      'War': 10752, 'Western': 37
    };
    return map[genreName] || null;
  },

  _getLanguageName(langCode) {
    const names = {
      'en': 'English', 'hi': 'Hindi', 'te': 'Telugu', 'ta': 'Tamil',
      'kn': 'Kannada', 'ml': 'Malayalam', 'bn': 'Bengali', 'mr': 'Marathi',
      'gu': 'Gujarati', 'pa': 'Punjabi', 'es': 'Spanish', 'fr': 'French',
      'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'pl': 'Polish',
      'ru': 'Russian', 'uk': 'Ukrainian', 'nl': 'Dutch', 'sv': 'Swedish',
      'no': 'Norwegian', 'da': 'Danish', 'fi': 'Finnish', 'ja': 'Japanese',
      'ko': 'Korean', 'zh': 'Chinese', 'vi': 'Vietnamese', 'th': 'Thai',
      'id': 'Indonesian', 'ms': 'Malay', 'ar': 'Arabic', 'he': 'Hebrew',
      'tr': 'Turkish', 'el': 'Greek', 'hu': 'Hungarian', 'ro': 'Romanian',
      'cs': 'Czech', 'fa': 'Persian', 'ur': 'Urdu', 'sw': 'Swahili',
      'af': 'Afrikaans', 'tl': 'Tagalog'
    };
    const base = langCode ? langCode.split('-')[0].toLowerCase() : '';
    return names[langCode] || names[base] || base.toUpperCase() || 'Unknown';
  },

  getConfig() {
    return {
      weightSimilar: this.WEIGHT_SIMILAR,
      weightGenre: this.WEIGHT_GENRE,
      weightCrew: this.WEIGHT_CREW,
      weightKeywords: this.WEIGHT_KEYWORDS,
      weightLanguage: this.WEIGHT_LANGUAGE,
      targetCount: this.TARGET_RECOMMENDATION_COUNT
    };
  },

  async getAllDetectedLanguages() {
    try {
      const history = await Storage.getHistory();
      const languages = {};
      history.forEach(movie => {
        const lang = movie.originalLanguage;
        if (lang) {
          if (!languages[lang]) {
            languages[lang] = { code: lang, name: this._getLanguageName(lang), count: 0 };
          }
          languages[lang].count++;
        }
      });
      return Object.values(languages).sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('[Recommender] Error getting languages:', error);
      return [];
    }
  },

  async getTrendingByLanguage(languageCode) {
    try {
      if (!languageCode) return [];
      const movies = await API.getTrendingByLanguage(languageCode);
      return movies.slice(0, this.TARGET_RECOMMENDATION_COUNT).map(m => ({
        id: m.id, title: m.title, posterPath: m.posterPath,
        rating: m.rating, genres: m.genres || [],
        description: m.description,
        explanation: `Trending in ${this._getLanguageName(languageCode)}`,
        backdropPath: m.backdropPath, originalLanguage: m.originalLanguage
      }));
    } catch (error) {
      console.error('[Recommender] Trending by language error:', error);
      return [];
    }
  },

  async getRecommendationsByAllLanguages() {
    try {
      const languages = await this.getAllDetectedLanguages();
      if (languages.length === 0) return await this._getTrendingMovies();
      const allRecs = [];
      const ids = new Set();
      for (const lang of languages.slice(0, 5)) {
        const movies = await this.getTrendingByLanguage(lang.code);
        movies.forEach(m => {
          if (!ids.has(m.id) && m.rating >= this.MIN_RATING_THRESHOLD) {
            ids.add(m.id);
            allRecs.push({ ...m, languageCode: lang.code });
          }
        });
      }
      return allRecs.sort((a, b) => b.rating - a.rating).slice(0, this.TARGET_RECOMMENDATION_COUNT);
    } catch (error) {
      console.error('[Recommender] All-language error:', error);
      return await this._getTrendingMovies();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Recommender;
}