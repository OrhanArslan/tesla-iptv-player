/**
 * Player Module - Full Featured
 * Fixes: close error bug, subtitle support, proper HLS handling
 */
class PlayerModule {
  constructor() {
    this.player = null;
    this.hls = null;
    this.currentStream = null;
    this.isPlaying = false;
    this.controlsTimeout = null;
    this.volume = 70;
    this.isMuted = false;
    this._closing = false;
    this.subtitleTracks = [];
    this.currentSubtitle = -1;
    this._subtitlePanelOpen = false;
  }

  init() {
    this.player = document.getElementById('video-player');
    if (!this.player) return;
    const saved = storageService.get('player_volume', 70);
    this.volume = saved;
    this._setupVideoEvents();
    this._setupControlEvents();
    this._setupMouseEvents();
    this._setVolume(this.volume);
  }

  /* ── PUBLIC ─────────────────────────────────────────────── */

  async playStream(stream) {
    if (!this.player) this.init();
    this._closing = false;
    this.currentStream = stream;

    const streamId = stream.stream_id || stream.id;
    const type = (stream.type || 'live').toLowerCase();

    let url;
    if (type === 'live') {
      url = apiService.getLiveStreamUrl(streamId);
    } else if (type === 'movie' || type === 'movies' || type === 'vod') {
      url = apiService.getVodStreamUrl(streamId, stream.container_extension || 'mp4');
    } else if (type === 'series' || type === 'episode') {
      url = apiService.getSeriesStreamUrl(streamId, stream.container_extension || 'mkv');
    } else {
      url = apiService.getLiveStreamUrl(streamId);
    }

    console.log(`▶️ Playing [${type}] "${stream.name}" → ${url}`);

    document.getElementById('player-modal').style.display = 'flex';
    document.getElementById('player-title').textContent = stream.name || stream.title || '...';
    const descEl = document.getElementById('player-description');
    if (descEl) descEl.textContent = stream.plot || stream.description || '';

    // Reset subtitle state
    this.subtitleTracks = [];
    this.currentSubtitle = -1;
    this._hideSubtitlePanel();
    this._updateSubtitleBtn(false);

    this._showBuffering(true);
    this._loadStream(url, type);

    // For VOD and episodes: fetch external subtitles from API in background
    if (type === 'movie' || type === 'movies' || type === 'vod' || type === 'episode') {
      this._fetchExternalSubtitles(streamId, type).catch(e => {
        console.warn('External subtitle fetch failed:', e.message);
      });
    }

    storageService.addToHistory({
      id: streamId,
      name: stream.name || stream.title,
      type,
      icon: stream.icon || stream.stream_icon || stream.cover || '',
      watchedAt: new Date().toISOString(),
    });
    this.updateFavoriteButton(stream);
  }

  closePlayer() {
    this._closing = true;
    const modal = document.getElementById('player-modal');
    if (modal) modal.style.display = 'none';

    if (this.hls) { this.hls.destroy(); this.hls = null; }

    if (this.player) {
      this.player.pause();
      this.player.removeAttribute('src');
      this.player.load(); // Resets, fires MEDIA_ERR_ABORTED — suppressed by _closing
    }

    this._showBuffering(false);
    this._hideSubtitlePanel();
    clearTimeout(this.controlsTimeout);
    this.currentStream = null;
    this.isPlaying = false;
    this.subtitleTracks = [];
    this.currentSubtitle = -1;
    this._updateSubtitleBtn(false);
    setTimeout(() => { this._closing = false; }, 200);
  }

  /* ── STREAM LOADING ─────────────────────────────────────── */

  _loadStream(url, type) {
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    const isM3u8 = url.endsWith('.m3u8') || type === 'live';
    if (isM3u8 && typeof Hls !== 'undefined' && Hls.isSupported()) {
      this._loadHls(url);
    } else {
      this.player.src = url;
      this.player.load();
      this._autoPlay();
    }
  }

