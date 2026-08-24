/**
 * Tesla Bypass Module — Canvas Rendering
 * 
 * Tesla aracın D/R vitesinde <video> elementinin görüntüsünü motor
 * seviyesinde donduruyor. Bu modül videoyu gizli tutup her frame'i
 * bir <canvas> elementine çizerek bu engeli aşar.
 *
 * Ayrıca:
 * - pause() override (Tesla bazen pause çağırır)
 * - visibilitychange guard
 * - auto-resume
 */

class TeslaBypassModule {
  constructor() {
    this.isRunning = false;
    this.settings = {};

    // Canvas state
    this._canvas = null;
    this._ctx = null;
    this._rafId = null;
    this._videoEl = null;
    this._resizeObserver = null;

    // Pause override
    this._originalPause = null;
    this._pauseListeners = new Map();
    this.trackedVideos = new Set();
    this.monitorInterval = null;
    this.videoObserver = null;
  }

  // ─── INIT & SETTINGS ────────────────────────────────────────

  init() {
    this.loadSettings();
    console.log('[TeslaBypass] Initialized');
  }

  loadSettings() {
    const saved = (typeof storageService !== 'undefined' && storageService?.get('tesla_bypass_settings')) || {};
    this.settings = {
      enabled:      CONFIG?.BYPASS?.ENABLED      ?? true,
      autoResume:   CONFIG?.BYPASS?.AUTO_RESUME   ?? true,
      preventPause: CONFIG?.BYPASS?.PREVENT_PAUSE ?? true,
      ...saved,
    };
  }

  saveSettings() {
    if (typeof storageService !== 'undefined') {
      storageService.set('tesla_bypass_settings', this.settings);
    }
  }

  // ─── START / STOP / TOGGLE ──────────────────────────────────

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Pause override
    if (this.settings.preventPause) {
      this._overrideVideoPause();
    }

    // Visibility guard
    this._installVisibilityGuard();

    // Auto-resume monitoring
    if (this.settings.autoResume) {
      this._startVideoMonitoring();
    }

    // Watch for new <video> elements
    this._observeNewVideos();

    // If player already has a video, attach canvas now
    const existingVideo = document.getElementById('video-player');
    if (existingVideo) {
      this.attachCanvas(existingVideo);
    }

    this._updateStatusUI();
    console.log('[TeslaBypass] ✅ Bypass aktif (Canvas Rendering)');
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    this.detachCanvas();

    // Restore pause
    if (this._originalPause) {
      HTMLVideoElement.prototype.pause = this._originalPause;
      this._originalPause = null;
    }

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

    // Remove pause listeners
    this._pauseListeners.forEach((listener, video) => {
      video.removeEventListener('pause', listener);
    });
    this._pauseListeners.clear();
    this.trackedVideos.clear();

