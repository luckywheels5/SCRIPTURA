"""
SCRIPTURA — Ponto de entrada para Vercel Serverless Functions (/api)
Exporta handler, app e application no nível superior para conformidade com a Vercel.
"""
import os
import sys

# Adiciona a raiz do projeto ao sys.path para importar o server.py
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from server import ScripturaSecurityHandler, handler, app, application

# Reexporta explicitamente no nível superior para a Vercel
__all__ = ["handler", "app", "application", "ScripturaSecurityHandler"]
