import os

from dotenv import load_dotenv
from supabase import create_client


# ============================================================
# CONFIGURAÇÃO
# ============================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


# ============================================================
# VERIFICAÇÃO
# ============================================================

if not SUPABASE_URL:
    raise Exception("SUPABASE_URL não foi configurada.")

if not SUPABASE_KEY:
    raise Exception("SUPABASE_KEY não foi configurada.")


# ============================================================
# CONEXÃO COM O SUPABASE
# ============================================================

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)