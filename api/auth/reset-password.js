const { handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  return res.status(200).json({
    message: 'Senha redefinida com sucesso! Faça login novamente com sua nova senha.'
  });
};
