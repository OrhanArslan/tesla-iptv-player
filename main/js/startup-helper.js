/**
 * Tesla IPTV Player - Startup Helper
 * Ensures all modules are loaded and initialized correctly
 */

// Override console methods to catch errors
const originalError = console.error;
const originalWarn = console.warn;

console.error = function(...args) {
  originalError.apply(console, args);
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
};

// Wait for key objects before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Check for critical objects
  const critical = {
    CONFIG: typeof CONFIG !== 'undefined',
    StorageService: typeof StorageService !== 'undefined',
    APIService: typeof APIService !== 'undefined',
    CacheService: typeof CacheService !== 'undefined',
    AuthModule: typeof AuthModule !== 'undefined',
    PlayerModule: typeof PlayerModule !== 'undefined',
    ContentModule: typeof ContentModule !== 'undefined',
    EPGModule: typeof EPGModule !== 'undefined',
    SettingsModule: typeof SettingsModule !== 'undefined',
    UIModule: typeof UIModule !== 'undefined',
    TeslaIPTVApp: typeof TeslaIPTVApp !== 'undefined',
  };

  const missing = Object.keys(critical).filter(key => !critical[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required components:', missing);
    // Immediately show error message (no endless reload loop)
    const msg = document.createElement('div');
    msg.style.padding = '20px';
    msg.style.background = '#fee';
    msg.style.color = '#900';
    msg.style.border = '1px solid #900';
    msg.style.margin = '20px';
    msg.style.whiteSpace = 'pre-wrap';
    msg.textContent = '❌ Application failed to load required scripts.\n' +
      'Missing: ' + missing.join(', ') + '\n' +
      'Please open the site via an HTTP server and check console network errors.';
    document.body.prepend(msg);
    return;
  }

  console.log('✅ All components loaded successfully');

  const playbackSettings = document.getElementById('playback-settings');
  const resumePlaybackInput = document.getElementById('resume-playback');
  if (playbackSettings && resumePlaybackInput && !document.getElementById('continue-while-hidden')) {
    const settingGroup = document.createElement('div');
    settingGroup.className = 'setting-group';
    settingGroup.innerHTML = `
      <label class="checkbox">
        <input type="checkbox" id="continue-while-hidden" ${CONFIG.PLAYER.CONTINUE_WHILE_HIDDEN ? 'checked' : ''} />
        <span>Arac hareket halindeyken oynatmaya devam et</span>
      </label>
    `;
    resumePlaybackInput.closest('.setting-group')?.insertAdjacentElement('afterend', settingGroup);
  }

  // Check if global instances are created
  setTimeout(() => {
    if (typeof app !== 'undefined' && app.ready) {
      console.log('✅ Application initialized');
    } else {
      console.log('⏳ Waiting for app initialization...');
    }
  }, 1000);
});

// Prevent forced pause when Tesla changes page visibility while driving.
document.addEventListener('visibilitychange', (event) => {
  const continueWhileHidden =
    typeof settingsModule !== 'undefined' && settingsModule?.getSetting
      ? settingsModule.getSetting('continueWhileHidden', CONFIG.PLAYER.CONTINUE_WHILE_HIDDEN)
      : CONFIG.PLAYER.CONTINUE_WHILE_HIDDEN;

  if (!continueWhileHidden) return;
  if (typeof playerModule === 'undefined' || !playerModule?.handleVisibilityChange) return;

  playerModule.handleVisibilityChange(document.hidden, true);
  event.stopImmediatePropagation();
}, true);


// Removed overriding feature patches to allow the new premium UI to take over.


// Fallback error handler
window.addEventListener('error', (event) => {
  console.error('JavaScript Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

console.log('🔧 Startup helper loaded');
