const crypto = require('crypto');
const {
  state,
  loadStore,
  saveStore,
  hashPassword,
  validateEmail,
  validatePasswordStrength,
  handleCors,
  createSession,
  parseBody
} = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  loadStore();
  const body = parseBody(req);
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const name = (body.name || '').trim().slice(0, 60);

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Formato de e-mail inválido.' });
  }

  const pwdCheck = validatePasswordStrength(password);
  if (!pwdCheck.valid) {
    return res.status(400).json({ error: pwdCheck.error });
  }

  // Verifica e-mail duplicado
  const existingUser = Object.values(state.users).find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'Não foi possível criar a conta com este e-mail.' });
  }

  const userId = 'usr_' + crypto.randomBytes(12).toString('hex');
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  state.users[userId] = {
    id: userId,
    email,
    salt,
    passwordHash,
    name,
    emailVerified: true,
    failedAttempts: 0,
    lockedUntil: null,
    twoFactorSecret: null,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString()
  };

  state.syncData[userId] = {
    bookmark: null,
    highlights: {},
    streak: null,
    fontSize: 19,
    version: 1,
    updatedAt: new Date().toISOString()
  };

  const { token, cookieStr } = createSession(userId);
  saveStore();

  res.setHeader('Set-Cookie', cookieStr);
  return res.status(201).json({
    message: 'Conta criada com sucesso!',
    user: {
      id: userId,
      email,
      name,
      email_verified: true,
      two_factor_enabled: false
    },
    token
  });
};
