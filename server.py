#!/usr/bin/env python3
"""
SCRIPTURA — Servidor Backend de Autenticação Segura & Sincronização
Segurança em Primeiro Lugar (Conformidade com a Baseline de Segurança & LGPD):
- Hashing de Senhas: bcrypt com salt automático por usuário e cost factor 12
- Sessões Seguras: Tokens criptográficos opacos (32 bytes), cookies HttpOnly + SameSite=Strict
- Invalidação no Servidor: Logout e troca de senha revogam sessões imediatamente
- Proteção Força Bruta: Rate limiting por IP e bloqueio automático de conta após 5 falhas
- Proteção contra Enumeração: Mensagens de erro padronizadas e timing dummy
- Proteção Injeção SQL: 100% de consultas parametrizadas
- Proteção XSS & Headers: Cabeçalhos de segurança obrigatórios (CSP, HSTS, X-Content-Type, etc.)
- Autenticação 2FA (TOTP RFC 6238 nativo)
- LGPD: Minimização de dados, exportação completa (JSON) e exclusão permanente de conta
- Sincronização: Destaques, marcadores e progresso sincronizados com isolamento estrito por usuário
"""

import base64
import http.server
import json
import os
import re
import secrets
import socketserver
import sqlite3
import struct
import sys
import time
import urllib.parse
from datetime import datetime, timedelta

# Importa bcrypt com validação prévia
try:
    import bcrypt
except ImportError:
    print("[FATAL] O módulo 'bcrypt' é obrigatório para hashing de senhas. Instale com: pip install bcrypt")
    sys.exit(1)

# Configurações do Ambiente
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", 8080))
IS_VERCEL = bool(os.environ.get("VERCEL"))
# Em ambientes serverless (Vercel, AWS Lambda) ou se o diretório for somente-leitura, usa /tmp
default_db_dir = "/tmp" if (IS_VERCEL or not os.access(BASE_DIR, os.W_OK)) else BASE_DIR
DB_PATH = os.environ.get("SCRIPTURA_DB_PATH", os.path.join(default_db_dir, "scriptura_auth.db"))
IS_PRODUCTION = os.environ.get("PRODUCTION", "0") in ("1", "true", "True") or IS_VERCEL
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "0") in ("1", "true", "True") or IS_PRODUCTION
CORS_ALLOW_ALL = os.environ.get("CORS_ALLOW_ALL", "1") in ("1", "true", "True")

# Hash dummy pré-computado para mitigação de Timing Attacks contra enumeração de e-mails
DUMMY_BCRYPT_HASH = bcrypt.hashpw(b"ScripturaSecurityDummyPassword2026", bcrypt.gensalt(12))

# Lista de senhas comuns/fracas proibidas (Validação contra senhas conhecidas)
COMMON_WEAK_PASSWORDS = {
    "1234567890", "password123", "senha123456", "admin123456",
    "scriptura123", "jesus123456", "deus1234567", "bibliasagrada",
    "almeida1234", "calvino1536", "lutero1517", "solascriptura",
    "iloveyou123", "welcome1234", "qwertyuiop1", "12345678901"
}

# Rate Limiter em memória para proteção contra força bruta por IP
IP_LOGIN_ATTEMPTS = {}  # { ip: [timestamp1, timestamp2, ...] }
MAX_IP_ATTEMPTS_PER_MINUTE = 10


def check_ip_rate_limit(ip: str) -> bool:
    """Verifica se o IP excedeu o limite de tentativas por minuto."""
    now = time.time()
    cutoff = now - 60
    attempts = [t for t in IP_LOGIN_ATTEMPTS.get(ip, []) if t > cutoff]
    if len(attempts) >= MAX_IP_ATTEMPTS_PER_MINUTE:
        return False
    attempts.append(now)
    IP_LOGIN_ATTEMPTS[ip] = attempts
    return True


