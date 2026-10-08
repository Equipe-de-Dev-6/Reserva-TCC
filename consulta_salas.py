"""Consulta das salas que aparecem nas telas de reserva.

O filtro das salas acontece aqui, na consulta ao banco, e não depois no
navegador: assim o browser só recebe o que pode ser reservado.
"""

from db import supabase


# ============================================================
# SALAS RESERVÁVEIS
# ============================================================

# Quais salas aparecem nas telas de reserva é um dado do banco, na
# coluna "reservavel": o Coordenador liga e desliga isso na tela de
# gerenciamento de salas. A lista vivia antes escrita em Python, e cada
# mudança de sala da escola exigia alterar e republicar o código.

# Ids que já eram reserváveis. Servem só para marcar a coluna na
# primeira vez que a migração roda, preservando o comportamento atual.
SALAS_RESERVAVEIS_INICIAL = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19, 24, 25, 55, 56, 57, 89, 90, 91
]


# ============================================================
# CONSULTA
# ============================================================

def salas_para_tela(supabase_cliente=None):
    """Retorna somente as salas que aparecem nas telas de reserva.

    O filtro acontece na consulta ao banco (WHERE reservavel), e não
    depois no frontend, para que o navegador receba apenas as salas
    reserváveis.
    """
    cliente = supabase_cliente or supabase

    resposta = (
        cliente
        .table("salas")
        .select("*")
        .eq("reservavel", True)
        .order("id")
        .execute()
    )

    return resposta.data or []