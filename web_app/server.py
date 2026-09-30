#!/usr/bin/env python3
"""
SCRIPTURA APP — Servidor Web & API REST Local (Zero Dependências Externas)
Conecta-se diretamente ao SQLite da Bíblia ACF e atende ao navegador.
"""

import http.server
import json
import os
import sqlite3
import sys
import urllib.parse
from datetime import datetime

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DB_PATH = os.path.join(PROJECT_ROOT, "assets", "database", "biblia_acf.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. user_progress
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        book_id INT NOT NULL,
        chapter INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, chapter)
      );
    """)

    # 2. user_highlights
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS user_highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        book_id INT NOT NULL,
        chapter INT NOT NULL,
        verse INT NOT NULL,
        start_offset INT NOT NULL DEFAULT 0,
        end_offset INT NOT NULL DEFAULT 0,
        color VARCHAR(20) NOT NULL CHECK (color IN ('verde', 'amarelo', 'azul', 'laranja', 'rosa')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, chapter, verse)
      );
    """)

    # 3. devotionals
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS devotionals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        bible_reference VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        source_author VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    """)

    # 4. user_prayers
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS user_prayers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'respondido')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answered_at TIMESTAMP
      );
    """)

    # Índices
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id, book_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_highlights_user ON user_highlights(user_id, book_id, chapter);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_prayers_user ON user_prayers(user_id, status);")

    # Seed de devocionais se tabela estiver vazia
    cursor.execute("SELECT COUNT(*) FROM devotionals;")
    if cursor.fetchone()[0] == 0:
        seed_devotionals(cursor)

    conn.commit()
    conn.close()


def seed_devotionals(cursor):
    sample_devotionals = [
        (
            datetime.now().strftime("%Y-%m-%d"),
            "A Glória da Justificação Pela Fé",
            "Romanos 5:1",
            "Charles H. Spurgeon",
            "Sendo, pois, justificados pela fé, temos paz com Deus, por nosso Senhor Jesus Cristo.\n\nQue oceano de consolo há nesta única sentença! A paz não é uma trégua temporária, nem uma calmaria enganosa antes da tempestade; é a reconciliação definitiva e eterna selada pelo sangue do Cordeiro. O pecador que confia em Cristo não tem mais contra si qualquer acusação perante o tribunal de Deus. A lei foi satisfeita, a justiça foi vindicada e a ira de Deus foi propiciada no Calvário.\n\nÓ minh'alma, descansa na perfeita justiça de teu Redentor! Não olhes para tuas fraquezas, mas fixa os olhos nas chagas e na fidelidade de Cristo.",
        ),
        (
            "2026-09-29",
            "O Mistério da Soberana Providência",
            "Romanos 8:28",
            "Thomas Watson",
            "Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.\n\nO grande Médico das almas sabe preparar a mais amarga receita para produzir a mais doce cura. Nem sempre compreendemos o propósito de nossas aflições enquanto estamos no vale, mas Deus opera soberanamente nos bastidores. As linhas escuras da tapeçaria da vida são tão necessárias para compor o belo desenho quanto os fios de ouro.\n\nNenhum fio de cabelo cai de tua cabeça sem a permissão do teu Pai celeste.",
        ),
        (
            "2026-09-28",
            "A Santidade Sem a Qual Ninguém Verá o Senhor",
            "Hebreus 12:14",
            "J.C. Ryle",
            "Segui a paz com todos, e a santificação, sem a qual ninguém verá o Senhor.\n\nA verdadeira santidade cristã não consiste em mero misticismo, tampouco em um legalismo exterior; é a semelhança real e crescente com o Senhor Jesus Cristo em caráter, palavra e ação. Um homem santo odeia o pecado e ama apaixonadamente a justiça e os mandamentos do Senhor.\n\nA graça que justifica é a mesma que purifica o coração e renova a mente.",
        ),
        (
            "2026-09-27",
            "A Fonte Inabalável da Graça Soberana",
            "Efésios 2:8-9",
            "Arthur W. Pink",
            "Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus. Não vem das obras, para que ninguém se glorie.\n\nA salvação pertence ao Senhor de ponta a ponta. Não fomos nós que escolhemos a Cristo primeiro quando estávamos mortos em delitos e pecados, mas foi Ele quem nos amou com amor eterno e nos chamou eficazmente para a Sua luz maravilhosa.\n\nOnde, pois, está a jactância humana? Excluída inteiramente!",
        ),
        (
            "2026-09-26",
            "A Mortificação Diária do Pecado",
            "Romanos 8:13",
            "John Owen",
            "Porque, se viverdes segundo a carne, morrereis; mas, se pelo Espírito mortificardes as obras do corpo, vivereis.\n\nOu estás matando o pecado diariamente, ou o pecado estará matando a ti. O crente em Cristo jamais pode declarar um cessar-fogo contra a concupiscência. Esta batalha espiritual exige vigilância constante, oração fervorosa e dependência absoluta do Espírito Santo.",
        ),
        (
            "2026-09-25",
            "A Luz das Escrituras Para os Nossos Passos",
            "Salmos 119:105",
            "João Calvino",
            "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.\n\nAssim como os viajantes na escuridão da noite tropeçam a cada passo a menos que tenham uma tocha acesa, assim toda a sabedoria humana é pura cegueira se não for iluminada pela luz límpida da Palavra Sagrada de Deus. As Escrituras são os óculos celestiais que nos permitem enxergar claramente a Deus e a nós mesmos.",
        ),
        (
            "2026-09-24",
            "A Doçura da Oração Matutina",
            "Salmos 5:3",
            "Matthew Henry",
            "Pela manhã ouvirás a minha voz, ó SENHOR; pela manhã apresentarei a ti a minha oração, e vigiarei.\n\nConsagrar as primeiras horas do dia ao nosso Criador é colocar a chave de ouro da manhã nas mãos de Deus. Antes que os ruídos do mundo invadam os nossos ouvidos, silenciemos o coração na presença dEle com reverência e fé.",
        ),
    ]

    for date_str, title, ref, author, content in sample_devotionals:
        cursor.execute(
            """
            INSERT OR IGNORE INTO devotionals (date, title, bible_reference, source_author, content)
            VALUES (?, ?, ?, ?, ?);
        """,
            (date_str, title, ref, author, content),
        )


class ScripturaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def parse_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            body = self.rfile.read(content_length)
            return json.loads(body.decode("utf-8"))
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith("/api/"):
            conn = get_db()
            cursor = conn.cursor()

            try:
                if path == "/api/books":
                    cursor.execute(
                        "SELECT id, order_index, abbreviation, name, testament, chapter_count FROM books WHERE version = 'acf' ORDER BY order_index ASC;"
                    )
                    books = [dict(row) for row in cursor.fetchall()]
                    self.send_json(books)
                    return

                elif path == "/api/verses":
                    book_id = int(query.get("book_id", [1])[0])
                    chapter = int(query.get("chapter", [1])[0])
                    cursor.execute("SELECT abbreviation, name FROM books WHERE id = ? AND version = 'acf';", (book_id,))
                    b_row = cursor.fetchone()
                    if not b_row:
                        self.send_json([], 404)
                        return
                    abbr = b_row["abbreviation"]
                    cursor.execute(
                        "SELECT id, number, text FROM verses WHERE version = 'acf' AND book = ? AND chapter = ? ORDER BY number ASC;",
                        (abbr, chapter),
                    )
                    verses = [dict(row) for row in cursor.fetchall()]
                    self.send_json({"book_name": b_row["name"], "chapter": chapter, "verses": verses})
                    return

                elif path == "/api/progress":
                    user_id = query.get("user_id", [""])[0]
                    cursor.execute("SELECT book_id, chapter, completed_at FROM user_progress WHERE user_id = ?;", (user_id,))
                    progress = [dict(row) for row in cursor.fetchall()]
                    self.send_json(progress)
                    return

                elif path == "/api/highlights":
                    user_id = query.get("user_id", [""])[0]
                    book_id = query.get("book_id", [None])[0]
                    chapter = query.get("chapter", [None])[0]
                    if book_id and chapter:
                        cursor.execute(
                            "SELECT verse, color FROM user_highlights WHERE user_id = ? AND book_id = ? AND chapter = ?;",
                            (user_id, int(book_id), int(chapter)),
                        )
                        hl = {row["verse"]: row["color"] for row in cursor.fetchall()}
                        self.send_json(hl)
                    else:
                        cursor.execute(
                            """
                            SELECT h.*, b.name as book_name, v.text as verse_text
                            FROM user_highlights h
                            JOIN books b ON b.id = h.book_id AND b.version = 'acf'
                            JOIN verses v ON v.book = b.abbreviation AND v.chapter = h.chapter AND v.number = h.verse AND v.version = 'acf'
                            WHERE h.user_id = ?
                            ORDER BY h.created_at DESC;
                            """,
                            (user_id,),
                        )
                        self.send_json([dict(row) for row in cursor.fetchall()])
                    return

                elif path == "/api/devotionals":
                    cursor.execute("SELECT * FROM devotionals ORDER BY date DESC;")
                    self.send_json([dict(row) for row in cursor.fetchall()])
                    return

                elif path == "/api/prayers":
                    user_id = query.get("user_id", [""])[0]
                    cursor.execute("SELECT * FROM user_prayers WHERE user_id = ? ORDER BY created_at DESC;", (user_id,))
                    self.send_json([dict(row) for row in cursor.fetchall()])
                    return

                else:
                    self.send_json({"error": "Endpoint não encontrado"}, 404)
                    return

            finally:
                conn.close()

        # Servir arquivo estático normal
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.parse_body()

        conn = get_db()
        cursor = conn.cursor()

        try:
            if path == "/api/progress/toggle":
                user_id = body.get("user_id")
                book_id = body.get("book_id")
                chapter = body.get("chapter")
                force_completed = body.get("force_completed", False)

                cursor.execute(
                    "SELECT id FROM user_progress WHERE user_id = ? AND book_id = ? AND chapter = ?;",
                    (user_id, book_id, chapter),
                )
                existing = cursor.fetchone()

                if existing and not force_completed:
                    cursor.execute("DELETE FROM user_progress WHERE id = ?;", (existing["id"],))
                    completed = False
                else:
                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO user_progress (user_id, book_id, chapter, completed_at)
                        VALUES (?, ?, ?, ?);
                        """,
                        (user_id, book_id, chapter, datetime.now().isoformat()),
                    )
                    completed = True

                conn.commit()
                self.send_json({"completed": completed})
                return

            elif path == "/api/highlights":
                user_id = body.get("user_id")
                book_id = body.get("book_id")
                chapter = body.get("chapter")
                verse = body.get("verse")
                color = body.get("color")

                cursor.execute(
                    """
                    INSERT OR REPLACE INTO user_highlights (user_id, book_id, chapter, verse, color, created_at)
                    VALUES (?, ?, ?, ?, ?, ?);
                    """,
                    (user_id, book_id, chapter, verse, color, datetime.now().isoformat()),
                )
                conn.commit()
                self.send_json({"status": "success", "color": color})
                return

            elif path == "/api/prayers":
                user_id = body.get("user_id")
                title = body.get("title", "").strip()
                description = body.get("description", "").strip()

                cursor.execute(
                    """
                    INSERT INTO user_prayers (user_id, title, description, status, created_at)
                    VALUES (?, ?, ?, 'ativo', ?);
                    """,
                    (user_id, title, description, datetime.now().isoformat()),
                )
                conn.commit()
                self.send_json({"status": "created", "id": cursor.lastrowid})
                return

            elif path == "/api/prayers/answer":
                prayer_id = body.get("id")
                cursor.execute(
                    "UPDATE user_prayers SET status = 'respondido', answered_at = ? WHERE id = ?;",
                    (datetime.now().isoformat(), prayer_id),
                )
                conn.commit()
                self.send_json({"status": "updated"})
                return

            elif path == "/api/prayers/reopen":
                prayer_id = body.get("id")
                cursor.execute(
                    "UPDATE user_prayers SET status = 'ativo', answered_at = NULL WHERE id = ?;",
                    (prayer_id,),
                )
                conn.commit()
                self.send_json({"status": "reopened"})
                return

            elif path == "/api/highlights/delete":
                user_id = body.get("user_id")
                book_id = body.get("book_id")
                chapter = body.get("chapter")
                verse = body.get("verse")

                cursor.execute(
                    "DELETE FROM user_highlights WHERE user_id = ? AND book_id = ? AND chapter = ? AND verse = ?;",
                    (user_id, book_id, chapter, verse),
                )
                conn.commit()
                self.send_json({"status": "deleted"})
                return

            elif path == "/api/prayers/delete":
                prayer_id = body.get("id")
                cursor.execute("DELETE FROM user_prayers WHERE id = ?;", (prayer_id,))
                conn.commit()
                self.send_json({"status": "deleted"})
                return

            else:
                self.send_json({"error": "Endpoint inválido"}, 404)

        finally:
            conn.close()


def run():
    init_db()
    server_address = ("127.0.0.1", PORT)
    httpd = http.server.HTTPServer(server_address, ScripturaHandler)
    print(f"==================================================")
    print(f"📖 SCRIPTURA APP (ACF) — Servidor Ativo")
    print(f"Acesse no navegador: http://localhost:{PORT}")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
        httpd.server_close()


if __name__ == "__main__":
    run()
