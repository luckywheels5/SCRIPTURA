const { state, loadStore, saveStore, authenticateRequest, handleCors, parseBody } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const auth = authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  loadStore();
  const userId = auth.user.id;
  const body = parseBody(req);

  const current = state.syncData[userId] || { version: 0 };
  state.syncData[userId] = {
    bookmark: body.bookmark || null,
    highlights: body.highlights || {},
    streak: body.streak || null,
    fontSize: parseInt(body.font_size, 10) || 19,
    version: (current.version || 0) + 1,
    updatedAt: new Date().toISOString()
  };

  saveStore();
  return res.status(200).json({
    message: 'Sincronização salva com sucesso!',
    synced_at: state.syncData[userId].updatedAt
  });
};
