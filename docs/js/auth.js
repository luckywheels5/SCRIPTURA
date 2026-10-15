/**
 * SCRIPTURA — Módulo de Autenticação Segura & Sincronização em Nuvem
 * Segurança em Primeiro Lugar (Conformidade com a Baseline & LGPD):
 * - Login Opcional: O site opera 100% offline/local sem conta caso o usuário prefira.
 * - Sincronização entre Dispositivos: Destaques, marcadores e progresso mesclados com segurança.
 * - Sessões HttpOnly com Invalidação no Servidor.
 * - Suporte a 2FA (TOTP), Portabilidade e Exclusão Definitiva (LGPD).
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isSyncing = false;
    this.syncTimeout = null;
    this.listeners = new Set();

    // Determina a URL base da API de autenticação
    this.apiBase = window.location.origin;
    if (window.location.protocol === 'file:') {
      this.apiBase = 'http://localhost:8080';
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
      const res = await fetch(`${this.apiBase}/api/auth/me`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include' // Envia cookie httpOnly SameSite=Strict
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          this.currentUser = data.user;
          this.notify('authStateChanged', { authenticated: true, user: this.currentUser });
          // Sincroniza dados da nuvem para o navegador
          await this.syncPull();
          return this.currentUser;
        }
      }
    } catch (e) {
      // Falha silenciosa: modo offline ou sem backend iniciado
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
    const res = await fetch(`${this.apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, totp_code: totpCode })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao autenticar.');
    }

    // Se 2FA for exigido
    if (data.two_factor_required) {
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
   */
  async register(email, password, name = '') {
    const res = await fetch(`${this.apiBase}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível criar a conta.');
    }

    this.currentUser = data.user;
    if (data.token) {
      sessionStorage.setItem('scriptura_session_token', data.token);
    }
    this.notify('authStateChanged', { authenticated: true, user: this.currentUser });

    // Salva o estado local atual na conta recém-criada
    await this.syncPush();

    return { success: true, user: this.currentUser };
  }

  /**
   * Encerra a sessão atual invalidando no servidor.
   */
  async logout() {
    try {
      const token = sessionStorage.getItem('scriptura_session_token') || '';
      await fetch(`${this.apiBase}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Erro ao chamar logout no servidor:', e);
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
    const res = await fetch(`${this.apiBase}/api/auth/logout-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao encerrar todas as sessões.');
    }

    sessionStorage.removeItem('scriptura_session_token');
    this.currentUser = null;
    this.notify('authStateChanged', { authenticated: false, user: null });
    return data;
  }

  /**
   * Solicitação de recuperação de senha com token de expiração curta.
   */
  async forgotPassword(email) {
    const res = await fetch(`${this.apiBase}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await res.json();
  }

  /**
   * Redefine senha com token único.
   */
  async resetPassword(token, newPassword) {
    const res = await fetch(`${this.apiBase}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao redefinir senha.');
    }
    return data;
  }

  /**
   * Exporta todos os dados pessoais do usuário (Portabilidade LGPD).
   */
  async exportData() {
    const token = sessionStorage.getItem('scriptura_session_token') || '';
    const res = await fetch(`${this.apiBase}/api/user/export`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('Falha ao exportar dados.');
    }

    const data = await res.json();
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
    const res = await fetch(`${this.apiBase}/api/user/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include',
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao excluir a conta.');
    }

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
    const res = await fetch(`${this.apiBase}/api/auth/2fa/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao configurar 2FA.');
    return data;
  }

  async verify2FA(code) {
    const token = sessionStorage.getItem('scriptura_session_token') || '';
    const res = await fetch(`${this.apiBase}/api/auth/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      credentials: 'include',
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Código 2FA inválido.');
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
      const res = await fetch(`${this.apiBase}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.notify('syncStateChanged', { status: 'synced', lastSynced: new Date() });
      } else {
        this.notify('syncStateChanged', { status: 'error' });
      }
    } catch (e) {
      console.warn('Erro ao sincronizar push:', e);
      this.notify('syncStateChanged', { status: 'offline' });
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
      const res = await fetch(`${this.apiBase}/api/sync/pull`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
      });

      if (res.ok) {
        const cloudData = await res.json();
        // Mescla com os dados locais sem perda
        if (window.appState.importSyncData) {
          window.appState.importSyncData(cloudData);
        }
        this.notify('syncStateChanged', { status: 'synced', lastSynced: new Date() });
      }
    } catch (e) {
      console.warn('Erro ao sincronizar pull:', e);
    } finally {
      this.isSyncing = false;
    }
  }
}

// Instância global de autenticação
window.authManager = new AuthManager();
