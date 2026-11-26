"""Consulta das salas que aparecem nas telas de reserva.

O filtro das salas acontece aqui, na consulta ao banco, e não depois no
navegador: assim o browser só recebe o que pode ser reservado.
"""

# Cliente padrão, usado quando a função é chamada pelas rotas do app.
# Os testes passam um cliente próprio para não tocar no banco real.
from db import supabase


# ============================================================
# SALAS RESERVÁVEIS
# ============================================================

# Quais salas aparecem nas telas de reserva é um dado do banco, na
# coluna "reservavel": o Coordenador liga e desliga isso na tela de
# gerenciamento de salas. A lista vivia antes escrita em Python, e cada
# mudança de sala da escola exigia alterar e republicar o código.

# Ids que já eram reserváveis quando a coluna foi criada. A migração SQL
# usa esta mesma lista para marcar as salas antigas; aqui ela fica como
# registro histórico, e não é usada na consulta (o filtro é feito no banco).
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

    Fluxo:
    1. Usa o cliente passado ou o cliente global do db.py.
    2. Consulta a tabela "salas" com WHERE reservavel = true.
    3. Ordena por id.
    4. Devolve a lista de dados (ou lista vazia se não houver).
    """
    # Permite injetar um cliente (nos testes) ou usar o cliente global.
    cliente = supabase_cliente or supabase

    # O WHERE reservavel = true fica no banco: assim o navegador nunca
    # recebe salas que o coordenador desligou do cadastro.
    resposta = (
        cliente
        .table("salas")
        .select("*")
        .eq("reservavel", True)
        .order("id")
        .execute()
    )

    # PostgREST devolve None quando não há linhas; a API trabalha melhor
    # com uma lista vazia.
    return resposta.data or []
