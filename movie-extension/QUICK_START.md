# Quick Start Guide

Get your Cross-Platform Movie Recommendation Extension up and running in 5 minutes.

## ⚡ 5-Minute Setup

### 1. Get TMDb API Key (2 minutes)

```
1. Go to https://www.themoviedb.org/signup
2. Create account or login
3. Go to Settings → API
4. Generate API key (v3 auth)
5. Copy the key (looks like: sk_tmdb_abcd1234...)
```

### 2. Add API Key to Extension (1 minute)

Open `utils/api.js` and replace:

```javascript
// Line 6
API_KEY: 'YOUR_TMDB_API_KEY_HERE'
```

With your actual key:

```javascript
API_KEY: 'sk_tmdb_abcd1234efgh5678'
```

**Save the file!**

### 3. Load Extension in Chrome (1 minute)

```
1. Open chrome://extensions/ in address bar
2. Toggle "Developer Mode" ON (top right)
3. Click "Load unpacked"
4. Select the movie-extension folder
5. Done! Extension loads
```

### 4. Test It (1 minute)

```
1. Go to https://www.hotstar.com or primevideo.com
2. Browse to any movie detail page
3. Extension should detect movie
4. Click extension icon to see popup
5. Click "Show Recommendations" to see overlay
```

## ✅ Configuration Checklist

- [ ] Downloaded/cloned the extension
- [ ] Set TMDb API key in `utils/api.js`
- [ ] Loaded extension in Chrome (Developer Mode)
- [ ] Extension appears in toolbar
- [ ] Popup opens when clicking icon
- [ ] No red errors in Console (F12)
- [ ] Tested on Hotstar and Prime Video

## 🎯 First Steps

### Try These Actions

1. **Watch a Movie**
   - Navigate to movie detail page
   - Wait for movie detection
   - Check popup shows movie title

2. **See Recommendations**
   - Click "Show Recommendations" button
   - Beautiful overlay appears on right
   - See 6 personalized recommendations

3. **Save a Movie**
   - In recommendations overlay
   - Click bookmark icon on any movie
   - Goes to "Bookmarks" tab in popup

4. **View Your Data**
   - Click extension icon
   - Dashboard tab shows stats
   - History tab shows watched movies
   - Bookmarks tab shows saved movies

5. **Adjust Settings**
   - Click ⚙️ icon in popup
   - Toggle extension on/off
   - Change recommendation count
   - Export or clear data

## 🎮 Keyboard Shortcuts

| Key Combo | Action |
|-----------|--------|
| Alt + R | Toggle recommendation overlay |
| F12 | Open DevTools (for debugging) |

## 🐛 Quick Troubleshooting

### "Not on a movie page"
- Make sure you're on actual movie detail page
- Not on home/search page
- Try different movie

### "No recommendations available"
- Check API key is set correctly
- Check internet connection
- Clear cache: Settings → Clear Cache
- Try again after a minute

### "Extension not loading"
- Check manifest.json syntax (no trailing commas)
- Reload extension: chrome://extensions (refresh icon)
- Check console for errors (F12)

### "Movies not detecting"
- Check browser console (F12)
- Look for [Content] logs
- Try refreshing the page
- Movie detail page structure may have changed

## 📖 Key Files to Know

```
manifest.json           ← Extension config (no changes needed)
utils/api.js           ← API KEY GOES HERE!
popup/popup.html       ← Settings/dashboard UI
content/content.js     ← Runs on Hotstar/Prime
ui/overlay.js          ← Recommendation popup UI
```

## 🚀 Next Steps

### Basic Usage
1. Read the full [README.md](README.md) for all features
2. Check Settings to configure preferences
3. Build up watch history (recommendations improve with more data)

### Development
1. Check [DEVELOPMENT.md](DEVELOPMENT.md) for code guide
2. Understand the modular architecture
3. Add support for more platforms

### Deployment
1. Read "Deployment" section in README.md
2. Create icons (assets/icons/)
3. Prepare for Chrome Web Store submission

## 💡 Pro Tips

1. **Watch Multiple Movies**: Better recommendations with more history
2. **Use Bookmarks**: Save movies you want to watch
3. **Clear Cache**: If recommendations seem stale
4. **Check DevTools**: F12 console shows helpful debug info
5. **Keyboard Shortcut**: Alt+R is faster than clicking popup

## 🎬 Supported Platforms

Currently supported:
- ✅ JioHotstar (hotstar.com)
- ✅ Amazon Prime Video (primevideo.com)

Want to add Netflix? See DEVELOPMENT.md → "Adding New Platforms"

## 🆘 Getting Help

1. Check console (F12) for error messages
2. Read troubleshooting in README.md
3. Check DEVELOPMENT.md for technical details
4. Try clearing all data and starting fresh

## 📦 What's Inside

```
movie-extension/
├── manifest.json              # Extension config
├── README.md                  # Full documentation
├── DEVELOPMENT.md             # Code guide
├── QUICK_START.md            # This file!
├── content/
│   ├── content.js            # Movie detection
│   └── platformDetectors.js  # Platform-specific
├── background/
│   └── background.js         # Background tasks
├── popup/
│   ├── popup.html           # Settings UI
│   ├── popup.css            # Styles
│   └── popup.js             # Logic
├── ui/
│   └── overlay.js           # Recommendations panel
├── utils/
│   ├── api.js               # TMDb integration ⭐ UPDATE THIS
│   ├── cache.js             # Caching
│   ├── storage.js           # Local storage
│   └── recommender.js       # Smart recommendations
└── assets/
    └── icons/               # Add icons here
```

## 🎓 How It Works (High Level)

```
1. You visit Hotstar/Prime video page
   ↓
2. Content script detects you're on movie detail page
   ↓
3. Extracts movie title (e.g., "Inception")
   ↓
4. Calls TMDb API to get movie details
   ↓
5. Saves to your local watch history
   ↓
6. Shows recommendation panel with 6 movies
   ↓
7. Panel is personalized based on:
   - Movies you've watched recently (60%)
   - Your favorite genres (40%)
```

## 🔒 Privacy First

✅ Everything stays on your device
- No tracking
- No analytics
- No external servers
- Only TMDb API for movie data
- All history stored locally

## 🎉 Ready to Go!

You're all set! Visit any movie page on Hotstar or Prime Video and enjoy personalized recommendations.

**Questions?** Check the full [README.md](README.md) or [DEVELOPMENT.md](DEVELOPMENT.md)

Happy watching! 🎬
