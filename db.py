"""Conexão com o Supabase.

Este módulo inicializa o cliente do Supabase que será usado por toda a
aplicação (app.py e consulta_salas.py).

As variáveis de ambiente são lidas do .env (via python-dotenv). Se
alguma delas faltar, a aplicação não sobe — é melhor falhar cedo do que
seguir sem banco.
"""

import os

from dotenv import load_dotenv
from supabase import create_client


# ============================================================
# CONFIGURAÇÃO
# ============================================================

# Carrega as variáveis do arquivo .env para o ambiente do processo.
load_dotenv()

# URL do projeto Supabase (ex: https://meu-projeto.supabase.co).
SUPABASE_URL = os.getenv("SUPABASE_URL")

# Chave secreta (service role) do Supabase. Começa com "sb_secret_".
# É somente do servidor: a API usa ela para falar com o banco.
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


# ============================================================
# VERIFICAÇÃO
# ============================================================

# Se a URL não estiver definida, interrompe com erro claro.
if not SUPABASE_URL:
    raise Exception("SUPABASE_URL não foi configurada.")

# Se a chave não estiver definida, interrompe com erro claro.
if not SUPABASE_KEY:
    raise Exception("SUPABASE_KEY não foi configurada.")


# ============================================================
# CONEXÃO COM O SUPABASE
# ============================================================

# Instância única do cliente, reutilizada por todas as rotas.
supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)
