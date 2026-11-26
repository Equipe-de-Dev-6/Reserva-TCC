"""Cliente único do Supabase usado pelo app e pelos scripts de consulta.

A configuração é lida do arquivo .env (via python-dotenv) e validada na
importação: se a URL ou a chave estiverem faltando, o processo falha logo
de início, em vez de quebrar no meio de uma requisição.
"""

import os  # biblioteca padrão que lê as variáveis de ambiente do sistema

from dotenv import load_dotenv  # carrega o arquivo .env para os.getenv()
from supabase import create_client  # constrói o cliente HTTP do Supabase


# ============================================================
# CONFIGURAÇÃO
# ============================================================

# Preenche o ambiente com o conteúdo de .env. Chamada antes dos gets,
# senão as variáveis ainda não existiriam neste processo.
load_dotenv()

# URL do projeto (Project Settings -> API). Identifica para onde vão as
# requisições PostgREST.
SUPABASE_URL = os.getenv("SUPABASE_URL")

# Chave secreta do projeto. Nunca deve ser enviada ao navegador: aqui ela
# só é usada pelo processo Python, dentro do servidor.
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


# ============================================================
# VERIFICAÇÃO
# ============================================================

# Uma configuração incompleta é erro de inicialização, não erro de usuário.
# RuntimeError deixa a mensagem clara no log do uvicorn.
if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL não foi configurada.")

if not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_KEY não foi configurada.")


# ============================================================
# CONEXÃO COM O SUPABASE
# ============================================================

# O cliente é criado uma vez, na importação, e reaproveitado por todas as
# rotas. Os testes substituem "app.supabase" por um dublê, sem tocar nesta
# conexão real.
supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)
