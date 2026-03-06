# 🎬 Tesla IPTV Player - Professional Streaming Solution

**Version:** 2.0.0  
**License:** MIT  
**Target Platform:** Web Browser (Desktop, Tablet, Mobile, Smart TVs including Tesla)

## 📋 Overview

Tesla IPTV Player is a professional-grade, feature-rich IPTV streaming application built with modern web technologies. It provides complete support for Xtream Codes IPTV servers with an elegant, intuitive user interface optimized for all devices.

## ✨ Key Features

- **🔐 Secure Authentication** - Credential storage with optional auto-login
- **📺 Live TV** - Browse channels by category with real-time streaming
- **🎬 Movies** - Extensive VOD catalog with categorization
- **📺 Series** - TV series management with episode tracking
- **❤️ Favorites** - Save and quick-access your favorite content
- **📼 Watch History** - Auto-resume from last position
- **📅 EPG** - Electronic Program Guide with schedules
- **🔍 Advanced Search** - Search all content types
- **🎮 Professional Player** - HLS/DASH streaming with adaptive bitrate
- **⚙️ Quality Selection** - Auto or manual (1080p, 720p, 480p, 360p)
- **🔊 Volume Control** - Volume slider and mute
- **💾 Picture-in-Picture** - Floating video window
- **⛔ Fullscreen** - Immersive experience
- **⌨️ Keyboard Shortcuts** - Space: Play/Pause, F: Fullscreen, M: Mute, Arrows: Control
- **🎨 Themes** - Dark, Light, Auto modes
- **💾 Smart Caching** - 3-tier cache (memory → storage → API)
- **📱 Responsive** - Optimized for all screen sizes
- **♿ Accessible** - WCAG compliant with keyboard navigation
- **⚡ HIGH PERFORMANCE** - Fast load and smooth playback

## 🏗️ Architecture

Professional modular architecture with 4,500+ lines of production-ready code:

```
Project Structure:
├── index.html                 # UI Template (250+ lines)
├── styles/                    # Stylesheet (1650 lines total)
│   ├── main.css              # Core styles (650 lines)
│   ├── player.css            # Player styles (400 lines)
│   └── responsive.css        # Mobile optimization (400 lines)
└── js/                        # JavaScript (2850+ lines)
    ├── config.js             # Configuration (150 lines)
    ├── app.js                # App initialization (150 lines)
    ├── services/             # Service layer (720 lines)
    │   ├── storage-service.js    # Data persistence (220 lines)
    │   ├── api-service.js        # Xtream Codes API (300 lines)
    │   └── cache-service.js      # Multi-tier caching (200 lines)
    └── modules/              # Feature modules (1980 lines)
        ├── auth-module.js        # Authentication (150 lines)
        ├── player-module.js      # Video player (500 lines)
        ├── content-module.js     # Content manager (550 lines)
        ├── epg-module.js         # Program guide (100 lines)
        ├── settings-module.js    # User preferences (250 lines)
        └── ui-module.js          # UI utilities (400 lines)
```

## 🚀 Quick Start

### Installation

1. **Host on any web server**
```bash
# Using Python
cd main && python -m http.server 8000

# Using Node
npx http-server main

# Using Docker
docker run -it --rm -p 8000:8000 -v $(pwd)/main:/app -w /app python:3.9 python -m http.server 8000

# Using Nginx/Apache - copy main/ folder to document root
```

2. **Open in Browser**
- Desktop: http://localhost:8000
- Tesla: Via browser on infotainment system
- Mobile: From any device on network

### First Login

