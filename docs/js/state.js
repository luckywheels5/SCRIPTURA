/**
 * SCRIPTURA — Leitura Bíblica (Sola Scriptura · ACF)
 * Módulo de Estado e Persistência Local (localStorage)
 */

const STORAGE_KEYS = {
  BOOKMARK: 'acf_bookmark',
  HIGHLIGHTS: 'acf_highlights',
  FONT_SIZE: 'acf_font_size',
  STREAK: 'acf_streak_data',
  API_CONFIG: 'acf_api_config',
  CACHE_CHAPTERS: 'acf_cache_chapters',
  CACHE_BOOKS: 'acf_cache_books'
};

/**
 * Utilitário centralizado para requisições HTTP seguras.
 * Valida status HTTP e Content-Type antes de tentar interpretar a resposta como JSON,
 * prevenindo o erro técnico "Unexpected token '<' ... is not valid JSON".
 */
async function fetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (netErr) {
    console.error('Falha de rede ao acessar:', url, netErr);
    throw new Error('Falha de conexão com o servidor. Verifique sua rede ou se o backend está em execução.');
  }

  const contentType = (res.headers && res.headers.get('content-type')) || '';

  if (!res.ok || !contentType.toLowerCase().includes('application/json')) {
    const raw = await res.text(); // ler como texto, nunca como JSON, nesse caso
    console.error('Resposta inesperada de', url, '— status', res.status, '— corpo:', raw.slice(0, 300));

    // Se o backend retornou JSON estruturado de erro (ex: 400 ou 401 com { error: "..." })
    try {
      const errorData = JSON.parse(raw);
      if (errorData && (errorData.error || errorData.message)) {
        const err = new Error(errorData.error || errorData.message);
        err.status = res.status;
        err.data = errorData;
        throw err;
      }
    } catch (jsonErr) {
      if (jsonErr.status) throw jsonErr;
    }

    if (res.status === 429) {
      const isOfficialBible = url.includes('abibliadigital.com.br');
      const msg = isOfficialBible
        ? 'Limite de 20 requisições/hora por IP excedido na API oficial.'
        : 'Muitas tentativas em pouco tempo. Aguarde alguns instantes antes de tentar novamente.';
      const err = new Error(msg);
      err.status = 429;
      err.rawBody = raw;
      throw err;
    }

    // Contextualiza a mensagem com base no método e endpoint
    const method = (options.method || 'GET').toUpperCase();
    let actionDesc = 'ao processar solicitação';

    if (url.includes('/api/auth/register') || url.includes('/api/auth/signup')) {
      actionDesc = 'ao criar conta';
    } else if (url.includes('/api/auth/login')) {
      actionDesc = 'ao autenticar';
    } else if (url.includes('/api/sync/push')) {
      actionDesc = 'ao enviar dados de sincronização';
    } else if (url.includes('/api/sync/pull')) {
      actionDesc = 'ao sincronizar dados da nuvem';
    } else if (url.includes('/api/auth/me')) {
      actionDesc = 'ao verificar sessão';
    } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      actionDesc = 'ao enviar dados';
    } else if (method === 'DELETE') {
      actionDesc = 'ao excluir dados';
    } else if (method === 'GET') {
      actionDesc = 'ao carregar dados';
    }

    let defaultMsg = `Falha ${actionDesc} (status ${res.status}).`;

    if (res.status === 405) {
      const isStaticHost = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
      if (url.includes('/api/auth/register') || url.includes('/api/auth/signup')) {
        defaultMsg = isStaticHost
          ? 'Não foi possível criar a conta (status 405 Method Not Allowed). O GitHub Pages é estático e recusa requisições POST. Conecte ao backend do Scriptura (server.py).'
          : 'Não foi possível criar a conta (status 405 Method Not Allowed). O servidor recusou a requisição POST para este endpoint.';
      } else {
        defaultMsg = `Método ${method} não permitido para este endpoint (status 405 Method Not Allowed).`;
      }
    } else if (res.status === 404 && url.includes('/api/')) {
      defaultMsg = 'Serviço do servidor não encontrado ou indisponível (status 404). Verifique se o backend está em execução.';
    }

    const err = new Error(defaultMsg);
    err.status = res.status;
    err.rawBody = raw;
    throw err;
  }

  return res.json();
}

if (typeof window !== 'undefined') {
  window.fetchJson = fetchJson;
}

class StateManager {
  constructor() {
    this.bookmark = this._loadBookmark();
    this.highlights = this._loadHighlights();
    this.fontSize = this._loadFontSize();
    this.streak = this._calculateStreak();
    this.apiConfig = this._loadApiConfig();
    this.activeScreen = 'home'; // 'home' | 'bible' | 'reader' | 'search'
    this.currentBook = null;
    this.currentChapter = 1;
    this.selectedVerse = null;
    this.activeFilterTestament = 'VT'; // 'VT' | 'NT'
    this.subscribers = new Set();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event, data) {
    for (const callback of this.subscribers) {
      try {
        callback(event, data);
      } catch (err) {
        console.error('Erro no listener de estado:', err);
      }
    }
  }

