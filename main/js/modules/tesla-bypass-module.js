/**
 * Tesla Bypass Module
 * Tesla araç tarayıcısında hareket halindeyken video oynatma kısıtlamalarını aşar.
 * 
 * Özellikler:
 * - Motion sensör sahte değerleri (ivmeölçer, jiroskop)
 * - Geolocation spoofing (sabit konum, hız=0)
 * - Video pause yakalama ve otomatik devam
 * - HTMLVideoElement.prototype override
 * - MutationObserver ile yeni video elementleri izleme
 * - Network bağlantı bilgisi sahte değerleri
 */

class TeslaBypassModule {
  constructor() {
    this.isRunning = false;
    this.settings = {};
    this.monitorInterval = null;
    this.videoObserver = null;
    this.trackedVideos = new Set();
    this._originalPause = null;
    this._originalPlay = null;
    this._originalGetCurrentPosition = null;
    this._originalWatchPosition = null;
    this._pauseListeners = new Map();
  }

  /**
   * Initialize the bypass module with settings
   */
  init() {
    this.loadSettings();
    console.log('🛡️ TeslaBypassModule initialized');
  }

  /**
   * Load bypass settings from config and storage
   */
  loadSettings() {
    const saved = storageService?.get('tesla_bypass_settings') || {};
    this.settings = {
      enabled:       CONFIG.BYPASS?.ENABLED       ?? true,
      mockSpeed:     CONFIG.BYPASS?.MOCK_SPEED     ?? true,
      mockGear:      CONFIG.BYPASS?.MOCK_GEAR      ?? true,
      autoResume:    CONFIG.BYPASS?.AUTO_RESUME     ?? true,
      preventPause:  CONFIG.BYPASS?.PREVENT_PAUSE   ?? true,
      fakeLocation:  CONFIG.BYPASS?.FAKE_LOCATION   ?? { lat: 41.0082, lng: 28.9784 },
      ...saved,
    };
  }

  /**
   * Save current settings to storage
   */
  saveSettings() {
    storageService?.set('tesla_bypass_settings', this.settings);
  }

