/**
 * API Service
 * Handles all API calls to Xtream Codes server
 */

class APIService {
  constructor() {
    this.baseUrl = '';
    this.serverUrl = '';
    this.username = '';
    this.password = '';
    this.isAuthenticated = false;
    this.userInfo = null;
    this.requestQueue = [];
    this.requestCount = 0;
    this.maxConcurrentRequests = 5;
  }

  /**
   * Initialize with server credentials
   */
  async init(serverUrl, username, password) {
    // Normalize URL - ensure protocol
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      this.serverUrl = `https://${serverUrl.replace(/\/$/, '')}`;
    } else {
      this.serverUrl = serverUrl.replace(/\/$/, '');
    }
    
    this.username = username;
    this.password = password;
    this.baseUrl = `${this.serverUrl}/`;

    console.log('🔐 Attempting login to server:', this.serverUrl);
    console.log('👤 Username:', username);

    // Test connection and get user info
    try {
      this.userInfo = await this.getUserInfo();
      this.isAuthenticated = true;
      console.log('✅ Authentication successful!');
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Build endpoint URL
   */
  buildUrl(endpoint, params = {}) {
    let url = `${this.baseUrl}${endpoint}`;
    
    // Replace parameters
    url = url.replace('{username}', encodeURIComponent(this.username));
    url = url.replace('{password}', encodeURIComponent(this.password));

    Object.keys(params).forEach(key => {
      url = url.replace(`{${key}}`, encodeURIComponent(params[key]));
    });

    this.lastBuiltUrl = url; // Store for debugging
    return url;
  }

  /**
   * Make HTTP request with retry logic
   */
  async request(endpoint, params = {}, options = {}) {
    const maxRetries = options.retries || CONFIG.API.RETRY_ATTEMPTS;
    const timeout = options.timeout || CONFIG.API.TIMEOUT;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Wait if queue is full
        while (this.requestCount >= this.maxConcurrentRequests) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.requestCount++;
        const url = this.buildUrl(endpoint, params);
        console.log(`🔗 API Request (${endpoint}):`, url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let response;
        try {
          // Try direct fetch first (works if server supports CORS or same origin)
          response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
          });
        } catch (fetchError) {
          // If direct request fails (likely CORS), try proxy fallbacks
          if (fetchError.name !== 'AbortError') {
            // IMPORTANT: No custom headers on proxy requests - they trigger CORS preflight
            // that most proxies don't support. Use bare fetch (simple request = no preflight).
            const proxyUrls = [
              `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
              `https://thingproxy.freeboard.io/fetch/${url}`,
              `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
            ];
            
            let proxySuccess = false;
            let lastProxyError = null;
            
            for (const proxyUrl of proxyUrls) {
              try {
                console.warn(`⚠️ Direct fetch failed. Trying proxy: ${proxyUrl}`);
                // No custom headers - ensures a simple CORS request (no preflight)
                response = await fetch(proxyUrl, {
                  method: 'GET',
                  signal: controller.signal,
                });
                
                if (response.ok) {
                  proxySuccess = true;
                  break; // Exit loop if successful
                } else {
                  lastProxyError = new Error(`Proxy returned HTTP ${response.status}`);
                }
              } catch (proxyError) {
                lastProxyError = proxyError;
                console.warn(`❌ Proxy failed (${proxyUrl}):`, proxyError.message);
              }
            }
            
            if (!proxySuccess && !response) {
              throw lastProxyError || fetchError;
            }
          } else {
            throw fetchError;
          }
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Try to parse as JSON
        let data;
        
        try {
          data = await response.json();
          
          // Unwrap allorigins.win response or similar proxies
          if (data && data.contents && typeof data.contents === 'string') {
            try {
              data = JSON.parse(data.contents);
            } catch (innerErr) {
               console.error('Failed to parse inner proxy contents:', innerErr);
               throw new Error(`Invalid JSON inside proxy response`);
            }
          }
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          // Try as text fallback
          let text;
          try {
             text = await response.text();
          } catch(e) {
             text = '';
          }
          console.log('Response as text:', text);
          throw new Error(`Invalid JSON response: ${text ? text.substring(0, 100) : 'No content'}`);
        }
        
        console.log(`✅ API Response (${endpoint}):`, data);
        this.requestCount--;
        return data;
      } catch (error) {
        this.requestCount--;
        console.error(`❌ API Error (${endpoint}, attempt ${attempt + 1}/${maxRetries}):`, error.message);

        if (attempt < maxRetries - 1) {
          const delay = CONFIG.API.RETRY_DELAY * Math.pow(2, attempt);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Get user info
   */
  async getUserInfo() {
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_USER_INFO);
      
      // Check if response is valid
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        throw new Error('Empty response from server - check credentials');
      }
      
      // Handle array response (some servers return error array)
      if (Array.isArray(data)) {
        throw new Error('Server returned invalid format - check server address');
      }
      
      // Some servers return error in response object
      if (data.error === true || data.error === 'true') {
        throw new Error('Invalid credentials or server error');
      }
      
      if (data.message === 'User not found' || data.message === 'Invalid credentials') {
        throw new Error(data.message);
      }
      
      // Check if we have expected user data
      if (!data.username && !data.user_id && !data.status) {
        console.warn('⚠️ Unexpected user info structure:', data);
      }
      
      return data;
    } catch (error) {
      console.error('❌ User info fetch failed:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Get live categories
   */
  async getLiveCategories() {
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_LIVE_CATEGORIES, {}, {
        retries: 2,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to get live categories:', error);
      return [];
    }
  }

  /**
   * Get live streams by category (requires a specific categoryId)
   * For "all" streams, use the content-module's _fetchAllLive() instead
   */
  async getLiveStreams(categoryId) {
    if (!categoryId || categoryId === 'all') return [];
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_LIVE_STREAMS, {
        category_id: categoryId,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to get live streams:', error);
      return [];
    }
  }

  /**
   * Get VOD categories
   */
  async getVodCategories() {
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_VOD_CATEGORIES);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to get VOD categories:', error);
      return [];
    }
  }

  /**
   * Get VOD streams by category
   */
  async getVodStreams(categoryId) {
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_VOD_STREAMS, {
        category_id: categoryId,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to get VOD streams:', error);
      return [];
    }
  }

  /**
   * Get series categories
   */
  async getSeriesCategories() {
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_SERIES_CATEGORIES);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to get series categories:', error);
      return [];
    }
  }

  /**
   * Get series by category
   */
  async getSeries(categoryId) {
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_SERIES, {
        category_id: categoryId,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to get series:', error);
      return [];
    }
  }

  /**
   * Get series info
   */
  async getSeriesInfo(seriesId) {
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_SERIES_INFO, {
        series_id: seriesId,
      });
      return data;
    } catch (error) {
      console.error('Failed to get series info:', error);
      return null;
    }
  }

  /**
   * Get VOD info (metadata + subtitle URLs)
   * Response includes: info.subtitles[], info.plot, info.cast, etc.
   */
  async getVodInfo(vodId) {
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_VOD_INFO, {
        vod_id: vodId,
      });
      return data;
    } catch (error) {
      console.error('Failed to get VOD info:', error);
      return null;
    }
  }

  /**
   * Get EPG for stream
   */
  async getEPG(streamId, limit = 10) {
    try {
      const data = await this.request(CONFIG.XTREAM_ENDPOINTS.GET_EPG, {
        stream_id: streamId,
        limit: limit,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to get EPG:', error);
      return [];
    }
  }

  /**
   * Build live stream URL (Xtream format)
   * e.g. http://server/live/user/pass/streamId.m3u8
   */
  getLiveStreamUrl(streamId) {
    return `${this.serverUrl}/live/${encodeURIComponent(this.username)}/${encodeURIComponent(this.password)}/${streamId}.m3u8`;
  }

  /**
   * Build VOD stream URL
   * e.g. http://server/movie/user/pass/streamId.mp4
   */
  getVodStreamUrl(streamId, container = 'mp4') {
    return `${this.serverUrl}/movie/${encodeURIComponent(this.username)}/${encodeURIComponent(this.password)}/${streamId}.${container}`;
  }

  /**
   * Build series episode stream URL
   * e.g. http://server/series/user/pass/streamId.mp4
   */
  getSeriesStreamUrl(streamId, container = 'mp4') {
    return `${this.serverUrl}/series/${encodeURIComponent(this.username)}/${encodeURIComponent(this.password)}/${streamId}.${container}`;
  }

  /**
   * Generic getStreamUrl - kept for backward compat, defaults to live
   */
  getStreamUrl(streamId, type = 'live') {
    if (type === 'movie') return this.getVodStreamUrl(streamId);
    if (type === 'series') return this.getSeriesStreamUrl(streamId);
    return this.getLiveStreamUrl(streamId);
  }

  /**
   * Search streams
   */
  async searchStreams(query, type = 'live') {
    try {
      let streams = [];

      if (type === 'live') {
        streams = await this.getLiveStreams();
      } else if (type === 'vod') {
        const categories = await this.getVodCategories();
        for (const category of categories) {
          const categoryStreams = await this.getVodStreams(category.category_id);
          streams = streams.concat(categoryStreams);
        }
      } else if (type === 'series') {
        const categories = await this.getSeriesCategories();
        for (const category of categories) {
          const categorySeries = await this.getSeries(category.category_id);
          streams = streams.concat(categorySeries);
        }
      }

      // Filter by query
      const queryLower = query.toLowerCase();
      return streams.filter(stream =>
        (stream.name && stream.name.toLowerCase().includes(queryLower)) ||
        (stream.title && stream.title.toLowerCase().includes(queryLower))
      );
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Logout and clear session
   */
  logout() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.username = '';
    this.password = '';
    this.serverUrl = '';
  }

  /**
   * Check if service is authenticated
   */
  isReady() {
    return this.isAuthenticated && !!this.baseUrl;
  }
}