    this._updateStatusUI();
    console.log('[TeslaBypass] ⏹ Bypass durduruldu');
  }

  toggle() {
    if (this.isRunning) this.stop();
    else this.start();
    return this.isRunning;
  }

  // ─── CANVAS RENDERING (CORE) ───────────────────────────────

  /**
   * Attach a canvas overlay on top of a <video> element.
   * The video is made visually invisible but keeps playing (audio continues).
   * Each frame is drawn to the canvas via requestAnimationFrame.
   */
  attachCanvas(videoEl) {
    if (!videoEl || this._canvas) return;
    this._videoEl = videoEl;

    const parent = videoEl.parentElement;
    if (!parent) return;

    // The core of the bypass: Hide the real video so Tesla doesn't flag it as full-screen video playback.
    // We make it 1x1 pixel. Canvas drawImage uses internal resolution (videoWidth/videoHeight), so quality is preserved.
    videoEl.style.cssText = 'position: absolute; top: 0; left: 0; width: 1px; height: 1px; opacity: 0.01; pointer-events: none; z-index: -1;';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'bypass-canvas';
    canvas.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;' +
      'z-index:2;pointer-events:none;background:#000;' +
      'border: 2px solid rgba(255, 0, 0, 0.5); box-sizing: border-box;';

    // Make sure parent is positioned
    const parentPos = getComputedStyle(parent).position;
    if (parentPos === 'static') {
      parent.style.position = 'relative';
    }

    parent.appendChild(canvas);
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Hide the real video visually by making it tiny and fully transparent, but keeping it in DOM
    videoEl.style.cssText = 'position: absolute; top: 0; left: 0; width: 1px; height: 1px; opacity: 0.01; pointer-events: none; z-index: -1;';

    // Sync canvas size
    this._syncCanvasSize();

    // Watch for resize
    this._resizeObserver = new ResizeObserver(() => this._syncCanvasSize());
    this._resizeObserver.observe(parent);

    // Start render loop
    this._startRenderLoop();

    console.log('[TeslaBypass] Canvas attached to video');
  }

  /**
   * Remove canvas overlay, restore video visibility.
   */
  detachCanvas() {
    // Stop render loop
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    // Remove resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    // Remove canvas
    if (this._canvas && this._canvas.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx = null;

    // Restore video visibility
    if (this._videoEl) {
      this._videoEl.style.cssText = '';
      this._videoEl = null;
    }
  }

  /**
   * Sync canvas pixel dimensions to its CSS display size.
   */
  _syncCanvasSize() {
    if (!this._canvas) return;
    const rect = this._canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for perf
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (this._canvas.width !== w || this._canvas.height !== h) {
      this._canvas.width = w;
      this._canvas.height = h;
    }
  }

  /**
   * Core render loop - draws video frames to canvas.
   */
  _startRenderLoop() {
    const draw = () => {
      if (!this.isRunning || !this._canvas || !this._videoEl) return;

      const video = this._videoEl;
      const ctx = this._ctx;
      const canvas = this._canvas;

      // Only draw if video has data
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        try {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Calculate Aspect Ratio to preserve letterboxing
          const hRatio = canvas.width / video.videoWidth;
          const vRatio = canvas.height / video.videoHeight;
          const ratio  = Math.min(hRatio, vRatio);
          const centerShift_x = (canvas.width - video.videoWidth * ratio) / 2;
          const centerShift_y = (canvas.height - video.videoHeight * ratio) / 2;  

          ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
                        centerShift_x, centerShift_y, video.videoWidth * ratio, video.videoHeight * ratio);
        } catch (e) {
          // Silently ignore cross-origin or other draw errors
        }
      }

      this._rafId = requestAnimationFrame(draw);
    };

    this._rafId = requestAnimationFrame(draw);
  }

  // ─── PAUSE OVERRIDE ─────────────────────────────────────────

  _overrideVideoPause() {
    if (this._originalPause) return; // Already overridden
    this._originalPause = HTMLVideoElement.prototype.pause;
    const self = this;

    HTMLVideoElement.prototype.pause = function () {
      if (self.isRunning && self.settings.preventPause) {
        // Allow user-initiated pause from our UI
        if (this._userPauseAllowed) {
          this._userPauseAllowed = false;
          return self._originalPause.call(this);
        }

        // Block external pause, force play
        console.log('[TeslaBypass] Pause blocked, resuming...');
        setTimeout(() => {
          this.play().catch(() => {});
        }, 50);
        return;
      }

      return self._originalPause.call(this);
    };
  }

  // ─── VISIBILITY GUARD ───────────────────────────────────────

  _installVisibilityGuard() {
    // Prevent document.hidden from returning true
    try {
      Object.defineProperty(document, 'hidden', {
        get: () => this.isRunning ? false : false,
        configurable: true,
      });
    } catch (e) { /* may not be configurable */ }

    try {
      Object.defineProperty(document, 'visibilityState', {
        get: () => this.isRunning ? 'visible' : 'visible',
        configurable: true,
      });
    } catch (e) { /* may not be configurable */ }

    // Suppress visibilitychange events
    document.addEventListener('visibilitychange', (e) => {
      if (this.isRunning) {
        e.stopImmediatePropagation();
        // Force-resume any paused videos
        if (this._videoEl && this._videoEl.paused && !this._videoEl._userPauseAllowed) {
          this._videoEl.play().catch(() => {});
        }
      }
    }, true);
  }

  // ─── AUTO-RESUME MONITORING ─────────────────────────────────

  _trackVideo(video) {
    if (this.trackedVideos.has(video)) return;
    this.trackedVideos.add(video);

    const pauseHandler = () => {
      if (!this.isRunning || !this.settings.autoResume) return;
      if (video._userPauseAllowed) return;

      setTimeout(() => {
        if (this.isRunning && video.paused) {
          video.play().catch(() => {});
        }
      }, 200);
    };

    video.addEventListener('pause', pauseHandler);
    this._pauseListeners.set(video, pauseHandler);
  }

  _startVideoMonitoring() {
    document.querySelectorAll('video').forEach(v => this._trackVideo(v));

    this.monitorInterval = setInterval(() => {
      if (!this.isRunning) return;
      this.trackedVideos.forEach(video => {
        if (video.paused && this.settings.autoResume && !video._userPauseAllowed) {
          video.play().catch(() => {});
        }
      });
    }, 2000);
  }

  _observeNewVideos() {
    this.videoObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeName === 'VIDEO') {
            this._trackVideo(node);
            if (this.isRunning && !this._canvas) {
              this.attachCanvas(node);
            }
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('video').forEach(v => {
              this._trackVideo(v);
              if (this.isRunning && !this._canvas) {
                this.attachCanvas(v);
              }
            });
          }
        });
      });
    });

    this.videoObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ─── UI ─────────────────────────────────────────────────────

  _updateStatusUI() {
    const indicator = document.getElementById('bypass-status-indicator');
    if (indicator) {
      indicator.classList.toggle('active', this.isRunning);
      indicator.title = this.isRunning ? 'Bypass Aktif' : 'Bypass Devre Dışı';
    }

    const statusText = document.getElementById('bypass-status-text');
    if (statusText) {
      statusText.textContent = this.isRunning ? '🟢 Aktif' : '🔴 Devre Dışı';
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      canvasActive: !!this._canvas,
      trackedVideos: this.trackedVideos.size,
      autoResume: this.settings.autoResume,
      preventPause: this.settings.preventPause,
    };
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}
