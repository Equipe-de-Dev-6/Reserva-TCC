import os
import time

from dotenv import load_dotenv
from supabase import create_client


# ============================================================
# CONFIGURAÇÃO
# ============================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

TABELA = "usuarios"
INTERVALO = 5


# ============================================================
# CONEXÃO
# ============================================================

if not SUPABASE_URL:
    raise Exception("SUPABASE_URL não foi configurada.")

if not SUPABASE_KEY:
    raise Exception("SUPABASE_KEY não foi configurada.")

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# ============================================================
# CONSULTAR BANCO
# ============================================================

def consultar_usuarios():
    """Retorna todos os usuários"""
    resposta = (
        supabase
        .table(TABELA)
        .select("*")
        .execute()
    )
    return resposta.data


def consultar_usuario_por_email_senha(email, senha):
    """Busca um usuário específico por email e senha"""
    resposta = (
        supabase
        .table(TABELA)
        .select("*")
        .eq("email", email)
        .eq("senha", senha)
        .execute()
    )
    return resposta.data


# ============================================================
# MOSTRAR USUÁRIOS
# ============================================================

def mostrar_usuarios(usuarios):
    print("USUÁRIOS\n")
    
    # Se receber o objeto resposta, pega .data
    if hasattr(usuarios, 'data'):
        usuarios = usuarios.data
    
    for usuario in usuarios:
        print(
            f"{usuario['id']} - "
            f"{usuario['nome']} | "
            f"{usuario['email']}"
        )
    
    print(f"\nTotal: {len(usuarios)}")