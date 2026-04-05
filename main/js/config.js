/**
 * Tesla IPTV Player - Configuration
 * Central configuration constants and defaults
 */

const CONFIG = {
  // API Configuration
  API: {
    BASE_URL: '',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },

  // Player Configuration
  PLAYER: {
    DEFAULT_QUALITY: 'auto',
    DEFAULT_VOLUME: 70,
    AUTOPLAY: false,
    RESUME_PLAYBACK: true,
    CONTINUE_WHILE_HIDDEN: true,
    PLAYBACK_RATE: 1,
    BUFFER_TIMEOUT: 10000,
    HLS_CONFIG: {
      capLevelOnFPS: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 60 * 1000 * 1000,
      startLevel: -1,
      debug: false,
    },
  },

  // Cache Configuration
  CACHE: {
    ENABLED: true,
    TTL: 3600000, // 1 hour
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    COMPRESSION: true,
  },

  // Storage Configuration
  STORAGE: {
    PREFIX: 'tesla_iptv_',
    CREDENTIALS_KEY: 'credentials',
    FAVORITES_KEY: 'favorites',
    HISTORY_KEY: 'history',
    SETTINGS_KEY: 'settings',
    CACHE_KEY: 'content_cache',
  },

  // UI Configuration
  UI: {
    THEME: 'dark',
    SIDEBAR_VISIBLE: true,
    SHOW_GUIDE: true,
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    CONTROLS_AUTO_HIDE: 5000, // ms
  },

  // Feature Flags
  FEATURES: {
    LIVE_TV: true,
    MOVIES: true,
    SERIES: true,
    FAVORITES: true,
    HISTORY: true,
    EPG: true,
    SEARCH: true,
    RECOMMENDATIONS: true,
    CONTINUE_WATCHING: true,
    OFFLINE_MODE: false,
    CASTING: false,
  },

  // Content Configuration
  CONTENT: {
    ITEMS_PER_PAGE: 20,
    GRID_COLS_MOBILE: 2,
    GRID_COLS_TABLET: 3,
    GRID_COLS_DESKTOP: 5,
    LOAD_MORE_THRESHOLD: 80, // percentage
  },

  // Streaming Configuration
  STREAMING: {
    MAX_CONCURRENT_STREAMS: 1,
    BANDWIDTH_SAVING: false,
    QUALITY_AUTO_SELECT: true,
    ADAPTIVE_BITRATE: true,
  },

  // EPG Configuration
  EPG: {
    DAYS_AHEAD: 7,
    HOURS_PER_VIEW: 6,
    UPDATE_INTERVAL: 3600000, // 1 hour
  },

  // Timeout & Retry Configuration
  TIMEOUT: {
    API_CALL: 30000,
    STREAM_CONNECT: 15000,
    STREAM_BUFFER: 10000,
  },

  // Local Storage Keys
  KEYS: {
    AUTH_TOKEN: 'tesla_iptv_auth_token',
    USER_PROFILE: 'tesla_iptv_user_profile',
    FAVORITES: 'tesla_iptv_favorites',
    WATCH_HISTORY: 'tesla_iptv_history',
    SETTINGS: 'tesla_iptv_settings',
    PLAYLISTS: 'tesla_iptv_playlists',
    CACHE: 'tesla_iptv_cache',
  },

  // App Version
  VERSION: '2.0.0',

  // Xtream Codes API Endpoints
  XTREAM_ENDPOINTS: {
    GET_LIVE_CATEGORIES: 'player_api.php?username={username}&password={password}&action=get_live_categories',
    GET_LIVE_STREAMS: 'player_api.php?username={username}&password={password}&action=get_live_streams&category_id={category_id}',
    GET_VOD_CATEGORIES: 'player_api.php?username={username}&password={password}&action=get_vod_categories',
    GET_VOD_STREAMS: 'player_api.php?username={username}&password={password}&action=get_vod_streams&category_id={category_id}',
    GET_VOD_INFO: 'player_api.php?username={username}&password={password}&action=get_vod_info&vod_id={vod_id}',
    GET_SERIES_CATEGORIES: 'player_api.php?username={username}&password={password}&action=get_series_categories',
    GET_SERIES: 'player_api.php?username={username}&password={password}&action=get_series&category_id={category_id}',
    GET_SERIES_INFO: 'player_api.php?username={username}&password={password}&action=get_series_info&series_id={series_id}',
    GET_USER_INFO: 'player_api.php?username={username}&password={password}&action=get_user_info',
    GET_EPG: 'player_api.php?username={username}&password={password}&action=get_epg&stream_id={stream_id}&limit={limit}',
  },

  // Quality Presets
  QUALITY_PRESETS: [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: '1080' },
    { label: '720p', value: '720' },
    { label: '480p', value: '480' },
    { label: '360p', value: '360' },
  ],

  // Default Categories
  DEFAULT_CATEGORIES: {
    ALL: { id: 'all', name: 'All', icon: '📺' },
    LIVE: { id: 'live', name: 'Live TV', icon: '📡' },
    MOVIES: { id: 'movies', name: 'Movies', icon: '🎬' },
    SERIES: { id: 'series', name: 'Series', icon: '📺' },
    FAVORITES: { id: 'favorites', name: 'Favorites', icon: '❤️' },
  },

  // Error Messages
  ERRORS: {
    INVALID_CREDENTIALS: 'Invalid server credentials. Please check your login details.',
    NETWORK_ERROR: 'Network error. Please check your internet connection.',
    SERVER_ERROR: 'Server error. Please try again later.',
    STREAM_NOT_FOUND: 'Stream not found or not available.',
    PLAYBACK_ERROR: 'Error playing stream. Please try again.',
    INVALID_URL: 'Invalid server URL format.',
    NO_STREAMS: 'No streams available.',
  },

  // Success Messages
  SUCCESS: {
    LOGIN: 'Logged in successfully!',
    LOGOUT: 'Logged out successfully!',
    ADDED_FAVORITE: 'Added to favorites',
    REMOVED_FAVORITE: 'Removed from favorites',
    CACHE_CLEARED: 'Cache cleared successfully',
    SETTINGS_SAVED: 'Settings saved successfully',
  },
};

// Export config for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
