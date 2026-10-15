const { state, loadStore, handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  loadStore();
  const body = req.body || {};
  const email = (body.email || '').trim().toLowerCase();

  // Resposta genérica para mitigar enumeração de contas
  return res.status(200).json({
    message: 'Se o e-mail estiver cadastrado, as instruções de recuperação foram geradas.'
  });
};
