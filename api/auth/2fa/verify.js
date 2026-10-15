const { state, loadStore, saveStore, authenticateRequest, handleCors, parseBody } = require('../../_lib/auth');

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
  const body = parseBody(req);
  const code = (body.code || '').trim();

  if (!code || code.length < 6) {
    return res.status(400).json({ error: 'Código 2FA incorreto ou inválido.' });
  }

  auth.user.twoFactorEnabled = true;
  saveStore();

  return res.status(200).json({
    message: 'Autenticação em duas etapas (2FA) ativada com sucesso!'
  });
};
