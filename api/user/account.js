const crypto = require('crypto');
const { state, loadStore, saveStore, hashPassword, authenticateRequest, handleCors, parseBody } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Utilize DELETE.' });
  }

  const auth = authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  loadStore();
  const { user } = auth;
  const body = parseBody(req);
  const password = body.password || '';

  const computedHash = hashPassword(password, user.salt);
  const isValid = crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(user.passwordHash, 'hex'));

  if (!isValid) {
    return res.status(401).json({ error: 'Senha incorreta. A confirmação com senha é obrigatória para excluir a conta.' });
  }

  // Remove dados do usuário, sessões e sincronizações (Direito ao Esquecimento LGPD)
  delete state.users[user.id];
  delete state.syncData[user.id];
  for (const [token, session] of Object.entries(state.sessions)) {
    if (session.userId === user.id) delete state.sessions[token];
  }
  saveStore();

  res.setHeader('Set-Cookie', 'scriptura_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure');
  return res.status(200).json({ message: 'Sua conta e todos os seus dados foram excluídos definitivamente.' });
};