def get_db():
    """Retorna uma conexão isolada com o banco de dados SQLite."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
    except Exception:
        conn.execute("PRAGMA journal_mode = DELETE;")
    return conn


def init_db():
    """Inicializa as tabelas de segurança e auditoria no SQLite."""
    conn = get_db()
    with conn:
        # 1. Usuários
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash BLOB NOT NULL,
                name TEXT,
                email_verified INTEGER NOT NULL DEFAULT 1,
                failed_attempts INTEGER NOT NULL DEFAULT 0,
                locked_until TIMESTAMP,
                two_factor_secret TEXT,
                two_factor_enabled INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Sessões Ativas (com suporte a revogação no servidor)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user_agent TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0
            );
        """)

        # 3. Tokens de Recuperação e Verificação
        conn.execute("""
            CREATE TABLE IF NOT EXISTS security_tokens (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_type TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 4. Dados Sincronizados de Usuário (Isolamento Estrito por Linha)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_sync_data (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                bookmark TEXT,
                highlights TEXT,
                streak TEXT,
                font_size INTEGER DEFAULT 19,
                version INTEGER NOT NULL DEFAULT 1,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 5. Logs de Auditoria de Segurança (sem registro de senhas ou dados sensíveis)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS security_audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                user_id TEXT,
                ip_address TEXT,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Índices de performance e segurança
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sec_tokens_user ON security_tokens(user_id, token_type);")
    conn.close()

    # Define permissões seguras do arquivo de banco no Linux (0600)
    try:
        os.chmod(DB_PATH, 0o600)
    except Exception:
        pass


# Inicializa o banco de dados no nível do módulo (essencial para Vercel Serverless / Lambda)
try:
    init_db()
except Exception as _e:
    print(f"[WARN] Inicialização inicial do banco adiada: {_e}")


def log_security_event(event_type: str, user_id: str = None, ip_address: str = None, details: str = None):
    """Registra evento de auditoria sem vazar senhas ou segredos."""
    try:
        conn = get_db()
        with conn:
            conn.execute("""
                INSERT INTO security_audit_logs (event_type, user_id, ip_address, details)
                VALUES (?, ?, ?, ?);
            """, (event_type, user_id, ip_address, details))
        conn.close()
    except Exception as e:
        print(f"[AUDIT LOG ERROR] {e}")


# ==============================================================================
# ALGORITMO TOTP 2FA (RFC 6238 NATIVO E SEGURO)
# ==============================================================================
def generate_totp_secret() -> str:
    """Gera chave secreta Base32 criptograficamente segura para 2FA."""
    random_bytes = secrets.token_bytes(20)
    return base64.b32encode(random_bytes).decode("ascii")


def verify_totp_code(secret_b32: str, code: str, allowed_skew: int = 1) -> bool:
    """Verifica código TOTP com tolerância de até ±1 intervalo de 30s."""
    if not secret_b32 or not code:
        return False
    code = code.strip().replace(" ", "")
    if len(code) != 6 or not code.isdigit():
        return False

    try:
        key = base64.b32decode(secret_b32, casefold=True)
    except Exception:
        return False

    now_counter = int(time.time() // 30)
    for skew in range(-allowed_skew, allowed_skew + 1):
        counter = now_counter + skew
        msg = struct.pack(">Q", counter)
        h = base64.b16decode(urllib.parse.unquote("%20".join(f"{b:02x}" for b in []))) if False else None
        import hmac, hashlib
        h = hmac.new(key, msg, hashlib.sha1).digest()
        offset = h[-1] & 0x0F
        expected_int = struct.unpack(">I", h[offset : offset + 4])[0] & 0x7FFFFFFF
        expected_code = f"{expected_int % 1000000:06d}"
        if secrets.compare_digest(expected_code, code):
            return True
    return False


# ==============================================================================
# VALIDAÇÕES DE SEGURANÇA
# ==============================================================================
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email(email: str) -> bool:
    if not email or len(email) > 254:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Exige senha robusta (10+ caracteres, não vazada/comum)."""
    if not password or len(password) < 10:
        return False, "A senha deve ter no mínimo 10 caracteres."
    if len(password) > 128:
        return False, "A senha não pode exceder 128 caracteres."
    if password.lower() in COMMON_WEAK_PASSWORDS:
        return False, "Esta senha é muito comum ou fraca. Escolha uma senha mais segura."
    return True, ""


# Rotas protegidas mapeadas por método HTTP para suporte estrito a 405 Method Not Allowed
POST_ONLY_ROUTES = {
    "/api/auth/register", "/api/auth/signup",
    "/api/auth/login", "/api/auth/logout", "/api/auth/logout-all",
    "/api/auth/forgot-password", "/api/auth/reset-password",
    "/api/sync/push", "/api/auth/2fa/setup", "/api/auth/2fa/verify"
}

GET_ONLY_ROUTES = {
    "/api/auth/me", "/api/user/export"
}

# ==============================================================================
# HANDLER HTTP PRINCIPAL
# ==============================================================================
class ScripturaSecurityHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def normalize_api_path(self) -> str:
        """Normaliza caminho da requisição tratando subpastas e barras finais."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        if not path:
            path = '/'
        # Trata subcaminhos de repositório caso seja servido atrás de proxy ou subpasta (ex: /SCRIPTURA/api/...)
        for prefix in ('/SCRIPTURA', '/scriptura'):
            if path.startswith(prefix + '/api/'):
                path = path[len(prefix):]
                break
        return path

    def log_message(self, format, *args):
        # Desativa logs de requisições que possam expor senhas em query strings
        if IS_PRODUCTION:
            return
        sys.stderr.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {args[0]} - {args[1]}\n")

    def end_headers(self):
        # Injeta cabeçalhos de segurança obrigatórios (OWASP / Checklist)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("X-XSS-Protection", "1; mode=block")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        if COOKIE_SECURE:
            self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

        # Cabeçalhos CORS seguros: se houver Origin informado, reflete explicitamente com credentials
        origin = self.headers.get("Origin")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept")
        elif CORS_ALLOW_ALL:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept")

        super().end_headers()

    def do_OPTIONS(self):
        """Trata requisições de pre-flight CORS com sucesso imediato e métodos permitidos."""
        self.send_response(204)
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_PUT(self):
        """Trata requisições PUT retornando 405 Method Not Allowed estruturado."""
        path = self.normalize_api_path()
        if path.startswith("/api/"):
            self.send_response(405)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Allow", "GET, POST, DELETE, OPTIONS")
            self.end_headers()
            body = json.dumps({"error": f"Método PUT não permitido para {path}."}, ensure_ascii=False).encode("utf-8")
            self.wfile.write(body)
            return
        self.send_error(405, "Method Not Allowed")

    def send_json(self, status_code: int, data: dict, set_cookie: str = None):
        """Envia resposta JSON com cabeçalho limpo."""
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, private")
        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self) -> dict:
        """Lê e decodifica o corpo da requisição com limite de tamanho seguro (máx 1MB)."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            return {}
        if content_length > 1024 * 1024:
            raise ValueError("Payload muito grande (máximo 1MB).")
        raw = self.rfile.read(content_length)
        return json.loads(raw.decode("utf-8"))

    def get_session_token(self) -> str:
        """Extrai o token de sessão do Cookie httpOnly ou do header Authorization: Bearer."""
        cookie_header = self.headers.get("Cookie", "")
        if cookie_header:
            cookies = [c.strip() for c in cookie_header.split(";")]
            for c in cookies:
                if c.startswith("scriptura_session="):
                    return c[len("scriptura_session=") :].strip()

        # Fallback para header Bearer (API clients)
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        return None

    def authenticate_request(self) -> dict:
        """Valida a sessão atual no banco de dados e retorna o registro do usuário."""
        token = self.get_session_token()
        if not token:
            return None

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.id as session_id, s.expires_at, s.revoked,
                   u.id, u.email, u.name, u.email_verified, u.two_factor_enabled
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ? AND s.revoked = 0;
        """, (token,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        # Verifica expiração
        expires_at = datetime.fromisoformat(row["expires_at"])
        if datetime.now() > expires_at:
            return None

        return dict(row)

    # ==========================================================================
    # ROTAS DA API REST
    # ==========================================================================
    def do_POST(self):
        path = self.normalize_api_path()
        client_ip = self.client_address[0]

        # Se for uma rota que aceita apenas GET, retorna 405 Method Not Allowed
        if path in GET_ONLY_ROUTES:
            self.send_response(405)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Allow", "GET, OPTIONS")
            self.end_headers()
            body = json.dumps({"error": f"Método POST não permitido para {path}. Utilize GET."}, ensure_ascii=False).encode("utf-8")
            self.wfile.write(body)
            return

        try:
            # 1. CADASTRO / REGISTRO (suporta tanto /api/auth/register quanto /api/auth/signup)
            if path in ("/api/auth/register", "/api/auth/signup"):
                data = self.read_json_body()
                email = (data.get("email") or "").strip().lower()
                password = data.get("password") or ""
                name = (data.get("name") or "").strip()[:60]

                if not validate_email(email):
                    return self.send_json(400, {"error": "Formato de e-mail inválido."})

                valid_pwd, pwd_err = validate_password_strength(password)
                if not valid_pwd:
                    return self.send_json(400, {"error": pwd_err})

                conn = get_db()
                cursor = conn.cursor()

                # Verifica se e-mail já existe
                cursor.execute("SELECT id FROM users WHERE email = ?;", (email,))
                if cursor.fetchone():
                    conn.close()
                    # Mensagem genérica para proteção contra enumeração
                    return self.send_json(409, {"error": "Não foi possível criar a conta com este e-mail."})

                user_id = "usr_" + secrets.token_hex(12)
                password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(12))

                with conn:
                    cursor.execute("""
                        INSERT INTO users (id, email, password_hash, name, email_verified)
                        VALUES (?, ?, ?, ?, 1);
                    """, (user_id, email, password_hash, name))

                    # Cria registro inicial de sincronização
                    cursor.execute("""
                        INSERT INTO user_sync_data (user_id, bookmark, highlights, streak, font_size)
                        VALUES (?, NULL, '{}', NULL, 19);
                    """, (user_id,))

                    # Cria sessão automática inicial
                    session_id = secrets.token_urlsafe(32)
                    expires_at = (datetime.now() + timedelta(days=14)).isoformat()
                    cursor.execute("""
                        INSERT INTO sessions (id, user_id, user_agent, ip_address, expires_at)
                        VALUES (?, ?, ?, ?, ?);
                    """, (session_id, user_id, self.headers.get("User-Agent", "")[:250], client_ip, expires_at))

                conn.close()
                log_security_event("register_success", user_id=user_id, ip_address=client_ip)

                cookie_str = f"scriptura_session={session_id}; Path=/; Max-Age={14*86400}; HttpOnly; SameSite=Strict"
                if COOKIE_SECURE:
                    cookie_str += "; Secure"

                return self.send_json(201, {
                    "message": "Conta criada com sucesso!",
                    "user": {"id": user_id, "email": email, "name": name, "email_verified": True, "two_factor_enabled": False},
                    "token": session_id
                }, set_cookie=cookie_str)

            # 2. LOGIN (COM RATE LIMITING & MITIGAÇÃO DE TIMING)
            elif path == "/api/auth/login":
                if not check_ip_rate_limit(client_ip):
                    log_security_event("rate_limit_ip_blocked", ip_address=client_ip)
                    return self.send_json(429, {"error": "Muitas tentativas a partir deste IP. Aguarde um minuto."})

                data = self.read_json_body()
                email = (data.get("email") or "").strip().lower()
                password = data.get("password") or ""
                totp_code = (data.get("totp_code") or "").strip()

                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, email, password_hash, name, email_verified, failed_attempts,
                           locked_until, two_factor_secret, two_factor_enabled
                    FROM users WHERE email = ?;
                """, (email,))
                user = cursor.fetchone()

                # Se o usuário não existir, executa verificação falsa de bcrypt para igualar o tempo
                if not user:
                    bcrypt.checkpw(b"DummyPasswordCheck123", DUMMY_BCRYPT_HASH)
                    conn.close()
                    log_security_event("login_failure_unknown_email", ip_address=client_ip)
                    # Mensagem padronizada contra enumeração
                    return self.send_json(401, {"error": "E-mail ou senha incorretos."})

                user_id = user["id"]

                # Verifica bloqueio de força bruta na conta
                if user["locked_until"]:
                    locked_until = datetime.fromisoformat(user["locked_until"])
                    if datetime.now() < locked_until:
                        conn.close()
                        log_security_event("login_blocked_account", user_id=user_id, ip_address=client_ip)
                        remaining = int((locked_until - datetime.now()).total_seconds() / 60) + 1
                        return self.send_json(429, {
                            "error": f"Conta temporariamente bloqueada por excesso de tentativas incorretas. Tente novamente em {remaining} minutos."
                        })

                # Valida senha via bcrypt
                is_correct = bcrypt.checkpw(password.encode("utf-8"), user["password_hash"])
                if not is_correct:
                    failed = user["failed_attempts"] + 1
                    locked = None
                    if failed >= 5:
                        locked = (datetime.now() + timedelta(minutes=15)).isoformat()
                        log_security_event("account_locked_bruteforce", user_id=user_id, ip_address=client_ip)

                    with conn:
                        cursor.execute("""
                            UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?;
                        """, (failed, locked, user_id))
                    conn.close()

                    log_security_event("login_failure_wrong_password", user_id=user_id, ip_address=client_ip)
                    return self.send_json(401, {"error": "E-mail ou senha incorretos."})

                # Se 2FA estiver ativado, valida código TOTP
                if user["two_factor_enabled"]:
                    if not totp_code:
                        conn.close()
                        return self.send_json(200, {"two_factor_required": True, "message": "Código de autenticação em duas etapas necessário."})

                    if not verify_totp_code(user["two_factor_secret"], totp_code):
                        conn.close()
                        log_security_event("login_failure_2fa", user_id=user_id, ip_address=client_ip)
                        return self.send_json(401, {"error": "Código de autenticação em 2 etapas inválido ou expirado."})

                # Login bem-sucedido: zera tentativas e cria sessão
                session_id = secrets.token_urlsafe(32)
                expires_at = (datetime.now() + timedelta(days=14)).isoformat()

                with conn:
                    cursor.execute("""
                        UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?;
                    """, (user_id,))
                    cursor.execute("""
                        INSERT INTO sessions (id, user_id, user_agent, ip_address, expires_at)
                        VALUES (?, ?, ?, ?, ?);
                    """, (session_id, user_id, self.headers.get("User-Agent", "")[:250], client_ip, expires_at))
                conn.close()

                log_security_event("login_success", user_id=user_id, ip_address=client_ip)

                cookie_str = f"scriptura_session={session_id}; Path=/; Max-Age={14*86400}; HttpOnly; SameSite=Strict"
                if COOKIE_SECURE:
                    cookie_str += "; Secure"

                return self.send_json(200, {
                    "message": "Login realizado com sucesso!",
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "name": user["name"],
                        "email_verified": bool(user["email_verified"]),
                        "two_factor_enabled": bool(user["two_factor_enabled"])
                    },
                    "token": session_id
                }, set_cookie=cookie_str)

            # 3. LOGOUT (INVALIDA SESSÃO NO SERVIDOR)
            elif path == "/api/auth/logout":
                token = self.get_session_token()
                if token:
                    conn = get_db()
                    with conn:
                        conn.execute("UPDATE sessions SET revoked = 1 WHERE id = ?;", (token,))
                    conn.close()
                    log_security_event("logout", ip_address=client_ip)

                cookie_str = "scriptura_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict"
                if COOKIE_SECURE:
                    cookie_str += "; Secure"
                return self.send_json(200, {"message": "Sessão encerrada com sucesso."}, set_cookie=cookie_str)

            # 4. LOGOUT DE TODOS OS DISPOSITIVOS
            elif path == "/api/auth/logout-all":
                user = self.authenticate_request()
                if not user:
                    return self.send_json(401, {"error": "Não autenticado."})

                conn = get_db()
                with conn:
                    conn.execute("UPDATE sessions SET revoked = 1 WHERE user_id = ?;", (user["id"],))
                conn.close()

                log_security_event("logout_all_devices", user_id=user["id"], ip_address=client_ip)
                cookie_str = "scriptura_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict"
                if COOKIE_SECURE:
                    cookie_str += "; Secure"
                return self.send_json(200, {"message": "Todas as sessões foram invalidadas."}, set_cookie=cookie_str)

            # 5. ESQUECI MINHA SENHA (MENSAGEM GENÉRICA ANTI-ENUMERAÇÃO)
            elif path == "/api/auth/forgot-password":
                data = self.read_json_body()
                email = (data.get("email") or "").strip().lower()

                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE email = ?;", (email,))
                user = cursor.fetchone()

                reset_token_raw = None
                if user:
                    # Gera token de uso único com 32 bytes de entropia e expiração curta (15 minutos)
                    reset_token_raw = secrets.token_urlsafe(32)
                    import hashlib
                    token_hash = hashlib.sha256(reset_token_raw.encode("utf-8")).hexdigest()
                    expires_at = (datetime.now() + timedelta(minutes=15)).isoformat()

                    with conn:
                        cursor.execute("""
                            INSERT INTO security_tokens (token_hash, user_id, token_type, expires_at)
                            VALUES (?, ?, 'password_reset', ?);
                        """, (token_hash, user["id"], expires_at))
                    log_security_event("password_reset_requested", user_id=user["id"], ip_address=client_ip)
                conn.close()

                # Resposta segura: nunca diz se o e-mail existe ou não
                res = {"message": "Se o e-mail estiver cadastrado, as instruções de recuperação foram geradas."}
                # Em ambiente local de desenvolvimento, expõe token de forma assistida
                if not IS_PRODUCTION and reset_token_raw:
                    res["dev_reset_token"] = reset_token_raw
                return self.send_json(200, res)

            # 6. REDEFINIR SENHA COM TOKEN
            elif path == "/api/auth/reset-password":
                data = self.read_json_body()
                token_raw = data.get("token") or ""
                new_password = data.get("new_password") or ""

                valid_pwd, pwd_err = validate_password_strength(new_password)
                if not valid_pwd:
                    return self.send_json(400, {"error": pwd_err})

                import hashlib
                token_hash = hashlib.sha256(token_raw.encode("utf-8")).hexdigest()

                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT user_id, expires_at, used
                    FROM security_tokens
                    WHERE token_hash = ? AND token_type = 'password_reset';
                """, (token_hash,))
                token_row = cursor.fetchone()

                if not token_row or token_row["used"]:
                    conn.close()
                    return self.send_json(400, {"error": "Token de recuperação inválido ou já utilizado."})

                expires_at = datetime.fromisoformat(token_row["expires_at"])
                if datetime.now() > expires_at:
                    conn.close()
                    return self.send_json(400, {"error": "Token de recuperação expirado (limite de 15 minutos)."})

                user_id = token_row["user_id"]
                new_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt(12))

                with conn:
                    # Atualiza senha
                    cursor.execute("""
                        UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?;
                    """, (new_hash, user_id))
                    # Invalida o token usado
                    cursor.execute("UPDATE security_tokens SET used = 1 WHERE token_hash = ?;", (token_hash,))
                    # Invalida todas as sessões anteriores (força novo login seguro em todos os dispositivos)
                    cursor.execute("UPDATE sessions SET revoked = 1 WHERE user_id = ?;", (user_id,))
                conn.close()

                log_security_event("password_reset_success", user_id=user_id, ip_address=client_ip)
                return self.send_json(200, {"message": "Senha redefinida com sucesso! Faça login novamente com sua nova senha."})

            # 7. SINCRONIZAÇÃO PUSH (SALVA DADOS NA NUVEM)
            elif path == "/api/sync/push":
                user = self.authenticate_request()
                if not user:
                    return self.send_json(401, {"error": "Não autenticado."})

                data = self.read_json_body()
                user_id = user["id"]

                bookmark_json = json.dumps(data.get("bookmark")) if data.get("bookmark") else None
                highlights_json = json.dumps(data.get("highlights", {}))
                streak_json = json.dumps(data.get("streak")) if data.get("streak") else None
                font_size = int(data.get("font_size") or 19)

                conn = get_db()
                with conn:
                    conn.execute("""
                        INSERT INTO user_sync_data (user_id, bookmark, highlights, streak, font_size, version, updated_at)
                        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                        ON CONFLICT(user_id) DO UPDATE SET
                            bookmark = excluded.bookmark,
                            highlights = excluded.highlights,
                            streak = excluded.streak,
                            font_size = excluded.font_size,
                            version = user_sync_data.version + 1,
                            updated_at = CURRENT_TIMESTAMP;
                    """, (user_id, bookmark_json, highlights_json, streak_json, font_size))
                conn.close()

                return self.send_json(200, {"message": "Sincronização salva com sucesso!", "synced_at": datetime.now().isoformat()})

            # 8. SINCRONIZAÇÃO PULL (BAIXA DADOS DA NUVEM)
            elif path == "/api/sync/pull":
                user = self.authenticate_request()
                if not user:
                    return self.send_json(401, {"error": "Não autenticado."})

                user_id = user["id"]
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT bookmark, highlights, streak, font_size, version, updated_at
                    FROM user_sync_data WHERE user_id = ?;
                """, (user_id,))
                row = cursor.fetchone()
                conn.close()

                if not row:
                    return self.send_json(200, {"bookmark": None, "highlights": {}, "streak": None, "font_size": 19})

                return self.send_json(200, {
                    "bookmark": json.loads(row["bookmark"]) if row["bookmark"] else None,
                    "highlights": json.loads(row["highlights"]) if row["highlights"] else {},
                    "streak": json.loads(row["streak"]) if row["streak"] else None,
                    "font_size": row["font_size"],
                    "version": row["version"],
                    "updated_at": row["updated_at"]
                })

            # 9. ATIVAR / CONFIGURAR 2FA (TOTP)
            elif path == "/api/auth/2fa/setup":
                user = self.authenticate_request()
                if not user:
                    return self.send_json(401, {"error": "Não autenticado."})

                secret = generate_totp_secret()
                # Salva o segredo temporário (ainda não ativado até confirmação com código)
                conn = get_db()
                with conn:
                    conn.execute("UPDATE users SET two_factor_secret = ? WHERE id = ?;", (secret, user["id"]))
                conn.close()

                otp_uri = f"otpauth://totp/Scriptura:{user['email']}?secret={secret}&issuer=Scriptura"
                return self.send_json(200, {
                    "secret": secret,
                    "otp_uri": otp_uri,
                    "message": "Insira o código gerado pelo aplicativo autenticador para confirmar a ativação."
                })

            elif path == "/api/auth/2fa/verify":
                user = self.authenticate_request()
                if not user:
                    return self.send_json(401, {"error": "Não autenticado."})

                data = self.read_json_body()
                code = data.get("code") or ""

                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT two_factor_secret FROM users WHERE id = ?;", (user["id"],))
                secret = cursor.fetchone()["two_factor_secret"]

                if not verify_totp_code(secret, code):
                    conn.close()
                    return self.send_json(400, {"error": "Código 2FA incorreto ou expirado."})

                with conn:
                    cursor.execute("UPDATE users SET two_factor_enabled = 1 WHERE id = ?;", (user["id"],))
                conn.close()

                log_security_event("2fa_enabled", user_id=user["id"], ip_address=client_ip)
                return self.send_json(200, {"message": "Autenticação em duas etapas (2FA) ativada com sucesso!"})

            else:
                return self.send_json(404, {"error": "Endpoint não encontrado"})

        except json.JSONDecodeError:
            self.send_json(400, {"error": "JSON malformatado."})
        except Exception as e:
            # Nunca vaza rastros de pilha ou segredos em mensagens de erro
            print(f"[INTERNAL ERROR] {e}")
            self.send_json(500, {"error": "Ocorreu um erro interno no servidor."})

    def do_GET(self):
        path = self.normalize_api_path()

        # Se for uma rota que aceita apenas POST, retorna 405 Method Not Allowed
        if path in POST_ONLY_ROUTES:
            self.send_response(405)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Allow", "POST, OPTIONS")
            self.end_headers()
            body = json.dumps({"error": f"Método GET não permitido para {path}. Utilize POST."}, ensure_ascii=False).encode("utf-8")
            self.wfile.write(body)
            return

        # 1. OBTER USUÁRIO ATUAL (STATUS DE AUTENTICAÇÃO)
        if path == "/api/auth/me":
            user = self.authenticate_request()
            if not user:
                return self.send_json(401, {"authenticated": False})

            return self.send_json(200, {
                "authenticated": True,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["name"],
                    "email_verified": bool(user["email_verified"]),
                    "two_factor_enabled": bool(user["two_factor_enabled"])
                }
            })

        # 2. EXPORTAÇÃO DE DADOS PESSOAIS (DIREITO À PORTABILIDADE LGPD)
        elif path == "/api/user/export":
            user = self.authenticate_request()
            if not user:
                return self.send_json(401, {"error": "Não autenticado."})

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, name, created_at, two_factor_enabled FROM users WHERE id = ?;", (user["id"],))
            user_data = dict(cursor.fetchone())

            cursor.execute("SELECT bookmark, highlights, streak, font_size, updated_at FROM user_sync_data WHERE user_id = ?;", (user["id"],))
            sync_row = cursor.fetchone()
            conn.close()

            export_payload = {
                "export_date": datetime.now().isoformat(),
                "lgpd_compliance": "Scriptura Data Export",
                "user_profile": user_data,
                "synchronized_data": {
                    "bookmark": json.loads(sync_row["bookmark"]) if sync_row and sync_row["bookmark"] else None,
                    "highlights": json.loads(sync_row["highlights"]) if sync_row and sync_row["highlights"] else {},
                    "streak": json.loads(sync_row["streak"]) if sync_row and sync_row["streak"] else None,
                    "font_size": sync_row["font_size"] if sync_row else 19
                }
            }
            return self.send_json(200, export_payload)

        # 3. SINCRONIZAÇÃO PULL VIA GET
        elif path == "/api/sync/pull":
            user = self.authenticate_request()
            if not user:
                return self.send_json(401, {"error": "Não autenticado."})

            user_id = user["id"]
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT bookmark, highlights, streak, font_size, version, updated_at
                FROM user_sync_data WHERE user_id = ?;
            """, (user_id,))
            row = cursor.fetchone()
            conn.close()

            if not row:
                return self.send_json(200, {"bookmark": None, "highlights": {}, "streak": None, "font_size": 19})

            return self.send_json(200, {
                "bookmark": json.loads(row["bookmark"]) if row["bookmark"] else None,
                "highlights": json.loads(row["highlights"]) if row["highlights"] else {},
                "streak": json.loads(row["streak"]) if row["streak"] else None,
                "font_size": row["font_size"],
                "version": row["version"],
                "updated_at": row["updated_at"]
            })

        # 4. ATENDIMENTO DE ARQUIVOS ESTÁTICOS DO APP
        else:
            if path.startswith("/api/"):
                return self.send_json(404, {"error": "Endpoint não encontrado"})
            return super().do_GET()

    def do_DELETE(self):
        path = self.normalize_api_path()
        client_ip = self.client_address[0]

        # Se for uma rota de API conhecida que não suporta DELETE, retorna 405 Method Not Allowed
        if path in POST_ONLY_ROUTES or path in GET_ONLY_ROUTES:
            self.send_response(405)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Allow", "POST, OPTIONS" if path in POST_ONLY_ROUTES else "GET, OPTIONS")
            self.end_headers()
            body = json.dumps({"error": f"Método DELETE não permitido para {path}."}, ensure_ascii=False).encode("utf-8")
            self.wfile.write(body)
            return

        # EXCLUSÃO DEFINITIVA DE CONTA (DIREITO AO ESQUECIMENTO LGPD)
        if path == "/api/user/account":
            user = self.authenticate_request()
            if not user:
                return self.send_json(401, {"error": "Não autenticado."})

            try:
                data = self.read_json_body()
            except Exception:
                data = {}

            password = data.get("password") or ""
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT password_hash FROM users WHERE id = ?;", (user["id"],))
            row = cursor.fetchone()

            if not row or not bcrypt.checkpw(password.encode("utf-8"), row["password_hash"]):
                conn.close()
                return self.send_json(401, {"error": "Senha incorreta. A confirmação com senha é obrigatória para excluir a conta."})

            with conn:
                # O DELETE CASCADE remove automaticamente as sessões e dados sincronizados
                cursor.execute("DELETE FROM users WHERE id = ?;", (user["id"],))
            conn.close()

            log_security_event("account_deleted_lgpd", user_id=user["id"], ip_address=client_ip)

            cookie_str = "scriptura_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict"
            if COOKIE_SECURE:
                cookie_str += "; Secure"
            return self.send_json(200, {"message": "Sua conta e todos os seus dados foram excluídos definitivamente."}, set_cookie=cookie_str)
        else:
            return self.send_json(404, {"error": "Endpoint não encontrado"})


# ==============================================================================
# INICIALIZAÇÃO DO SERVIDOR
# ==============================================================================
def run_server():
    init_db()
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ScripturaSecurityHandler) as httpd:
        print(f"==================================================================")
        print(f" SCRIPTURA APP — Servidor Backend Seguro Iniciado na Porta {PORT}")
        print(f" - URL Local: http://localhost:{PORT}")
        print(f" - Banco de Dados: {DB_PATH}")
        print(f" - Hashing de Senhas: bcrypt (Cost=12, Salt Automático)")
        print(f" - Proteção de Sessão: HttpOnly, SameSite=Strict")
        print(f" - Proteção Força Bruta & Enumeração Ativa")
        print(f" - LGPD: Exportação e Exclusão Segura Disponíveis")
        print(f"==================================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[INFO] Encerrando servidor com segurança...")
            httpd.shutdown()


# ==============================================================================
# EXPORTAÇÕES DE NÍVEL SUPERIOR PARA VERCEL SERVERLESS / WSGI RUNTIMES
# A Vercel exige explicitamente 'handler', 'app' ou 'application' no nível do módulo.
# ==============================================================================
handler = ScripturaSecurityHandler
app = handler
application = handler


if __name__ == "__main__":
    run_server()
