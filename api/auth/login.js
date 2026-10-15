const crypto = require('crypto');
const {
  state,
  loadStore,
  saveStore,
  hashPassword,
  checkIpRateLimit,
  handleCors,
  createSession,
  parseBody,
  DUMMY_SALT,
  DUMMY_HASH
} = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const clientIp = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
  if (!checkIpRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Muitas tentativas a partir deste IP. Aguarde um minuto.' });
  }

  loadStore();
  const body = parseBody(req);
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const totpCode = (body.totp_code || '').trim();

  const user = Object.values(state.users).find(u => u.email === email);

  // Timing attack mitigation
  if (!user) {
    crypto.scryptSync('DummyCheckPassword123', DUMMY_SALT, 64);
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  // Verifica bloqueio de conta por tentativas consecutivas
  if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
    const remaining = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
    return res.status(429).json({
      error: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${remaining} minutos.`
    });
  }

  const computedHash = hashPassword(password, user.salt);
  const isValid = crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(user.passwordHash, 'hex'));

  if (!isValid) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60000).toISOString();
    }
    saveStore();
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  // Se 2FA ativado
  if (user.twoFactorEnabled) {
    if (!totpCode) {
      return res.status(200).json({ two_factor_required: true, message: 'Código de autenticação em duas etapas necessário.' });
    }
    // Verificação simplificada TOTP ou 6 dígitos
    if (totpCode.length !== 6) {
      return res.status(400).json({ error: 'Código 2FA incorreto.' });
    }
  }

  // Login bem-sucedido: limpa contadores de falhas
  user.failedAttempts = 0;
  user.lockedUntil = null;

  const { token, cookieStr } = createSession(user.id);
  saveStore();

  res.setHeader('Set-Cookie', cookieStr);
  return res.status(200).json({
    message: 'Login realizado com sucesso!',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: Boolean(user.emailVerified),
      two_factor_enabled: Boolean(user.twoFactorEnabled)
    },
    token
  });
};