  _loadHls(url) {
    const cfg = Object.assign({
      enableWorker: true,
      startLevel: -1,
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
    }, (CONFIG.PLAYER || {}).HLS_CONFIG || {});

    this.hls = new Hls(cfg);

    this.hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      this._populateQuality(data.levels);
      // Check subtitle tracks right at manifest parse (catches case where
      // SUBTITLE_TRACKS_UPDATED fires before our listener is registered)
      const hlsSubs = this.hls.subtitleTracks || [];
      if (hlsSubs.length > 0 && this.subtitleTracks.length === 0) {
        console.log(`📝 Manifest: found ${hlsSubs.length} subtitle track(s)`);
        this._onSubtitleTracksUpdated(hlsSubs);
      }
      this._autoPlay();
    });

    this.hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
      // Only process if we don't already have subtitle tracks
      if (this.subtitleTracks.length === 0 && data.subtitleTracks?.length > 0) {
        this._onSubtitleTracksUpdated(data.subtitleTracks);
      }
    });

    this.hls.on(Hls.Events.FRAG_BUFFERED, () => {
      this._showBuffering(false);
    });

    this.hls.on(Hls.Events.ERROR, (_, data) => {
      if (this._closing) return;
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        this.hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        this.hls.recoverMediaError();
      } else {
        UIModule.showToast('Yayın yüklenemedi', 'error');
        this._showBuffering(false);
      }
    });

    this.hls.loadSource(url);
    this.hls.attachMedia(this.player);
  }

  async _autoPlay() {
    try { await this.player.play(); }
    catch (e) { if (!this._closing) this._showControlsFor(0); }
  }

  /* ── SUBTITLE ───────────────────────────────────────────── */

  _onSubtitleTracksUpdated(tracks) {
    if (!tracks || tracks.length === 0) return;
    this.subtitleTracks = tracks;
    console.log(`📝 Subtitle tracks updated: ${tracks.length}`);
    this._updateSubtitleBtn(true);
    this._buildSubtitlePanel();
  }

  /**
   * Fetch external subtitles from Xtream API.
   * Handles ALL known Xtream panel response formats robustly.
   */
  async _fetchExternalSubtitles(streamId, type) {
    // Wait for HLS to report its own tracks first
    await new Promise(r => setTimeout(r, 1800));
    if (this._closing) return;

    // If HLS already found tracks, don't replace them
    if (this.subtitleTracks.length > 0) {
      console.log('📝 HLS already has subtitle tracks — skipping API fetch');
      return;
    }

    let info = null;
    try {
      info = await apiService.getVodInfo(streamId);
    } catch (e) {
      console.warn('📝 getVodInfo error:', e.message);
    }

    if (this._closing) return;

    // Log raw response so user/developer can debug what the server actually returns
    console.log('📝 VOD info raw response:', JSON.stringify(info, null, 2));

    if (!info) {
      console.log('📝 No VOD info response — subtitles unavailable');
      return;
    }

    // Update plot description in player if empty
    const plot = info?.info?.plot || info?.movie_data?.plot || '';
    if (plot) {
      const descEl = document.getElementById('player-description');
      if (descEl && !descEl.textContent) descEl.textContent = plot;
    }

    // ── Parse subtitles from every known format ─────────────────────────
    const parsedSubs = this._parseSubtitlesFromVodInfo(info, streamId);

    if (!parsedSubs.length) {
      console.log('📝 No subtitles found in VOD info response (checked all known formats)');
      return;
    }

    console.log(`📝 Found ${parsedSubs.length} subtitle(s):`, parsedSubs);
    this._injectTrackElements(parsedSubs);
  }

  /**
   * Extract subtitles from VOD info — handles every known Xtream panel variant.
   * Returns: [{ lang, label, url }]
   */
  _parseSubtitlesFromVodInfo(info, streamId) {
    const results = [];

    // === Format 1: info.subtitles = [{lang, url}, ...]  (standard panels) ===
    const rawSubs =
      info?.info?.subtitles ||
      info?.movie_data?.subtitles ||
      info?.subtitles ||
      null;

    if (Array.isArray(rawSubs) && rawSubs.length > 0) {
      rawSubs.forEach((sub, i) => {
        if (typeof sub === 'string') {
          // Format 2: ["tr", "en"] — just language codes, no URL
          // Construct standard Xtream subtitle URL
          const url = this._buildSubtitleUrl(streamId, sub);
          results.push({ lang: sub, label: this._langLabel(sub), url });
        } else if (typeof sub === 'object' && sub !== null) {
          // Format 1 or variants: {lang, url} or {language, url} or {id, lang, url}
          const lang = sub.lang || sub.language || sub.code || `sub${i}`;
          const url = sub.url || sub.src || sub.path || this._buildSubtitleUrl(streamId, lang);
          results.push({ lang, label: this._langLabel(lang), url });
        }
      });
      return results;
    }

    // === Format 3: info.subtitles = { "tr": "url", "en": "url" } (object map) ===
    if (rawSubs && typeof rawSubs === 'object' && !Array.isArray(rawSubs)) {
      Object.entries(rawSubs).forEach(([lang, url]) => {
        results.push({ lang, label: this._langLabel(lang), url: typeof url === 'string' ? url : this._buildSubtitleUrl(streamId, lang) });
      });
      return results;
    }

    // === Format 4: look for sub_* or subtitle_* fields anywhere in info ===
    const searchIn = { ...info?.info, ...info?.movie_data };
    Object.entries(searchIn).forEach(([key, val]) => {
      if ((key.includes('sub') || key.includes('caption') || key.includes('track')) &&
           typeof val === 'string' && val.includes('http')) {
        const lang = key.replace(/[^a-z]/gi, '').toLowerCase().slice(-2) || 'unk';
        results.push({ lang, label: this._langLabel(lang), url: val });
      }
    });

    return results;
  }

  /**
   * Build standard Xtream subtitle URL.
   * Many modern panels serve WebVTT at /sub/user/pass/id/lang.vtt
   */
  _buildSubtitleUrl(streamId, lang) {
    const { serverUrl, username, password } = apiService;
    return `${serverUrl}/sub/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}/${lang}.vtt`;
  }

  /**
   * Inject <track> elements for external subtitle files.
   * Supports WebVTT and SRT (browser converts SRT on some engines).
   */
  _injectTrackElements(subtitles) {
    // Remove old tracks
    Array.from(this.player.querySelectorAll('track')).forEach(t => t.remove());

    const validSubs = subtitles.filter(s => s.url || s.lang);
    if (!validSubs.length) return;

    validSubs.forEach((sub, idx) => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = this._langLabel(sub.lang || `Track ${idx + 1}`);
      track.srclang = sub.lang || '';
      if (sub.url) track.src = sub.url;
      track.default = false;
      this.player.appendChild(track);
    });

    // Build subtitle track list from native TextTracks
    // (needs a tick for the browser to register them)
    setTimeout(() => {
      if (this._closing) return;
      const nativeTracks = Array.from(this.player.textTracks || []);
      if (nativeTracks.length === 0) return;

      this.subtitleTracks = nativeTracks.map((t, i) => ({
        name: t.label || this._langLabel(t.language),
        lang: t.language,
        _native: true,
        _index: i,
      }));
      this._updateSubtitleBtn(true);
      this._buildSubtitlePanel();
      UIModule.showToast(`${nativeTracks.length} altyazı yüklendi`, 'success');
    }, 300);
  }

  _buildSubtitlePanel() {
    const panel = document.getElementById('subtitle-panel');
    if (!panel) return;
    panel.innerHTML = '';

    const makeBtn = (label, idx) => {
      const b = document.createElement('button');
      b.className = 'subtitle-item' + (this.currentSubtitle === idx ? ' active' : '');
      b.textContent = label;
      b.onclick = () => this._selectSubtitle(idx);
      return b;
    };

    panel.appendChild(makeBtn('⊘ Kapalı', -1));
    this.subtitleTracks.forEach((t, i) => {
      panel.appendChild(makeBtn(this._langLabel(t.lang || t.name || `Track ${i+1}`), i));
    });
  }

  _selectSubtitle(idx) {
    this.currentSubtitle = idx;
    const isNative = this.subtitleTracks[idx]?._native;

    if (isNative || !this.hls || this.hls.subtitleTracks.length === 0) {
      // Use native TextTrack API
      const tracks = Array.from(this.player.textTracks || []);
      tracks.forEach((t, i) => {
        t.mode = (idx !== -1 && i === idx) ? 'showing' : 'hidden';
      });
    } else {
      // Use HLS.js internal tracks
      this.hls.subtitleTrack = idx;
      this.hls.subtitleDisplay = idx !== -1;
    }

    const lbl = idx === -1 ? 'Altyazı kapalı' : (this.subtitleTracks[idx]?.name || 'Altyazı açık');
    UIModule.showToast(lbl, 'info');
    this._buildSubtitlePanel();
    this._hideSubtitlePanel();
    this._updateSubtitleBtn(true);
  }

  _langLabel(code) {
    const map = { tr:'🇹🇷 Türkçe', en:'🇬🇧 İngilizce', de:'🇩🇪 Almanca', fr:'🇫🇷 Fransızca',
      es:'🇪🇸 İspanyolca', it:'🇮🇹 İtalyanca', ar:'🇸🇦 Arapça', ru:'🇷🇺 Rusça',
      pt:'🇵🇹 Portekizce', nl:'🇳🇱 Flemenkçe', pl:'🇵🇱 Lehçe', ja:'🇯🇵 Japonca',
      ko:'🇰🇷 Korece', zh:'🇨🇳 Çince', sv:'🇸🇪 İsveççe', el:'🇬🇷 Yunanca' };
    return map[code.toLowerCase().slice(0,2)] || `📝 ${code}`;
  }

  _updateSubtitleBtn(show) {
    const btn = document.getElementById('subtitle-btn');
    if (!btn) return;
    btn.style.display = show ? 'flex' : 'none';
    btn.classList.toggle('active', this.currentSubtitle !== -1);
    btn.title = this.currentSubtitle !== -1
      ? `Altyazı açık — değiştir (C)`
      : `Altyazı seç (C)`;
  }

  _toggleSubtitlePanel(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('subtitle-panel');
    if (!panel) return;
    this._subtitlePanelOpen = !this._subtitlePanelOpen;
    panel.style.display = this._subtitlePanelOpen ? 'flex' : 'none';
  }

  _hideSubtitlePanel() {
    const panel = document.getElementById('subtitle-panel');
    if (panel) panel.style.display = 'none';
    this._subtitlePanelOpen = false;
  }

  /* ── VIDEO EVENTS ───────────────────────────────────────── */

  _setupVideoEvents() {
    this.player.addEventListener('playing', () => {
      if (this._closing) return;
      this.isPlaying = true;
      this._showBuffering(false);
      this._updatePlayBtn(true);
    });
    this.player.addEventListener('pause', () => {
      if (this._closing) return;
      this.isPlaying = false;
      this._updatePlayBtn(false);
      this._showControlsFor(0);
    });
    this.player.addEventListener('waiting', () => {
      if (this._closing) return;
      this._showBuffering(true);
    });
    this.player.addEventListener('canplay', () => {
      if (this._closing) return;
      this._showBuffering(false);
    });
    this.player.addEventListener('timeupdate', () => {
      if (!this._closing) this._updateProgress();
    });
    this.player.addEventListener('ended', () => {
      if (this._closing) return;
      this.isPlaying = false;
      this._updatePlayBtn(false);
    });
    this.player.addEventListener('error', () => {
      if (this._closing) return; // ← Key fix: no toast on intentional close
      const err = this.player.error;
      // MEDIA_ERR_ABORTED (code 1) = intentional stop
      if (!err || err.code === 1) return;
      console.error('Video error:', err.code, err.message);
      this._showBuffering(false);
      UIModule.showToast('Video hata: ' + (err.message || 'Yayın yüklenemedi'), 'error');
    });

    // Close subtitle panel on outside click
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('subtitle-panel');
      const btn = document.getElementById('subtitle-btn');
      if (panel && !panel.contains(e.target) && e.target !== btn) this._hideSubtitlePanel();
    });

    // Fullscreen icon update
    document.addEventListener('fullscreenchange', () => {
      const btn = document.getElementById('fullscreen-btn');
      if (!btn) return;
      const isFs = !!document.fullscreenElement;
      btn.innerHTML = isFs
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
    });
  }

  _setupControlEvents() {
    const $ = id => document.getElementById(id);

    $('play-pause-btn')?.addEventListener('click', () => this.togglePlayPause());
    $('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
    $('pip-btn')?.addEventListener('click', () => this.togglePiP());
    $('player-close')?.addEventListener('click', () => this.closePlayer());
    $('favorite-toggle')?.addEventListener('click', () => this._toggleFavorite());

    $('volume-btn')?.addEventListener('click', () => {
      $('volume-slider')?.classList.toggle('show');
    });
    $('volume-control')?.addEventListener('input', e => {
      this._setVolume(Number(e.target.value));
    });

    $('subtitle-btn')?.addEventListener('click', e => this._toggleSubtitlePanel(e));

    $('quality-select')?.addEventListener('change', e => {
      if (this.hls) this.hls.currentLevel = e.target.value === '' ? -1 : +e.target.value;
    });

    $('progress-bar-container')?.addEventListener('click', e => {
      const rect = $('progress-bar-container').getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (this.player?.duration) this.player.currentTime = pct * this.player.duration;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      const modal = $('player-modal');
      if (!modal || modal.style.display === 'none') return;
      if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
      const map = {
        ' ': () => this.togglePlayPause(),
        'k': () => this.togglePlayPause(),
        'f': () => this.toggleFullscreen(),
        'm': () => this.toggleMute(),
        'c': () => this.subtitleTracks.length && this._toggleSubtitlePanel(),
        'ArrowRight': () => { if (this.player?.duration) this.player.currentTime = Math.min(this.player.currentTime + 10, this.player.duration); },
        'ArrowLeft':  () => { if (this.player?.duration) this.player.currentTime = Math.max(this.player.currentTime - 10, 0); },
        'ArrowUp':    () => this._setVolume(Math.min(this.volume + 10, 100)),
        'ArrowDown':  () => this._setVolume(Math.max(this.volume - 10, 0)),
        'Escape':     () => { if (!document.fullscreenElement) this.closePlayer(); },
      };
      const fn = map[e.key];
      if (fn) { e.preventDefault(); fn(); }
    });
  }

  _setupMouseEvents() {
    const modal = document.getElementById('player-modal');
    if (!modal) return;
    const show = () => this._showControlsFor(3500);
    modal.addEventListener('mousemove', show);
    modal.addEventListener('touchstart', show, { passive: true });

    modal.querySelector('.video-player-wrapper')?.addEventListener('click', e => {
      if (!e.target.closest('.player-controls') &&
          !e.target.closest('.player-header') &&
          !e.target.closest('.player-info') &&
          !e.target.closest('#subtitle-panel')) {
        this.togglePlayPause();
      }
    });
  }

  /* ── CONTROLS ───────────────────────────────────────────── */

  togglePlayPause() {
    if (!this.player) return;
    this.player.paused ? this.player.play().catch(() => {}) : this.player.pause();
  }

  toggleMute() {
    if (!this.player) return;
    this.isMuted = !this.isMuted;
    this.player.muted = this.isMuted;
    const vc = document.getElementById('volume-control');
    if (vc) vc.value = this.isMuted ? 0 : this.volume;
  }

  async togglePiP() {
    try {
      document.pictureInPictureElement
        ? await document.exitPictureInPicture()
        : await this.player?.requestPictureInPicture();
    } catch (e) { console.warn('PiP:', e.message); }
  }

  toggleFullscreen() {
    const modal = document.getElementById('player-modal');
    if (!modal) return;
    document.fullscreenElement
      ? document.exitFullscreen?.()
      : modal.requestFullscreen?.();
  }

  updateFavoriteButton(stream) {
    const btn = document.getElementById('favorite-toggle');
    if (!btn) return;
    const id = String(stream.stream_id || stream.id);
    const isFav = storageService.getFavorites().some(f => String(f.id) === id);
    btn.classList.toggle('active', isFav);
    const span = btn.querySelector('span');
    if (span) span.textContent = isFav ? 'Favoride' : 'Favori';
    const path = btn.querySelector('svg path');
    if (path) path.setAttribute('fill', isFav ? 'currentColor' : 'none');
  }

  /* ── HELPERS ────────────────────────────────────────────── */

  _setVolume(val) {
    this.volume = Math.max(0, Math.min(100, val));
    if (this.player) { this.player.volume = this.volume / 100; }
    const vc = document.getElementById('volume-control');
    if (vc) vc.value = this.volume;
    storageService.set('player_volume', this.volume);
  }

  _populateQuality(levels) {
    const sel = document.getElementById('quality-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Auto</option>';
    levels.forEach((l, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = l.height ? `${l.height}p` : `Q${i+1}`;
      sel.appendChild(o);
    });
  }

  _updatePlayBtn(playing) {
    const btn = document.getElementById('play-pause-btn');
    if (!btn) return;
    btn.innerHTML = playing
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  }

  _updateProgress() {
    if (!this.player?.duration || isNaN(this.player.duration)) return;
    const pct = (this.player.currentTime / this.player.duration) * 100;
    const fill = document.getElementById('progress-fill');
    const handle = document.getElementById('progress-handle');
    if (fill) fill.style.width = pct + '%';
    if (handle) handle.style.left = pct + '%';
    const curr = document.getElementById('current-time');
    const dur = document.getElementById('duration-time');
    if (curr) curr.textContent = this._fmt(this.player.currentTime);
    if (dur) dur.textContent = this._fmt(this.player.duration);
    // Save state every 5 seconds
    if (this.currentStream && Math.floor(this.player.currentTime) % 5 === 0) {
      storageService.savePlaybackState(this.currentStream.stream_id || this.currentStream.id, this.player.currentTime, this.player.duration);
    }
  }

  _showControlsFor(hideAfterMs) {
    const els = [
      document.getElementById('player-controls'),
      document.querySelector('.player-header'),
      document.querySelector('.player-info'),
    ];
    els.forEach(el => el?.classList.remove('hidden'));
    clearTimeout(this.controlsTimeout);
    if (hideAfterMs > 0 && this.isPlaying) {
      this.controlsTimeout = setTimeout(() => {
        els.forEach(el => el?.classList.add('hidden'));
        this._hideSubtitlePanel();
      }, hideAfterMs);
    }
  }

  _showBuffering(show) {
    const el = document.getElementById('player-buffering');
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  _toggleFavorite() {
    if (!this.currentStream) return;
    const id = this.currentStream.stream_id || this.currentStream.id;
    const isFav = storageService.getFavorites().some(f => String(f.id) === String(id));
    if (isFav) {
      storageService.removeFavorite(id);
      UIModule.showToast('Favorilerden çıkarıldı', 'info');
    } else {
      storageService.addFavorite({
        id, name: this.currentStream.name || this.currentStream.title,
        type: this.currentStream.type || 'live',
        icon: this.currentStream.icon || this.currentStream.stream_icon || this.currentStream.cover || '',
      });
      UIModule.showToast('Favorilere eklendi ❤️', 'success');
    }
    this.updateFavoriteButton(this.currentStream);
    contentModule?.renderFavorites?.();
  }

  _fmt(s) {
    if (!s || isNaN(s) || !isFinite(s)) return '--:--';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
}
