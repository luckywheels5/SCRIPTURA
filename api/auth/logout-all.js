const { state, loadStore, saveStore, authenticateRequest, handleCors } = require('../_lib/auth');

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
  for (const session of Object.values(state.sessions)) {
    if (session.userId === userId) {
      session.revoked = true;
    }
  }
  saveStore();

  res.setHeader('Set-Cookie', 'scriptura_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure');
  return res.status(200).json({ message: 'Todas as sessões foram invalidadas com sucesso.' });
};
