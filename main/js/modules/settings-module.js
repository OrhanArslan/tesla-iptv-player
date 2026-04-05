/**
 * Settings Module
 * Handles user settings and preferences
 */

class SettingsModule {
  constructor() {
    this.settings = {};
  }

  /**
   * Initialize settings module
   */
  init() {
    this.loadSettings();
    this.setupEventListeners();
  }

  /**
   * Load settings from storage
   */
  loadSettings() {
    const savedSettings = storageService.getSettings() || {};
    this.settings = {
      defaultQuality: CONFIG.PLAYER.DEFAULT_QUALITY,
      defaultVolume: CONFIG.PLAYER.DEFAULT_VOLUME,
      autoplay: CONFIG.PLAYER.AUTOPLAY,
      resumePlayback: CONFIG.PLAYER.RESUME_PLAYBACK,
      continueWhileHidden: CONFIG.PLAYER.CONTINUE_WHILE_HIDDEN,
      theme: CONFIG.UI.THEME,
      showGuide: CONFIG.UI.SHOW_GUIDE,
      maxStreams: CONFIG.STREAMING.MAX_CONCURRENT_STREAMS,
      bandwidthSaving: CONFIG.STREAMING.BANDWIDTH_SAVING,
      ...savedSettings,
    };

    this.applySettings();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.show());
    }

    // Tab switching
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.currentTarget));
    });

    // Close button
    document.querySelectorAll('[data-close="settings-modal"]').forEach(btn => {
      btn.addEventListener('click', () => this.hide());
    });

    // Playback settings
    this.setupPlaybackSettings();

    // Display settings
    this.setupDisplaySettings();

    // Streaming settings
    this.setupStreamingSettings();
  }

  /**
   * Setup playback settings
   */
  setupPlaybackSettings() {
    const defaultQuality = document.getElementById('default-quality');
    const defaultVolume = document.getElementById('default-volume');
    const autoplay = document.getElementById('autoplay');
    const resumePlayback = document.getElementById('resume-playback');
    const continueWhileHidden = document.getElementById('continue-while-hidden');

    if (defaultQuality) {
      defaultQuality.value = this.settings.defaultQuality;
      defaultQuality.addEventListener('change', (e) => {
        this.settings.defaultQuality = e.target.value;
        this.saveSettings();
      });
    }

    if (defaultVolume) {
      defaultVolume.value = this.settings.defaultVolume;
      defaultVolume.addEventListener('change', (e) => {
        this.settings.defaultVolume = e.target.value;
        this.saveSettings();
      });
    }

    if (autoplay) {
      autoplay.checked = this.settings.autoplay;
      autoplay.addEventListener('change', (e) => {
        this.settings.autoplay = e.target.checked;
        this.saveSettings();
      });
    }

    if (resumePlayback) {
      resumePlayback.checked = this.settings.resumePlayback;
      resumePlayback.addEventListener('change', (e) => {
        this.settings.resumePlayback = e.target.checked;
        this.saveSettings();
      });
    }

    if (continueWhileHidden) {
      continueWhileHidden.checked = this.settings.continueWhileHidden;
      continueWhileHidden.addEventListener('change', (e) => {
        this.settings.continueWhileHidden = e.target.checked;
        this.saveSettings();
      });
    }
  }

  /**
   * Setup display settings
   */
  setupDisplaySettings() {
    const themeSelect = document.getElementById('theme-select');
    const showGuide = document.getElementById('show-guide');

    if (themeSelect) {
      themeSelect.value = this.settings.theme;
      themeSelect.addEventListener('change', (e) => {
        this.settings.theme = e.target.value;
        this.applyTheme(e.target.value);
        this.saveSettings();
      });
    }

    if (showGuide) {
      showGuide.checked = this.settings.showGuide;
      showGuide.addEventListener('change', (e) => {
        this.settings.showGuide = e.target.checked;
        this.saveSettings();
      });
    }
  }

  /**
   * Setup streaming settings
   */
  setupStreamingSettings() {
    const maxStreams = document.getElementById('max-streams');
    const bandwidthSaving = document.getElementById('bandwidth-saving');
    const clearCacheBtn = document.getElementById('clear-cache-btn');

    if (maxStreams) {
      maxStreams.value = this.settings.maxStreams;
      maxStreams.addEventListener('change', (e) => {
        this.settings.maxStreams = e.target.value;
        this.saveSettings();
      });
    }

    if (bandwidthSaving) {
      bandwidthSaving.checked = this.settings.bandwidthSaving;
      bandwidthSaving.addEventListener('change', (e) => {
        this.settings.bandwidthSaving = e.target.checked;
        this.saveSettings();
      });
    }

    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => this.clearCache());
    }
  }

  /**
   * Switch settings tab
   */
  switchTab(tabBtn) {
    const tabName = tabBtn.dataset.tab;

    // Update active tab
    document.querySelectorAll('.settings-tab').forEach(btn => {
      btn.classList.remove('active');
    });
    tabBtn.classList.add('active');

    // Show/hide panels
    document.querySelectorAll('.settings-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const tabId = `${tabName}-settings`;
    const panel = document.getElementById(tabId);
    if (panel) {
      panel.classList.add('active');
    }
  }

  /**
   * Apply settings
   */
  applySettings() {
    // Apply theme
    this.applyTheme(this.settings.theme);

    // Apply playback settings
    if (playerModule) {
      playerModule.volume = this.settings.defaultVolume;
    }
  }

  /**
   * Apply theme
   */
  applyTheme(theme) {
    const html = document.documentElement;

    if (theme === 'light') {
      html.style.colorScheme = 'light';
    } else if (theme === 'dark') {
      html.style.colorScheme = 'dark';
    } else {
      // Auto - use system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.style.colorScheme = isDark ? 'dark' : 'light';
    }
  }

  /**
   * Save settings
   */
  saveSettings() {
    storageService.saveSettings(this.settings);
    UIModule.showToast(CONFIG.SUCCESS.SETTINGS_SAVED, 'success');
  }

  /**
   * Clear cache
   */
  clearCache() {
    if (confirm('Clear all cached data?')) {
      cacheService.clear();
      UIModule.showToast('Cache cleared successfully', 'success');
    }
  }

  /**
   * Show settings modal
   */
  show() {
    document.getElementById('settings-modal').style.display = 'flex';
  }

  /**
   * Hide settings modal
   */
  hide() {
    document.getElementById('settings-modal').style.display = 'none';
  }

  /**
   * Get setting value
   */
  getSetting(key, defaultValue = null) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }

  /**
   * Set setting value
   */
  setSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }
}
