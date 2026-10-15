/**
 * SCRIPTURA — Módulo de Autenticação Segura & Sincronização em Nuvem
 * Segurança em Primeiro Lugar (Conformidade com a Baseline & LGPD):
 * - Login Opcional: O site opera 100% offline/local sem conta caso o usuário prefira.
 * - Sincronização entre Dispositivos: Destaques, marcadores e progresso mesclados com segurança.
 * - Sessões HttpOnly com Invalidação no Servidor.
 * - Suporte a 2FA (TOTP), Portabilidade e Exclusão Definitiva (LGPD).
 * - Uso obrigatório de fetchJson para prevenir "Unexpected token '<' ... is not valid JSON".
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isSyncing = false;
    this.syncTimeout = null;
    this.listeners = new Set();

    // Permite configurar a URL da API via parâmetro de URL (ex: ?api_base=https://meu-backend.onrender.com)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramApi = urlParams.get('api_base') || urlParams.get('api');
      if (paramApi) {
        localStorage.setItem('scriptura_api_base', paramApi.replace(/\/+$/, ''));
      }
    } catch (_) {}

    // Determina a URL base da API de autenticação
    this.apiBase = window.SCRIPTURA_API_BASE || localStorage.getItem('scriptura_api_base') || window.location.origin;
    if (window.location.protocol === 'file:') {
      this.apiBase = 'http://localhost:8080';
    } else if (
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      window.location.port !== '8080' &&
      !window.SCRIPTURA_API_BASE &&
      !localStorage.getItem('scriptura_api_base')
    ) {
      // Se em desenvolvimento local em porta estática diferente (ex: Live Server 5500, 3000), direciona à porta padrão da API (8080)
      this.apiBase = `http://${window.location.hostname}:8080`;
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event, data) {
    for (const cb of this.listeners) {
      try {
        cb(event, data);
      } catch (err) {
        console.error('Erro no listener de auth:', err);
      }
    }
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getUser() {
    return this.currentUser;
  }

  /**
   * Verifica o status da sessão com o backend ao inicializar o app.
   */
  async checkSession() {
    try {
      const data = await window.fetchJson(`${this.apiBase}/api/auth/me`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include' // Envia cookie httpOnly SameSite=Strict
      });

      if (data && data.authenticated && data.user) {
        this.currentUser = data.user;
        this.notify('authStateChanged', { authenticated: true, user: this.currentUser });
        // Sincroniza dados da nuvem para o navegador
        await this.syncPull();
        return this.currentUser;
      }
    } catch (e) {
      // Falha silenciosa: modo offline, backend não iniciado ou rota estática sem backend
      console.info('Modo Local/Offline ativo (Backend opcional não conectado).');
    }

    this.currentUser = null;
    this.notify('authStateChanged', { authenticated: false, user: null });
    return null;
  }

  /**
   * Realiza login no servidor.
   */
  async login(email, password, totpCode = '') {
    const data = await window.fetchJson(`${this.apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, totp_code: totpCode })
    });

    // Se 2FA for exigido
    if (data && data.two_factor_required) {
      return { twoFactorRequired: true };
    }

    this.currentUser = data.user;
    if (data.token) {
      sessionStorage.setItem('scriptura_session_token', data.token);
    }
    this.notify('authStateChanged', { authenticated: true, user: this.currentUser });

    // Puxa dados da nuvem e mescla com os locais
    await this.syncPull();
    // Salva o estado consolidado na nuvem
    await this.syncPush();

    return { success: true, user: this.currentUser };
  }

  /**
   * Cadastra nova conta segura com hash Argon2id/bcrypt.
   * Não realiza busca de dados (pull), pois uma conta recém-criada inicia vazia no servidor.
   */
  async register(email, password, name = '') {
    const data = await window.fetchJson(`${this.apiBase}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name })
    });

    this.currentUser = data.user;
    if (data.token) {
      sessionStorage.setItem('scriptura_session_token', data.token);
    }
    this.notify('authStateChanged', { authenticated: true, user: this.currentUser });

    // Uma conta nova não possui dados na nuvem para buscar (sem syncPull).
    // Se o usuário já possuir dados locais acumulados antes de criar a conta,
    // agenda o envio em segundo plano sem travar a interface nem exibir 'buscando dados'.
    const hasLocalData = window.appState && (
      (window.appState.highlights && Object.keys(window.appState.highlights).length > 0) ||
      window.appState.getBookmark()
    );

    if (hasLocalData) {
      this.scheduleSyncPush();
    } else {
      this.notify('syncStateChanged', { status: 'synced', lastSynced: new Date() });
    }

    return { success: true, user: this.currentUser };
  }

  /**
   * Encerra a sessão atual invalidando no servidor.
   */
  async logout() {
    try {
      const token = sessionStorage.getItem('scriptura_session_token') || '';
      await window.fetchJson(`${this.apiBase}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include',
        body: '{}'
      });
    } catch (e) {
      console.warn('Erro ao chamar logout no servidor:', e.message);
    }

    sessionStorage.removeItem('scriptura_session_token');
    this.currentUser = null;
    this.notify('authStateChanged', { authenticated: false, user: null });
    return { success: true };
  }

  /**
   * Encerra todas as sessões em todos os dispositivos.
   */
  async logoutAll() {
    const token = sessionStorage.getItem('scriptura_session_token') || '';
    const data = await window.fetchJson(`${this.apiBase}/api/auth/logout-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include',
      body: '{}'
    });

    sessionStorage.removeItem('scriptura_session_token');
    this.currentUser = null;
    this.notify('authStateChanged', { authenticated: false, user: null });
    return data;
  }

  /**
   * Solicitação de recuperação de senha com token de expiração curta.
   */
  async forgotPassword(email) {
    return await window.fetchJson(`${this.apiBase}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email })
    });
  }

  /**
   * Redefine senha com token único.
   */
  async resetPassword(token, newPassword) {
    return await window.fetchJson(`${this.apiBase}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword })
    });
  }

  /**
   * Exporta todos os dados pessoais do usuário (Portabilidade LGPD).
   */
  async exportData() {
    const token = sessionStorage.getItem('scriptura_session_token') || '';
    const data = await window.fetchJson(`${this.apiBase}/api/user/export`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include'
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scriptura-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  /**
   * Exclui definitivamente a conta e todos os dados associados (Direito ao Esquecimento LGPD).
   */
  async deleteAccount(password) {
    const token = sessionStorage.getItem('scriptura_session_token') || '';
    const data = await window.fetchJson(`${this.apiBase}/api/user/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include',
      body: JSON.stringify({ password })
    });

    sessionStorage.removeItem('scriptura_session_token');
    this.currentUser = null;
    this.notify('authStateChanged', { authenticated: false, user: null });
    return data;
  }

  /**
   * Configuração de 2FA (TOTP)
   */
  async setup2FA() {
    const token = sessionStorage.getItem('scriptura_session_token') || '';
    return await window.fetchJson(`${this.apiBase}/api/auth/2fa/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include',
      body: '{}'
    });
  }

  async verify2FA(code) {
    const token = sessionStorage.getItem('scriptura_session_token') || '';
    const data = await window.fetchJson(`${this.apiBase}/api/auth/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include',
      body: JSON.stringify({ code })
    });
    if (this.currentUser) this.currentUser.two_factor_enabled = true;
    this.notify('authStateChanged', { authenticated: true, user: this.currentUser });
    return data;
  }

  // ===========================================================================
  // SINCRONIZAÇÃO EM NUVEM (DESTAQUES, MARCADOR, PROGRESSO)
  // ===========================================================================

  /**
   * Agenda sincronização push com debounce para evitar requisições excessivas.
   */
  scheduleSyncPush() {
    if (!this.isAuthenticated()) return;
    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    this.syncTimeout = setTimeout(() => {
      this.syncPush();
    }, 1200);
  }

  /**
   * Envia os dados locais consolidados para a nuvem.
   */
  async syncPush() {
    if (!this.isAuthenticated() || !window.appState) return;

    try {
      this.isSyncing = true;
      this.notify('syncStateChanged', { status: 'syncing' });

      const payload = {
        bookmark: window.appState.getBookmark(),
        highlights: window.appState.highlights,
        streak: window.appState.streak,
        font_size: window.appState.fontSize
      };

      const token = sessionStorage.getItem('scriptura_session_token') || '';
      await window.fetchJson(`${this.apiBase}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      this.notify('syncStateChanged', { status: 'synced', lastSynced: new Date() });
    } catch (e) {
      console.warn('Erro ao sincronizar push:', e.message);
      this.notify('syncStateChanged', { status: 'error' });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Puxa dados da nuvem e mescla inteligentemente com o estado local.
   */
  async syncPull() {
    if (!this.isAuthenticated() || !window.appState) return;

    try {
      this.isSyncing = true;
      this.notify('syncStateChanged', { status: 'syncing' });

      const token = sessionStorage.getItem('scriptura_session_token') || '';
      const cloudData = await window.fetchJson(`${this.apiBase}/api/sync/pull`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
      });

      if (cloudData && window.appState.importSyncData) {
        window.appState.importSyncData(cloudData);
      }
      this.notify('syncStateChanged', { status: 'synced', lastSynced: new Date() });
    } catch (e) {
      console.warn('Erro ao sincronizar pull:', e.message);
      this.notify('syncStateChanged', { status: 'error' });
    } finally {
      this.isSyncing = false;
    }
  }
}

// Instância global de autenticação
window.authManager = new AuthManager();
