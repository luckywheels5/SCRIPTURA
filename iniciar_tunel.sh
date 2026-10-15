#!/bin/bash
# ==============================================================================
# SCRIPTURA — Inicializador do Túnel Cloudflare para Acesso Externo
# ==============================================================================
set -e
cd "$(dirname "$0")"

if [ ! -f "./cloudflared" ]; then
    echo "[ERRO] Binário cloudflared não encontrado."
    exit 1
fi

echo "=================================================================="
echo " SCRIPTURA — Criando Túnel Público Seguro com HTTPS..."
echo " Conectando ao backend em http://localhost:8080"
echo " Copie a URL *.trycloudflare.com exibida abaixo para acessar externamente!"
echo "=================================================================="
exec ./cloudflared tunnel --url http://localhost:8080
