#!/usr/bin/env bash
# ==========================================================
# SCRIPTURA APP — Inicializador do Porte para Navegador
# ==========================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=8080

echo "Verificando servidor local do Scriptura App..."

# Inicia o servidor em segundo plano com nohup se não estiver rodando
if ! curl -s "http://127.0.0.1:$PORT/api/books" >/dev/null 2>&1; then
    echo "Iniciando servidor na porta $PORT..."
    nohup python3 "$DIR/web_app/server.py" > "$DIR/web_app/server.log" 2>&1 &
    sleep 1.5
fi

URL="http://localhost:$PORT"
echo "Abrindo $URL no navegador..."

# Abre no Google Chrome, Firefox ou navegador padrão
if command -v /usr/bin/google-chrome-stable >/dev/null 2>&1; then
    /usr/bin/google-chrome-stable "$URL" >/dev/null 2>&1 &
elif command -v /usr/bin/firefox >/dev/null 2>&1; then
    /usr/bin/firefox "$URL" >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
fi

echo "=========================================================="
echo "Scriptura App disponível em: $URL"
echo "=========================================================="
