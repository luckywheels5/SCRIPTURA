const registerHandler = require('./register');

module.exports = async function handler(req, res) {
  return registerHandler(req, res);
};