  // --- MARCADOR (BOOKMARK) ---
  _loadBookmark() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARK);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Erro ao carregar marcador:', e);
    }
    return null;
  }

  setBookmark(bookAbbrev, bookName, chapter, verseNumber, snippet = '') {
    const bookmark = {
      bookAbbrev,
      bookName,
      chapter: parseInt(chapter, 10),
      verseNumber: parseInt(verseNumber, 10),
      snippet,
      updatedAt: new Date().toISOString()
    };
    this.bookmark = bookmark;
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARK, JSON.stringify(bookmark));
    } catch (e) {
      console.warn('Erro ao salvar marcador:', e);
    }
    this.notify('bookmarkChanged', bookmark);
    this._triggerCloudSync();
    return bookmark;
  }

  getBookmark() {
    return this.bookmark;
  }

  // --- DESTAQUES (HIGHLIGHTS) ---
  _loadHighlights() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Erro ao carregar destaques:', e);
    }
    return {}; // { "jo_3_16": "yellow" }
  }

  getVerseKey(bookAbbrev, chapter, verseNumber) {
    const abbrev = (bookAbbrev || '').toLowerCase().trim();
    return `${abbrev}_${chapter}_${verseNumber}`;
  }

  getHighlight(bookAbbrev, chapter, verseNumber) {
    const key = this.getVerseKey(bookAbbrev, chapter, verseNumber);
    return this.highlights[key] || null;
  }

  setHighlight(bookAbbrev, chapter, verseNumber, color) {
    const key = this.getVerseKey(bookAbbrev, chapter, verseNumber);
    if (!color) {
      delete this.highlights[key];
    } else {
      this.highlights[key] = color;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(this.highlights));
    } catch (e) {
      console.warn('Erro ao salvar destaques:', e);
    }
    this.notify('highlightsChanged', { key, color, highlights: this.highlights });
    this._triggerCloudSync();
  }

  // --- TAMANHO DA FONTE ---
  _loadFontSize() {
    try {
      const size = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
      if (size) return parseInt(size, 10);
    } catch (e) {}
    return 18; // Padrão 18px
  }

  setFontSize(size) {
    const clamped = Math.max(14, Math.min(26, size));
    this.fontSize = clamped;
    try {
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, clamped.toString());
    } catch (e) {}
    this.notify('fontSizeChanged', clamped);
    return clamped;
  }

  adjustFontSize(delta) {
    return this.setFontSize(this.fontSize + delta);
  }

  // --- STREAK (SEQUÊNCIA DE LEITURA) ---
  _calculateStreak() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
      const today = new Date().toISOString().slice(0, 10);
      let data = raw ? JSON.parse(raw) : { count: 1, lastDate: today };

      if (!data.lastDate) {
        data = { count: 1, lastDate: today };
        localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(data));
        return data;
      }

      if (data.lastDate === today) {
        return data;
      }

      const lastDate = new Date(data.lastDate);
      const currentDate = new Date(today);
      const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        data.count += 1;
      } else if (diffDays > 1) {
        data.count = 1;
      }
      data.lastDate = today;
      localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(data));
      return data;
    } catch (e) {
      return { count: 1, lastDate: new Date().toISOString().slice(0, 10) };
    }
  }

  // --- CONFIGURAÇÃO DA API ---
  _loadApiConfig() {
    const defaultConfig = {
      baseUrl: 'https://www.abibliadigital.com.br/api',
      token: '',
      provider: 'auto', // 'auto' | 'official' | 'mirror'
      version: 'acf'
    };
    try {
      const data = localStorage.getItem(STORAGE_KEYS.API_CONFIG);
      if (data) return { ...defaultConfig, ...JSON.parse(data) };
    } catch (e) {}
    return defaultConfig;
  }

  saveApiConfig(config) {
    this.apiConfig = { ...this.apiConfig, ...config };
    try {
      localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(this.apiConfig));
    } catch (e) {}
    this.notify('apiConfigChanged', this.apiConfig);
  }

  // --- SINCRONIZAÇÃO EM NUVEM (CLOUD SYNC) ---
  _triggerCloudSync() {
    if (window.authManager && typeof window.authManager.scheduleSyncPush === 'function') {
      window.authManager.scheduleSyncPush();
    }
  }

  importSyncData(cloudData) {
    if (!cloudData) return false;

    let hasChanges = false;

    // 1. Destaques: união segura para não perder marcações locais
    if (cloudData.highlights && typeof cloudData.highlights === 'object') {
      const merged = { ...this.highlights, ...cloudData.highlights };
      this.highlights = merged;
      try {
        localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(merged));
      } catch (e) {}
      this.notify('highlightsChanged', { highlights: this.highlights });
      hasChanges = true;
    }

    // 2. Marcador: se da nuvem for mais recente ou local for nulo
    if (cloudData.bookmark && typeof cloudData.bookmark === 'object') {
      const remote = cloudData.bookmark;
      const local = this.bookmark;
      const shouldUpdate = !local || !local.updatedAt || !remote.updatedAt || (new Date(remote.updatedAt) >= new Date(local.updatedAt));
      if (shouldUpdate) {
        this.bookmark = remote;
        try {
          localStorage.setItem(STORAGE_KEYS.BOOKMARK, JSON.stringify(remote));
        } catch (e) {}
        this.notify('bookmarkChanged', remote);
        hasChanges = true;
      }
    }

    // 3. Tamanho da Fonte
    if (cloudData.font_size && typeof cloudData.font_size === 'number') {
      const clamped = Math.max(14, Math.min(26, cloudData.font_size));
      this.fontSize = clamped;
      try {
        localStorage.setItem(STORAGE_KEYS.FONT_SIZE, clamped.toString());
      } catch (e) {}
      this.notify('fontSizeChanged', clamped);
      hasChanges = true;
    }

    // 4. Streak
    if (cloudData.streak && typeof cloudData.streak === 'object' && cloudData.streak.count) {
      if (!this.streak || cloudData.streak.count > this.streak.count) {
        this.streak = cloudData.streak;
        try {
          localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(this.streak));
        } catch (e) {}
        this.notify('streakChanged', this.streak);
        hasChanges = true;
      }
    }

    return hasChanges;
  }
}

// Instância global de estado
window.appState = new StateManager();
