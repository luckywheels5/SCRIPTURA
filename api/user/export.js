const { state, loadStore, authenticateRequest, handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Utilize GET.' });
  }

  const auth = authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  loadStore();
  const { user } = auth;
  const sync = state.syncData[user.id] || {};

  return res.status(200).json({
    export_date: new Date().toISOString(),
    lgpd_compliance: 'Scriptura Data Export',
    user_profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.createdAt,
      two_factor_enabled: Boolean(user.twoFactorEnabled)
    },
    synchronized_data: {
      bookmark: sync.bookmark || null,
      highlights: sync.highlights || {},
      streak: sync.streak || null,
      font_size: sync.fontSize || 19
    }
  });
};
