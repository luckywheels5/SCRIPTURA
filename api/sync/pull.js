const { state, loadStore, authenticateRequest, handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  loadStore();
  const userId = auth.user.id;
  const data = state.syncData[userId] || {
    bookmark: null,
    highlights: {},
    streak: null,
    fontSize: 19,
    version: 1,
    updatedAt: new Date().toISOString()
  };

  return res.status(200).json({
    bookmark: data.bookmark,
    highlights: data.highlights,
    streak: data.streak,
    font_size: data.fontSize,
    version: data.version,
    updated_at: data.updatedAt
  });
};
