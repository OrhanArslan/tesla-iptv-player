/**
 * Tesla IPTV Player - Global Initialization
 * Ensures all services and modules are properly instantiated
 */

// Wait for all scripts to load before initializing
window.addEventListener('load', () => {
  // Check if all required objects exist
  const required = ['CONFIG', 'StorageService', 'APIService', 'CacheService', 'AuthModule', 'PlayerModule', 'ContentModule', 'EPGModule', 'SettingsModule', 'UIModule', 'TeslaIPTVApp'];
  
  const missing = required.filter(name => typeof window[name] === 'undefined');
  
  if (missing.length > 0) {
    console.error('❌ Missing required objects:', missing);
    alert('Application failed to load. Missing required components: ' + missing.join(', '));
    return;
  }
  
  console.log('✅ All required objects found');
  
  // Check if global instances were created
  if (typeof app === 'undefined') {
    console.error('❌ App instance not created!');
    alert('Application failed to initialize');
    return;
  }
  
  console.log('✅ Global instances initialized');
  console.log('📱 Tesla IPTV Player is ready to use');
  
  // Log status
  console.log('Version:', CONFIG.VERSION);
  console.log('Debug Mode:', window.DEBUG_MODE || false);
});

// Add safety checks for critical functions
console.log('🔍 Performing startup checks...');

setTimeout(() => {
  if (typeof app !== 'undefined' && app.ready) {
    console.log('✅ App is ready');
  }
}, 2000);
