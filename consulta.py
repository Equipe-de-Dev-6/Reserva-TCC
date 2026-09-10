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

    resposta = (
        supabase
        .table(TABELA)
        .select("*")
        .execute()
    )

    return resposta.data


# ============================================================
# MOSTRAR USUÁRIOS
# ============================================================

def mostrar_usuarios(usuarios):

    print("USUÁRIOS\n")

    for usuario in usuarios:

        print(
            f"{usuario['id']} - "
            f"{usuario['nome']} | "
            f"{usuario['email']}"
        )

    print(f"\nTotal: {len(usuarios)}")


# ============================================================
# INICIALIZAÇÃO
# ============================================================

usuarios = consultar_usuarios()

os.system("cls")

mostrar_usuarios(usuarios)


# ============================================================
# MONITORAMENTO
# ============================================================

while True:

    try:

        novos_usuarios = consultar_usuarios()

        ids_atuais = {
            usuario["id"]
            for usuario in usuarios
        }

        usuario_novo = any(
            usuario["id"] not in ids_atuais
            for usuario in novos_usuarios
        )

        # Só atualiza se houver usuário novo
        if usuario_novo:

            usuarios = novos_usuarios

            os.system("cls")

            mostrar_usuarios(usuarios)

        time.sleep(INTERVALO)

    except KeyboardInterrupt:

        os.system("cls")
        print("Programa encerrado.")

        break

    except Exception as erro:

        print(f"\nErro: {erro}")

        time.sleep(INTERVALO)