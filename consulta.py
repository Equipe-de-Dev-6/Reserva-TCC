"""Script de consulta rápida aos usuários cadastrados no Supabase.

Serve para conferir o banco na máquina de desenvolvimento, sem expor o
hash da senha no terminal. Não faz parte do servidor FastAPI: é executado
direto com `python consulta.py`.
"""

import os  # lê SUPABASE_URL/SUPABASE_KEY do ambiente

from dotenv import load_dotenv  # carrega as variáveis de .env
from supabase import create_client  # cliente PostgREST do Supabase


# ============================================================
# CONFIGURAÇÃO
# ============================================================

# Carrega o .env antes das leituras abaixo, senão as variáveis ainda não
# estariam disponíveis neste processo.
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Nome da tabela consultada. Fica em uma constante para o script poder
# ser adaptado a outra tabela sem mexer na função de consulta.
TABELA = "usuarios"


# ============================================================
# CONEXÃO
# ============================================================

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL não foi configurada.")

if not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_KEY não foi configurada.")

# Conexão reaproveitada pela função consultar_usuarios().
supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# ============================================================
# CONSULTAR BANCO
# ============================================================

def consultar_usuarios():
    """Retorna todos os usuários"""
    # select("*") devolve também a coluna "senha", que é um hash bcrypt.
    # Ela só é usada para conferir se o cadastro existe; nunca é impressa.
    resposta = (
        supabase
        .table(TABELA)
        .select("*")
        .execute()
    )
    return resposta.data or []


# Não existe consulta por "e-mail e senha" aqui de propósito: a senha
# guardada é um hash bcrypt, que não pode ser comparado com a senha
# digitada. A verificação acontece com bcrypt.checkpw, em
# criptografia.verify_password, chamada pela rota /login.


# ============================================================
# MOSTRAR USUÁRIOS
# ============================================================

def mostrar_usuarios(usuarios):
    """Imprime id, nome e e-mail, sem mostrar o hash da senha."""
    print("USUÁRIOS\n")

    # Aceita tanto a lista de dados quanto o objeto de resposta do
    # Supabase, para a função ser chamada diretamente nos dois formatos.
    if hasattr(usuarios, 'data'):
        usuarios = usuarios.data or []

    # Só as três colunas públicas aparecem no terminal: a senha é um
    # segredo mesmo quando armazenada como hash.
    for usuario in usuarios:
        print(
            f"{usuario['id']} - "
            f"{usuario['nome']} | "
            f"{usuario['email']}"
        )

    print(f"\nTotal: {len(usuarios)}")


# Sem este bloco o arquivo só definia funções: rodar `python consulta.py`
# não mostrava nada. Agora o script faz a consulta ao ser executado direto,
# e continua importável sem efeito colateral.
if __name__ == "__main__":
    mostrar_usuarios(consultar_usuarios())