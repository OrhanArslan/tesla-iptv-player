/**
 * Auth Module
 * Handles authentication and login functionality
 */

class AuthModule {
  constructor() {
    this.isLoggedIn = false;
    this.user = null;
    this.setupEventListeners();
    this.checkAutoLogin();
    
    // Initialize debug panel
    this.clearDebug();
    // Test debug panel immediately
    setTimeout(() => {
      this.showDebug('🔧 DEBUG PANEL TEST - If you see this, debug is working!');
    }, 1000);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    const rememberCheckbox = document.getElementById('remember-login');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Load saved credentials if available
    this.loadSavedCredentials();
  }

  /**
   * Handle login form submission
   */
  async handleLogin(e) {
    e.preventDefault();

    const serverUrl = document.getElementById('server-url').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-login').checked;

    if (!serverUrl || !username || !password) {
      this.showError('⚠️ Please fill in all fields');
      return;
    }

    try {
      this.showLoading(true);
      this.clearDebug();
      this.showDebug('🔄 STARTING LOGIN PROCESS...');
      this.showDebug('Server URL: ' + serverUrl);
      this.showDebug('Username: ' + username);
      this.showDebug('Password: ' + password.substring(0, 3) + '***');

      // Try multiple URL formats (preserve port and protocol – **do not alter :443**)          
      // IMPORTANT: we must never strip or modify ":443" as the server requires it.
      const urlFormats = [
        serverUrl,                            // As entered (do not change port or protocol)
        serverUrl.replace(/\/$/, '')         // Only drop trailing slash if present
        // Note: we deliberately do NOT include variants that add/remove :443 or change protocol
      ];

      let lastError = null;
      let successfulUrl = null;

      for (let i = 0; i < urlFormats.length; i++) {
        const testUrl = urlFormats[i];
        this.showDebug(`\n🔍 Testing URL format ${i + 1}: ${testUrl}`);
        if (i === 0) this.showDebug('   (Original URL - unmodified)');
        if (i === 1) this.showDebug('   (Trailing slash removed)');

        try {
          await apiService.init(testUrl, username, password);
          successfulUrl = testUrl;
          this.showDebug('✅ SUCCESS with this URL!');
          break;
        } catch (error) {
          lastError = error;
          this.showDebug('❌ Failed: ' + error.message.substring(0, 50));
        }
      }

      if (!successfulUrl) {
        throw lastError;
      }

      // Save credentials
      storageService.saveCredentials(successfulUrl, username, password, rememberMe);

      // Set user info
      this.user = apiService.userInfo;
      this.isLoggedIn = true;

      this.showError('');
      this.showDebug('✅ LOGIN SUCCESSFUL!');
      this.showSuccess('✅ Login successful!');

      // Show app after brief delay
      setTimeout(() => {
        this.showApp();
        this.initApp();
      }, 500);
    } catch (error) {
      const errorMsg = error.message || CONFIG.ERRORS.INVALID_CREDENTIALS;
      console.error('❌ Login failed:', errorMsg);

      // Show debug info
      this.showDebug('\n❌ FINAL ERROR: ' + errorMsg);
      if (apiService.lastBuiltUrl) {
        this.showDebug('Last URL tried: ' + apiService.lastBuiltUrl);
      }

      // Provide specific error messages
      let displayError = '❌ Login failed:\n';
      if (errorMsg.includes('HTTP 401') || errorMsg.includes('credentials') || errorMsg.includes('Invalid credentials')) {
        displayError += '❌ INVALID CREDENTIALS\n\nCheck:\n• Username\n• Password\n• Account is active';
        this.showDebug('REASON: Wrong username or password');
      } else if (errorMsg.includes('HTTP 403')) {
        displayError += '❌ ACCESS FORBIDDEN\n\nServer blocked your request';
        this.showDebug('REASON: Server blocked access');
      } else if (errorMsg.includes('HTTP 404')) {
        displayError += '❌ API NOT FOUND\n\nWrong server URL or port';
        this.showDebug('REASON: Wrong URL or API path');
      } else if (errorMsg.includes('HTTP 500') || errorMsg.includes('HTTP 502') || errorMsg.includes('HTTP 503')) {
        displayError += '❌ SERVER ERROR\n\nServer is having problems';
        this.showDebug('REASON: Server internal error');
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('ERR_CONNECTION_REFUSED')) {
        displayError += '❌ CANNOT REACH SERVER\n\nCheck:\n• Server URL\n• Port number\n• Server is online\n• Internet connection';
        this.showDebug('REASON: Cannot connect to server');
      } else if (errorMsg.includes('CORS') || errorMsg.includes('Access-Control')) {
        displayError += '❌ CORS BLOCKED\n\nServer blocks mobile requests\nTry different browser or VPN';
        this.showDebug('REASON: CORS security policy');
      } else if (errorMsg.includes('timeout') || errorMsg.includes('AbortError')) {
        displayError += '❌ TIMEOUT\n\nServer too slow or offline';
        this.showDebug('REASON: Request timed out');
      } else if (errorMsg.includes('Invalid JSON') || errorMsg.includes('Unexpected token')) {
        displayError += '❌ INVALID RESPONSE\n\nServer not responding correctly\nCheck server URL and port';
        this.showDebug('REASON: Server returned invalid data');
      } else {
        displayError += errorMsg;
        this.showDebug('REASON: Unknown error - ' + errorMsg);
      }

      this.showError(displayError);
      
      // Fallback alert for critical errors
      if (displayError.includes('CORS') || displayError.includes('CANNOT REACH SERVER')) {
        setTimeout(() => {
          alert('CRITICAL ERROR:\n\n' + displayError + '\n\nCheck browser console for details.');
        }, 100);
      }
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Load saved credentials
   */
  loadSavedCredentials() {
    const credentials = storageService.getCredentials();
    if (credentials && credentials.rememberMe) {
      document.getElementById('server-url').value = credentials.serverUrl || '';
      document.getElementById('username').value = credentials.username || '';
      document.getElementById('password').value = credentials.password || '';
      document.getElementById('remember-login').checked = true;
    }
  }

  /**
   * Auto-login if credentials exist
   */
  async checkAutoLogin() {
    try {
      const credentials = storageService.getCredentials();
      if (credentials && credentials.rememberMe) {
        // Try auto-login
        await apiService.init(credentials.serverUrl, credentials.username, credentials.password);
        this.user = apiService.userInfo;
        this.isLoggedIn = true;

        // Small delay for smooth transition
        setTimeout(() => {
          this.showApp();
          this.initApp();
        }, 500);
      }
    } catch (error) {
      console.log('Auto-login failed, showing login screen');
    }
  }

  /**
   * Show loading state
   */
  showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      if (message) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        // Also show in debug panel as fallback
        this.showDebug('❌ ERROR MESSAGE: ' + message);
      } else {
        errorDiv.classList.remove('show');
        errorDiv.textContent = '';
      }
    }
  }

  /**
   * Show debug info on mobile (since console is not accessible)
   */
  showDebug(info) {
    console.log('DEBUG:', info); // Fallback for debugging
    
    const debugDiv = document.getElementById('login-debug');
    if (debugDiv) {
      debugDiv.style.display = 'block';
      debugDiv.textContent += info + '\n';
      // Auto scroll to bottom
      debugDiv.scrollTop = debugDiv.scrollHeight;
    }
  }

  /**
   * Clear debug info
   */
  clearDebug() {
    console.log('DEBUG: Clearing debug panel');
    
    const debugDiv = document.getElementById('login-debug');
    if (debugDiv) {
      debugDiv.textContent = '';
      // Don't hide it completely, just clear content
      debugDiv.style.display = 'block';
      debugDiv.textContent = '🔧 DEBUG PANEL ACTIVE - ' + new Date().toLocaleTimeString() + '\n\n';
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    UIModule.showToast(message, 'success');
  }

  /**
   * Show app
   */
  showApp() {
    const authModule = document.getElementById('auth-module');
    const app = document.getElementById('app');

    if (authModule) authModule.style.display = 'none';
    if (app) app.style.display = 'flex';
  }

  /**
   * Initialize app after login
   */
  initApp() {
    // Initialize all modules
    contentModule.init();
    playerModule.init();
    epgModule.init();
    settingsModule.init();
    UIModule.init();
  }

  /**
   * Logout user
   */
  async logout() {
    if (confirm('Are you sure you want to logout?')) {
      // Clear storage
      storageService.clearCredentials();

      // Clear API session
      apiService.logout();

      // Clear cache
      cacheService.clear();

      // Reset modules
      this.isLoggedIn = false;
      this.user = null;

      // Show login screen
      document.getElementById('app').style.display = 'none';
      document.getElementById('auth-module').style.display = 'flex';

      // Reset form
      document.getElementById('login-form').reset();
      this.loadSavedCredentials();
    }
  }

  /**
   * Get user profile info
   */
  getUserProfile() {
    return {
      username: this.user?.username || 'User',
      status: this.user?.status || 'Active',
      expiration: this.user?.exp_date || 'N/A',
      bandwidth: this.user?.total_bandwidth || 0,
      connections: this.user?.max_connections || 0,
    };
  }
}