  /**
   * Start all bypass systems
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this._log('Bypass sistemi başlatılıyor...', 'info');

    if (this.settings.mockSpeed) {
      this._hijackMotionSensor();
    }
    if (this.settings.mockGear) {
      this._hijackGearStatus();
    }
    this._hijackGeolocation();
    this._hijackNetworkConnection();

    if (this.settings.preventPause) {
      this._overrideVideoPause();
    }
    if (this.settings.autoResume) {
      this._startVideoMonitoring();
    }

    this._observeNewVideos();
    this._updateStatusUI();

    this._log('✅ Bypass sistemi aktif!', 'success');
  }

  /**
   * Stop all bypass systems
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    // Stop monitoring
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    // Disconnect observer
    if (this.videoObserver) {
      this.videoObserver.disconnect();
      this.videoObserver = null;
    }

    // Restore original pause
    if (this._originalPause) {
      HTMLVideoElement.prototype.pause = this._originalPause;
      this._originalPause = null;
    }

    // Restore geolocation
    if (this._originalGetCurrentPosition) {
      navigator.geolocation.getCurrentPosition = this._originalGetCurrentPosition;
      this._originalGetCurrentPosition = null;
    }
    if (this._originalWatchPosition) {
      navigator.geolocation.watchPosition = this._originalWatchPosition;
      this._originalWatchPosition = null;
    }

    // Remove pause listeners from tracked videos
    this._pauseListeners.forEach((listener, video) => {
      video.removeEventListener('pause', listener);
    });
    this._pauseListeners.clear();
    this.trackedVideos.clear();

    this._updateStatusUI();
    this._log('⏹️ Bypass sistemi durduruldu', 'warning');
  }

  /**
   * Toggle bypass on/off
   */
  toggle() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
    return this.isRunning;
  }

  /**
   * Get current bypass status
   */
  getStatus() {
    return {
      running: this.isRunning,
      mockedSpeed: this.settings.mockSpeed ? '0 km/h' : 'Devre dışı',
      mockedGear: this.settings.mockGear ? 'PARK' : 'Devre dışı',
      autoResume: this.settings.autoResume,
      preventPause: this.settings.preventPause,
      trackedVideos: this.trackedVideos.size,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // MOTION & SENSOR HIJACKING
  // ═══════════════════════════════════════════════════════════════

  _hijackMotionSensor() {
    const zeroMotion = {
      acceleration: { x: 0, y: 0, z: 0 },
      accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 },
      rotationRate: { alpha: 0, beta: 0, gamma: 0 },
      interval: 16,
    };

    // Override navigator.motion
    try {
      Object.defineProperty(window.navigator, 'motion', {
        get: () => zeroMotion,
        configurable: true,
      });
    } catch (e) { /* property may not be configurable */ }

    // Override navigator.deviceMotion
    try {
      Object.defineProperty(window.navigator, 'deviceMotion', {
        get: () => zeroMotion,
        configurable: true,
      });
    } catch (e) { /* property may not be configurable */ }

    // Intercept DeviceMotionEvent
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const self = this;
    window.addEventListener('devicemotion', function(e) {
      if (!self.isRunning) return;
      e.stopImmediatePropagation();
    }, true);

    // Override window.speed
    try {
      Object.defineProperty(window, 'speed', {
        get: () => 0,
        configurable: true,
      });
    } catch (e) { /* property may not be configurable */ }

    this._log('Motion sensör hijack edildi (hız=0)', 'success');
  }

  _hijackGearStatus() {
    // Override window.gear
    try {
      Object.defineProperty(window, 'gear', {
        get: () => 'PARK',
        configurable: true,
      });
    } catch (e) { /* property may not be configurable */ }

    // Override Tesla-specific APIs if they exist
    if (window.Tesla) {
      if (window.Tesla.isVehicleMoving) {
        window.Tesla.isVehicleMoving = () => false;
      }
      if (window.Tesla.checkSpeed) {
        window.Tesla.checkSpeed = () => 0;
      }
      if (window.Tesla.getGearPosition) {
        window.Tesla.getGearPosition = () => 'P';
      }
      if (window.Tesla.isDriving) {
        window.Tesla.isDriving = () => false;
      }
    }

    this._log('Vites durumu PARK olarak sabitlendi', 'success');
  }

  // ═══════════════════════════════════════════════════════════════
  // GEOLOCATION HIJACKING
  // ═══════════════════════════════════════════════════════════════

  _hijackGeolocation() {
    const fakePosition = {
      coords: {
        latitude: this.settings.fakeLocation.lat,
        longitude: this.settings.fakeLocation.lng,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: 0, // Speed = 0 → vehicle stationary
      },
      timestamp: Date.now(),
    };

    // Save originals
    this._originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    this._originalWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);

    // Override getCurrentPosition
    navigator.geolocation.getCurrentPosition = (success, error, options) => {
      if (this.isRunning) {
        fakePosition.timestamp = Date.now();
        success(fakePosition);
      } else if (this._originalGetCurrentPosition) {
        this._originalGetCurrentPosition(success, error, options);
      }
    };

    // Override watchPosition
    navigator.geolocation.watchPosition = (success, error, options) => {
      if (this.isRunning) {
        const id = setInterval(() => {
          fakePosition.timestamp = Date.now();
          success(fakePosition);
        }, 1000);
        return id;
      } else if (this._originalWatchPosition) {
        return this._originalWatchPosition(success, error, options);
      }
    };

    this._log('Geolocation hijack edildi (sabit konum, hız=0)', 'success');
  }

  // ═══════════════════════════════════════════════════════════════
  // NETWORK CONNECTION SPOOFING
  // ═══════════════════════════════════════════════════════════════

  _hijackNetworkConnection() {
    const fakeConnection = {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
      type: 'wifi',
    };

    try {
      Object.defineProperty(window.navigator, 'connection', {
        get: () => fakeConnection,
        configurable: true,
      });
    } catch (e) { /* property may not be configurable */ }

    try {
      Object.defineProperty(window.navigator, 'onLine', {
        get: () => true,
        configurable: true,
      });
    } catch (e) { /* property may not be configurable */ }

    this._log('Network bağlantı bilgisi 4G/WiFi olarak sabitlendi', 'success');
  }

  // ═══════════════════════════════════════════════════════════════
  // VIDEO PAUSE OVERRIDE & AUTO-RESUME
  // ═══════════════════════════════════════════════════════════════

  _overrideVideoPause() {
    this._originalPause = HTMLVideoElement.prototype.pause;
    const self = this;

    HTMLVideoElement.prototype.pause = function() {
      // If bypass is running and preventPause is enabled, ignore external pause calls
      if (self.isRunning && self.settings.preventPause) {
        // Check if this is a user-initiated pause from our own player controls
        if (this._userPauseAllowed) {
          this._userPauseAllowed = false;
          return self._originalPause.call(this);
        }

        self._log('Pause komutu engellendi, video oynatılmaya devam ediyor', 'warning');

        // Re-trigger play after a short delay
        setTimeout(() => {
          this.play().catch(() => {});
        }, 50);
        return;
      }

      return self._originalPause.call(this);
    };

    this._log('Video pause override aktif', 'success');
  }

  /**
   * Track a video element for auto-resume
   */
  _trackVideo(video) {
    if (this.trackedVideos.has(video)) return;
    this.trackedVideos.add(video);

    const pauseHandler = () => {
      if (!this.isRunning || !this.settings.autoResume) return;

      // Don't auto-resume if user explicitly paused via our UI
      if (video._userPauseAllowed) return;

      this._log('Video duraklatıldı, otomatik devam ettiriliyor...', 'warning');
      setTimeout(() => {
        if (this.isRunning && video.paused) {
          video.play().catch(err => {
            this._log(`Otomatik play başarısız: ${err.message}`, 'error');
          });
        }
      }, 200);
    };

    video.addEventListener('pause', pauseHandler);
    this._pauseListeners.set(video, pauseHandler);
  }

  /**
   * Start monitoring all video elements
   */
  _startVideoMonitoring() {
    // Track existing videos
    document.querySelectorAll('video').forEach(v => this._trackVideo(v));

    // Periodically check video states
    this.monitorInterval = setInterval(() => {
      if (!this.isRunning) return;

      this.trackedVideos.forEach(video => {
        if (video.paused && this.settings.autoResume && !video._userPauseAllowed) {
          video.play().catch(() => {});
        }
      });

      this._updateVideoStatusUI();
    }, 2000);
  }

  /**
   * Observe DOM for newly added video elements
   */
  _observeNewVideos() {
    this.videoObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeName === 'VIDEO') {
            this._trackVideo(node);
            this._log('Yeni video elementi tespit edildi ve izlemeye alındı', 'success');
          }
          // Also check child nodes
          if (node.querySelectorAll) {
            node.querySelectorAll('video').forEach(v => {
              this._trackVideo(v);
            });
          }
        });
      });
    });

    this.videoObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this._log('Video MutationObserver başlatıldı', 'success');
  }

  // ═══════════════════════════════════════════════════════════════
  // UI UPDATES
  // ═══════════════════════════════════════════════════════════════

  _updateStatusUI() {
    const indicator = document.getElementById('bypass-status-indicator');
    if (indicator) {
      if (this.isRunning) {
        indicator.classList.add('active');
        indicator.title = 'Bypass Aktif';
      } else {
        indicator.classList.remove('active');
        indicator.title = 'Bypass Devre Dışı';
      }
    }

    // Update settings panel status text
    const statusText = document.getElementById('bypass-status-text');
    if (statusText) {
      statusText.textContent = this.isRunning ? '🟢 Aktif' : '🔴 Devre Dışı';
    }

    // Update speed/gear indicators
    const speedEl = document.getElementById('bypass-mocked-speed');
    if (speedEl) {
      speedEl.textContent = this.isRunning && this.settings.mockSpeed ? '0 km/h' : '--';
    }
    const gearEl = document.getElementById('bypass-mocked-gear');
    if (gearEl) {
      gearEl.textContent = this.isRunning && this.settings.mockGear ? 'PARK' : '--';
    }
  }

  _updateVideoStatusUI() {
    const videoStateEl = document.getElementById('bypass-video-state');
    if (!videoStateEl) return;

    let playingCount = 0;
    this.trackedVideos.forEach(v => {
      if (!v.paused) playingCount++;
    });

    if (playingCount > 0) {
      videoStateEl.textContent = `▶ ${playingCount} video oynatılıyor`;
      videoStateEl.style.color = '#00ff88';
    } else if (this.trackedVideos.size > 0) {
      videoStateEl.textContent = '⏸ Durdurulmuş';
      videoStateEl.style.color = '#ff4757';
    } else {
      videoStateEl.textContent = 'Video yok';
      videoStateEl.style.color = '#8b8b8b';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update a bypass setting
   */
  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();

    // If bypass is running, apply changes immediately
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════

  _log(message, type = 'info') {
    const prefix = '[TeslaBypass]';
    switch (type) {
      case 'success':
        console.log(`%c${prefix} ${message}`, 'color: #00ff88');
        break;
      case 'warning':
        console.warn(`${prefix} ${message}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }

    // Also write to bypass log panel if it exists
    const logPanel = document.getElementById('bypass-log');
    if (logPanel) {
      const entry = document.createElement('div');
      entry.className = `bypass-log-entry ${type}`;
      const time = new Date().toLocaleTimeString('tr-TR');
      entry.textContent = `[${time}] ${message}`;
      logPanel.appendChild(entry);
      logPanel.scrollTop = logPanel.scrollHeight;

      // Keep max 50 entries
      while (logPanel.children.length > 50) {
        logPanel.removeChild(logPanel.firstChild);
      }
    }
  }
}
