/**
 * UI Module
 * Handles UI interactions and notifications
 */

class UIModule {
  static init() {
    this.setupModalHandlers();
    this.setupToastHandlers();
  }

  /**
   * Setup modal handlers
   */
  static setupModalHandlers() {
    // Close buttons with data-close attribute
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.close;
        const modal = document.getElementById(targetId);
        if (modal) modal.style.display = 'none';
      });
    });

    // Also support close-btn inside modals
    document.querySelectorAll('.modal .close-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const modal = e.target.closest('.modal');
        if (modal) modal.style.display = 'none';
      });
    });

    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
          if (modal.style.display === 'flex') modal.style.display = 'none';
        });
      }
    });
  }

  /**
   * Setup toast handlers
   */
  static setupToastHandlers() {
    // Auto-hide toasts
    document.querySelectorAll('.toast').forEach(toast => {
      toast.addEventListener('click', () => {
        toast.style.display = 'none';
      });
    });
  }

  /**
   * Show toast notification
   */
  static showToast(message, type = 'success') {
    const toast = document.getElementById('app-toast');
    if (!toast) return;

    // Clear any running timer
    if (this._toastTimer) clearTimeout(this._toastTimer);

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, CONFIG.UI.TOAST_DURATION || 3000);
  }

  /**
   * Show loading state
   */
  static showLoading(show = true) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Show alert dialog
   */
  static showAlert(title, message, buttons = ['OK']) {
    return new Promise(resolve => {
      const dialog = document.createElement('div');
      dialog.className = 'modal';
      dialog.style.display = 'flex';

      const content = document.createElement('div');
      content.className = 'modal-content';
      content.style.maxWidth = '400px';

      const header = document.createElement('div');
      header.className = 'modal-header';
      header.innerHTML = `
        <h2>${title}</h2>
        <button class="close-btn">×</button>
      `;

      const body = document.createElement('div');
      body.style.padding = '20px';
      body.textContent = message;

      const footer = document.createElement('div');
      footer.style.padding = '16px 20px';
      footer.style.borderTop = '1px solid var(--border-color)';
      footer.style.display = 'flex';
      footer.style.gap = '8px';
      footer.style.justifyContent = 'flex-end';

      buttons.forEach((btn, index) => {
        const button = document.createElement('button');
        button.className = 'btn ' + (index === buttons.length - 1 ? 'btn-primary' : 'btn-secondary');
        button.textContent = btn;
        button.addEventListener('click', () => {
          document.body.removeChild(dialog);
          resolve(btn);
        });
        footer.appendChild(button);
      });

      content.appendChild(header);
      content.appendChild(body);
      content.appendChild(footer);
      dialog.appendChild(content);

      document.body.appendChild(dialog);

      dialog.querySelector('.close-btn').addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(null);
      });
    });
  }

  /**
   * Disable controls
   */
  static disableControls(disable = true) {
    document.querySelectorAll('button, input, select').forEach(el => {
      el.disabled = disable;
    });
  }

  /**
   * Update loading message
   */
  static updateLoadingMessage(message) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      const p = spinner.querySelector('p');
      if (p) {
        p.textContent = message;
      }
    }
  }

  /**
   * Hide sidebar
   */
  static hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.remove('open');
    }
  }

  /**
   * Show sidebar
   */
  static showSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.add('open');
    }
  }

  /**
   * Toggle sidebar
   */
  static toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  }

  /**
   * Update window title
   */
  static updateTitle(title) {
    document.title = `${title} - Tesla IPTV Player`;
  }

  /**
   * Request fullscreen
   */
  static requestFullscreen(element) {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    }
  }

  /**
   * Exit fullscreen
   */
  static exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    }
  }

  /**
   * Is fullscreen
   */
  static isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
  }

  /**
   * Setup responsive handlers
   */
  static setupResponsive() {
    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) {
        this.hideSidebar();
      }
    });

    // Handle orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updateLayout();
      }, 100);
    });
  }

  /**
   * Update layout
   */
  static updateLayout() {
    // Recalculate grid columns based on viewport
    const width = window.innerWidth;
    const grid = document.querySelector('.content-grid');

    if (grid) {
      if (width <= 480) {
        grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      } else if (width <= 768) {
        grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      } else if (width <= 1024) {
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
      } else {
        grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
      }
    }
  }

  /**
   * Check network status
   */
  static checkNetworkStatus() {
    if (!navigator.onLine) {
      this.showToast('No internet connection', 'error');
      return false;
    }
    return true;
  }

  /**
   * Setup network status handlers
   */
  static setupNetworkHandlers() {
    window.addEventListener('online', () => {
      this.showToast('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
      this.showToast('Connection lost', 'error');
    });
  }

  /**
   * Open external link
   */
  static openLink(url, target = '_blank') {
    window.open(url, target);
  }

  /**
   * Copy to clipboard
   */
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard', 'success');
      return true;
    } catch (err) {
      this.showToast('Failed to copy', 'error');
      return false;
    }
  }

  /**
   * Share content
   */
  static async share(title, text, url) {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      this.copyToClipboard(url);
    }
  }

  /**
   * Get viewport size
   */
  static getViewportSize() {
    return {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
    };
  }

  /**
   * Is mobile device
   */
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Is touch device
   */
  static isTouchDevice() {
    return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIModule;
}
