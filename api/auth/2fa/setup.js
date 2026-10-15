const crypto = require('crypto');
const { state, loadStore, saveStore, authenticateRequest, handleCors } = require('../../_lib/auth');

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
  const secret = crypto.randomBytes(20).toString('hex').slice(0, 32).toUpperCase();
  auth.user.twoFactorSecret = secret;
  saveStore();

  const otpUri = `otpauth://totp/Scriptura:${encodeURIComponent(auth.user.email)}?secret=${secret}&issuer=Scriptura`;
  return res.status(200).json({
    secret,
    otp_uri: otpUri,
    message: 'Insira o código gerado pelo aplicativo autenticador para confirmar a ativação.'
  });
};
