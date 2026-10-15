/**
 * SCRIPTURA — Configuração Central do Supabase
 * Linha de Base de Segurança:
 * - A 'Project URL' e a 'anon public key' são seguras para uso no frontend (client-side).
 * - A segurança real é aplicada pelas políticas de Row Level Security (RLS) no banco Postgres.
 */

window.SCRIPTURA_CONFIG = {
  // Você pode preencher diretamente aqui ou colar na tela de Configurações do app:
  supabaseUrl: localStorage.getItem('scriptura_supabase_url') || '',
  supabaseAnonKey: localStorage.getItem('scriptura_supabase_anon_key') || '',

  /**
   * Salva as credenciais do Supabase no localStorage para persistência imediata.
   */
  setCredentials(url, anonKey) {
    if (url) {
      this.supabaseUrl = url.trim().replace(/\/+$/, '');
      localStorage.setItem('scriptura_supabase_url', this.supabaseUrl);
    }
    if (anonKey) {
      this.supabaseAnonKey = anonKey.trim();
      localStorage.setItem('scriptura_supabase_anon_key', this.supabaseAnonKey);
    }
  },

  /**
   * Verifica se o Supabase está configurado.
   */
  isConfigured() {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey);
  }
};
