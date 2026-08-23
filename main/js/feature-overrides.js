(function applyFeatureOverrides() {
  if (typeof ContentModule === 'undefined') return;

  const patchStyles = () => {
    if (document.getElementById('feature-patch-styles')) return;
    const style = document.createElement('style');
    style.id = 'feature-patch-styles';
    style.textContent = `
      .content-card { position: relative; }
      .card-actions {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 3;
        display: flex;
        gap: 6px;
      }
      .card-action-btn {
        width: 30px;
        height: 30px;
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 999px;
        background: rgba(0,0,0,0.55);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--transition);
      }
      .card-action-btn:hover,
      .card-action-btn.active {
        background: rgba(229,9,20,0.9);
        border-color: rgba(229,9,20,1);
      }
      .card-subtitle {
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.4;
        margin-top: 4px;
      }
      .detail-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.82);
        z-index: 700;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        backdrop-filter: blur(10px);
      }
      .detail-modal.show { display: flex; }
      .detail-shell {
        width: min(1040px, 100%);
        max-height: 92vh;
        overflow: auto;
        border: 1px solid var(--border);
        border-radius: var(--radius-xl);
        background: var(--bg-surface);
        box-shadow: var(--shadow-lg);
      }
      .detail-hero {
        position: relative;
        min-height: 320px;
        background: linear-gradient(135deg, rgba(229,9,20,0.2), rgba(14,165,233,0.1)), var(--bg-elevated);
        background-size: cover;
        background-position: center;
      }
      .detail-hero::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.55) 48%, rgba(10,10,15,0.15) 100%);
      }
      .detail-close {
        position: absolute;
        top: 18px;
        right: 18px;
        z-index: 2;
      }
      .detail-content {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 210px 1fr;
        gap: 24px;
        padding: 48px 28px 28px;
        align-items: end;
      }
      .detail-poster {
        width: 100%;
        max-width: 210px;
        aspect-ratio: 2 / 3;
        object-fit: cover;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border);
        box-shadow: var(--shadow-lg);
        background: var(--bg-elevated);
      }
      .detail-copy h2 {
        font-size: clamp(22px, 3vw, 36px);
        line-height: 1.1;
        margin-bottom: 12px;
      }
      .detail-badges {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .detail-badge {
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 12px;
        color: var(--text-secondary);
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .detail-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin: 18px 0;
      }
      .detail-actions .btn { width: auto; }
      .detail-body {
        padding: 24px 28px 30px;
        display: grid;
        gap: 18px;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
      }
      .detail-stat {
        padding: 14px 16px;
        border-radius: var(--radius-md);
        background: var(--bg-elevated);
        border: 1px solid var(--border);
      }
      .detail-stat-label {
        display: block;
        color: var(--text-muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 8px;
      }
      .detail-stat-value {
        color: var(--text-primary);
        font-size: 14px;
        line-height: 1.5;
      }
      .detail-overview {
        color: var(--text-secondary);
        line-height: 1.7;
        font-size: 14px;
      }
      .season-pager {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }
      .season-nav-btn {
        min-width: 36px;
        height: 36px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--bg-elevated);
        color: var(--text-primary);
        cursor: pointer;
      }
      .season-nav-btn:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .season-tab-window {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        flex: 1;
      }
      .season-tab-summary {
        margin-left: auto;
        color: var(--text-muted);
        font-size: 12px;
        white-space: nowrap;
      }
      @media (max-width: 768px) {
        .detail-modal { padding: 12px; }
        .detail-content {
          grid-template-columns: 1fr;
          padding: 64px 18px 18px;
        }
        .detail-poster {
          max-width: 170px;
        }
        .detail-body {
          padding: 18px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const ensureMovieModal = () => {
    if (document.getElementById('movie-detail-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'movie-detail-modal';
    modal.className = 'detail-modal';
    modal.innerHTML = `
      <div class="detail-shell">
        <div class="detail-hero" id="movie-detail-backdrop">
          <button type="button" class="close-btn detail-close" id="movie-detail-close">x</button>
          <div class="detail-content">
            <img id="movie-detail-poster" class="detail-poster" alt="" />
            <div class="detail-copy">
              <div class="detail-badges" id="movie-detail-badges"></div>
              <h2 id="movie-detail-title"></h2>
              <p class="detail-overview" id="movie-detail-overview"></p>
              <div class="detail-actions">
                <button type="button" class="btn btn-primary" id="movie-detail-play">Oynat</button>
                <button type="button" class="btn btn-secondary" id="movie-detail-favorite">Favori</button>
              </div>
            </div>
          </div>
        </div>
        <div class="detail-body">
          <div class="detail-grid" id="movie-detail-stats"></div>
        </div>
      </div>
    `;
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.classList.remove('show');
    });
    modal.querySelector('#movie-detail-close')?.addEventListener('click', () => {
      modal.classList.remove('show');
    });
    modal.querySelector('#movie-detail-play')?.addEventListener('click', () => {
      const movie = contentModule?._activeMovieDetail;
      if (!movie) return;
      modal.classList.remove('show');
      playerModule.playStream(movie);
    });
    modal.querySelector('#movie-detail-favorite')?.addEventListener('click', () => {
      const movie = contentModule?._activeMovieDetail;
      if (!movie) return;
      contentModule._toggleFavoriteEntity(movie);
      contentModule._syncMovieFavoriteButton();
    });
    document.body.appendChild(modal);
  };

  const proto = ContentModule.prototype;

  proto._ensurePatchedState = function() {
    this._vodCache = this._vodCache || {};
    this._movieInfoCache = this._movieInfoCache || {};
    this._seriesCache = this._seriesCache || {};
    this._seasonPage = this._seasonPage || 0;
    this._seasonPageSize = this._seasonPageSize || 10;
    this._eventBindingsReady = !!this._eventBindingsReady;
    patchStyles();
    ensureMovieModal();
  };

  proto.init = async function() {
    this._ensurePatchedState();
    if (!this._eventBindingsReady) {
      this._setupEventListeners();
      this._eventBindingsReady = true;
    }
    await this._loadAllCategories();
    this.renderView(this.currentView || 'live');
  };

  proto._setupEventListeners = function() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.onclick = (event) => {
        const view = event.currentTarget.dataset.view;
        if (view) this.switchView(view);
      };
    });
    document.getElementById('search-btn')?.addEventListener('click', () => this._search());
    document.getElementById('search-input')?.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') this._search();
    });
    document.getElementById('settings-btn')?.addEventListener('click', () => settingsModule.show());
    document.getElementById('profile-btn')?.addEventListener('click', () => this.showProfile());
    document.getElementById('logout-btn')?.addEventListener('click', () => authModule.logout());
    document.getElementById('menu-toggle')?.addEventListener('click', () => this.toggleSidebar());
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => this.closeSidebar());
  };

  proto._normalizeContentType = function(type) {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'movies' || normalized === 'vod') return 'movie';
    return normalized || 'live';
  };

  proto._normalizeItem = function(stream, typeHint = '') {
    const type = this._normalizeContentType(typeHint || stream?.type || stream?._searchType);
    const id = stream?.stream_id || stream?.series_id || stream?.id;
    return {
      ...(stream || {}),
      id,
      stream_id: stream?.stream_id || id,
      series_id: stream?.series_id || id,
      type,
      name: stream?.name || stream?.title || 'Bilinmiyor',
      icon: stream?.icon || stream?.stream_icon || stream?.cover || stream?.cover_big || '',
      plot: stream?.plot || stream?.description || '',
      container_extension: stream?.container_extension || stream?.info?.container_extension || 'mp4',
    };
  };

  proto._isFavorite = function(item) {
    const id = String(item?.stream_id || item?.series_id || item?.id || '');
    return storageService.getFavorites().some((fav) => String(fav.id) === id);
  };

  proto._favoriteRecord = function(item) {
    const normalized = this._normalizeItem(item, item?.type);
    return {
      id: normalized.stream_id || normalized.series_id || normalized.id,
      name: normalized.name,
      type: normalized.type,
      icon: normalized.icon,
      plot: normalized.plot || '',
      container_extension: normalized.container_extension,
    };
  };

  proto._toggleFavoriteEntity = function(item) {
    const record = this._favoriteRecord(item);
    const id = record.id;
    const exists = storageService.getFavorites().some((fav) => String(fav.id) === String(id));
    if (exists) {
      storageService.removeFavorite(id);
      UIModule.showToast('Favorilerden cikarildi', 'info');
    } else {
      storageService.addFavorite(record);
      UIModule.showToast('Favorilere eklendi', 'success');
    }
    playerModule?.updateFavoriteButton?.(record);
    if (this.currentView === 'favorites') this.renderFavorites();
  };

  proto._openItem = function(item, typeHint = '') {
    const normalized = this._normalizeItem(item, typeHint);
    if (normalized.type === 'series') {
      this.showSeriesDetail(normalized);
      return;
    }
    if (normalized.type === 'movie') {
      this.showMovieDetail(normalized);
      return;
    }
    playerModule.playStream(normalized);
  };

  proto._makeCard = function(stream, type, favIds) {
    const item = this._normalizeItem(stream, type);
    const id = String(item.stream_id || item.series_id || item.id);
    const isFav = favIds?.has(id) || this._isFavorite(item);
    const card = document.createElement('div');
    card.className = 'content-card';

    const typeIcon = item.type === 'live' ? '📡' : item.type === 'movie' ? '🎬' : '📺';
    const typeLabel = item.type === 'live' ? 'Canli' : item.type === 'movie' ? 'Film' : 'Dizi';
    const typeClass = item.type === 'live' ? 'badge-live' : item.type === 'movie' ? 'badge-movie' : 'badge-series';
    const subtitle = item.year || item.releaseDate || item.genre || item.category_name || '';

    card.innerHTML = `
      <div class="card-thumb">
        ${item.icon ? `<img src="${item.icon}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
        <div class="card-thumb-placeholder" style="${item.icon ? 'display:none;' : ''}">${typeIcon}</div>
        <div class="card-actions">
          <button type="button" class="card-action-btn card-favorite-btn ${isFav ? 'active' : ''}" title="Favori">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
        ${item.type === 'live' ? '<div class="card-live-badge">CANLI</div>' : ''}
        <div class="card-overlay">
          <div class="card-play-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${item.name}</div>
        <div class="card-meta">
          <span class="card-type-badge ${typeClass}">${typeLabel}</span>
        </div>
        ${subtitle ? `<div class="card-subtitle">${subtitle}</div>` : ''}
      </div>
    `;

    card.querySelector('.card-favorite-btn')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this._toggleFavoriteEntity(item);
      const btn = event.currentTarget;
      const active = this._isFavorite(item);
      btn.classList.toggle('active', active);
      const path = btn.querySelector('path');
      if (path) path.setAttribute('fill', active ? 'currentColor' : 'none');
    });

    card.addEventListener('click', () => this._openItem(item, item.type));
    return card;
  };

  proto._renderGrid = function(gridEl, streams, type) {
    gridEl.innerHTML = '';
    if (!Array.isArray(streams) || streams.length === 0) {
      gridEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📺</div><h3>Icerik bulunamadi</h3><p>Bu bolumde gosterilecek icerik yok.</p></div>`;
      return;
    }
    const favIds = new Set(storageService.getFavorites().map((fav) => String(fav.id)));
    const fragment = document.createDocumentFragment();
    streams.forEach((stream) => {
      const itemType = type === 'mixed' ? (stream._searchType || stream.type) : type;
      fragment.appendChild(this._makeCard(stream, itemType, favIds));
    });
    gridEl.appendChild(fragment);
  };

  proto.showMovieDetail = async function(movie) {
    this._ensurePatchedState();
    const normalized = this._normalizeItem(movie, movie?.type || 'movie');
    const modal = document.getElementById('movie-detail-modal');
    if (!modal) return;

    const cacheKey = String(normalized.stream_id || normalized.id);
    let details = this._movieInfoCache[cacheKey];
    if (!details) {
      details = await apiService.getVodInfo(cacheKey);
      this._movieInfoCache[cacheKey] = details || {};
    }

    const info = details?.info || {};
    const movieData = details?.movie_data || {};
    const backdrop = Array.isArray(info.backdrop_path) ? info.backdrop_path[0] : (info.backdrop_path || normalized.backdrop_path || '');
    const poster = info.movie_image || movieData.stream_icon || normalized.icon || '';
    const plot = info.plot || movieData.plot || normalized.plot || 'Detay bilgisi bulunamadi.';
    const badges = [
      info.genre || movieData.genre,
      info.rating ? `IMDB ${info.rating}` : '',
      info.duration || movieData.duration,
      movieData.releasedate || info.releasedate || '',
    ].filter(Boolean);

    const stats = [
      ['Yonetmen', info.director || movieData.director || '-'],
      ['Oyuncular', info.cast || movieData.cast || '-'],
      ['Tur', info.genre || movieData.genre || '-'],
      ['Sure', info.duration || movieData.duration || '-'],
      ['Yil', movieData.releasedate || info.releasedate || '-'],
      ['Uzanti', normalized.container_extension || '-'],
    ];

    document.getElementById('movie-detail-backdrop').style.backgroundImage = backdrop ? `url(${backdrop})` : '';
    document.getElementById('movie-detail-poster').src = poster;
    document.getElementById('movie-detail-title').textContent = normalized.name;
    document.getElementById('movie-detail-overview').textContent = plot;
    document.getElementById('movie-detail-badges').innerHTML = badges.map((badge) => `<span class="detail-badge">${badge}</span>`).join('');
    document.getElementById('movie-detail-stats').innerHTML = stats.map(([label, value]) => `
      <div class="detail-stat">
        <span class="detail-stat-label">${label}</span>
        <div class="detail-stat-value">${value}</div>
      </div>
    `).join('');

    this._activeMovieDetail = {
      ...normalized,
      plot,
      description: plot,
      icon: poster || normalized.icon,
      type: 'movie',
      container_extension: normalized.container_extension || movieData.container_extension || info.container_extension || 'mp4',
      direct_source: movieData.direct_source || info.direct_source || normalized.direct_source || '',
      _vodInfo: details,
    };
    this._syncMovieFavoriteButton();
    modal.classList.add('show');
  };

  proto._syncMovieFavoriteButton = function() {
    const button = document.getElementById('movie-detail-favorite');
    if (!button || !this._activeMovieDetail) return;
    const active = this._isFavorite(this._activeMovieDetail);
    button.textContent = active ? 'Favoriden Cikar' : 'Favoriye Ekle';
    button.className = `btn ${active ? 'btn-danger' : 'btn-secondary'}`;
  };

  proto.showSeriesDetail = async function(series) {
    this._ensurePatchedState();
    const normalized = this._normalizeItem(series, 'series');
    const modal = document.getElementById('series-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    document.getElementById('series-modal-title').textContent = normalized.name;
    document.getElementById('series-cover-img').src = normalized.icon || '';
    document.getElementById('series-cover-img').style.display = normalized.icon ? 'block' : 'none';
    document.getElementById('series-plot').textContent = '';
    document.getElementById('series-genre').textContent = '';
    document.getElementById('series-rating').textContent = '';
    document.getElementById('series-cast').textContent = '';
    document.getElementById('season-tabs').innerHTML = '';
    document.getElementById('episode-grid').innerHTML = '<div class="grid-loading"><div class="spinner"></div><span>Bolumler yukleniyor...</span></div>';

    const seriesId = normalized.series_id || normalized.id;
    let info = this._seriesCache[seriesId];
    if (!info) {
      info = await apiService.getSeriesInfo(seriesId);
      this._seriesCache[seriesId] = info || {};
    }
    if (!info) {
      document.getElementById('episode-grid').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📺</div><h3>Detay bulunamadi</h3></div>';
      return;
    }

    const seriesInfo = info.info || {};
    document.getElementById('series-plot').textContent = seriesInfo.plot || '';
    document.getElementById('series-genre').textContent = seriesInfo.genre || '';
    document.getElementById('series-rating').textContent = seriesInfo.rating ? `IMDB ${seriesInfo.rating}` : '';
    document.getElementById('series-cast').textContent = seriesInfo.cast ? `Oyuncular: ${seriesInfo.cast}` : '';
    if (seriesInfo.backdrop_path?.[0]) {
      document.getElementById('series-hero-bg').style.backgroundImage = `url(${seriesInfo.backdrop_path[0]})`;
    } else {
      document.getElementById('series-hero-bg').style.backgroundImage = '';
    }

    const seasonEntries = Object.entries(info.episodes || {})
      .map(([seasonKey, episodes]) => {
        const match = String(seasonKey).match(/\d+/);
        const seasonNumber = match ? Number(match[0]) : Number(seasonKey);
        return {
          key: seasonKey,
          seasonNumber: Number.isFinite(seasonNumber) ? seasonNumber : 0,
          episodes: Array.isArray(episodes) ? episodes : [],
        };
      })
      .sort((a, b) => a.seasonNumber - b.seasonNumber);

    if (!seasonEntries.length) {
      document.getElementById('episode-grid').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📺</div><h3>Bolum bulunamadi</h3></div>';
      return;
    }

    this._seriesSeasonEntries = seasonEntries;
    this._currentSeason = seasonEntries[0].seasonNumber;
    this._seasonPage = 0;
    this._renderSeasonTabs(seasonEntries, normalized.name);
    this._renderEpisodes(seasonEntries[0].episodes, normalized.name);
  };

  proto._renderSeasonTabs = function(seasonEntries, seriesName) {
    const tabsEl = document.getElementById('season-tabs');
    if (!tabsEl) return;
    const pageSize = this._seasonPageSize || 10;
    const totalPages = Math.ceil(seasonEntries.length / pageSize);
    const start = this._seasonPage * pageSize;
    const currentEntries = seasonEntries.slice(start, start + pageSize);

    tabsEl.innerHTML = `
      <div class="season-pager">
        <button type="button" class="season-nav-btn" data-nav="-1" ${this._seasonPage === 0 ? 'disabled' : ''}>&lt;</button>
        <div class="season-tab-window"></div>
        <button type="button" class="season-nav-btn" data-nav="1" ${this._seasonPage >= totalPages - 1 ? 'disabled' : ''}>&gt;</button>
        <span class="season-tab-summary">${seasonEntries.length} sezon</span>
      </div>
    `;

    const windowEl = tabsEl.querySelector('.season-tab-window');
    currentEntries.forEach((entry) => {
      const button = document.createElement('button');
      button.className = 'season-tab' + (entry.seasonNumber === this._currentSeason ? ' active' : '');
      button.textContent = `Sezon ${entry.seasonNumber}`;
      button.addEventListener('click', () => {
        this._currentSeason = entry.seasonNumber;
        this._renderSeasonTabs(seasonEntries, seriesName);
        this._renderEpisodes(entry.episodes, seriesName);
      });
      windowEl.appendChild(button);
    });

    tabsEl.querySelectorAll('.season-nav-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const direction = Number(button.dataset.nav || 0);
        const nextPage = this._seasonPage + direction;
        if (nextPage < 0 || nextPage >= totalPages) return;
        this._seasonPage = nextPage;
        this._renderSeasonTabs(seasonEntries, seriesName);
      });
    });
  };

  proto._renderEpisodes = function(episodes, seriesName) {
    const gridEl = document.getElementById('episode-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';
    if (!episodes?.length) {
      gridEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎭</div><h3>Bu sezonda bolum yok</h3></div>';
      return;
    }
    const fragment = document.createDocumentFragment();
    episodes.forEach((episode) => fragment.appendChild(this._makeEpisodeCard(episode, seriesName)));
    gridEl.appendChild(fragment);
  };

  proto._makeEpisodeCard = function(episode, seriesName) {
    const epNum = episode.episode_num || episode.id || 0;
    const plot = episode.info?.plot || '';
    const duration = episode.info?.duration || '';
    const image = episode.info?.movie_image || '';
    const card = document.createElement('div');
    card.className = 'episode-card';
    card.innerHTML = `
      <div class="episode-thumb">
        ${image ? `<img src="${image}" alt="${episode.title || `Bolum ${epNum}`}" loading="lazy" onerror="this.style.display='none'" />` : ''}
        <div class="episode-num-badge">E${String(epNum).padStart(2, '0')}</div>
        <div class="episode-play-overlay">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
      </div>
      <div class="episode-info">
        <div class="episode-title">${episode.title || `Bolum ${epNum}`}</div>
        ${duration ? `<div class="episode-meta">${duration}</div>` : ''}
        ${plot ? `<div class="episode-plot">${plot}</div>` : ''}
      </div>
    `;
    card.addEventListener('click', () => {
      document.getElementById('series-modal').style.display = 'none';
      playerModule.playStream({
        id: episode.id,
        stream_id: episode.id,
        name: `${seriesName} · E${String(epNum).padStart(2, '0')} ${episode.title || ''}`.trim(),
        type: 'episode',
        plot,
        icon: image,
        info: episode.info || {},
        direct_source: episode.direct_source || episode.info?.direct_source || '',
        container_extension: episode.container_extension || episode.info?.container_extension || 'mp4',
      });
    });
    return card;
  };

  proto.renderFavorites = function() {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;
    const favorites = storageService.getFavorites();
    if (!favorites.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">❤</div><h3>Favori yok</h3><p>Kartlardaki kalp butonuyla veya player icinden favori ekleyebilirsiniz.</p></div>`;
      return;
    }
    this._renderGrid(grid, favorites, 'mixed');
  };

  proto.renderHistory = function() {
    const list = document.getElementById('history-list');
    if (!list) return;
    const history = storageService.getHistory();
    list.innerHTML = '';
    if (!history?.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🕐</div><h3>Gecmis yok</h3><p>Izlediginiz icerikler burada listelenecek.</p></div>`;
      return;
    }

    history.forEach((rawItem) => {
      const item = this._normalizeItem(rawItem, rawItem.type);
      const row = document.createElement('div');
      row.className = 'history-item';
      const badgeClass = item.type === 'live' ? 'badge-live' : item.type === 'movie' ? 'badge-movie' : 'badge-series';
      row.innerHTML = `
        <div class="history-item-thumbnail">
          ${item.icon ? `<img src="${item.icon}" loading="lazy" onerror="this.onerror=null; this.parentElement.textContent='📺'" />` : '📺'}
        </div>
        <div class="history-item-content">
          <div class="history-item-title">${item.name}</div>
          <div class="history-item-meta">
            <span class="card-type-badge ${badgeClass}">${item.type}</span>
            <span>${this._timeAgo(new Date(rawItem.watchedAt))}</span>
          </div>
        </div>
      `;
      row.addEventListener('click', () => this._openItem(item, item.type));
      list.appendChild(row);
    });
  };

  proto._search = function() {
    const query = document.getElementById('search-input')?.value?.trim().toLowerCase();
    if (!query) {
      this.renderView(this.currentView);
      return;
    }

    const seen = new Set();
    const results = [];
    Object.entries(this.loadedData || {}).forEach(([key, items]) => {
      const itemType = this._normalizeContentType(key.split('_')[0]);
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        const normalized = this._normalizeItem(item, itemType);
        const id = String(normalized.stream_id || normalized.series_id || normalized.id);
        if (seen.has(id)) return;
        const haystack = [normalized.name, normalized.plot, item.genre, item.year].filter(Boolean).join(' ').toLowerCase();
        if (haystack.includes(query)) {
          seen.add(id);
          results.push({ ...normalized, _searchType: normalized.type });
        }
      });
    });

    this.switchView('live');
    const grid = document.getElementById('live-grid');
    if (!grid) return;
    if (!results.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔎</div><h3>Sonuc yok</h3><p>"${query}" icin sonuc bulunamadi.</p></div>`;
      return;
    }
    this._renderGrid(grid, results, 'mixed');
    UIModule.showToast(`${results.length} sonuc bulundu`, 'success');
  };

  patchStyles();
  ensureMovieModal();
})();
