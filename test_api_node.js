/**
 * Testes Automatizados de Segurança e Funcionalidade para as Vercel Functions (Node.js)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Limpa banco de testes em /tmp
const DB_FILE = path.join('/tmp', 'scriptura_auth_store.json');
if (fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
}

// Helpers para simular req e res de Vercel Functions
function createMockReq({ method = 'GET', url = '/', headers = {}, body = null }) {
  return {
    method,
    url,
    headers: { ...headers },
    body
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
    end(data) {
      if (data && !this.body) {
        try { this.body = JSON.parse(data); } catch (_) { this.body = data; }
      }
      return this;
    }
  };
  return res;
}

// Handlers
const registerHandler = require('./api/auth/register');
const signupHandler = require('./api/auth/signup');
const loginHandler = require('./api/auth/login');
const meHandler = require('./api/auth/me');
const logoutHandler = require('./api/auth/logout');
const logoutAllHandler = require('./api/auth/logout-all');
const pushHandler = require('./api/sync/push');
const pullHandler = require('./api/sync/pull');
const exportHandler = require('./api/user/export');
const accountHandler = require('./api/user/account');

async function runTests() {
  console.log('🧪 Iniciando bateria de testes para Vercel Functions (Node.js)...');
  let passed = 0;

  // 1. Rejeição de método incorreto (ex: GET em /api/auth/register) -> 405
  {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await registerHandler(req, res);
    assert.strictEqual(res.statusCode, 405, 'Deveria retornar 405 para GET');
    passed++;
    console.log('  ✅ 1. Bloqueio de método HTTP indevido (405 Method Not Allowed)');
  }

  // 2. Preflight CORS (OPTIONS) -> 204
  {
    const req = createMockReq({ method: 'OPTIONS' });
    const res = createMockRes();
    await registerHandler(req, res);
    assert.strictEqual(res.statusCode, 204, 'Deveria retornar 204 para OPTIONS');
    passed++;
    console.log('  ✅ 2. Suporte a Preflight CORS (204 No Content)');
  }

  // 3. Rejeição de e-mail inválido
  {
    const req = createMockReq({
      method: 'POST',
      body: { email: 'email_invalido', password: 'SenhaForte123!@#' }
    });
    const res = createMockRes();
    await registerHandler(req, res);
    assert.strictEqual(res.statusCode, 400, 'Deveria retornar 400 para e-mail inválido');
    passed++;
    console.log('  ✅ 3. Rejeição de e-mail malformatado (400)');
  }

  // 4. Rejeição de senha fraca/curta
  {
    const req = createMockReq({
      method: 'POST',
      body: { email: 'teste@exemplo.com', password: '123' }
    });
    const res = createMockRes();
    await registerHandler(req, res);
    assert.strictEqual(res.statusCode, 400, 'Deveria rejeitar senha curta');
    passed++;
    console.log('  ✅ 4. Rejeição de senha fraca/curta (400)');
  }

  // 5. Cadastro com sucesso (/api/auth/register) -> 201
  let sessionCookie = '';
  {
    const req = createMockReq({
      method: 'POST',
      body: {
        email: 'usuario.leitor@scriptura.app',
        password: 'SenhaForteSegura2026!#',
        name: 'Leitor Teste'
      }
    });
    const res = createMockRes();
    await registerHandler(req, res);
    assert.strictEqual(res.statusCode, 201, 'Deveria retornar 201 Created');
    assert.ok(res.body.token, 'Deveria retornar token');
    sessionCookie = res.getHeader('set-cookie');
    assert.ok(sessionCookie.includes('HttpOnly'), 'Cookie deve ter HttpOnly');
    assert.ok(sessionCookie.includes('SameSite=Strict'), 'Cookie deve ter SameSite=Strict');
    passed++;
    console.log('  ✅ 5. Cadastro com sucesso e emissão de Cookie Seguro (201)');
  }

  // 6. E-mail duplicado no cadastro -> 409
  {
    const req = createMockReq({
      method: 'POST',
      body: {
        email: 'usuario.leitor@scriptura.app',
        password: 'OutraSenhaForte2026!#'
      }
    });
    const res = createMockRes();
    await registerHandler(req, res);
    assert.strictEqual(res.statusCode, 409, 'Deveria retornar 409 Conflict');
    passed++;
    console.log('  ✅ 6. Prevenção de cadastro duplicado (409 Conflict)');
  }

  // 7. Rota de alias /api/auth/signup funciona perfeitamente
  {
    const req = createMockReq({
      method: 'POST',
      body: {
        email: 'segundo.usuario@scriptura.app',
        password: 'SegundaSenhaForte2026!#'
      }
    });
    const res = createMockRes();
    await signupHandler(req, res);
    assert.strictEqual(res.statusCode, 201, 'Deveria aceitar POST em /api/auth/signup');
    passed++;
    console.log('  ✅ 7. Rota /api/auth/signup compatível e ativa (201)');
  }

  // 8. Login com credenciais incorretas -> 401
  {
    const req = createMockReq({
      method: 'POST',
      body: {
        email: 'usuario.leitor@scriptura.app',
        password: 'SenhaErrada12345'
      }
    });
    const res = createMockRes();
    await loginHandler(req, res);
    assert.strictEqual(res.statusCode, 401, 'Deveria retornar 401');
    passed++;
    console.log('  ✅ 8. Bloqueio de senha incorreta com timing seguro (401)');
  }

  // 9. Login com sucesso -> 200
  let loginCookie = '';
  {
    const req = createMockReq({
      method: 'POST',
      body: {
        email: 'usuario.leitor@scriptura.app',
        password: 'SenhaForteSegura2026!#'
      }
    });
    const res = createMockRes();
    await loginHandler(req, res);
    assert.strictEqual(res.statusCode, 200, 'Deveria retornar 200');
    assert.ok(res.body.token, 'Deveria retornar token');
    loginCookie = res.getHeader('set-cookie');
    passed++;
    console.log('  ✅ 9. Login bem-sucedido com renovação de sessão (200)');
  }

  // Extrair token do cookie para os próximos testes
  const cookieMatch = loginCookie.match(/scriptura_session=([a-f0-9]+)/);
  const token = cookieMatch ? cookieMatch[1] : '';

  // 10. Sessão autenticada via /api/auth/me
  {
    const req = createMockReq({
      method: 'GET',
      headers: { cookie: `scriptura_session=${token}` }
    });
    const res = createMockRes();
    await meHandler(req, res);
    assert.strictEqual(res.statusCode, 200, 'Deveria autenticar sessão');
    assert.strictEqual(res.body.authenticated, true);
    assert.strictEqual(res.body.user.email, 'usuario.leitor@scriptura.app');
    passed++;
    console.log('  ✅ 10. Verificação de sessão autenticada via /api/auth/me (200)');
  }

  // 11. Sincronização em nuvem - Envio de dados (/api/sync/push)
  {
    const req = createMockReq({
      method: 'POST',
      headers: { cookie: `scriptura_session=${token}` },
      body: {
        bookmark: { book: 'jo', chapter: 3, verse: 16 },
        highlights: { 'jo_3_16': 'yellow' },
        streak: { current: 5, best: 10 },
        font_size: 21
      }
    });
    const res = createMockRes();
    await pushHandler(req, res);
    assert.strictEqual(res.statusCode, 200, 'Deveria salvar sincronização');
    passed++;
    console.log('  ✅ 11. Push de dados sincronizados em nuvem (200)');
  }

  // 12. Sincronização em nuvem - Busca de dados (/api/sync/pull)
  {
    const req = createMockReq({
      method: 'GET',
      headers: { cookie: `scriptura_session=${token}` }
    });
    const res = createMockRes();
    await pullHandler(req, res);
    assert.strictEqual(res.statusCode, 200, 'Deveria recuperar sincronização');
    assert.strictEqual(res.body.font_size, 21);
    assert.strictEqual(res.body.bookmark.book, 'jo');
    assert.strictEqual(res.body.highlights['jo_3_16'], 'yellow');
    passed++;
    console.log('  ✅ 12. Pull de dados sincronizados em nuvem (200)');
  }

  // 13. Exportação de dados (LGPD) -> 200
  {
    const req = createMockReq({
      method: 'GET',
      headers: { cookie: `scriptura_session=${token}` }
    });
    const res = createMockRes();
    await exportHandler(req, res);
    assert.strictEqual(res.statusCode, 200, 'Deveria exportar dados');
    assert.ok(res.body.synchronized_data, 'Deveria conter dados sincronizados');
    passed++;
    console.log('  ✅ 13. Exportação de dados para conformidade LGPD (200)');
  }

  // 14. Logout (/api/auth/logout)
  {
    const req = createMockReq({
      method: 'POST',
      headers: { cookie: `scriptura_session=${token}` }
    });
    const res = createMockRes();
    await logoutHandler(req, res);
    assert.strictEqual(res.statusCode, 200, 'Deveria deslogar com sucesso');
    const expiredCookie = res.getHeader('set-cookie');
    assert.ok(expiredCookie.includes('Max-Age=0'), 'Cookie deve expirar');
    passed++;
    console.log('  ✅ 14. Encerramento de sessão e invalidação de cookie (200)');
  }

  // 15. Acesso com sessão revogada deve falhar (401)
  {
    const req = createMockReq({
      method: 'GET',
      headers: { cookie: `scriptura_session=${token}` }
    });
    const res = createMockRes();
    await meHandler(req, res);
    assert.strictEqual(res.statusCode, 401, 'Sessão revogada deve ser rejeitada');
    passed++;
    console.log('  ✅ 15. Rejeição de sessão revogada / inválida (401)');
  }

  console.log(`\n🎉 Todos os ${passed}/15 testes das Vercel Functions passaram com 100% de sucesso!`);
}

runTests().catch(err => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
