/**
 * Internationalization (i18n) Module
 * Supports: English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi
 * Auto-detects language from browser or user setting
 */

const I18n = {
  currentLang: 'en',

  translations: {
    en: {
      // Overlay
      movieBuddy: 'Movie Buddy',
      picksForYou: '{count} picks for you',
      availableOnPlatform: 'Available on this platform',
      findingMovies: 'Finding movies...',
      noRecsYet: 'No recommendations yet',
      noRecsDesc: 'Browse some movies and we\'ll suggest what to watch next!',
      somethingWrong: 'Something went wrong',
      checkConnection: 'Check your connection and try again.',
      poweredBy: 'Powered by TMDb',
      currentlyWatching: 'Currently watching',
      trending: 'Trending now',
      trendingIn: 'Trending in {lang}',
      similarTo: 'Similar to "{title}"',
      similarOnPlatform: 'Similar to "{title}" — on {platform}',
      basedOn: 'Based on "{title}"',
      becauseYouLike: 'Because you like "{genre}" movies',
      matchesGenres: 'Matches "{title}" genres',
      directedBy: 'Directed by {name}',
      starring: 'Starring {name}',
      themes: 'Themes: {keywords}',
      popularIn: 'Popular in {lang}',
      popularChoice: 'Popular choice',
      moreSignals: '+{count} more signals',
      bookmark: 'Bookmark',
      saved: 'Saved!',
      // Content types
      movie: 'Movie',
      tvShow: 'TV Show',
      anime: 'Anime',
      series: 'Series',
      // Popup
      dashboard: 'Dashboard',
      history: 'History',
      bookmarks: 'Bookmarks',
      settings: 'Settings',
      watches: 'Watches',
      noHistoryYet: 'No history yet',
      moviesWillAppear: 'Movies you browse will appear here',
      noBookmarksYet: 'No bookmarks yet',
      saveFromRecs: 'Save movies from recommendations to watch later',
      getRecommendations: 'Get Recommendations',
      loading: 'Loading...',
      clearHistory: 'Clear History',
      clearBookmarks: 'Clear Bookmarks',
      resetAllData: 'Reset All Data',
      exportData: 'Export Data',
      clearCache: 'Clear Cache',
      dataReloaded: 'Data reloaded successfully',
      historyCleared: 'History cleared',
      bookmarksCleared: 'Bookmarks cleared',
      allDataReset: 'All data has been reset',
      dataExported: 'Data exported successfully',
      cacheCleared: 'Cache cleared',
      enabled: 'Enabled',
      autoTrack: 'Auto Track',
      notifications: 'Notifications',
      maxHistory: 'Max History',
      recCount: 'Recommendation Count',
      language: 'Language',
      justNow: 'just now',
      minsAgo: '{n}m ago',
      hoursAgo: '{n}h ago',
      daysAgo: '{n}d ago'
    },

    hi: {
      movieBuddy: 'मूवी बडी',
      picksForYou: 'आपके लिए {count} पिक्स',
      availableOnPlatform: 'इस प्लेटफ़ॉर्म पर उपलब्ध',
      findingMovies: 'मूवीज़ खोज रहे हैं...',
      noRecsYet: 'अभी तक कोई सिफ़ारिश नहीं',
      noRecsDesc: 'कुछ मूवीज़ ब्राउज़ करें और हम सुझाव देंगे!',
      somethingWrong: 'कुछ गलत हो गया',
      checkConnection: 'अपना कनेक्शन जांचें और पुनः प्रयास करें।',
      poweredBy: 'TMDb द्वारा संचालित',
      currentlyWatching: 'अभी देख रहे हैं',
      trending: 'ट्रेंडिंग',
      similarTo: '"{title}" जैसी',
      bookmark: 'बुकमार्क',
      saved: 'सेव हो गया!',
      movie: 'मूवी',
      tvShow: 'टीवी शो',
      anime: 'एनीमे',
      dashboard: 'डैशबोर्ड',
      history: 'इतिहास',
      bookmarks: 'बुकमार्क्स',
      settings: 'सेटिंग्स',
      watches: 'देखे गए',
      getRecommendations: 'सिफ़ारिशें प्राप्त करें',
      loading: 'लोड हो रहा है...',
      clearHistory: 'इतिहास साफ़ करें',
      language: 'भाषा',
      justNow: 'अभी',
      minsAgo: '{n} मिनट पहले',
      hoursAgo: '{n} घंटे पहले',
      daysAgo: '{n} दिन पहले'
    },

    ta: {
      movieBuddy: 'மூவி பட்டி',
      picksForYou: 'உங்களுக்கான {count} தேர்வுகள்',
      findingMovies: 'திரைப்படங்களை கண்டறிகிறது...',
      noRecsYet: 'இதுவரை பரிந்துரைகள் இல்லை',
      noRecsDesc: 'சில திரைப்படங்களை பார்வையிடுங்கள்!',
      currentlyWatching: 'இப்போது பார்க்கிறீர்கள்',
      trending: 'டிரெண்டிங்',
      movie: 'திரைப்படம்',
      tvShow: 'டிவி நிகழ்ச்சி',
      anime: 'அனிமே',
      dashboard: 'டாஷ்போர்ட்',
      history: 'வரலாறு',
      bookmarks: 'புக்மார்க்குகள்',
      settings: 'அமைப்புகள்',
      getRecommendations: 'பரிந்துரைகள் பெறுக',
      language: 'மொழி',
      justNow: 'இப்போது',
      minsAgo: '{n} நிமிடங்கள் முன்',
      hoursAgo: '{n} மணி நேரம் முன்',
      daysAgo: '{n} நாட்கள் முன்'
    },

    te: {
      movieBuddy: 'మూవీ బడ్డీ',
      picksForYou: 'మీ కోసం {count} ఎంపికలు',
      findingMovies: 'సినిమాలు కనుగొనడం...',
      noRecsYet: 'ఇంకా సూచనలు లేవు',
      noRecsDesc: 'కొన్ని సినిమాలు బ్రౌజ్ చేయండి!',
      currentlyWatching: 'ప్రస్తుతం చూస్తున్నారు',
      trending: 'ట్రెండింగ్',
      movie: 'సినిమా',
      tvShow: 'టీవీ షో',
      anime: 'ఏనిమే',
      dashboard: 'డాష్‌బోర్డ్',
      history: 'చరిత్ర',
      bookmarks: 'బుక్‌మార్క్‌లు',
      settings: 'సెట్టింగ్‌లు',
      getRecommendations: 'సూచనలు పొందండి',
      language: 'భాష',
      justNow: 'ఇప్పుడే',
      minsAgo: '{n} నిమిషాల క్రితం',
      hoursAgo: '{n} గంటల క్రితం',
      daysAgo: '{n} రోజుల క్రితం'
    },

    kn: {
      movieBuddy: 'ಮೂವಿ ಬಡ್ಡಿ',
      picksForYou: 'ನಿಮಗಾಗಿ {count} ಆಯ್ಕೆಗಳು',
      findingMovies: 'ಚಲನಚಿತ್ರಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
      currentlyWatching: 'ಪ್ರಸ್ತುತ ನೋಡುತ್ತಿರುವುದು',
      trending: 'ಟ್ರೆಂಡಿಂಗ್',
      movie: 'ಚಲನಚಿತ್ರ',
      tvShow: 'ಟಿವಿ ಶೋ',
      dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      history: 'ಇತಿಹಾಸ',
      bookmarks: 'ಬುಕ್‌ಮಾರ್ಕ್‌ಗಳು',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      language: 'ಭಾಷೆ',
      justNow: 'ಈಗ ತಾನೆ'
    },

    ml: {
      movieBuddy: 'മൂവി ബഡ്ഡി',
      picksForYou: 'നിങ്ങൾക്കായി {count} തിരഞ്ഞെടുപ്പുകൾ',
      findingMovies: 'സിനിമകൾ കണ്ടെത്തുന്നു...',
      currentlyWatching: 'ഇപ്പോൾ കാണുന്നത്',
      trending: 'ട്രെൻഡിംഗ്',
      movie: 'സിനിമ',
      tvShow: 'ടിവി ഷോ',
      dashboard: 'ഡാഷ്‌ബോർഡ്',
      history: 'ചരിത്രം',
      bookmarks: 'ബുക്ക്‌മാർക്കുകൾ',
      settings: 'ക്രമീകരണങ്ങൾ',
      language: 'ഭാഷ',
      justNow: 'ഇപ്പോൾ'
    },

    bn: {
      movieBuddy: 'মুভি বাডি',
      picksForYou: 'আপনার জন্য {count}টি পিক',
      findingMovies: 'মুভি খোঁজা হচ্ছে...',
      currentlyWatching: 'এখন দেখছেন',
      trending: 'ট্রেন্ডিং',
      movie: 'সিনেমা',
      tvShow: 'টিভি শো',
      dashboard: 'ড্যাশবোর্ড',
      history: 'ইতিহাস',
      bookmarks: 'বুকমার্ক',
      settings: 'সেটিংস',
      language: 'ভাষা',
      justNow: 'এইমাত্র'
    },

    mr: {
      movieBuddy: 'मूव्ही बडी',
      picksForYou: 'तुमच्यासाठी {count} निवडी',
      findingMovies: 'चित्रपट शोधत आहे...',
      currentlyWatching: 'सध्या पहात आहात',
      trending: 'ट्रेंडिंग',
      movie: 'चित्रपट',
      tvShow: 'टीव्ही शो',
      dashboard: 'डॅशबोर्ड',
      history: 'इतिहास',
      bookmarks: 'बुकमार्क्स',
      settings: 'सेटिंग्ज',
      language: 'भाषा',
      justNow: 'आत्ताच'
    }
  },

  /**
   * Initialize — detect language from settings or browser
   */
  async init() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await chrome.storage.local.get('settings');
        const settings = data.settings || {};
        if (settings.uiLanguage && this.translations[settings.uiLanguage]) {
          this.currentLang = settings.uiLanguage;
          return;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }

    // Fallback: detect from browser
    const browserLang = (navigator.language || 'en').split('-')[0].toLowerCase();
    if (this.translations[browserLang]) {
      this.currentLang = browserLang;
    }
  },

  /**
   * Get translated string with interpolation
   * @param {string} key
   * @param {Object} params - e.g. { count: 5, title: 'Inception' }
   * @returns {string}
   */
  t(key, params = {}) {
    const langStrings = this.translations[this.currentLang] || this.translations.en;
    let str = langStrings[key] || this.translations.en[key] || key;

    // Interpolate {param} placeholders
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
  },

  /**
   * Set language and persist
   * @param {string} langCode
   */
  async setLanguage(langCode) {
    if (!this.translations[langCode]) return;
    this.currentLang = langCode;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await chrome.storage.local.get('settings');
        const settings = data.settings || {};
        settings.uiLanguage = langCode;
        await chrome.storage.local.set({ settings });
      }
    } catch (e) {
      console.warn('[I18n] Error saving language preference:', e);
    }
  },

  /**
   * Get list of available languages for UI selector
   * @returns {Array}
   */
  getAvailableLanguages() {
    const names = {
      en: 'English', hi: 'हिन्दी', ta: 'தமிழ்', te: 'తెలుగు',
      kn: 'ಕನ್ನಡ', ml: 'മലയാളം', bn: 'বাংলা', mr: 'मराठी'
    };
    return Object.keys(this.translations).map(code => ({
      code, name: names[code] || code
    }));
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18n;
}
