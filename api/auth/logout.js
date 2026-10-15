const { state, loadStore, saveStore, getSessionToken, handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  loadStore();
  const token = getSessionToken(req);
  if (token && state.sessions[token]) {
    state.sessions[token].revoked = true;
    saveStore();
  }

  res.setHeader('Set-Cookie', 'scriptura_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure');
  return res.status(200).json({ message: 'Sessão encerrada com sucesso.' });
};
