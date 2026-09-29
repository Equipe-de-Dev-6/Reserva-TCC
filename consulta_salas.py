from db import supabase


# ============================================================
# SALAS RESERVÁVEIS
# ============================================================

# Ids das salas e laboratórios que aparecem nas telas de reserva.
# A lista foi levantada a partir do cadastro do campus: entram
# somente as salas usadas por professores. O que ficou de fora
# (portas, depósitos, cozinhas, cilindros de gás) não é
# reservável e por isso nunca chega ao frontend.
#
# A seleção é feita pelo "id" e não pelo nome, porque existem
# salas com o mesmo nome e ids diferentes (as duas C24, por
# exemplo). Para incluir ou remover uma sala, ajuste esta lista.
SALAS_RESERVAVEIS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19, 24, 25, 54, 55, 56, 57, 89, 90, 91
]

# Uma sala é laboratório quando a própria descrição diz
# "Laboratório". Salas de prática sem essa palavra no texto
# (Sala de TI, Metrologia, salas de eletrônica) continuam
# sendo tratadas como salas.
PALAVRA_LABORATORIO = "laborat"


# ============================================================
# CONSULTA
# ============================================================

def consultar_salas_reservaveis():
    """Retorna somente as salas que aparecem nas telas de reserva.

    O filtro acontece na consulta ao banco (cláusula IN), e não
    depois no frontend, para que o navegador receba apenas as
    salas reserváveis.
    """
    resposta = (
        supabase
        .table("salas")
        .select("*")
        .in_("id", SALAS_RESERVAVEIS)
        .order("id")
        .execute()
    )

    return resposta.data or []


def eh_laboratorio(sala):
    """Informa se a sala pertence à tela de laboratórios."""
    caracteristica = str(sala.get("caracteristica") or "").lower()

    return PALAVRA_LABORATORIO in caracteristica
