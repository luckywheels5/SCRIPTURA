const { authenticateRequest, handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Utilize GET.' });
  }

  const auth = authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ authenticated: false });
  }

  const { user } = auth;
  return res.status(200).json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: Boolean(user.emailVerified),
      two_factor_enabled: Boolean(user.twoFactorEnabled)
    }
  });
};
