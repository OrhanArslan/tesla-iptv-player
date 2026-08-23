/**
 * Tesla IPTV Video Bypass - Content Script
 * Injected into all pages to bypass Tesla's video playback restrictions
 */

(function() {
  'use strict';

  let bypassActive = false;

  const startBypass = () => {
    if (bypassActive) return;
    bypassActive = true;
    console.log('[TeslaBypass] Content script bypass activated');

    // ─── Motion Sensor Override ────────────────────────────
    const zeroMotion = {
      acceleration: { x: 0, y: 0, z: 0 },
      accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 },
      rotationRate: { alpha: 0, beta: 0, gamma: 0 },
      interval: 16,
    };

    try {
      Object.defineProperty(window.navigator, 'motion', {
        get: () => zeroMotion,
        configurable: true,
      });
    } catch (e) { /* ignore */ }

    // Intercept devicemotion events
    window.addEventListener('devicemotion', (e) => {
      e.stopImmediatePropagation();
    }, true);

    // Override speed and gear
    try {
      Object.defineProperty(window, 'speed', { get: () => 0, configurable: true });
      Object.defineProperty(window, 'gear', { get: () => 'PARK', configurable: true });
    } catch (e) { /* ignore */ }

    // Override Tesla-specific APIs
    if (window.Tesla) {
      if (window.Tesla.isVehicleMoving) window.Tesla.isVehicleMoving = () => false;
      if (window.Tesla.checkSpeed) window.Tesla.checkSpeed = () => 0;
      if (window.Tesla.isDriving) window.Tesla.isDriving = () => false;
      if (window.Tesla.getGearPosition) window.Tesla.getGearPosition = () => 'P';
    }

    // ─── Geolocation Override ──────────────────────────────
    const fakePosition = {
      coords: {
        latitude: 41.0082,
        longitude: 28.9784,
        accuracy: 10,
        speed: 0,
      },
      timestamp: Date.now(),
    };

    const origGetPos = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (success, error, opts) => {
      fakePosition.timestamp = Date.now();
      success(fakePosition);
    };

    // ─── Video Auto-Resume ─────────────────────────────────
    const setupVideoBypass = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (video._bypassTracked) return;
        video._bypassTracked = true;

        video.addEventListener('pause', () => {
          if (!bypassActive) return;
          setTimeout(() => {
            if (video.paused && bypassActive) {
              video.play().catch(() => {});
            }
          }, 200);
        });
      });
    };

    // Run on DOM ready and observe for new videos
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupVideoBypass);
    } else {
      setupVideoBypass();
    }

    const observer = new MutationObserver(() => {
      setupVideoBypass();
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }

    // ─── Visibility Change Override ────────────────────────
    document.addEventListener('visibilitychange', (e) => {
      if (!bypassActive) return;
      e.stopImmediatePropagation();

      // Force resume all videos when page becomes hidden
      if (document.hidden) {
        document.querySelectorAll('video').forEach(v => {
          if (!v.paused) {
            setTimeout(() => v.play().catch(() => {}), 100);
          }
        });
      }
    }, true);
  };

  // Listen for messages from background script
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'startBypass') {
        startBypass();
      }
    });
  }

  // Auto-start bypass
  if (document.readyState === 'complete') {
    startBypass();
  } else {
    window.addEventListener('load', startBypass);
  }
})();
