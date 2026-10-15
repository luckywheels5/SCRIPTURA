/**
 * SCRIPTURA — Módulo Central de Autenticação Segura & Armazenamento para Vercel Functions
 * Linha de Base Obrigatória de Segurança:
 * - Hashing de Senhas: Scrypt (salt individual de 16 bytes, memory-hard, OWASP)
 * - Sessões Criptográficas: Tokens opacos de 32 bytes em cookies HttpOnly + SameSite=Strict + Secure
 * - Rate Limiting: Proteção por IP contra força bruta
 * - Mitigação de Enumeração: Mensagens genéricas e timing constante
 * - LGPD: Portabilidade (exportação) e exclusão definitiva de conta
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Caminho do armazenamento seguro em ambientes serverless (Vercel permite escrita em /tmp)
const DB_FILE = path.join('/tmp', 'scriptura_auth_store.json');

// Lista de senhas comuns/fracas proibidas
const COMMON_WEAK_PASSWORDS = new Set([
  '1234567890', 'password123', 'senha123456', 'admin123456',
  'scriptura123', 'jesus123456', 'deus1234567', 'bibliasagrada',
  'almeida1234', 'calvino1536', 'lutero1517', 'solascriptura',
  'iloveyou123', 'welcome1234', 'qwertyuiop1', '12345678901'
]);

// Dummy hash pré-computado para mitigação de Timing Attacks contra enumeração de e-mail
const DUMMY_SALT = 'e5b7a192f8c3d4e5f6a7b8c9d0e1f2a3';
const DUMMY_HASH = crypto.scryptSync('DummyPasswordScriptura2026', DUMMY_SALT, 64).toString('hex');

// Rate limiting por IP em memória
const IP_ATTEMPTS = new Map();
const MAX_ATTEMPTS_PER_MIN = 10;

function checkIpRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 60000;
  const list = (IP_ATTEMPTS.get(ip) || []).filter(t => t > windowStart);
  if (list.length >= MAX_ATTEMPTS_PER_MIN) return false;
  list.push(now);
  IP_ATTEMPTS.set(ip, list);
  return true;
}

// Armazenamento em memória com persistência em /tmp
const state = {
  users: {},      // { id: { id, email, passwordHash, salt, name, emailVerified, failedAttempts, lockedUntil, twoFactorSecret, twoFactorEnabled, createdAt } }
  sessions: {},   // { token: { id, userId, expiresAt, revoked } }
  syncData: {}    // { userId: { bookmark, highlights, streak, fontSize, version, updatedAt } }
};

function loadStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (data.users && typeof data.users === 'object') {
          for (const k of Object.keys(state.users)) delete state.users[k];
          Object.assign(state.users, data.users);
        }
        if (data.sessions && typeof data.sessions === 'object') {
          for (const k of Object.keys(state.sessions)) delete state.sessions[k];
          Object.assign(state.sessions, data.sessions);
        }
        if (data.syncData && typeof data.syncData === 'object') {
          for (const k of Object.keys(state.syncData)) delete state.syncData[k];
          Object.assign(state.syncData, data.syncData);
        }
      }
    }
  } catch (_) {}
}

function saveStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (_) {}
}

// Carrega store inicial
loadStore();

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function validateEmail(email) {
  if (!email || typeof email !== 'string' || email.length > 254) return false;
  return /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email.trim());
}

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string' || password.length < 10) {
    return { valid: false, error: 'A senha deve ter no mínimo 10 caracteres.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'A senha não pode exceder 128 caracteres.' };
  }
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: 'Esta senha é muito comum ou fraca. Escolha uma senha mais segura.' };
  }
  return { valid: true };
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}

function handleCors(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

function getSessionToken(req) {
  if (!req || !req.headers) return null;
  const cookieHeader = req.headers.cookie || req.headers.Cookie || '';
  const cookies = cookieHeader ? cookieHeader.split(';') : [];
  for (const c of cookies) {
    const [k, ...v] = c.trim().split('=');
    if (k === 'scriptura_session' && v.length > 0) return decodeURIComponent(v.join('='));
  }
  const auth = req.headers.authorization || req.headers.Authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

function authenticateRequest(req) {
  loadStore();
  const token = getSessionToken(req);
  if (!token) return null;
  const session = state.sessions[token];
  if (!session || session.revoked) return null;
  if (new Date(session.expiresAt) < new Date()) return null;
  const user = state.users[session.userId];
  if (!user) return null;
  return { user, sessionToken: token };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
  state.sessions[token] = {
    id: token,
    userId,
    expiresAt,
    revoked: false
  };
  saveStore();
  return {
    token,
    cookieStr: `scriptura_session=${token}; Path=/; Max-Age=${14 * 86400}; HttpOnly; SameSite=Strict; Secure`
  };
}

function parseBody(req) {
  if (!req) return {};
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return {};
    }
  }
  return {};
}

module.exports = {
  state,
  loadStore,
  saveStore,
  hashPassword,
  validateEmail,
  validatePasswordStrength,
  checkIpRateLimit,
  setCorsHeaders,
  handleCors,
  getSessionToken,
  authenticateRequest,
  createSession,
  parseBody,
  DUMMY_SALT,
  DUMMY_HASH
};
