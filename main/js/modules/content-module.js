/**
 * Content Module — Lazy loading, Series detail with seasons/episodes
 */
class ContentModule {
  constructor() {
    this.currentView = 'live';
    this.currentCategory = {};
    this.categories = { live: [], movies: [], series: [] };
    this.loadedData = {};
    this._seriesCache = {};
    this._currentSeason = 1;
  }

  async init() {
    this._setupEventListeners();
    await this._loadAllCategories();
    this.renderView('live');
  }

  async _loadAllCategories() {
    await Promise.allSettled([
      this._fetchCategories('live'),
      this._fetchCategories('movies'),
      this._fetchCategories('series'),
    ]);
  }

  async _fetchCategories(type) {
    try {
      let cats;
      if (type === 'live') cats = await apiService.getLiveCategories();
      else if (type === 'movies') cats = await apiService.getVodCategories();
      else cats = await apiService.getSeriesCategories();
      this.categories[type] = cats || [];
    } catch (e) {
      console.error(`${type} kategori hatası:`, e.message);
      this.categories[type] = [];
    }
  }

  _setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        const view = e.currentTarget.dataset.view;
        if (view) this.switchView(view);
      });
    });
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    searchBtn?.addEventListener('click', () => this._search());
    searchInput?.addEventListener('keypress', e => e.key === 'Enter' && this._search());
    document.getElementById('settings-btn')?.addEventListener('click', () => settingsModule.show());
    document.getElementById('profile-btn')?.addEventListener('click', () => this.showProfile());
    document.getElementById('logout-btn')?.addEventListener('click', () => authModule.logout());
    document.getElementById('menu-toggle')?.addEventListener('click', () => this.toggleSidebar());
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => this.closeSidebar());
  }

  switchView(view) {
    if (this.currentView === view) { this.closeSidebar(); return; }
    this.currentView = view;
    this.closeSidebar();
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.view === view));
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${view}-view`)?.classList.add('active');
    this.renderView(view);
  }

  renderView(view) {
    if (view === 'favorites') { this.renderFavorites(); return; }
    if (view === 'history') { this.renderHistory(); return; }
    const type = { live: 'live', movies: 'movies', series: 'series' }[view] || 'live';
    this._renderCategoryView(type);
  }

  /* ── CATEGORY VIEW ─────────────────────────────────────── */

  _renderCategoryView(type) {
    const catsEl = document.getElementById(`${type}-categories`);
    const gridEl = document.getElementById(`${type}-grid`);
    if (!catsEl || !gridEl) return;
    const curCat = this.currentCategory[type] || 'all';

    // Category pills
    catsEl.innerHTML = '';
    catsEl.appendChild(this._makeCatBtn('all', 'Tümü', type, curCat === 'all'));
    this.categories[type].forEach(c =>
      catsEl.appendChild(this._makeCatBtn(c.category_id, c.category_name, type, String(c.category_id) === String(curCat)))
    );

    this._loadAndRender(type, curCat, gridEl);
  }

  async _loadAndRender(type, catId, gridEl) {
    const key = `${type}_${catId}`;
    gridEl.innerHTML = `<div class="grid-loading" style="grid-column:1/-1"><div class="spinner"></div><span>Yükleniyor...</span></div>`;

    if (this.loadedData[key]) {
      this._renderGrid(gridEl, this.loadedData[key], type);
      return;
    }

    try {
      let streams = [];
      if (catId === 'all') {
        // Load first category only for speed
        const firstCats = this.categories[type].slice(0, 3);
        for (const c of firstCats) {
          const s = await this._fetchStreams(type, c.category_id);
          streams.push(...s);
          if (streams.length >= 150) break;
        }
      } else {
        streams = await this._fetchStreams(type, catId);
      }
      this.loadedData[key] = streams;
      this._renderGrid(gridEl, streams, type);
    } catch (e) {
      gridEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⚠️</div><h3>Yüklenemedi</h3><p>${e.message}</p></div>`;
    }
  }

  async _fetchStreams(type, catId) {
    if (type === 'live') return apiService.getLiveStreams(catId);
    if (type === 'movies') return apiService.getVodStreams(catId);
    return apiService.getSeries(catId);
  }

  _renderGrid(gridEl, streams, type) {
    gridEl.innerHTML = '';
    if (!streams?.length) {
      const icons = { live: '📡', movies: '🎬', series: '📺' };
      gridEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">${icons[type]||'📺'}</div><h3>İçerik bulunamadı</h3><p>Bu kategoride içerik yok.</p></div>`;
      return;
    }
    const favIds = new Set(storageService.getFavorites().map(f => String(f.id)));
    const frag = document.createDocumentFragment();
    streams.forEach(s => frag.appendChild(this._makeCard(s, type, favIds)));
    gridEl.appendChild(frag);
  }

  /* ── CARD ──────────────────────────────────────────────── */

  _makeCard(stream, type, favIds) {
    const id = stream.stream_id || stream.series_id || stream.id;
    const name = stream.name || stream.title || 'Bilinmiyor';
    const icon = stream.stream_icon || stream.cover || '';
    const isFav = favIds.has(String(id));

    const card = document.createElement('div');
    card.className = 'content-card';

    const typeIcons = { live: '📡', movies: '🎬', series: '📺' };
    const typeLabels = { live: 'Canlı', movies: 'Film', series: 'Dizi' };
    const typeCls = { live: 'badge-live', movies: 'badge-movie', series: 'badge-series' };

    card.innerHTML = `
      <div class="card-thumb">
        ${icon
          ? `<img src="${icon}" alt="${name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''
        }
        <div class="card-thumb-placeholder" style="${icon ? 'display:none' : ''}">${typeIcons[type]||'📺'}</div>
        ${type === 'live' ? '<div class="card-live-badge">CANLI</div>' : ''}
        ${isFav ? '<div class="card-fav-badge">❤️</div>' : ''}
        <div class="card-overlay">
          <div class="card-play-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${name}</div>
        <div class="card-meta">
          <span class="card-type-badge ${typeCls[type]||''}">${typeLabels[type]||type}</span>
        </div>
      </div>`;

    card.addEventListener('click', () => {
      if (type === 'series') {
        this.showSeriesDetail({ id, series_id: id, name, icon, stream });
      } else if (type === 'movies' || type === 'movie' || type === 'vod') {
        this.showVodDetail({ id, stream_id: id, name, icon, type, ...stream });
      } else {
        playerModule.playStream({ id, stream_id: id, name, icon, type, ...stream });
      }
    });

    return card;
  }

  _makeCatBtn(catId, name, type, active) {
    const btn = document.createElement('button');
    btn.className = 'category-btn' + (active ? ' active' : '');
    btn.textContent = name;
    btn.addEventListener('click', () => {
      document.querySelectorAll(`#${type}-categories .category-btn`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.currentCategory[type] = catId;
      const gridEl = document.getElementById(`${type}-grid`);
      if (gridEl) this._loadAndRender(type, catId, gridEl);
    });
    return btn;
  }

  /* ── SERIES DETAIL ─────────────────────────────────────── */

  
  /* ── VOD DETAIL ────────────────────────────────────────── */
  async showVodDetail(movie) {
    const modal = document.getElementById('vod-modal');
    if (!modal) return playerModule.playStream(movie);

    modal.style.display = 'flex';
    document.getElementById('vod-modal-title').textContent = movie.name;
    document.getElementById('vod-cover-img').src = movie.icon || '';
    document.getElementById('vod-plot').textContent = 'Yükleniyor...';
    document.getElementById('vod-genre').textContent = '';
    const gallery = document.getElementById('vod-cast-gallery');
    if (gallery) gallery.innerHTML = '<span style="color:#aaa;font-size:0.9rem;">Kadrolar yükleniyor...</span>';
    document.getElementById('vod-director').textContent = '';
    
    // Reset badges
    ['vod-year', 'vod-duration', 'vod-rating'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '';
        el.style.display = 'none';
      }
    });
    
    document.getElementById('vod-hero-bg').style.backgroundImage = movie.icon ? `url(${movie.icon})` : '';

    const playBtn = document.getElementById('vod-play-btn');
    if (playBtn) {
      const newPlayBtn = playBtn.cloneNode(true);
      playBtn.parentNode.replaceChild(newPlayBtn, playBtn);
      newPlayBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        playerModule.playStream(movie);
      });
    }

    const favBtn = document.getElementById('vod-fav-btn');
    if (favBtn) {
      const newFavBtn = favBtn.cloneNode(true);
      favBtn.parentNode.replaceChild(newFavBtn, favBtn);
      const isFav = storageService.getFavorites().some(f => String(f.id) === String(movie.id));
      newFavBtn.classList.toggle('active', isFav);
      
      newFavBtn.addEventListener('click', () => {
        const checkIsFav = storageService.getFavorites().some(f => String(f.id) === String(movie.id));
        if (checkIsFav) {
          storageService.removeFavorite(movie.id);
          UIModule.showToast('Favorilerden çıkarıldı', 'info');
        } else {
          storageService.addFavorite({ id: movie.id, name: movie.name, type: movie.type || 'movie', icon: movie.icon || '' });
          UIModule.showToast('Favorilere eklendi', 'success');
        }
        const nowFav = !checkIsFav;
        newFavBtn.classList.toggle('active', nowFav);
        if (this.currentView === 'favorites') this.renderFavorites();
      });
    }
    
    const vlcBtn = document.getElementById('vod-vlc-btn');
    if (vlcBtn) {
      const newVlcBtn = vlcBtn.cloneNode(true);
      vlcBtn.parentNode.replaceChild(newVlcBtn, vlcBtn);
      newVlcBtn.addEventListener('click', () => {
        const streamUrl = apiService.getVodStreamUrl(movie.stream_id || movie.id, movie.container_extension || 'mkv');
        window.location.href = 'vlc://' + streamUrl;
      });
    }

    try {
      const info = await apiService.getVodInfo(movie.stream_id || movie.id);
      if (info && info.info) {
        const mi = info.info;
        document.getElementById('vod-plot').textContent = mi.plot || movie.description || 'Detay bulunamadı.';
        document.getElementById('vod-genre').textContent = mi.genre || '';
        document.getElementById('vod-director').textContent = mi.director ? `Yönetmen: ${mi.director}` : '';

        // Populate badges
        const year = mi.releasedate ? mi.releasedate.substring(0, 4) : '';
        const duration = mi.duration || '';
        const rating = mi.rating ? `⭐ ${mi.rating}` : '';

        if (year) { 
          const el = document.getElementById('vod-year');
          if (el) { el.textContent = year; el.style.display = 'inline-block'; }
        }
        if (duration) {
          const el = document.getElementById('vod-duration');
          if (el) { el.textContent = duration; el.style.display = 'inline-block'; }
        }
        if (rating) {
          const el = document.getElementById('vod-rating');
          if (el) { el.textContent = rating; el.style.display = 'inline-block'; }
        }
        
        let bd = '';
        if (info.movie_data?.backdrop_path?.length) bd = info.movie_data.backdrop_path[0];
        else if (mi.backdrop_path?.length) bd = mi.backdrop_path[0];
        if (bd) document.getElementById('vod-hero-bg').style.backgroundImage = `url(${bd})`;

        // TMDB Logic
        const yrStr = (mi.releasedate || '').substring(0,4);
        const tmdbMatch = await apiService.getTmdbMovie?.(movie.name, yrStr);
        let castFound = false;
        if (tmdbMatch && tmdbMatch.id && gallery) {
           const cast = await apiService.getTmdbCast?.(tmdbMatch.id);
           if (cast && cast.length > 0) {
             castFound = true;
             gallery.innerHTML = '';
             cast.forEach(actor => {
               if (!actor.profile_path) return;
               const d = document.createElement('div');
               d.className = 'cast-member';
               d.innerHTML = `<img class="cast-photo" src="https://image.tmdb.org/t/p/w185${actor.profile_path}" loading="lazy">
                              <span class="cast-name">${actor.name}</span>
                              <span class="cast-role">${actor.character || ''}</span>`;
               
               d.addEventListener('click', () => {
                 document.getElementById('actor-modal').style.display = 'flex';
                 document.getElementById('actor-name').textContent = actor.name;
                 document.getElementById('actor-character').textContent = actor.character ? `Rol: ${actor.character}` : '';
                 document.getElementById('actor-photo').src = `https://image.tmdb.org/t/p/w185${actor.profile_path}`;
                 
                 const grid = document.getElementById('actor-movies-grid');
                 grid.innerHTML = '<div class="spinner"></div> TMDB taranÄ±yor...';
                 
                 fetch(`https://api.themoviedb.org/3/person/${actor.id}/movie_credits?api_key=e9e9d8da18ae29fc430845952232787c&language=tr-TR`)
                   .then(r => r.json())
                   .then(res => {
                      const movies = (res.cast||[]).slice(0, 10);
                      if (!movies.length) { grid.innerHTML = '<span style="color:#aaa">KayÄ±t bulunamadÄ±.</span>'; return; }
                      grid.innerHTML = '';
                      movies.forEach(m => {
                        const poster = m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : '';
                        if (!poster) return;
                        const card = document.createElement('div');
                        card.className = 'content-card';
                        card.innerHTML = `<div class="card-thumb"><img src="${poster}" loading="lazy"></div>
                                        <div class="card-info" style="padding:10px;"><div class="card-title" style="font-size:0.9rem;">${m.title}</div></div>`;
                        grid.appendChild(card);
                      });
                   }).catch(() => grid.innerHTML = 'TMDB baÄŸlantÄ± hatasÄ±.');
               });
               gallery.appendChild(d);
             });
           }
        }
        if (!castFound && gallery) {
          gallery.innerHTML = `<span style="color:#888;">TMDB oyuncu detaylarÄ± bulunamadÄ±. (Data: ${mi.cast || 'Yok'})</span>`;
        }
      }
    } catch (e) {
      document.getElementById('vod-plot').textContent = movie.description || 'Hata oluÅŸtu.';
    }
  }

