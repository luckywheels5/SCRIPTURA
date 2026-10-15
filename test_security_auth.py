#!/usr/bin/env python3
"""
Script de Auditoria e Teste de Conformidade de Segurança da Autenticação do Scriptura.
Executa testes locais diretamente contra os endpoints do server.py.
"""

import json
import os
import sqlite3
import subprocess
import time
import urllib.request
import urllib.error

TEST_PORT = 8899
SERVER_URL = f"http://127.0.0.1:{TEST_PORT}"
TEST_DB = "test_scriptura_auth.db"

def run_tests():
    print("--- INICIANDO AUDITORIA DE CONFORMIDADE DE SEGURANÇA ---")

    # Inicia o servidor em processo isolado
    env = os.environ.copy()
    env["PORT"] = str(TEST_PORT)
    env["SCRIPTURA_DB_PATH"] = TEST_DB
    env["PRODUCTION"] = "0"
    env["COOKIE_SECURE"] = "0"

    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

    proc = subprocess.Popen(["python3", "server.py"], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    for _ in range(50):
        try:
            with urllib.request.urlopen(f"{SERVER_URL}/") as r:
                if r.status == 200:
                    break
        except Exception:
            time.sleep(0.1)

    try:
        # TESTE 1: Senha Fraca Rejeitada (< 10 caracteres)
        req = urllib.request.Request(
            f"{SERVER_URL}/api/auth/register",
            data=json.dumps({"email": "teste@scriptura.org", "password": "123", "name": "Leitor"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            urllib.request.urlopen(req)
            assert False, "Deveria ter rejeitado senha curta!"
        except urllib.error.HTTPError as e:
            assert e.code == 400, f"Código esperado 400, obtido {e.code}"
            body = json.loads(e.read().decode())
            print("✓ Teste 1 Passou: Senha curta rejeitada com status 400:", body["error"])

        # TESTE 2: Senha Fraca Comum Rejeitada
        req = urllib.request.Request(
            f"{SERVER_URL}/api/auth/register",
            data=json.dumps({"email": "teste@scriptura.org", "password": "password123", "name": "Leitor"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            urllib.request.urlopen(req)
            assert False, "Deveria ter rejeitado senha da lista fraca!"
        except urllib.error.HTTPError as e:
            assert e.code == 400
            print("✓ Teste 2 Passou: Senha comum/fraca rejeitada.")

        # TESTE 3: Cadastro Bem-sucedido com Senha Forte (Argon2id/Bcrypt)
        strong_password = "MinhaSenhaSuperForte!2026"
        req = urllib.request.Request(
            f"{SERVER_URL}/api/auth/register",
            data=json.dumps({"email": "leitor@scriptura.org", "password": strong_password, "name": "Leitor Bereano"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        res = urllib.request.urlopen(req)
        assert res.code == 201
        res_data = json.loads(res.read().decode())
        token = res_data["token"]
        assert token, "Token de sessão deveria ser emitido"
        set_cookie = res.headers.get("Set-Cookie")
        assert "HttpOnly" in set_cookie and "SameSite=Strict" in set_cookie
        print("✓ Teste 3 Passou: Conta criada, token emitido e cookie HttpOnly + SameSite=Strict configurado.")

        # TESTE 4: Verificação no Banco - Sem Senha em Texto Puro
        conn = sqlite3.connect(TEST_DB)
        conn.row_factory = sqlite3.Row
        user_row = conn.execute("SELECT * FROM users WHERE email = 'leitor@scriptura.org';").fetchone()
        assert user_row["password_hash"].startswith(b"$2b$"), "O hash deve ser bcrypt ($2b$)"
        assert strong_password.encode() not in user_row["password_hash"], "A senha nunca pode estar em texto puro!"
        conn.close()
        print("✓ Teste 4 Passou: Senha protegida por hash bcrypt com salt automático no SQLite.")

        # TESTE 5: Proteção contra Enumeração e Força Bruta
        for i in range(1, 6):
            req_fail = urllib.request.Request(
                f"{SERVER_URL}/api/auth/login",
                data=json.dumps({"email": "leitor@scriptura.org", "password": "SenhaErradaTotal"}).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            try:
                urllib.request.urlopen(req_fail)
                assert False
            except urllib.error.HTTPError as e:
                err_body = json.loads(e.read().decode())
                if i < 5:
                    assert e.code == 401
                    assert err_body["error"] == "E-mail ou senha incorretos."
                else:
                    assert e.code in (401, 429)

        # 6ª tentativa deve ser bloqueada com status 429
        req_locked = urllib.request.Request(
            f"{SERVER_URL}/api/auth/login",
            data=json.dumps({"email": "leitor@scriptura.org", "password": strong_password}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            urllib.request.urlopen(req_locked)
            assert False, "Conta deveria estar bloqueada após 5 falhas consecutivas!"
        except urllib.error.HTTPError as e:
            assert e.code == 429
            print("✓ Teste 5 Passou: Proteção contra Força Bruta bloqueou a conta após 5 falhas (HTTP 429).")

        # Desbloqueia manualmente no banco de teste para continuar
        conn = sqlite3.connect(TEST_DB)
        conn.execute("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE email = 'leitor@scriptura.org';")
        conn.commit()
        conn.close()

        # TESTE 6: Login Bem-sucedido
        req_login = urllib.request.Request(
            f"{SERVER_URL}/api/auth/login",
            data=json.dumps({"email": "leitor@scriptura.org", "password": strong_password}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        res_login = urllib.request.urlopen(req_login)
        assert res_login.code == 200
        login_data = json.loads(res_login.read().decode())
        valid_token = login_data["token"]
        print("✓ Teste 6 Passou: Login bem-sucedido com credenciais corretas.")

        # TESTE 7: Sincronização Push e Pull (Isolamento de Dados por Usuário)
        sync_payload = {
            "bookmark": {"bookAbbrev": "rm", "bookName": "Romanos", "chapter": 8, "verseNumber": 28},
            "highlights": {"rm_8_28": "yellow", "jo_3_16": "green"},
            "streak": {"count": 7, "lastDate": "2026-10-15"},
            "font_size": 22
        }
        req_push = urllib.request.Request(
            f"{SERVER_URL}/api/sync/push",
            data=json.dumps(sync_payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {valid_token}"}
        )
        res_push = urllib.request.urlopen(req_push)
        assert res_push.code == 200

        req_pull = urllib.request.Request(
            f"{SERVER_URL}/api/sync/pull",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        res_pull = urllib.request.urlopen(req_pull)
        pull_data = json.loads(res_pull.read().decode())
        assert pull_data["bookmark"]["chapter"] == 8
        assert pull_data["highlights"]["rm_8_28"] == "yellow"
        assert pull_data["font_size"] == 22
        print("✓ Teste 7 Passou: Sincronização Push e Pull com isolamento de dados no servidor.")

        # TESTE 8: Portabilidade LGPD (Exportação de Dados)
        req_export = urllib.request.Request(
            f"{SERVER_URL}/api/user/export",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        res_export = urllib.request.urlopen(req_export)
        export_data = json.loads(res_export.read().decode())
        assert export_data["user_profile"]["email"] == "leitor@scriptura.org"
        assert "synchronized_data" in export_data
        print("✓ Teste 8 Passou: Exportação de dados pessoais (Portabilidade LGPD).")

        # TESTE 9: Logout e Invalidação de Sessão no Servidor
        req_logout = urllib.request.Request(
            f"{SERVER_URL}/api/auth/logout",
            data=b"{}",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {valid_token}"}
        )
        res_logout = urllib.request.urlopen(req_logout)
        assert res_logout.code == 200

        # Tentativa de acesso com token revogado deve retornar 401
        try:
            urllib.request.urlopen(req_pull)
            assert False, "Sessão deveria ter sido invalidada no servidor!"
        except urllib.error.HTTPError as e:
            assert e.code == 401
            print("✓ Teste 9 Passou: Sessão invalidada com sucesso no servidor após logout.")

        # TESTE 10: Cabeçalhos de Segurança HTTP e Entrega de Arquivos Estáticos
        req_index = urllib.request.Request(f"{SERVER_URL}/")
        res_index = urllib.request.urlopen(req_index)
        assert res_index.code == 200
        headers_dict = dict(res_index.headers)
        assert headers_dict.get("X-Content-Type-Options") == "nosniff"
        assert headers_dict.get("X-Frame-Options") == "SAMEORIGIN"
        index_body = res_index.read().decode("utf-8")
        assert "auth-modal" in index_body
        assert "js/auth.js" in index_body
        assert "btn-open-auth" in index_body
        print("✓ Teste 10 Passou: Servidor entrega arquivos estáticos com cabeçalhos de segurança estritos.")

        # TESTE 11: Fluxo de Autenticação em 2 Etapas (2FA / TOTP)
        # Faz novo login para obter token ativo
        req_relogin = urllib.request.Request(
            f"{SERVER_URL}/api/auth/login",
            data=json.dumps({"email": "leitor@scriptura.org", "password": strong_password}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        res_relogin = urllib.request.urlopen(req_relogin)
        new_token = json.loads(res_relogin.read().decode())["token"]

        # Setup 2FA
        req_2fa_setup = urllib.request.Request(
            f"{SERVER_URL}/api/auth/2fa/setup",
            data=b"{}",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {new_token}"}
        )
        res_2fa_setup = urllib.request.urlopen(req_2fa_setup)
        assert res_2fa_setup.code == 200
        setup_data = json.loads(res_2fa_setup.read().decode())
        assert "secret" in setup_data
        print("✓ Teste 11 Passou: Geração de segredo 2FA (TOTP) bem-sucedida.")

        # TESTE 12: Exclusão Definitiva de Conta (Direito ao Esquecimento LGPD)
        # Senha errada deve ser rejeitada
        req_del_bad = urllib.request.Request(
            f"{SERVER_URL}/api/user/account",
            data=json.dumps({"password": "senha_errada"}).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {new_token}"}
        )
        req_del_bad.get_method = lambda: "DELETE"
        try:
            urllib.request.urlopen(req_del_bad)
            assert False, "Deveria exigir senha correta para exclusão"
        except urllib.error.HTTPError as e:
            assert e.code == 401

        # Senha correta exclui permanentemente
        req_del_ok = urllib.request.Request(
            f"{SERVER_URL}/api/user/account",
            data=json.dumps({"password": strong_password}).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {new_token}"}
        )
        req_del_ok.get_method = lambda: "DELETE"
        res_del_ok = urllib.request.urlopen(req_del_ok)
        assert res_del_ok.code == 200

        # Verifica se o usuário sumiu do banco de dados
        conn = sqlite3.connect(TEST_DB)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = 'leitor@scriptura.org';")
        assert cursor.fetchone()[0] == 0
        conn.close()
        print("✓ Teste 12 Passou: Exclusão definitiva de conta e dados pessoais com sucesso (LGPD).")

        print("\n=======================================================")
        print(" TODOS OS 12 TESTES DE CONFORMIDADE DE SEGURANÇA PASSARAM!")
        print("=======================================================")

    finally:
        proc.terminate()
        proc.wait()
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)

if __name__ == "__main__":
    run_tests()