1. Enter Xtream Codes server URL (e.g., http://example.com:8080)
2. Enter username and password
3. Check "Remember me" for auto-login
4. Click Login

## 🎯 Core Features

### Live TV
- Browse channels by category
- Real-time streaming with HLS
- Subscribe to favorite channels
- Sort and filter by name

### Movies (VOD)
- Browse catalog by category
- Search across all titles
- Quality selection
- Save to favorites
- Add to watch later

### TV Series
- Series browsing and search
- Episode information
- Season management
- Watch tracking
- Subtitle support

### Watch History
- Automatic tracking
- Resume from last position
- Clear history option
- View last watched

### Favorites Management
- Mark channels/content as favorites
- Quick access from sidebar
- Organized by category
- One-click viewing

### EPG (Program Guide)
- Program schedule display
- Time-based viewing
- Live indicator
- Channel guide

### Search
- Full-text search capability
- Search across all content types (Live, Movies, Series)
- Quick channel lookup
- Filter by category

### Settings
**Playback Settings:**
- Default quality (Auto, 1080p, 720p, 480p, 360p)
- Default volume (0-100%)
- Autoplay next
- Resume playback enabled

**Display Settings:**
- Theme (Dark, Light, Auto)
- Show EPG
- Language selection

**Streaming Settings:**
- Max concurrent streams
- Bandwidth saving mode
- Connection timeout

## 🎮 Player Controls

| Control | Function |
|---------|----------|
| Click | Play/Pause |
| Space | Play/Pause |
| M | Mute/Unmute |
| ↑/↓ | Volume |
| ←/→ | Seek |
| F | Fullscreen |
| P | Picture-in-Picture |
| Q | Quality menu |
| S | Subtitles toggle |
| ESC | Close player |

## 🔒 Security

- ✅ Credentials stored locally only
- ✅ No cloud synchronization
- ✅ No tracking or analytics
- ✅ No external API calls beyond IPTV server
- ✅ HTTPS compatible
- ✅ Secure logout clears session
- ✅ Privacy-first design

## 📚 API Reference

### Authentication Module
```javascript
authModule.handleLogin()           // Process login form
authModule.loadSavedCredentials()  // Load remembered creds
authModule.checkAutoLogin()        // Auto-login if enabled
authModule.logout()                // Clear session
authModule.getUserProfile()        // Get user info
```

### Player Module
```javascript
playerModule.playStream(stream)    // Play a stream
playerModule.togglePlayPause()     // Play/pause
playerModule.setVolume(level)      // Set volume (0-100)
playerModule.setQuality(quality)   // Set stream quality
playerModule.seek(seconds)         // Seek to position
playerModule.toggleFullscreen()    // Toggle fullscreen
playerModule.togglePiP()           // Picture-in-picture
playerModule.closePlayer()         // Close player
```

### Content Module
```javascript
contentModule.search(query)        // Search all content
contentModule.loadContent()        // Load all categories
contentModule.switchView(type)     // Switch to Live/Movies/Series
contentModule.showProfile()        // Show user profile
```

### Storage Service
```javascript
storageService.saveFavorites(arr)  // Save favorites list
storageService.addFavorite(item)   // Add to favorites
storageService.removeFavorite(id)  // Remove from favorites
storageService.saveHistory(arr)    // Save watch history
storageService.addToHistory(item)  // Track watched content
storageService.getLastWatched()    // Get resume position
storageService.saveSettings(obj)   // Save user preferences
storageService.getSettings()       // Load preferences
```

### API Service
```javascript
apiService.init(url, user, pass)   // Initialize API
apiService.getLiveCategories()     // Get live categories
apiService.getLiveStreams(catId)   // Get live channels
apiService.getVodCategories()      // Get movie categories
apiService.getVodStreams(catId)    // Get movies
apiService.getSeriesCategories()   // Get series categories
apiService.getSeries()             // Get series list
apiService.getEPG(streamId)        // Get program guide
apiService.searchStreams(query)    // Search across all
apiService.getStreamUrl(streamId)  // Build stream URL
apiService.getUserInfo()           // Get account info
```

### Cache Service
```javascript
cacheService.get(key)              // Get from cache
cacheService.set(key, value, ttl)  // Store in cache
cacheService.withCache(fn, ttl)    // Decorator pattern
cacheService.getCacheStats()       // Cache statistics
cacheService.clear()               // Clear all cache
```

## 📱 Device Support

| Device | Status | Notes |
|--------|--------|-------|
| Desktop (Windows/Mac/Linux) | ✅ Full Support | All features |
| Tablet (iPad/Android) | ✅ Full Support | Touch optimized |
| Mobile Phone | ✅ Full Support | Responsive layout |
| Smart TV | ✅ Full Support | Keyboard + remote |
| Tesla | ✅ Full Support | Browser compatible |

## 🔄 Xtream Codes API Support

**Supported Endpoints:**
- User authentication and account info
- Live TV categories and streams
- VOD movie categories and streams
- TV series categories, series, and episodes
- Electronic Program Guide (EPG)
- Search function
- Stream quality variants
- Subtitle support

**Features:**
- Automatic retry logic (exponential backoff)
- Request rate limiting (max 5 concurrent)
- Response caching with TTL
- Bandwidth optimization
- Error recovery

## 💻 Browser Compatibility

| Browser | Minimum | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Opera | 76+ | ✅ Full |

**Note:** Streaming quality depends on browser codec support (H.264/AAC recommended)

## 📈 Performance

| Metric | Value |
|--------|-------|
| Initial Load | < 2 seconds |
| Memory Usage | 50-100 MB |
| Cache Size | 50 MB (configurable) |
| API Retry | 3 attempts (default) |
| Request Timeout | 10 seconds |
| Cache TTL | 6 hours (default) |

## 🛠️ Development

### Debug Mode
Automatically enabled on localhost. Access all services:
```javascript
// In browser console
app.getStatus()           // App status
apiService.request()      // Make API calls
storageService.get()      // Access storage
cacheService.get()        // Check cache
```

### Configuration
Edit `js/config.js` to customize:
- API endpoints
- Player defaults
- Cache settings
- Storage keys
- Error messages
- Quality presets

### Extending the App
1. Add new modules to `js/modules/`
2. Create services in `js/services/`
3. Update `config.js` for settings
4. Add styles to appropriate CSS file

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Stream won't play | Check server URL and credentials; verify stream availability |
| No audio | Press M to unmute; check volume slider |
| Buffering | Reduce quality or check internet connection |
| Login fails | Verify server URL (include http:// or https://); check credentials |
| Fullscreen not working | May be restricted by browser; try ESC to exit |
| EPG not showing | Stream may not support EPG; check IPTV provider |

## 📝 Logging and Debugging

- **Console logs** - Developer tools (F12) for detailed information
- **Network tab** - Monitor API requests and responses
- **Application tab** - Inspect localStorage data
- **Performance tab** - Profile memory usage

## 🔐 Privacy

- No telemetry or tracking
- No server logs of viewing activity
- All data stored locally
- Can be used completely offline (with cached content)
- Supports private browsing mode

## 📦 Deployment

### Production Considerations

1. **HTTPS Only** - Always use encrypted connections
2. **CORS Headers** - Configure if behind proxy
3. **Caching Headers** - Set max-age for static assets
4. **CDN** - Consider CDN for faster delivery
5. **Performance** - Monitor player metrics
6. **Security** - Keep browser updated

### Docker Deployment
```dockerfile
FROM nginx:alpine
COPY main/ /usr/share/nginx/html/
EXPOSE 80
```

## 📄 License

MIT License - Free to use, modify, and distribute

## 🙏 Credits

Built with:
- **HLS.js** - HLS streaming support
- **HTML5 Video API** - Video playback
- **Xtream Codes Protocol** - IPTV server integration
- **Modern Web Standards** - Responsive design, ES6+ JavaScript

## 🔗 Repository

GitHub: [tesla-iptv-player](https://github.com/OrhanArslan/tesla-iptv-player)

---

**Professional IPTV Streaming for Everyone**

Version 2.0.0 | 2024 | MIT License
