/**
 * Tesla IPTV Player - Main Application
 * Orchestrates all modules and initializes the application
 */

class TeslaIPTVApp {
  constructor() {
    this.ready = false;
    this.version = CONFIG.VERSION;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('🚀 Initializing Tesla IPTV Player v' + this.version);

      // Initialize UI
      UIModule.setupResponsive();
      UIModule.setupNetworkHandlers();
      UIModule.init();

      // Hide loading spinner after initialization
      setTimeout(() => {
        UIModule.showLoading(false);
      }, 500);

      this.ready = true;
      console.log('✅ Tesla IPTV Player initialized successfully');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      UIModule.showToast('Application initialization failed', 'error');
    }
  }

  /**
   * Start the application (called after auth)
   */
  async start() {
    try {
      console.log('🎬 Starting application...');

      // Initialize modules
      settingsModule.init();
      playerModule.init();
      epgModule.init();

      // Preload cache
      console.log('📦 Preloading cache...');
      await cacheService.preloadCache();

      // Load content
      console.log('📺 Loading content...');
      await contentModule.init();

      console.log('✅ Application started successfully');
    } catch (error) {
      console.error('❌ Start failed:', error);
      UIModule.showToast('Failed to start application', 'error');
    }
  }

  /**
   * Shutdown the application
   */
  async shutdown() {
    try {
      console.log('🛑 Shutting down...');

      // Save current state
      storageService.saveSettings(settingsModule.settings);

      // Clear sensitive data
      playerModule.closePlayer();

      this.ready = false;
      console.log('✅ Shutdown complete');
    } catch (error) {
      console.error('❌ Shutdown error:', error);
    }
  }

  /**
   * Get application status
   */
  getStatus() {
    return {
      version: this.version,
      ready: this.ready,
      authenticated: authModule.isLoggedIn,
      userInfo: authModule.user,
      cacheSize: cacheService.getLocalStorageSize(),
      storageSize: storageService.getStorageSize(),
    };
  }

  /**
   * Handle unload
   */
  handleUnload() {
    this.shutdown();
  }
}

// Create global service instances
const storageService = new StorageService();
const cacheService = new CacheService();
const apiService = new APIService();

// Create global module instances
const authModule = new AuthModule();
const playerModule = new PlayerModule();
const contentModule = new ContentModule();
const epgModule = new EPGModule();
const settingsModule = new SettingsModule();

// Create global app instance
const app = new TeslaIPTVApp();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM ready, initializing app...');
  app.init();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  app.handleUnload();
});

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('⏸️ App hidden');
    if (playerModule.player) {
      playerModule.player.pause();
    }
  } else {
    console.log('▶️ App visible');
    if (playerModule.player && playerModule.isPlaying) {
      playerModule.player.play();
    }
  }
});

// Handle connection errors gracefully
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  if (event.message.includes('Network')) {
    UIModule.showToast(CONFIG.ERRORS.NETWORK_ERROR, 'error');
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  UIModule.showToast('An unexpected error occurred', 'error');
});

// Exponential backoff for retries
function exponentialBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 1000; // Add jitter
}

// Sleep utility for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Service worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Uncomment if you have a service worker
    // navigator.serviceWorker.register('/sw.js')
    //   .then(reg => console.log('SW registered:', reg))
    //   .catch(err => console.log('SW registration failed:', err));
  });
}

// Performance monitoring
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log(`📊 Page load time: ${pageLoadTime}ms`);
  });
}

// Enable debug mode in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.DEBUG_MODE = true;
  console.log('🐛 Debug mode enabled');
  window.app = app;
  window.apiService = apiService;
  window.storageService = storageService;
  window.cacheService = cacheService;
  window.authModule = authModule;
  window.playerModule = playerModule;
  window.contentModule = contentModule;
  window.settingsModule = settingsModule;
}

console.log('✅ Tesla IPTV Player loaded and ready');
