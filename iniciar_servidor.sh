#!/bin/bash
# ==============================================================================
# SCRIPTURA APP — Inicializador do Servidor Backend
# ==============================================================================
set -e
cd "$(dirname "$0")"

echo "=================================================================="
echo " SCRIPTURA — Inicializando Servidor Seguro de Autenticação..."
echo "=================================================================="

# Verifica se python3 está instalado
if ! command -v python3 &> /dev/null; then
    echo "[ERRO] Python 3 não foi encontrado no sistema. Por favor, instale o Python 3."
    exit 1
fi

# Verifica se o bcrypt está disponível; se não, instala via requirements.txt
if ! python3 -c "import bcrypt" &> /dev/null; then
    echo "[INFO] Instalando dependência obrigatória (bcrypt)..."
    pip install -r server/requirements.txt || pip3 install -r server/requirements.txt
fi

echo "[INFO] Iniciando servidor na porta 8080..."
echo "[INFO] Acesse no seu navegador: http://localhost:8080"
echo "=================================================================="
exec python3 server/server.py