async showSeriesDetail(series) {
    const modal = document.getElementById('series-modal');
    if (!modal) return;

    // Show modal with loading state
    modal.style.display = 'flex';
    document.getElementById('series-modal-title').textContent = series.name;
    document.getElementById('series-cover-img').src = series.icon || '';
    document.getElementById('series-cover-img').style.display = series.icon ? 'block' : 'none';
    document.getElementById('series-plot').textContent = '';
    document.getElementById('series-genre').textContent = '';
    document.getElementById('series-rating').textContent = '';
    document.getElementById('season-tabs').innerHTML = '';
    document.getElementById('episode-grid').innerHTML = '<div class="grid-loading"><div class="spinner"></div><span>Bilgiler yükleniyor...</span></div>';

    const seriesId = series.id || series.series_id;

    // Use cache
    let info = this._seriesCache[seriesId];
    if (!info) {
      try {
        info = await apiService.getSeriesInfo(seriesId);
        if (info) this._seriesCache[seriesId] = info;
      } catch (e) {
        document.getElementById('episode-grid').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Yüklenemedi</h3><p>${e.message}</p></div>`;
        return;
      }
    }

    if (!info) {
      document.getElementById('episode-grid').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📺</div><h3>Bilgi bulunamadı</h3></div>';
      return;
    }

    // Fill meta
    const si = info.info || {};
    document.getElementById('series-plot').textContent = si.plot || '';
    document.getElementById('series-genre').textContent = si.genre || '';
    document.getElementById('series-rating').textContent = si.rating ? `⭐ ${si.rating}` : '';
    document.getElementById('series-cast').textContent = si.cast ? `Oyuncular: ${si.cast}` : '';

    if (si.backdrop_path?.[0]) {
      document.getElementById('series-hero-bg').style.backgroundImage = `url(${si.backdrop_path[0]})`;
    }

    // Build season tabs from episodes object
    const episodes = info.episodes || {};
    const seasonNums = Object.keys(episodes).map(Number).sort((a, b) => a - b);

    if (!seasonNums.length) {
      document.getElementById('episode-grid').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📺</div><h3>Bölüm bulunamadı</h3></div>';
      return;
    }

    this._currentSeason = seasonNums[0];
    this._renderSeasonTabs(seasonNums, episodes, series.name);
    this._renderEpisodes(episodes[this._currentSeason] || [], series.name);
  }

  _renderSeasonTabs(seasonNums, episodes, seriesName) {
    const tabsEl = document.getElementById('season-tabs');
    tabsEl.innerHTML = '';
    seasonNums.forEach(num => {
      const btn = document.createElement('button');
      btn.className = 'season-tab' + (num === this._currentSeason ? ' active' : '');
      btn.textContent = `Sezon ${num}`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.season-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._currentSeason = num;
        this._renderEpisodes(episodes[num] || [], seriesName);
      });
      tabsEl.appendChild(btn);
    });
  }

  _renderEpisodes(eps, seriesName) {
    const gridEl = document.getElementById('episode-grid');
    gridEl.innerHTML = '';
    if (!eps.length) {
      gridEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><h3>Bu sezonda bölüm yok</h3></div>';
      return;
    }
    const frag = document.createDocumentFragment();
    eps.forEach(ep => frag.appendChild(this._makeEpisodeCard(ep, seriesName)));
    gridEl.appendChild(frag);
  }

  _makeEpisodeCard(ep, seriesName) {
    const card = document.createElement('div');
    card.className = 'episode-card';
    const img = ep.info?.movie_image || '';
    const dur = ep.info?.duration || '';
    const plot = ep.info?.plot || '';
    const epNum = ep.episode_num || ep.id;

    card.innerHTML = `
      <div class="episode-thumb">
        ${img ? `<img src="${img}" alt="E${epNum}" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="episode-num-badge">E${String(epNum).padStart(2,'0')}</div>
        <div class="episode-play-overlay">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </div>
      <div class="episode-info">
        <div class="episode-title">${ep.title || `Bölüm ${epNum}`}</div>
        ${dur ? `<div class="episode-meta">${dur}</div>` : ''}
        ${plot ? `<div class="episode-plot">${plot}</div>` : ''}
      </div>`;

    card.addEventListener('click', () => {
      document.getElementById('series-modal').style.display = 'none';
      playerModule.playStream({
        id: ep.id,
        stream_id: ep.id,
        name: `${seriesName} · E${String(epNum).padStart(2,'0')} ${ep.title || ''}`,
        type: 'episode',
        container_extension: ep.container_extension || 'mkv',
        plot: ep.info?.plot || '',
        icon: ep.info?.movie_image || '',
      });
    });

    return card;
  }

  /* ── FAVORITES / HISTORY ───────────────────────────────── */

  renderFavorites() {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;
    const favs = storageService.getFavorites();
    grid.innerHTML = '';
    if (!favs.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">❤️</div><h3>Favori yok</h3><p>İzlerken ♥ butonuna basarak ekleyin.</p></div>`;
      return;
    }
    const favIds = new Set(favs.map(f => String(f.id)));
    const frag = document.createDocumentFragment();
    favs.forEach(item => frag.appendChild(this._makeCard(item, item.type || 'live', favIds)));
    grid.appendChild(frag);
  }

  renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    const history = storageService.getHistory();
    list.innerHTML = '';
    if (!history?.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🕐</div><h3>Geçmiş yok</h3><p>İzlediğiniz içerikler burada görünecek.</p></div>`;
      return;
    }
    history.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      const typeCls = item.type === 'live' ? 'badge-live' : item.type === 'movie' ? 'badge-movie' : 'badge-series';
      el.innerHTML = `
        <div class="history-item-thumbnail">
          ${item.icon ? `<img src="${item.icon}" loading="lazy" onerror="this.onerror=null;this.parentElement.textContent='📺'">` : '📺'}
        </div>
        <div class="history-item-content">
          <div class="history-item-title">${item.name || 'Bilinmiyor'}</div>
          <div class="history-item-meta">
            <span class="card-type-badge ${typeCls}">${item.type||'stream'}</span>
            <span>${this._timeAgo(new Date(item.watchedAt))}</span>
          </div>
        </div>`;
      el.addEventListener('click', () => playerModule.playStream(item));
      list.appendChild(el);
    });
  }

  renderContent() { this.renderView(this.currentView); }

  /* ── SEARCH ────────────────────────────────────────────── */

  async _search() {
    const q = document.getElementById('search-input')?.value?.trim();
    if (!q) { this.renderView(this.currentView); return; }
    const ql = q.toLowerCase();
    const seen = new Set();
    const results = [];
    Object.entries(this.loadedData).forEach(([key, streams]) => {
      if (!Array.isArray(streams)) return;
      const type = key.split('_')[0];
      streams.forEach(s => {
        const id = s.stream_id || s.series_id || s.id;
        if (seen.has(id)) return;
        if ((s.name || s.title || '').toLowerCase().includes(ql)) {
          seen.add(id); results.push({ ...s, _searchType: type });
        }
      });
    });

    this.switchView('live');
    const grid = document.getElementById('live-grid');
    if (!grid) return;
    if (!results.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔍</div><h3>Sonuç yok</h3><p>"${q}" için sonuç bulunamadı.</p></div>`;
    } else {
      this._renderGrid(grid, results, 'live');
      UIModule.showToast(`${results.length} sonuç`, 'success');
    }
  }

  /* ── PROFILE ────────────────────────────────────────────── */

  showProfile() {
    const p = authModule.getUserProfile();
    document.getElementById('profile-username').textContent = p.username;
    document.getElementById('profile-expiration').textContent = `Bitiş: ${p.expiration}`;
    document.getElementById('profile-bandwidth').textContent = `Bant: ${(p.bandwidth/1024/1024/1024).toFixed(2)} GB`;
    document.getElementById('profile-connections').textContent = `Max Bağlantı: ${p.connections}`;
    document.getElementById('profile-modal').style.display = 'flex';
  }

  /* ── SIDEBAR ────────────────────────────────────────────── */

  toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    const open = sb?.classList.toggle('open');
    ov?.classList.toggle('show', open);
  }

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  }

  /* ── UTIL ───────────────────────────────────────────────── */

  _timeAgo(date) {
    const d = Date.now() - date;
    const m = Math.floor(d/60000), h = Math.floor(d/3600000), day = Math.floor(d/86400000);
    if (m < 1) return 'az önce';
    if (m < 60) return `${m}dk önce`;
    if (h < 24) return `${h}sa önce`;
    return `${day}g önce`;
  }
}
